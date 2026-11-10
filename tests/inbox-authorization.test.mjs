import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const T = '10000000-0000-4000-8000-000000000001'
const T2 = '10000000-0000-4000-8000-000000000002'
const S = '20000000-0000-4000-8000-000000000001'
const S2 = '20000000-0000-4000-8000-000000000002'
const LEGACY = '20000000-0000-4000-8000-000000000003'
const PENDING = '20000000-0000-4000-8000-000000000004'
const migration = name => readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8')

test('actual Inbox migrations persist both directions and enforce private participants with legacy student threads', async t => {
  const db = new PGlite()
  async function as(user, work) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user])
    try { return await work() } finally { await db.exec('reset role') }
  }
  async function send(user, { sender = user, recipient = user, role = 'student', recipientRole = 'student', subject = 'Practice together', body = 'Listen, repeat, personalize, then use.', isRead = false, readAt = null } = {}) {
    return (await as(user, () => db.query('insert into inbox_messages(sender_id,sender_role,recipient_id,recipient_role,subject,body,is_read,read_at) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,body', [sender, role, recipient, recipientRole, subject, body, isRead, readAt]))).rows[0]
  }
  async function ids(user) {
    return (await as(user, () => db.query('select id from inbox_messages'))).rows.map(row => row.id)
  }
  async function mark(user, id) {
    return (await as(user, () => db.query('select mark_inbox_message_as_read($1) result', [id]))).rows[0].result
  }
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text,language text,level text,level_name text,progress int,lessons_completed int,current_module text,next_step text);
      create table storage.objects(id uuid primary key,bucket_id text);
      grant usage on schema public,auth,storage to authenticated,anon;
      grant select on public.teachers,public.profiles to authenticated;`)
    for (const id of [T,T2,S,S2,LEGACY,PENDING]) {
      await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id,id+'@example.com'])
      await db.query('insert into profiles(id,name) values($1,$2)', [id,id===T||id===T2?'Teacher':'Student'])
    }
    await db.query('insert into teachers values($1),($2)', [T,T2])
    await db.exec(migration('0010_inbox_messaging.sql'))
    await db.exec(migration('0013_hybrid_enrollment.sql'))
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2", [T,S])
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2", [T2,S2])
    await db.query("update enrollments set status='pending',source='self' where student_id=$1", [PENDING])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [T])
    const retained=(await db.query("insert into inbox_messages(sender_id,sender_role,recipient_id,recipient_role,subject,body) values($1,'teacher',$2,'student','Retained','Existing private message') returning id", [T,S])).rows[0].id
    // 0010 insertion trigger checks auth.uid even for privileged test setup.
    await db.exec(migration('0017_inbox_authorization.sql'))

    let thread, reply, direct, otherThread, legacyThread, legacyReply
    await t.test('student own-thread and teacher reply persist with confirmed IDs and remain bidirectional', async () => {
      thread=await send(S)
      reply=await send(T,{recipient:S,role:'teacher',body:'Personalize your expression with a real situation.'})
      direct=await send(S,{recipient:T,recipientRole:'teacher',body:'I have a question for my assigned teacher.'})
      otherThread=await send(S2)
      assert.ok(thread.id&&reply.id&&direct.id)
      assert.equal((await db.query('select body from inbox_messages where id=$1',[reply.id])).rows[0].body,'Personalize your expression with a real situation.')
      assert.ok((await ids(S)).includes(thread.id))
      assert.ok((await ids(S)).includes(reply.id))
      assert.ok((await ids(T)).includes(thread.id))
      assert.ok((await ids(T)).includes(direct.id))
      assert.ok((await ids(T)).includes(retained))
      assert.ok(!(await ids(S2)).includes(thread.id))
      assert.ok(!(await ids(T2)).includes(thread.id))
      assert.ok(!(await ids(T)).includes(otherThread.id))
    })
    await t.test('unassigned teachers cannot read addressed private messages or send to another teachers student', async () => {
      for (const id of [thread.id,reply.id,direct.id,retained]) assert.ok(!(await ids(T2)).includes(id))
      await assert.rejects(send(T2,{recipient:S,role:'teacher'}),/row-level security/)
      await assert.rejects(send(T,{sender:T2,recipient:S,role:'teacher'}),/row-level security/)
      await assert.rejects(send(T,{recipient:S,role:'system'}),/row-level security/)
      await assert.rejects(send(S,{recipient:S2}),/Unauthorized recipient/)
      await assert.rejects(send(S,{recipient:T2,recipientRole:'teacher'}),/row-level security/)
      await assert.rejects(send(S,{role:'teacher'}),/impersonate/)
    })
    await t.test('new messages cannot claim a recipient read receipt at creation', async () => {
      for(const flags of [{isRead:true},{readAt:'2026-11-08T10:00:00Z'},{isRead:true,readAt:'2026-11-08T10:00:00Z'}]){
        await assert.rejects(send(S,flags),/row-level security/)
        await assert.rejects(send(T,{...flags,recipient:S,role:'teacher'}),/row-level security/)
      }
    })
    await t.test('read status updates are confined to recipient or assigned own-thread teacher', async () => {
      assert.equal(await mark(S,thread.id),false,'student sender cannot mark their outgoing self-thread read')
      assert.equal((await as(S,()=>db.query('update inbox_messages set is_read=true where id=$1 returning id',[thread.id]))).rows.length,0)
      assert.equal((await db.query('select is_read from inbox_messages where id=$1',[thread.id])).rows[0].is_read,false)
      assert.equal(await mark(T,thread.id),true)
      assert.equal(await mark(T2,thread.id),false)
      assert.equal(await mark(S,reply.id),true)
      assert.equal(await mark(S2,reply.id),false)
      assert.equal(await mark(T,reply.id),false,'sender cannot mark their outgoing message read')
      assert.equal(await mark(T,direct.id),true)
      assert.equal((await as(T2,()=>db.query('update inbox_messages set is_read=true where id=$1 returning id',[thread.id]))).rows.length,0)
      assert.equal((await as(T,()=>db.query('update inbox_messages set is_read=true where id=$1 returning id',[reply.id]))).rows.length,0)
      assert.equal((await as(S,()=>db.query('update inbox_messages set is_read=true where id=$1 returning id',[reply.id]))).rows.length,1)
      await assert.rejects(as(S,()=>db.query("update inbox_messages set body='Tampered' where id=$1",[reply.id])),/permission denied/)
      const triggerNames=(await db.query("select tgname from pg_trigger where tgrelid='public.inbox_messages'::regclass and not tgisinternal")).rows.map(row=>row.tgname)
      assert.ok(triggerNames.includes('trg_enforce_inbox_message_immutability'))
      assert.ok(triggerNames.includes('trg_validate_inbox_message_insert'))
    })
    await t.test('legacy teacher scope applies to student own-thread only; addressed messages stay private', async () => {
      legacyThread=await send(LEGACY)
      legacyReply=await send(T,{recipient:LEGACY,role:'teacher',body:'An addressed private reply.'})
      assert.ok((await ids(T)).includes(legacyThread.id))
      assert.ok((await ids(T2)).includes(legacyThread.id))
      assert.ok(!(await ids(T2)).includes(legacyReply.id))
      assert.equal(await mark(T2,legacyThread.id),true)
      assert.equal(await mark(T2,legacyReply.id),false)
    })
    await t.test('pending students cannot read, send or mark messages; private deletion requires participation', async () => {
      assert.deepEqual(await ids(PENDING),[])
      await assert.rejects(send(PENDING),/row-level security/)
      await assert.rejects(mark(PENDING,reply.id),/Approved/)
      assert.equal((await as(T2,()=>db.query('delete from inbox_messages where id=$1 returning id',[reply.id]))).rows.length,0)
      assert.equal((await as(S,()=>db.query('delete from inbox_messages where id=$1 returning id',[reply.id]))).rows.length,0)
      const removable=await send(T,{recipient:S,role:'teacher',body:'An own sent message.'})
      assert.equal((await as(T,()=>db.query('delete from inbox_messages where id=$1 returning id',[removable.id]))).rows.length,1)
      assert.ok((await ids(S)).includes(reply.id))
    })
    await t.test('migration rerun preserves existing message bodies and private scope', async () => {
      const before=(await db.query('select * from inbox_messages order by id')).rows
      await db.exec(migration('0017_inbox_authorization.sql'))
      assert.deepEqual((await db.query('select * from inbox_messages order by id')).rows,before)
      assert.ok(!(await ids(T2)).includes(reply.id))
      assert.ok((await ids(S)).includes(reply.id))
    })
  } finally { await db.close() }
})
