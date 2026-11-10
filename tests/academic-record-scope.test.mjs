import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const T='10000000-0000-4000-8000-000000000001'
const T2='10000000-0000-4000-8000-000000000002'
const UNVERIFIED_T='10000000-0000-4000-8000-000000000003'
const S='20000000-0000-4000-8000-000000000001'
const S2='20000000-0000-4000-8000-000000000002'
const LEGACY='20000000-0000-4000-8000-000000000003'
const PENDING='20000000-0000-4000-8000-000000000004'

test('actual PostgreSQL record scope closes broad feedback/challenge policies without changing existing data',async t=>{
  const db=new PGlite()
  async function as(user,work,role='authenticated'){
    await db.exec('set role '+role)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??''])
    try{return await work()}finally{await db.exec('reset role')}
  }
  async function feedback(owner,student,message){
    return (await db.query('insert into feedback(teacher_id,student_id,message) values($1,$2,$3) returning id',[owner,student,message])).rows[0].id
  }
  async function challenge(owner,student,title,audience='student',status='active',endDate=null){
    return (await db.query('insert into weekly_challenges(teacher_id,student_id,title,audience,status,end_date) values($1,$2,$3,$4,$5,$6) returning id',[owner,student,title,audience,status,endDate])).rows[0].id
  }
  async function submission(challengeId,student,response){
    return (await db.query('insert into challenge_submissions(challenge_id,student_id,response) values($1,$2,$3) returning id',[challengeId,student,response])).rows[0].id
  }
  const visible=async(user,table,id)=>(await as(user,()=>db.query('select id from '+table+' where id=$1',[id]))).rows.length
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to authenticated,anon;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text);
      grant select on public.teachers to authenticated;
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);
      create table public.inbox_messages(id uuid primary key,recipient_id uuid,is_read boolean,read_at timestamptz,updated_at timestamptz);`)
    for(const id of [T,T2,UNVERIFIED_T,S,S2,LEGACY,PENDING])await db.query(
      "insert into auth.users values($1,$2,$3,'{}')",[id,id+'@example.invalid',id===UNVERIFIED_T?null:new Date().toISOString()])
    await db.query('insert into teachers values($1),($2),($3)',[T,T2,UNVERIFIED_T])
    // T also has a student role, exercising action-specific read/write policies.
    for(const id of [T,S,S2,LEGACY,PENDING])await db.query("insert into profiles values($1,'Private learner')",[id])
    for(const file of ['0009_academic_sync_challenges_feedback.sql','0013_hybrid_enrollment.sql'])await db.exec(
      readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2",[T,S])
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2",[T2,S2])
    await db.query("update enrollments set source='self',status='pending' where student_id=$1",[PENDING])
    const ownFeedback=await feedback(T,S,'Own teacher feedback')
    const foreignFeedback=await feedback(T2,S2,'Other private feedback')
    const foreignOwnedLegacy=await feedback(T2,LEGACY,'Another teacher owns this legacy feedback')
    const nullScopedFeedback=await feedback(null,S,'Existing null-owner scoped feedback')
    const nullLegacyFeedback=await feedback(null,LEGACY,'Existing null-owner legacy feedback')
    const dualRoleFeedback=await feedback(T2,T,'Feedback to a teacher who is also a student')
    const pendingFeedback=await feedback(T,PENDING,'Pending private feedback')
    const ownChallenge=await challenge(T,S,'Own assigned challenge')
    const foreignChallenge=await challenge(T2,S2,'Other private challenge')
    const globalChallenge=await challenge(T2,null,'Shared global challenge','all')
    const legacyPrivateChallenge=await challenge(T2,LEGACY,'Teacher two private legacy challenge')
    const nullOwnerChallenge=await challenge(null,LEGACY,'Existing student legacy challenge')
    const archivedChallenge=await challenge(T,S,'Archived challenge','student','archived')
    const expiredChallenge=await challenge(T,S,'Expired challenge','student','active','2020-01-01T00:00:00Z')
    const ownSubmission=await submission(ownChallenge,S,'Own student response')
    const foreignSubmission=await submission(foreignChallenge,S2,'Other private response')
    const globalOtherSubmission=await submission(globalChallenge,S2,'Global response owned by teacher two')
    const globalUnrelatedSubmission=await submission(globalChallenge,S,'Student allowed global response but teacher unassigned')
    const legacySubmission=await submission(legacyPrivateChallenge,LEGACY,'Legacy response to teacher two')
    const pendingSubmission=await submission(ownChallenge,PENDING,'Pending response retained for review')
    const snapshot=async()=>({
      feedback:(await db.query('select * from feedback order by id')).rows,
      challenges:(await db.query('select * from weekly_challenges order by id')).rows,
      submissions:(await db.query('select * from challenge_submissions order by id')).rows,
    })
    const original=await snapshot()
    const migration=readFileSync(new URL('../supabase/migrations/0016_academic_teacher_scope.sql',import.meta.url),'utf8')
    await db.exec(migration)
    assert.deepEqual(await snapshot(),original)

    await t.test('feedback reads require owner and enrollment; explicit null-owner legacy scope is preserved',async()=>{
      assert.equal(await visible(T,'feedback',ownFeedback),1)
      assert.equal(await visible(T,'feedback',foreignFeedback),0)
      assert.equal(await visible(T2,'feedback',ownFeedback),0)
      assert.equal(await visible(T,'feedback',foreignOwnedLegacy),0)
      assert.equal(await visible(T2,'feedback',foreignOwnedLegacy),1)
      assert.equal(await visible(T,'feedback',nullScopedFeedback),1)
      assert.equal(await visible(T2,'feedback',nullScopedFeedback),0)
      assert.equal(await visible(T,'feedback',nullLegacyFeedback),1)
      assert.equal(await visible(T2,'feedback',nullLegacyFeedback),1)
      assert.equal(await visible(S,'feedback',ownFeedback),1)
      assert.equal(await visible(S2,'feedback',ownFeedback),0)
      assert.equal(await visible(PENDING,'feedback',pendingFeedback),0)
      assert.equal((await as(UNVERIFIED_T,()=>db.query('select * from feedback'))).rows.length,0)
    })
    await t.test('feedback writes cannot spoof owners, target foreign students or create null owners',async()=>{
      await assert.rejects(as(T,()=>db.query('insert into feedback(teacher_id,student_id,message) values($1,$2,$3)',[T,S2,'Cross-student'])),/row-level security/)
      await assert.rejects(as(T,()=>db.query('insert into feedback(teacher_id,student_id,message) values($1,$2,$3)',[T2,S,'Spoofed owner'])),/row-level security/)
      await assert.rejects(as(T,()=>db.query("insert into feedback(student_id,message) values($1,'New null owner')",[S])),/row-level security/)
      await assert.rejects(as(T,()=>db.query('update feedback set teacher_id=null where id=$1',[ownFeedback])),/row-level security/)
      assert.equal((await as(T,()=>db.query("update feedback set message='Edited' where id=$1 returning id",[foreignFeedback]))).rows.length,0)
      assert.equal((await as(T,()=>db.query('delete from feedback where id=$1 returning id',[foreignFeedback]))).rows.length,0)
      await as(T,()=>db.query("update feedback set message='Updated preserved legacy row' where id=$1",[nullScopedFeedback]))
      assert.equal((await db.query('select teacher_id from feedback where id=$1',[nullScopedFeedback])).rows[0].teacher_id,null)
      await as(T,()=>db.query('update feedback set teacher_id=$1 where id=$2',[T,nullScopedFeedback]))
      await assert.rejects(as(T,()=>db.query('update feedback set teacher_id=null where id=$1',[nullScopedFeedback])),/row-level security/)
      const inserted=await as(T,()=>db.query("insert into feedback(teacher_id,student_id,message) values($1,$2,'Persisted feedback') returning id",[T,S]))
      assert.equal(inserted.rows.length,1)
    })
    await t.test('student read permission never grants a dual-role teacher update/delete rights on another owner feedback',async()=>{
      assert.equal(await visible(T,'feedback',dualRoleFeedback),1)
      assert.equal((await as(T,()=>db.query("update feedback set message='Forged review' where id=$1 returning id",[dualRoleFeedback]))).rows.length,0)
      assert.equal((await as(T,()=>db.query('delete from feedback where id=$1 returning id',[dualRoleFeedback]))).rows.length,0)
      assert.equal((await as(S,()=>db.query('delete from feedback where id=$1 returning id',[ownFeedback]))).rows.length,0)
    })
    await t.test('private challenge ownership applies to legacy students while approved students retain assigned/global reads',async()=>{
      assert.equal(await visible(T,'weekly_challenges',ownChallenge),1)
      assert.equal(await visible(T,'weekly_challenges',foreignChallenge),0)
      assert.equal(await visible(T,'weekly_challenges',legacyPrivateChallenge),0)
      assert.equal(await visible(T2,'weekly_challenges',legacyPrivateChallenge),1)
      assert.equal(await visible(LEGACY,'weekly_challenges',nullOwnerChallenge),1)
      assert.equal(await visible(S,'weekly_challenges',ownChallenge),1)
      assert.equal(await visible(S,'weekly_challenges',globalChallenge),1)
      assert.equal(await visible(S,'weekly_challenges',foreignChallenge),0)
      assert.equal((await as(PENDING,()=>db.query('select * from weekly_challenges'))).rows.length,0)
      await assert.rejects(as(T,()=>db.query("insert into weekly_challenges(teacher_id,student_id,title) values($1,$2,'Unauthorized')",[T,S2])),/row-level security/)
      await assert.rejects(as(T,()=>db.query("insert into weekly_challenges(teacher_id,student_id,title) values($1,$2,'Spoofed')",[T2,S])),/row-level security/)
      assert.equal((await as(T,()=>db.query('delete from weekly_challenges where id=$1 returning id',[foreignChallenge]))).rows.length,0)
      await as(T,()=>db.query("update weekly_challenges set title='Edited own challenge' where id=$1",[ownChallenge]))
      await assert.rejects(as(T,()=>db.query('update weekly_challenges set student_id=$1 where id=$2',[S2,ownChallenge])),/row-level security/)
    })
    await t.test('teachers see responses only for their challenge and an authorized student',async()=>{
      assert.equal(await visible(T,'challenge_submissions',ownSubmission),1)
      assert.equal(await visible(T,'challenge_submissions',foreignSubmission),0)
      assert.equal(await visible(T,'challenge_submissions',legacySubmission),0)
      assert.equal(await visible(T2,'challenge_submissions',legacySubmission),1)
      assert.equal(await visible(T2,'challenge_submissions',globalOtherSubmission),1)
      assert.equal(await visible(T2,'challenge_submissions',globalUnrelatedSubmission),0)
      assert.equal(await visible(S,'challenge_submissions',globalUnrelatedSubmission),1)
      assert.equal(await visible(PENDING,'challenge_submissions',pendingSubmission),0)
      assert.equal((await as(T2,()=>db.query("update challenge_submissions set teacher_feedback='Cross-teacher' where id=$1 returning id",[ownSubmission]))).rows.length,0)
      await as(T,()=>db.query("update challenge_submissions set teacher_feedback='Useful next step',status='reviewed' where id=$1",[ownSubmission]))
      assert.equal((await db.query('select status from challenge_submissions where id=$1',[ownSubmission])).rows[0].status,'reviewed')
      await assert.rejects(as(T,()=>db.query('update challenge_submissions set student_id=$1 where id=$2',[S2,ownSubmission])),/row-level security/)
      await assert.rejects(as(T,()=>db.query('update challenge_submissions set challenge_id=$1 where id=$2',[foreignChallenge,ownSubmission])),/row-level security/)
    })
    await t.test('student submissions require an active assigned/global challenge, own identity and unreviewed status',async()=>{
      for(const id of [foreignChallenge,legacyPrivateChallenge,archivedChallenge,expiredChallenge])await assert.rejects(
        as(S,()=>db.query("insert into challenge_submissions(challenge_id,student_id,response) values($1,$2,'Forged foreign challenge')",[id,S])),/row-level security/)
      await assert.rejects(as(S,()=>db.query("insert into challenge_submissions(challenge_id,student_id,response) values($1,$2,'Forged student')",[ownChallenge,S2])),/row-level security/)
      await assert.rejects(as(S,()=>db.query("insert into challenge_submissions(challenge_id,student_id,response,status) values($1,$2,'Forged completion','completed')",[ownChallenge,S])),/row-level security/)
      await assert.rejects(as(S,()=>db.query("insert into challenge_submissions(challenge_id,student_id,response,teacher_feedback) values($1,$2,'Forged feedback','Perfect')",[ownChallenge,S])),/row-level security/)
      for(const id of [ownChallenge,globalChallenge]){
        const saved=await as(S,()=>db.query("insert into challenge_submissions(challenge_id,student_id,response) values($1,$2,'Real student response') returning id",[id,S]))
        assert.equal(saved.rows.length,1)
      }
      assert.equal((await as(S,()=>db.query("update challenge_submissions set teacher_feedback='Forged review' where id=$1 returning id",[ownSubmission]))).rows.length,0)
    })
    await t.test('suspension, anonymous requests and migration replay preserve the boundary',async()=>{
      await db.query("update enrollments set status='suspended' where student_id=$1",[S])
      assert.equal(await visible(T,'feedback',ownFeedback),0)
      assert.equal(await visible(T,'weekly_challenges',ownChallenge),0)
      assert.equal(await visible(T,'challenge_submissions',ownSubmission),0)
      assert.equal(await visible(S,'feedback',ownFeedback),0)
      await db.query("update enrollments set status='approved' where student_id=$1",[S])
      for(const table of ['feedback','weekly_challenges','challenge_submissions'])await assert.rejects(
        as(null,()=>db.query('select * from '+table),'anon'),/permission denied/)
      const beforeReplay=await snapshot()
      await db.exec(migration)
      assert.deepEqual(await snapshot(),beforeReplay)
      assert.equal(await visible(T,'feedback',foreignFeedback),0)
    })
  }finally{await db.close()}
})
