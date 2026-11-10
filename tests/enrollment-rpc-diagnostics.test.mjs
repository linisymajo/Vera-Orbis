import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const diagnostic=readFileSync(new URL('../supabase/tests/enrollment-rpc-verification.sql',import.meta.url),'utf8')
const migration=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
async function inspect(db){
  const results=await db.exec(diagnostic),report={}
  for(const result of results)for(const row of result.rows || [])if(row.check_name)report[row.check_name]=row.result
  assert.equal(report.diagnostic_session.transaction_read_only,'on')
  assert.equal((await db.query("select current_setting('transaction_read_only') value")).rows[0].value,'off')
  return report
}
async function setupActualEnrollment(db){
  // Disposable test baseline only. This is deliberately not a deployment recipe.
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
    create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.teachers(id uuid primary key references auth.users(id));
    create table public.profiles(id uuid primary key references auth.users(id),name text,language text,level text,level_name text,progress integer,lessons_completed integer,current_module text,next_step text);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    create table public.inbox_messages(id uuid primary key,recipient_id uuid,is_read boolean,read_at timestamptz,updated_at timestamptz);
    grant usage on schema public,auth,storage to anon,authenticated;
    grant select on teachers,profiles to authenticated;`)
  for(const name of['0004_exercise_studio.sql','0012_exercise_workflow.sql','0013_hybrid_enrollment.sql'])await db.exec(migration(name))
}

test('read-only catalog diagnostic tolerates missing baseline, roles, function and migration history without creating anything',async()=>{
  const db=new PGlite()
  try{
    const before=(await db.query("select count(*)::int value from pg_proc where pronamespace='public'::regnamespace")).rows[0].value
    const report=await inspect(db)
    assert.equal(report.rpc_contract.classification,'SQL_FUNCTION_MISSING')
    assert.deepEqual(report.function_candidates,[])
    assert.equal(report.migration_history_catalog.present,false)
    assert.ok(report.baseline_relation_presence.every(row=>row.present===false))
    assert.equal((await db.query("select count(*)::int value from pg_proc where pronamespace='public'::regnamespace")).rows[0].value,before)
    assert.equal((await db.query("select to_regclass('public.enrollments') value")).rows[0].value,null)
  }finally{await db.close()}
})

test('diagnostic distinguishes a wrong schema, wrong arguments and wrong return type from the expected RPC',async()=>{
  const db=new PGlite()
  try{
    await db.exec("create schema alternate;create function alternate.get_my_enrollment() returns jsonb language sql stable as $$select '{}'::jsonb$$")
    assert.equal((await inspect(db)).rpc_contract.classification,'FUNCTION_IN_OTHER_SCHEMA')
    await db.exec("create function public.get_my_enrollment(student_id uuid) returns jsonb language sql stable as $$select '{}'::jsonb$$")
    let report=await inspect(db)
    assert.equal(report.rpc_contract.classification,'SQL_SIGNATURE_MISMATCH')
    assert.equal(report.function_candidates.find(row=>row.schema==='public').identity_arguments,'student_id uuid')
    await db.exec("create function public.get_my_enrollment() returns text language sql stable as $$select 'not the JSON contract'::text$$")
    report=await inspect(db)
    assert.equal(report.rpc_contract.classification,'SQL_SIGNATURE_MISMATCH')
    assert.equal(report.rpc_contract.return_shape_matches,false)
  }finally{await db.close()}
})

test('actual 0013 metadata matches the zero-argument jsonb contract while API cache and remote state stay unverified',async()=>{
  const db=new PGlite()
  try{
    await setupActualEnrollment(db)
    await db.exec("create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text,name text,statements text[]);insert into supabase_migrations.schema_migrations values('0013','hybrid_enrollment',array['PRIVATE STATEMENT BODY MUST NOT BE EMITTED']);set pgrst.db_schemas='api';")
    const before=(await db.query('select count(*)::int value from auth.users')).rows[0].value
    const report=await inspect(db)
    assert.equal(report.rpc_contract.classification,'SQL_CONTRACT_PRESENT_API_STATE_UNVERIFIED')
    assert.equal(report.rpc_contract.authenticated_execute,true)
    assert.equal(report.rpc_contract.anon_execute,false)
    assert.equal(report.rpc_contract.public_execute,false)
    assert.equal(report.rpc_contract.authenticated_public_usage,true)
    const candidate=report.function_candidates[0]
    assert.equal(candidate.schema,'public');assert.equal(candidate.input_argument_count,0)
    assert.equal(candidate.return_type,'jsonb');assert.equal(candidate.security_definer,true)
    assert.equal(candidate.volatility,'s');assert.equal(candidate.search_path_setting,'search_path=""')
    assert.ok(report.enrollment_helper_presence.every(row=>row.present))
    assert.ok(report.baseline_column_review.every(row=>row.matches),'text-compatible managed Auth varchar column is accepted')
    assert.equal(report.migration_history_catalog.present,true)
    assert.equal(report.migration_history_catalog.current_role_can_select,true)
    assert.equal(report.sql_session_api_settings['pgrst.db_schemas'],'api')
    assert.ok(report.sql_session_api_settings.scope.includes('SQL session only'))
    assert.equal((await db.query('select count(*)::int value from auth.users')).rows[0].value,before)
    assert.ok(!JSON.stringify(report).includes('PRIVATE STATEMENT BODY'))
  }finally{await db.close()}
})

test('diagnostic reports missing authenticated grants/schema usage and unintended anonymous execution',async()=>{
  const db=new PGlite()
  try{
    await setupActualEnrollment(db)
    await db.exec('revoke execute on function public.get_my_enrollment() from authenticated')
    assert.equal((await inspect(db)).rpc_contract.classification,'AUTHENTICATED_EXECUTE_MISSING')
    await db.exec('grant execute on function public.get_my_enrollment() to authenticated;revoke usage on schema public from public,authenticated')
    assert.equal((await inspect(db)).rpc_contract.classification,'AUTHENTICATED_SCHEMA_USAGE_MISSING')
    await db.exec('grant usage on schema public to authenticated;grant execute on function public.get_my_enrollment() to public')
    const exposed=await inspect(db)
    assert.equal(exposed.rpc_contract.classification,'UNEXPECTED_ANONYMOUS_EXECUTE')
    assert.equal(exposed.rpc_contract.public_execute,true)
    await db.exec('revoke execute on function public.get_my_enrollment() from public;alter function public.get_my_enrollment() security invoker')
    assert.equal((await inspect(db)).rpc_contract.classification,'SQL_SECURITY_CONTRACT_MISMATCH')
  }finally{await db.close()}
})

test('diagnostic SQL never reloads, mutates data/roles or exposes full role settings and function bodies',()=>{
  const stripped=diagnostic.replace(/--[^\n]*/g,'')
  assert.match(stripped,/begin read only;/i);assert.match(stripped,/rollback;\s*$/i)
  assert.doesNotMatch(stripped,/\b(?:notify|create|alter|drop|grant|revoke|insert|update|delete|truncate)\b/i)
  assert.doesNotMatch(stripped,/pg_get_functiondef|jwt_secret|auth\.users\s+(?:where|as|[a-z]+\s+where)/i)
  assert.match(stripped,/md5\(p\.prosrc\)/)
})
