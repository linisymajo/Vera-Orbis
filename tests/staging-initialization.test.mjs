import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { buildStagingInitializationPlan, initializationFiles } from '../scripts/staging-initialization-plan.mjs'

const teacher = '10000000-0000-4000-8000-000000000081'
const otherTeacher = '10000000-0000-4000-8000-000000000082'
const admin = '10000000-0000-4000-8000-000000000083'
const student = '20000000-0000-4000-8000-000000000081'
const unrelated = '20000000-0000-4000-8000-000000000082'
const unverified = '20000000-0000-4000-8000-000000000083'

async function managedFixture(db) {
  // Disposable PostgreSQL stand-ins for Supabase-managed services only. These
  // objects are never included in the proposed staging application SQL.
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth,storage to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant select on storage.buckets to authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;`)
}

test('initialization proposal identifies the exact new baseline and excludes corrective/template SQL', async () => {
  const plan = await buildStagingInitializationPlan()
  assert.equal(plan.entries.length, 22)
  assert.equal(plan.entries.filter(row => row.migration_version).length, 19)
  assert.equal(plan.entries[0].file, initializationFiles[0])
  assert.equal(plan.entries.at(-1).file, 'supabase/staging/application_access.sql')
  assert.equal(plan.target.project_ref, 'duinvkphfnugoyvvlbbq')
  assert.equal(plan.migrations_approved, false)
  assert.equal(plan.ready_to_apply, false)
  assert.match(plan.plan_sha256, /^[a-f0-9]{64}$/)
  assert.ok(plan.entries.every(row => !/0001_|0003_/.test(row.file)))
  assert.equal(plan.entries.filter(row => row.migration_version >= '0011').length, 11)
  const activation = await readFile(new URL('../supabase/staging/application_access.sql', import.meta.url), 'utf8')
  const expected = JSON.parse(activation.match(/v_expected constant jsonb := '([^']+)'::jsonb/)[1])
  assert.deepEqual(expected, plan.entries.filter(row => row.migration_version).map(row => ({
    version: row.migration_version, name: row.migration_name,
    sha256: row.migration_version >= '0011' ? row.sha256 : null
  })), 'the static activation allowlist must match the current reviewed plan and release hashes')
  assert.equal(plan.plan_sha256, '46a4d771b5113fc284a13bea495379f0d375d29b25edc14398aa62dc078f69f0', 'the user-approved 22-file payload must remain frozen')
  const supplement = await readFile(new URL('../supabase/staging/client_privilege_hardening.sql', import.meta.url), 'utf8')
  const approvedFiles = JSON.parse(supplement.match(/v_expected constant jsonb := '([^']+)'::jsonb/)[1])
  assert.deepEqual(approvedFiles, plan.entries.map(row => ({ file: row.file, sha256: row.sha256, version: row.migration_version, name: row.migration_name })))
})

test('initial baseline refuses existing application objects, history, target buckets or incomplete managed services without changing them', async t => {
  const db = new PGlite()
  const baseline = await readFile(new URL('../supabase/staging/initial_application_schema.sql', import.meta.url), 'utf8')
  const cases = [
    { name: 'view', setup: 'create view public.guard_existing_view as select 17 value', cleanup: 'drop view public.guard_existing_view', check: 'select value from public.guard_existing_view', value: 17, error: /empty public/ },
    { name: 'function', setup: 'create function public.guard_existing_function() returns int language sql as $$select 17$$', cleanup: 'drop function public.guard_existing_function()', check: 'select public.guard_existing_function() value', value: 17, error: /empty public/ },
    { name: 'sequence', setup: 'create sequence public.guard_existing_sequence start 17', cleanup: 'drop sequence public.guard_existing_sequence', check: 'select last_value value from public.guard_existing_sequence', value: 17, error: /empty public/ },
    { name: 'marker', setup: 'create table public.vera_staging_environment(value int); insert into public.vera_staging_environment values(17)', cleanup: 'drop table public.vera_staging_environment', check: 'select value from public.vera_staging_environment', value: 17, error: /empty public|markers/ },
    { name: 'history', setup: "create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text); insert into supabase_migrations.schema_migrations values('preexisting-unreviewed-state')", cleanup: 'drop table supabase_migrations.schema_migrations; drop schema supabase_migrations', check: 'select version value from supabase_migrations.schema_migrations', value: 'preexisting-unreviewed-state', error: /existing migration history/ },
    ...['materials', 'academic-submissions'].map(bucket => ({ name: bucket, setup: `insert into storage.buckets(id,public,file_size_limit) values('${bucket}',false,17)`, cleanup: `delete from storage.buckets where id='${bucket}'`, check: `select file_size_limit value from storage.buckets where id='${bucket}'`, value: 17, error: /absent academic storage buckets/ })),
    { name: 'managed bucket catalog missing', setup: 'alter table storage.buckets rename to guard_saved_buckets', cleanup: 'alter table storage.guard_saved_buckets rename to buckets', error: /Managed Supabase/ }
  ]
  try {
    await managedFixture(db)
    for (const scenario of cases) await t.test(scenario.name, async () => {
      await db.exec(scenario.setup)
      await assert.rejects(db.exec(baseline), scenario.error)
      await db.exec('rollback')
      assert.equal((await db.query("select to_regclass('public.teachers') present")).rows[0].present, null)
      if (scenario.check) assert.equal((await db.query(scenario.check)).rows[0].value, scenario.value)
      await db.exec(scenario.cleanup)
    })
    await db.exec(baseline)
    assert.equal((await db.query("select to_regclass('public.teachers')::text present")).rows[0].present, 'teachers')
  } finally { await db.close() }
})

test('actual complete PostgreSQL initialization preserves enrollment and scoped academic permissions', async t => {
  const db = new PGlite()
  async function as(id, work) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    try { return await work() } finally { await db.exec('reset role') }
  }
  async function rpc(id, name, args = []) {
    return (await as(id, () => db.query(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) result`, args))).rows[0].result
  }
  try {
    await managedFixture(db)
    const plan = await buildStagingInitializationPlan()
    for (const entry of plan.entries) {
      const sql = await readFile(new URL('../' + entry.file, import.meta.url), 'utf8')
      if (entry.file === 'supabase/staging/application_access.sql') {
        // Each preceding file has actually executed. Deliberately corrupt only
        // disposable fixture evidence inside a rollback-only test transaction.
        const activationBody = sql.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '')
        const profileGrants = async () => (await db.query("select grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='profiles' order by grantee,privilege_type")).rows
        const grantsBeforeActivation = await profileGrants()
        const mutations = [
          ...['0015','0016','0017'].map(version => ({ name: `missing security version ${version}`, sql: `delete from supabase_migrations.schema_migrations where version='${version}'`, error: /19 migration versions and names/ })),
          { name: 'wrong migration name', sql: "update supabase_migrations.schema_migrations set name='unreviewed' where version='0016'", error: /19 migration versions and names/ },
          { name: 'unexpected history entry', sql: "insert into supabase_migrations.schema_migrations(version,name) values('0003','intentionally_invalid_fixture_evidence')", error: /19 migration versions and names/ },
          { name: 'missing release checksum', sql: "delete from vera_staging_migration_checksums where version='0015'", error: /11 release checksums/ },
          { name: 'tampered release checksum', sql: "update vera_staging_migration_checksums set sha256=repeat('0',64) where version='0017'", error: /11 release checksums/ },
          { name: 'history table absent', sql: 'alter table supabase_migrations.schema_migrations rename to guard_saved_history', error: /full release history/ },
          { name: 'checksum ledger absent', sql: 'alter table vera_staging_migration_checksums rename to guard_saved_ledger', error: /full release history/ }
        ]
        for (const mutation of mutations) await t.test(`activation refuses ${mutation.name} before opening grants`, async () => {
          await db.exec('begin')
          await db.exec(mutation.sql)
          try { await assert.rejects(db.exec(activationBody), mutation.error) }
          finally { await db.exec('rollback') }
          assert.deepEqual(await profileGrants(), grantsBeforeActivation, 'rejected activation cannot expand existing grants')
          assert.equal(Number((await db.query('select count(*) from supabase_migrations.schema_migrations')).rows[0].count), 19)
          assert.equal(Number((await db.query('select count(*) from vera_staging_migration_checksums')).rows[0].count), 11)
          assert.equal(Number((await db.query("select count(*) from pg_policies where tablename='profiles' and policyname='baseline authorized profile reads'")).rows[0].count), 0)
        })
      }
      try { await db.exec(sql) } catch (error) { throw new Error(entry.file + ': ' + error.message) }
      if (entry.migration_version) {
        await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)', [entry.migration_version, entry.migration_name])
        if (entry.migration_version >= '0011') await db.query('insert into vera_staging_migration_checksums(version,sha256) values($1,$2)', [entry.migration_version, entry.sha256])
      }
      if (entry.order > 1) await db.query('insert into vera_staging_setup_checksums(file_path,sha256) values($1,$2)', [entry.file, entry.sha256])
    }
    await db.query('insert into vera_staging_setup_checksums(file_path,sha256) values($1,$2)', [plan.entries[0].file, plan.entries[0].sha256])

    await t.test('full real SQL chain succeeds without accounts, fake history or placeholder RPCs', async () => {
      assert.equal(Number((await db.query('select count(*) from auth.users')).rows[0].count), 0)
      assert.equal(Number((await db.query('select count(*) from supabase_migrations.schema_migrations')).rows[0].count), 19)
      assert.equal(Number((await db.query('select count(*) from vera_staging_setup_checksums')).rows[0].count), 22)
      assert.equal((await db.query("select prorettype::regtype::text result from pg_proc where oid='public.get_my_enrollment()'::regprocedure")).rows[0].result, 'jsonb')
      const buckets = (await db.query('select id,public,file_size_limit from storage.buckets order by id')).rows
      assert.deepEqual(buckets.map(row => row.id), ['academic-submissions', 'materials'])
      assert.ok(buckets.every(row => row.public === false && Number(row.file_size_limit) === 10485760))
    })

    for (const [index, id] of [teacher, otherTeacher, admin, student, unrelated, unverified].entries()) {
      await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)',
        [id, `synthetic-${index}@example.test`, id === unverified ? null : new Date().toISOString(), {name:'Synthetic test account', role:'admin', approved:true}])
    }
    await db.query('insert into teachers(id) values($1),($2)', [teacher, otherTeacher])
    await db.query('insert into academic_admins(user_id) values($1)', [admin])

    await t.test('new self-registration stays pending despite spoofed metadata and cannot grant staff membership', async () => {
      const access = await rpc(student, 'get_my_enrollment')
      assert.equal(access.status, 'pending'); assert.equal(access.role, 'student'); assert.equal(access.academic_access, false)
      await assert.rejects(as(student, () => db.query('insert into teachers(id) values($1)', [student])), /permission denied/)
      await assert.rejects(as(student, () => db.query('insert into academic_admins(user_id) values($1)', [student])), /permission denied/)
      await rpc(student, 'initialize_student_profile')
      await rpc(unrelated, 'initialize_student_profile')
      await assert.rejects(rpc(unverified, 'initialize_student_profile'), /Verified/)
      await as(student, () => db.query('insert into onboarding_responses(student_id,learning_goals) values($1,$2)', [student,'A synthetic communicative goal']))
      await assert.rejects(as(student, () => db.query('insert into onboarding_responses(student_id) values($1)', [unrelated])), /row-level security/)
      assert.equal((await as(student, () => db.query('select id from profiles'))).rows.length, 1)
      for (const table of ['materials','student_exercises','student_finals','student_payment_summary','inbox_messages']) {
        assert.equal((await as(student, () => db.query('select * from ' + table))).rows.length, 0, table)
      }
    })

    await t.test('approval exposes only assigned students and students cannot rewrite teacher academic progress', async () => {
      await rpc(admin, 'review_student_enrollment', [student,true,teacher])
      assert.equal((await rpc(student, 'get_my_enrollment')).academic_access, true)
      assert.equal((await as(teacher, () => db.query('select id from profiles'))).rows.length, 1)
      assert.equal((await as(otherTeacher, () => db.query('select id from profiles'))).rows.length, 0)
      await as(teacher, () => db.query('update profiles set progress=35,total_lessons=24 where id=$1', [student]))
      await as(student, () => db.query("update profiles set interface_language='en' where id=$1", [student]))
      await assert.rejects(as(student, () => db.query('update profiles set progress=100 where id=$1', [student])), /authorized staff/)
      await as(teacher, () => db.query('insert into teacher_notes(teacher_id,student_id,notes) values($1,$2,$3)', [teacher,student,'Synthetic private teaching note']))
      await assert.rejects(as(otherTeacher, () => db.query('insert into teacher_notes(teacher_id,student_id) values($1,$2)', [otherTeacher,student])), /row-level security/)
      assert.equal((await as(student, () => db.query('select * from teacher_notes'))).rows.length, 0)
    })

    await t.test('activation never restores direct assignment/submission writes or anonymous table access', async () => {
      for (const table of ['exercise_assignments','exercise_attempts']) {
        assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed', ['authenticated','public.' + table,'INSERT'])).rows[0].allowed, false)
      }
      assert.equal((await db.query("select has_function_privilege('anon','public.get_my_enrollment()','EXECUTE') allowed")).rows[0].allowed, false)
      await db.exec('set role anon')
      try { await assert.rejects(db.query('select * from profiles'), /permission denied/) }
      finally { await db.exec('reset role') }
      const grants = await db.query("select count(*) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','PUBLIC')")
      assert.equal(Number(grants.rows[0].count), 0)
      await assert.rejects(db.exec(await readFile(new URL('../supabase/staging/initial_application_schema.sql', import.meta.url),'utf8')), /empty public/)
      await db.exec('rollback')
      assert.equal((await db.query('select progress from profiles where id=$1', [student])).rows[0].progress, 35)
    })

    await t.test('separately approved privilege supplement removes Supabase ALL-default extras while preserving approved CRUD and RPCs', async t => {
      const supplement = await readFile(new URL('../supabase/staging/client_privilege_hardening.sql', import.meta.url), 'utf8')
      const body = supplement.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '')
      const version = Number((await db.query("select current_setting('server_version_num') version")).rows[0].version)
      const extras = ['TRUNCATE','TRIGGER','REFERENCES', ...(version >= 170000 ? ['MAINTAIN'] : [])]
      for (const privilege of extras) {
        assert.equal((await db.query("select has_table_privilege('authenticated','public.classes',$1) allowed", [privilege])).rows[0].allowed, true, `${privilege} is demonstrably inherited from Supabase-like ALL defaults before hardening`)
      }
      // Table-level REVOKE must also close separate direct column REFERENCES.
      await db.exec('grant references(progress) on public.profiles to authenticated')
      const tableState = async () => (await db.query(`select c.relname,c.relowner,c.relrowsecurity,
        has_table_privilege('authenticated',c.oid,'SELECT') as readable,
        has_table_privilege('authenticated',c.oid,'INSERT') as insertable,
        has_table_privilege('authenticated',c.oid,'UPDATE') as updatable,
        has_table_privilege('authenticated',c.oid,'DELETE') as deletable
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind in('r','p','v','m') order by c.relname`)).rows
      const functionState = async () => (await db.query(`select p.oid,has_function_privilege('authenticated',p.oid,'EXECUTE') allowed
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.oid`)).rows
      const managedState = async () => (await db.query(`select n.nspname,c.relname,c.relowner,c.relrowsecurity,c.relacl::text
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname in('auth','storage') and c.relkind in('r','p') order by n.nspname,c.relname`)).rows
      const before = await tableState(), functionsBefore = await functionState(), managedBefore = await managedState()
      const mutations = [
        { name: 'missing prior activation evidence', sql: "delete from vera_staging_setup_checksums where file_path='supabase/staging/application_access.sql'", error: /22-file setup checksums/ },
        { name: 'tampered prior activation checksum', sql: "update vera_staging_setup_checksums set sha256=repeat('0',64) where file_path='supabase/staging/application_access.sql'", error: /22-file setup checksums/ },
        { name: 'incomplete migration history', sql: "delete from supabase_migrations.schema_migrations where version='0016'", error: /approved migration history/ },
        { name: 'tampered release checksum', sql: "update vera_staging_migration_checksums set sha256=repeat('0',64) where version='0015'", error: /approved release checksums/ },
        { name: 'disabled activation trigger', sql: 'alter table profiles disable trigger protect_profile_academic_fields', error: /Prior application access activation/ },
        { name: 'effective inherited privilege outside the scoped revocation', sql: 'grant truncate on classes to public', error: /retains effective TRUNCATE/ }
      ]
      for (const mutation of mutations) await t.test(`supplement refuses ${mutation.name}`, async () => {
        await db.exec('begin')
        await db.exec(mutation.sql)
        try { await assert.rejects(db.exec(body), mutation.error) }
        finally { await db.exec('rollback') }
        assert.deepEqual(await tableState(), before)
        assert.equal((await db.query("select has_table_privilege('authenticated','public.classes','TRUNCATE') allowed")).rows[0].allowed, true, 'failed checks roll back any partial revocations')
      })
      await db.exec(supplement)
      for (const privilege of extras) {
        const remaining = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public' and c.relkind in('r','p') and has_table_privilege('authenticated',c.oid,$1)`, [privilege])
        assert.equal(remaining.rows.length, 0, privilege)
      }
      assert.equal((await db.query("select has_any_column_privilege('authenticated','public.profiles','REFERENCES') allowed")).rows[0].allowed, false)
      assert.deepEqual(await tableState(), before, 'CRUD, ownership and RLS remain unchanged')
      assert.deepEqual(await functionState(), functionsBefore, 'RPC grants remain unchanged')
      assert.deepEqual(await managedState(), managedBefore, 'Auth/Storage schemas remain unchanged')
      await assert.rejects(as(student, () => db.exec('truncate table public.classes')), /permission denied/)
      await rpc(admin, 'review_student_enrollment', [unrelated,true,teacher])
      assert.equal((await rpc(unrelated, 'get_my_enrollment')).academic_access, true)
      await as(teacher, () => db.query('update profiles set progress=41 where id=$1', [unrelated]))
      await as(unrelated, () => db.query("update profiles set interface_language='en' where id=$1", [unrelated]))
      assert.equal((await db.query('select progress from profiles where id=$1', [unrelated])).rows[0].progress, 41)
      await assert.rejects(as(unrelated, () => db.query('update profiles set progress=100 where id=$1', [unrelated])), /authorized staff/)
      await db.exec(supplement)
      assert.deepEqual(await tableState(), before, 'a repeated explicit supplement execution does not expand grants')
      assert.equal((await buildStagingInitializationPlan()).plan_sha256, '46a4d771b5113fc284a13bea495379f0d375d29b25edc14398aa62dc078f69f0')
    })
  } finally { await db.close() }
})
