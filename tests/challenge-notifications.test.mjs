import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { publishChallenge, submitAcademicChallenge, reviewChallengeSubmission } from '../src/lib/academicChallenges.js'
import { markNotificationRead, unreadNotificationCount } from '../src/lib/notifications.js'
import { renderNotifications } from '../src/components/notifications.js'

test('challenge and notification clients require confirmed records and render private text safely', async () => {
  const missing = { rpc: async () => ({ data: {} }) }
  await assert.rejects(publishChallenge(missing, { draftId: 'draft', studentIds: ['student'], requestId: 'request' }), /confirmed/)
  await assert.rejects(submitAcademicChallenge(missing, { challengeId: 'challenge', response: 'My response', requestId: 'request' }), /not confirmed/)
  await assert.rejects(reviewChallengeSubmission(missing, { submissionId: 'response', feedback: 'Personalize it.', release: true }), /confirmed/)
  await assert.rejects(markNotificationRead(missing, 'notice'), /not confirmed/)
  assert.equal(unreadNotificationCount([{ read_at: null }, { read_at: '2026-11-08' }]), 1)
  assert.match(renderNotifications([{ id: 'notice', title: '<script>', body: '<private>', created_at: '2026-11-08' }]), /&lt;script&gt;/)
})

const T = '10000000-0000-4000-8000-000000000001'
const T2 = '10000000-0000-4000-8000-000000000002'
const S = '20000000-0000-4000-8000-000000000001'
const S2 = '20000000-0000-4000-8000-000000000002'
const OUT = '20000000-0000-4000-8000-000000000003'
const PENDING = '20000000-0000-4000-8000-000000000004'
const content = () => ({ title: 'A real conversation', objective: 'Use expressions to make a real plan.', language: 'English', level: 'A2', steps: ['Listen', 'Repeat', 'Personalize', 'Use'].map(stage => ({ stage, activity: stage + ' a practical expression.' })), exercise_type: null, questions: [], feedback: null })
const migration = name => readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8')

test('actual challenge publication, feedback approval and transactional academic notifications', async t => {
  const db = new PGlite()
  async function as(user, work) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user])
    try { return await work() } finally { await db.exec('reset role') }
  }
  async function rpc(user, name, args = []) {
    return (await as(user, () => db.query('select ' + name + '(' + args.map((_, i) => '$' + (i + 1)).join(',') + ') result', args))).rows[0].result
  }
  async function draft() {
    const request = (await db.query("insert into academic_ai_requests(teacher_id,student_id,kind,status) values($1,$2,'challenge','succeeded') returning id", [T, S])).rows[0].id
    return (await db.query("insert into ai_academic_drafts(request_id,teacher_id,student_id,kind,content) values($1,$2,$3,'challenge',$4) returning id", [request, T, S, content()])).rows[0].id
  }
  const uuid = () => crypto.randomUUID()
  const notices = async (user, kind = null) => (await as(user, () => db.query('select * from academic_notifications' + (kind ? ' where kind=$1' : '') + ' order by created_at', kind ? [kind] : []))).rows
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      grant usage on schema public,auth,storage to authenticated,anon;
      grant select on public.teachers,public.profiles to authenticated;`)
    for (const id of [T, T2, S, S2, OUT, PENDING]) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, id + '@example.invalid'])
    await db.query('insert into teachers values($1),($2)', [T, T2])
    for (const id of [S, S2, OUT, PENDING]) await db.query("insert into profiles(id,name) values($1,'Student')", [id])
    for (const name of ['0008_teacher_management_security_patch.sql', '0004_exercise_studio.sql', '0009_academic_sync_challenges_feedback.sql', '0010_inbox_messaging.sql', '0012_exercise_workflow.sql', '0013_hybrid_enrollment.sql', '0014_ai_drafts.sql', '0016_academic_teacher_scope.sql', '0017_inbox_authorization.sql', '0018_student_attachments.sql', '0020_challenges_notifications.sql', '0021_final_assessments.sql']) await db.exec(migration(name))
    await db.exec('grant select,insert,update,delete on classes,class_participants to authenticated')
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id in($2,$3)", [T, S, S2])
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2", [T2, OUT])
    await db.query("update enrollments set source='self',status='pending' where student_id=$1", [PENDING])
    const draftId = await draft(), requestId = uuid()
    let published, challengeId, submissionId

    await t.test('unapproved or out-of-scope recommendations cannot publish and a failed group leaves no notifications', async () => {
      await assert.rejects(rpc(T, 'publish_academic_challenge', [draftId, [S], null, 10, requestId]), /approved/)
      await rpc(T, 'review_academic_ai_draft', [draftId, content(), 'approved'])
      await assert.rejects(rpc(T2, 'publish_academic_challenge', [draftId, [OUT], null, 10, uuid()]), /approved/)
      await assert.rejects(rpc(T, 'publish_academic_challenge', [draftId, [S, OUT], null, 10, uuid()]), /Student access denied/)
      await assert.rejects(rpc(T, 'publish_academic_challenge', [draftId, [S, PENDING], null, 10, uuid()]), /Student access denied/)
      assert.equal((await db.query('select count(*)::int n from weekly_challenges')).rows[0].n, 0)
      assert.equal((await db.query('select count(*)::int n from academic_notifications')).rows[0].n, 0)
    })
    await t.test('approved group publication stores individual assignments exactly once with the reviewed content', async () => {
      published = await rpc(T, 'publish_academic_challenge', [draftId, [S2, S, S], null, 10, requestId])
      assert.equal(published.assignment_count, 2)
      assert.equal(published.challenge_ids.length, 2)
      assert.deepEqual(await rpc(T, 'publish_academic_challenge', [draftId, [S, S2], null, 10, requestId]), published)
      assert.deepEqual(await rpc(T, 'publish_academic_challenge', [draftId, [S, S2], null, 10, uuid()]), published)
      await assert.rejects(rpc(T, 'publish_academic_challenge', [draftId, [S], null, 10, requestId]), /already used/)
      const own = (await as(S, () => db.query('select * from weekly_challenges'))).rows
      assert.equal(own.length, 1); challengeId = own[0].id
      assert.match(own[0].instructions, /^Listen:.*\nRepeat:.*\nPersonalize:.*\nUse:/)
      assert.equal((await as(OUT, () => db.query('select * from weekly_challenges'))).rows.length, 0)
      assert.equal((await notices(S, 'challenge_assigned')).length, 1)
      assert.equal((await notices(S2, 'challenge_assigned')).length, 1)
      await assert.rejects(as(T, () => db.query("update weekly_challenges set instructions='Unreviewed edit' where id=$1", [challengeId])), /reviewed recommendation/)
    })
    await t.test('student response is authorized, idempotent and bound to a snapshot', async () => {
      const id = uuid(), response = 'I used the expression to invite a colleague.'
      await assert.rejects(rpc(OUT, 'submit_academic_challenge', [challengeId, response, uuid()]), /unavailable/)
      await assert.rejects(as(S, () => db.query('insert into challenge_submissions(challenge_id,student_id,response) values($1,$2,$3)', [challengeId, S, response])), /permission denied/)
      const saved = await rpc(S, 'submit_academic_challenge', [challengeId, response, id]); submissionId = saved.id
      assert.deepEqual(await rpc(S, 'submit_academic_challenge', [challengeId, response, id]), saved)
      await assert.rejects(rpc(S, 'submit_academic_challenge', [challengeId, 'Changed response', id]), /different response/)
      await assert.rejects(rpc(S, 'submit_academic_challenge', [challengeId, response, uuid()]), /already been submitted/)
      const stored = (await as(T, () => db.query('select * from challenge_submissions where id=$1', [submissionId]))).rows[0]
      assert.equal(stored.challenge_snapshot.title, content().title)
      assert.equal((await notices(T, 'challenge_submitted')).length, 1)
      assert.equal((await notices(T, 'challenge_submitted'))[0].target_view, 'challenges')
      assert.equal((await notices(T2, 'challenge_submitted')).length, 0)
      const nullOwner = (await db.query("insert into weekly_challenges(title,student_id,audience,status) values('Unassigned private',null,'student','active') returning id")).rows[0].id
      await assert.rejects(rpc(S, 'submit_academic_challenge', [nullOwner, response, uuid()]), /unavailable/)
    })
    await t.test('feedback drafts stay private and notifications appear only after teacher release', async () => {
      await assert.rejects(rpc(T2, 'review_challenge_submission', [submissionId, 'Spoofed feedback', true]), /access denied/)
      await rpc(T, 'review_challenge_submission', [submissionId, 'PRIVATE DRAFT', false])
      assert.equal((await as(S, () => db.query('select * from challenge_submissions'))).rows.length, 0)
      assert.equal((await as(S, () => db.query('select * from student_challenge_submissions'))).rows[0].teacher_feedback, null)
      assert.equal((await notices(S, 'challenge_feedback')).length, 0)
      await rpc(T, 'review_challenge_submission', [submissionId, 'Try using a personal example next time.', true])
      await rpc(T, 'review_challenge_submission', [submissionId, 'Try using a personal example next time.', true])
      assert.equal((await notices(S, 'challenge_feedback')).length, 1)
      assert.match((await as(S, () => db.query('select * from student_challenge_submissions'))).rows[0].teacher_feedback, /personal example/)
    })
    await t.test('exercise delivery, submission and published feedback generate transactional notifications without duplicates', async () => {
      const exercise = (await as(T, () => db.query("insert into exercises(teacher_id,title,language,exercise_type,questions) values($1,'Greeting','English','open_question',$2) returning id", [T, [{ prompt: 'Personalize your greeting.' }]]))).rows[0].id
      await rpc(T, 'publish_exercise', [exercise, [S], null]); await rpc(T, 'publish_exercise', [exercise, [S], null])
      assert.equal((await notices(S, 'exercise_assigned')).length, 1)
      const assignment = (await db.query('select id from exercise_assignments where exercise_id=$1', [exercise])).rows[0].id
      const attempt = await rpc(S, 'submit_exercise', [assignment, [{ index: 0, answer: 'Hello, how are you?' }], uuid()])
      assert.equal((await notices(T, 'exercise_submitted')).length, 1)
      assert.equal((await notices(T, 'exercise_submitted'))[0].target_view, 'exercises')
      await rpc(T, 'review_exercise_attempt', [attempt.id, 'Unpublished draft.', false])
      assert.equal((await notices(S, 'exercise_feedback')).length, 0)
      await rpc(T, 'review_exercise_attempt', [attempt.id, 'Great personal example.', true])
      await rpc(T, 'review_exercise_attempt', [attempt.id, 'Great personal example.', true])
      assert.equal((await notices(S, 'exercise_feedback')).length, 1)
    })
    await t.test('calendar enrollment and actual schedule changes notify assigned students only', async () => {
      const session = (await as(T, () => db.query("insert into classes(teacher_id,title,starts_at,status) values($1,'Speaking practice',now()+interval '1 day','scheduled') returning id", [T]))).rows[0].id
      await as(T, () => db.query('insert into class_participants(class_id,teacher_id,student_id) values($1,$2,$3)', [session, T, S]))
      assert.equal((await notices(S, 'calendar_scheduled')).length, 1)
      await as(T, () => db.query("update classes set starts_at=starts_at+interval '1 hour' where id=$1", [session]))
      await as(T, () => db.query('update classes set title=title where id=$1', [session]))
      assert.equal((await notices(S, 'calendar_changed')).length, 1)
      assert.equal((await notices(OUT, 'calendar_changed')).length, 0)
    })
    await t.test('Inbox notifications follow assigned own-thread and addressed recipient privacy', async () => {
      await as(S, () => db.query("insert into inbox_messages(sender_id,sender_role,recipient_id,subject,body) values($1,'student',$1,'Question','Can we practice this expression?')", [S]))
      assert.equal((await notices(T, 'inbox_message')).length, 1)
      assert.equal((await notices(T2, 'inbox_message')).length, 0)
      await as(T, () => db.query("insert into inbox_messages(sender_id,sender_role,recipient_id,subject,body) values($1,'teacher',$2,'Reply','Yes, personalize it for a colleague.')", [T, S]))
      assert.equal((await notices(S, 'inbox_message')).length, 1)
    })
    await t.test('actual Finals integration notifies only a published evaluation with duplicate-safe retries', async () => {
      const draft = { title: 'Final conversation', language: 'English', instructions: 'Personalize an expression for a real conversation.', exercise_type: 'open_question', questions: [{ prompt: 'Invite a colleague to lunch.' }], attachment_mode: 'none' }
      const final = await rpc(T, 'save_final_draft', [null, draft, [{ label: 'Communication', max_points: 100 }], [], uuid()])
      await rpc(T, 'publish_final_assessment', [final.id, [S], null])
      const assignment = (await db.query('select id from exercise_assignments where exercise_id=$1', [final.exercise_id])).rows[0].id
      const finalNotice = (await notices(S, 'exercise_assigned')).find(n => n.entity_id === assignment)
      assert.equal(finalNotice.target_view, 'finals')
      const attempt = await rpc(S, 'submit_exercise', [assignment, [{ index: 0, answer: 'Would you like to have lunch together?' }], uuid()])
      const reviewNotice = (await notices(T, 'exercise_submitted')).find(n => n.entity_id === attempt.id)
      assert.equal(reviewNotice.target_view, 'finals')
      const grade = await rpc(T, 'save_final_result', [attempt.id, [85], 'Clear invitation with a personal purpose.', uuid()])
      assert.equal((await notices(S, 'final_result')).length, 0)
      await rpc(T, 'publish_final_result', [grade.id]); await rpc(T, 'publish_final_result', [grade.id])
      const saved = await notices(S, 'final_result')
      assert.equal(saved.length, 1); assert.equal(saved[0].target_view, 'finals'); assert.equal(saved[0].entity_id, grade.id)
      assert.equal((await notices(S2, 'final_result')).length, 0)
    })
    await t.test('notification writes are server-only, read receipts are recipient-only and pending accounts see nothing', async () => {
      const own = (await notices(S))[0]
      await assert.rejects(as(S, () => db.query("insert into academic_notifications(recipient_id,kind,entity_id,target_view,title,event_key) values($1,'forged',$2,'challenges','Forged','forged')", [S, uuid()])), /permission denied/)
      await assert.rejects(as(T, () => db.query("select _add_academic_notification($1,'forged',$2,'challenges','Forged','','forged')", [S, uuid()])), /permission denied/)
      await assert.rejects(rpc(S2, 'mark_academic_notification_read', [own.id]), /unavailable/)
      const receipt = await rpc(S, 'mark_academic_notification_read', [own.id])
      assert.ok(receipt.read_at)
      assert.deepEqual(await rpc(S, 'mark_academic_notification_read', [own.id]), receipt)
      assert.equal((await notices(PENDING)).length, 0)
    })
  } finally { await db.close() }
})
