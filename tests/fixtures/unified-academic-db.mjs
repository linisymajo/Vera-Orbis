import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
export const T = '10000000-0000-4000-8000-000000000001', T2 = '10000000-0000-4000-8000-000000000002', S = '20000000-0000-4000-8000-000000000001', S2 = '20000000-0000-4000-8000-000000000002'
export async function unifiedAcademicFixture() {
  const db = new PGlite()
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth,storage to authenticated,anon;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,updated_at timestamptz default now(),unique(bucket_id,name));`)
  await db.exec(await readFile(new URL('../../supabase/staging/initial_application_schema.sql', import.meta.url), 'utf8'))
  for (const f of ['0002_teacher_operations.sql', '0004_exercise_studio.sql', '0009_academic_sync_challenges_feedback.sql', '0010_inbox_messaging.sql', '0012_exercise_workflow.sql', '0013_hybrid_enrollment.sql', '0014_ai_drafts.sql', '0019_learning_plans.sql', '0020_challenges_notifications.sql', '0022_exercise_experience.sql', '0023_legacy_exercise_feedback.sql', '0025_learning_architect.sql', '0026_learning_architect_twelve_classes.sql', '0028_unified_academic_context.sql']) await db.exec(await readFile(new URL('../../supabase/migrations/' + f, import.meta.url), 'utf8'))
  for (const id of [T, T2, S, S2]) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, 'synthetic@example.test'])
  for (const id of [T, T2, S, S2]) await db.query("insert into profiles(id,name) values($1,'Synthetic fixture') on conflict(id) do nothing", [id])
  await db.query('insert into teachers(id) values($1),($2)', [T, T2])
  await db.query("insert into enrollments(student_id,teacher_id,status,source) values($1,$2,'approved','self'),($3,$4,'approved','self') on conflict(student_id) do update set teacher_id=excluded.teacher_id,status=excluded.status", [S, T, S2, T2])
  await db.query("update enrollments set teacher_id=case when student_id=$1 then $2::uuid else $3::uuid end,status='approved',source='self' where student_id in($1,$4)", [S, T, T2, S2])
  await db.query("update profiles set language='English',level='B1',goal='Prepare for practical travel conversations',total_lessons=12,lessons_completed=5 where id=$1", [S])
  const as = async (actor, fn) => db.transaction(async tx => { await tx.exec('set local role authenticated'); await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]); return fn(tx) })
  const rpc = async (actor, name, params = {}) => as(actor, async tx => (await tx.query('select public.' + name + '(' + Object.keys(params).map((k, i) => k + '=>$' + (i + 1)).join(',') + ') result', Object.values(params))).rows[0].result)
  await rpc(S, 'set_academic_ai_consent', { p_allowed: true })
  const client = actor => ({ rpc: async (name, params) => { try { return { data: await rpc(actor, name, params) } } catch (error) { return { error: { code: error.code, message: error.message } } } }, from: table => ({ select: () => { const filters = []; const chain = { eq(k, v) { filters.push([k, v]); return chain }, async single() { if (table !== 'learning_plan_versions') throw Error('Fixture query unavailable'); return { data: await as(actor, async tx => (await tx.query('select * from public.learning_plan_versions where ' + filters.map(([k], i) => k + '=$' + (i + 1)).join(' and '), filters.map(([, v]) => v))).rows[0]) } } }; return chain } }) })
  return { db, as, rpc, client }
}
