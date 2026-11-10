import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { readEnrollmentAccess, acceptPendingInvitation, createStudentInvitation, reviewEnrollment, captureEnrollmentInvitation, invitationRegistrationUrl } from '../src/lib/enrollment.js'

const token = 'a'.repeat(64)
const mock = (result, user = { id: 'student', user_metadata: { role: 'admin' } }) => ({
  auth: { getUser: async () => ({ data: { user } }) },
  rpc: async () => result
})
const approved = { student_id: 'student', role: 'student', status: 'approved', email_verified: true, academic_access: true }

test('enrollment client fails closed on missing RPC, identity mismatch and unverified email', async () => {
  assert.deepEqual(await readEnrollmentAccess(mock({ data: approved })), approved)
  for (const data of [null, { ...approved, student_id: 'someone-else' }, { ...approved, academic_access: undefined }]) {
    await assert.rejects(readEnrollmentAccess(mock({ data })), /Enrollment|enrollment/)
  }
  await assert.rejects(readEnrollmentAccess(mock({ error: { message: 'Migration missing' } })), /Migration missing/)
  await assert.rejects(readEnrollmentAccess(mock({}, null)), /session/)
  assert.equal((await readEnrollmentAccess(mock({ data: { ...approved, email_verified: false } }))).academic_access, false)
})

test('enrollment writes require confirmed persistence and never clear an unsuccessful invitation', async () => {
  let removed = false
  const storage = { removeItem() { removed = true } }
  await assert.rejects(acceptPendingInvitation(mock({ error: { message: 'Wrong email' } }), token, storage), /Wrong email/)
  assert.equal(removed, false)
  await acceptPendingInvitation(mock({ data: approved }), token, storage)
  assert.equal(removed, true)
  await assert.rejects(createStudentInvitation(mock({ data: {} }), 'student@example.com'), /confirmed/)
  await assert.rejects(reviewEnrollment(mock({ data: {} }), 'student', true), /teacher/)
  await assert.rejects(reviewEnrollment(mock({ data: { student_id: 'student', status: 'pending' } }), 'student', true, 'teacher'), /confirmed/)
})

test('private invitation capture removes URL token and preserves it for email confirmation', () => {
  const saved = new Map()
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) }
  let cleaned
  const href = invitationRegistrationUrl('https://veraorbis.studio', token)
  assert.equal(new URL(href).search, '')
  assert.equal(captureEnrollmentInvitation({ href }, storage, { replaceState: (_, __, value) => { cleaned = value } }), token)
  assert.equal(new URL(cleaned).hash, '')
  assert.equal(captureEnrollmentInvitation({ href: cleaned }, storage, {}), token)
  assert.throws(() => invitationRegistrationUrl('http://example.com', token), /HTTPS/)
  assert.throws(() => captureEnrollmentInvitation({ href: 'https://example.com/?invitation=bad' }, storage), /Invalid/)
})

const T = '10000000-0000-4000-8000-000000000001'
const T2 = '10000000-0000-4000-8000-000000000002'
const ADMIN = '10000000-0000-4000-8000-000000000003'
const LEGACY = '20000000-0000-4000-8000-000000000001'
const SELF = '20000000-0000-4000-8000-000000000002'
const INVITED = '20000000-0000-4000-8000-000000000003'
const UNVERIFIED = '20000000-0000-4000-8000-000000000004'

test('actual PostgreSQL hybrid enrollment: migration order, pending denial, admin approval and secure invitations', async t => {
  const db = new PGlite()
  async function as(user, work) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user])
    try { return await work() } finally { await db.exec('reset role') }
  }
  async function rpc(user, name, args = []) {
    return (await as(user, () => db.query('select ' + name + '(' + args.map((_, i) => '$' + (i + 1)).join(',') + ') result', args))).rows[0].result
  }
  async function addUser(id, email, verified = true) {
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)", [id, email, verified ? new Date().toISOString() : null, { name: 'Applicant', role: 'admin', enrollment_status: 'approved' }])
  }
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to authenticated,anon;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text,language text,level text,level_name text,progress int,lessons_completed int,current_module text,next_step text,interface_language text);
      alter table public.profiles enable row level security;
      create policy "baseline own profile and staff read" on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.teachers where id=auth.uid()));
      grant select on public.teachers,public.profiles to authenticated;
      grant insert,update,delete on public.teachers to authenticated;
      create table public.materials(id uuid primary key default gen_random_uuid(),student_id uuid,title text,audience text);
      alter table public.materials enable row level security;
      create policy "baseline assigned materials" on public.materials for select to authenticated using(student_id=auth.uid() or audience='all');
      grant select on public.materials to authenticated,anon;
      create table public.inbox_messages(id uuid primary key,recipient_id uuid,is_read boolean,read_at timestamptz,updated_at timestamptz);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create policy "baseline storage read" on storage.objects for select to authenticated using(bucket_id='materials');
      grant select on storage.objects to authenticated;
      insert into public.materials(title,audience) values('Private academic resource','all');
      insert into storage.objects(bucket_id,name) values('materials','lesson.pdf');
      create view public.student_payment_summary as select id,student_id,title from public.materials;
      grant select on public.student_payment_summary to authenticated,anon;`)
    for (const [id, email] of [[T, 'teacher@example.com'], [T2, 'other-teacher@example.com'], [ADMIN, 'admin@example.com'], [LEGACY, 'legacy@example.com']]) await addUser(id, email)
    await db.query('insert into teachers values($1),($2)', [T, T2])
    await db.query("insert into profiles(id,name,progress) values($1,'Legacy student',73)", [LEGACY])
    for (const migration of ['0004_exercise_studio.sql', '0012_exercise_workflow.sql', '0013_hybrid_enrollment.sql']) {
      await db.exec(readFileSync(new URL('../supabase/migrations/' + migration, import.meta.url), 'utf8'))
    }
    await db.query('insert into academic_admins(user_id) values($1)', [ADMIN])
    await addUser(SELF, 'self@example.com')
    await addUser(INVITED, 'invited@example.com')
    await addUser(UNVERIFIED, 'unverified@example.com', false)

    await t.test('legacy enrollment preserves existing data; user metadata cannot approve new registrations', async () => {
      assert.equal((await rpc(LEGACY, 'get_my_enrollment')).academic_access, true)
      assert.equal((await db.query('select progress from profiles where id=$1', [LEGACY])).rows[0].progress, 73)
      const access = await rpc(SELF, 'get_my_enrollment')
      assert.equal(access.status, 'pending')
      assert.equal(access.role, 'student')
      assert.equal(access.academic_access, false)
      assert.equal((await rpc(ADMIN, 'get_my_enrollment')).role, 'admin')
      await assert.rejects(as(SELF, () => db.query("update enrollments set status='approved' where student_id=$1", [SELF])), /permission denied/)
      await assert.rejects(as(SELF, () => db.query('insert into academic_admins(user_id) values($1)', [SELF])), /permission denied/)
      await assert.rejects(as(SELF, () => db.query('insert into teachers values($1)', [SELF])), /permission denied/)
    })

    await t.test('pending account cannot read shared academic tables, owner views, storage or private teacher data', async () => {
      for (const table of ['materials', 'student_payment_summary', 'storage.objects']) {
        assert.equal((await as(SELF, () => db.query('select * from ' + table))).rows.length, 0, table)
        assert.equal((await as(LEGACY, () => db.query('select * from ' + table))).rows.length, 1, table)
      }
      assert.equal((await as(SELF, () => db.query('select * from profiles'))).rows.length, 0)
      await db.exec('set role anon')
      try { await assert.rejects(db.query('select * from materials'), /permission denied/) }
      finally { await db.exec('reset role') }
    })

    await t.test('administrator approval requires confirmed email and an assigned trusted teacher', async () => {
      await assert.rejects(rpc(T, 'list_pending_enrollments'), /Administrator/)
      const rows = await as(ADMIN, () => db.query('select * from list_pending_enrollments()'))
      assert.ok(rows.rows.some(row => row.student_id === SELF))
      assert.equal((await as(ADMIN, () => db.query('select * from list_enrollment_teachers()'))).rows.length, 2)
      await assert.rejects(rpc(ADMIN, 'review_student_enrollment', [UNVERIFIED, true, T]), /verify/)
      await assert.rejects(rpc(ADMIN, 'review_student_enrollment', [SELF, true, null]), /Assign/)
      const approved = await rpc(ADMIN, 'review_student_enrollment', [SELF, true, T])
      assert.equal(approved.status, 'approved')
      assert.equal((await rpc(SELF, 'get_my_enrollment')).academic_access, true)
      assert.equal(await rpc(T, 'can_teacher_access_student', [T, SELF]), true)
      assert.equal(await rpc(T2, 'can_teacher_access_student', [T2, SELF]), false)
      await assert.rejects(rpc(ADMIN, 'review_student_enrollment', [SELF, true, T]), /Pending enrollment not found/)
    })

    let invitation
    await t.test('teacher invitation stores a digest and rejects a different or unverified email', async () => {
      await assert.rejects(rpc(INVITED, 'create_student_invitation', ['invited@example.com']), /teacher/)
      invitation = await rpc(T, 'create_student_invitation', ['Invited@Example.com'])
      assert.match(invitation.token, /^[a-f0-9]{64}$/)
      const stored = (await db.query('select token_hash from enrollment_invitations where id=$1', [invitation.id])).rows[0]
      assert.notEqual(stored.token_hash, invitation.token)
      await assert.rejects(rpc(UNVERIFIED, 'accept_student_invitation', [invitation.token]), /Verify/)
      await assert.rejects(rpc(SELF, 'accept_student_invitation', [invitation.token]), /email/)
      assert.equal((await rpc(INVITED, 'get_my_enrollment')).status, 'pending')
    })

    await t.test('matching verified invitation is approved once and retry is idempotent', async () => {
      const result = await rpc(INVITED, 'accept_student_invitation', [invitation.token])
      assert.equal(result.academic_access, true)
      assert.equal((await rpc(INVITED, 'accept_student_invitation', [invitation.token])).academic_access, true)
      assert.equal((await db.query('select source,teacher_id from enrollments where student_id=$1', [INVITED])).rows[0].source, 'invitation')
      assert.equal((await as(INVITED, () => db.query('select * from materials'))).rows.length, 1)
      await rpc(INVITED, 'initialize_student_profile')
      assert.equal((await as(T, () => db.query('select id from profiles where id=$1', [INVITED]))).rows.length, 1)
      assert.equal((await as(T2, () => db.query('select id from profiles where id=$1', [INVITED]))).rows.length, 0)
    })

    await t.test('expired tokens and suspended accounts cannot regain access through an invitation replay', async () => {
      const expiry = await rpc(T, 'create_student_invitation', ['unverified@example.com'])
      await db.query("update enrollment_invitations set expires_at=now()-interval '1 second' where id=$1", [expiry.id])
      await db.query('update auth.users set email_confirmed_at=now() where id=$1', [UNVERIFIED])
      await assert.rejects(rpc(UNVERIFIED, 'accept_student_invitation', [expiry.token]), /expired/)
      await db.query("update enrollments set status='suspended' where student_id=$1", [INVITED])
      assert.equal((await rpc(INVITED, 'accept_student_invitation', [invitation.token])).academic_access, false)
      assert.equal((await as(INVITED, () => db.query('select * from storage.objects'))).rows.length, 0)
      await assert.rejects(rpc(INVITED, 'mark_inbox_message_as_read', ['50000000-0000-4000-8000-000000000001']), /Approved/)
    })
  } finally { await db.close() }
})
