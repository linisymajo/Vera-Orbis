-- Read-only catalog diagnostic; no account/application rows or function calls.
-- Operator must independently confirm the authorized staging target before use.
-- This file does not connect anywhere, apply migrations, change grants or reload
-- PostgREST. Its SQL-session settings cannot prove the API server's live config.
begin read only;
set local statement_timeout = '10s';
set local lock_timeout = '2s';

select 'diagnostic_session' as check_name, jsonb_build_object(
  'transaction_read_only', current_setting('transaction_read_only'),
  'database_role', current_user,
  'database_name', current_database(),
  'api_cache_state', 'not observable from PostgreSQL catalogs'
) as result;

select 'function_candidates' as check_name, coalesce(jsonb_agg(jsonb_build_object(
  'schema', n.nspname, 'name', p.proname, 'kind', p.prokind,
  'identity_arguments', pg_get_function_identity_arguments(p.oid),
  'input_argument_count', p.pronargs, 'input_argument_names', p.proargnames,
  'return_type', pg_get_function_result(p.oid), 'returns_set', p.proretset,
  'security_definer', p.prosecdef, 'volatility', p.provolatile,
  'owner', pg_get_userbyid(p.proowner),
  'search_path_setting', (select config from unnest(p.proconfig) config where config like 'search_path=%' limit 1),
  'body_fingerprint_md5', md5(p.prosrc)
) order by n.nspname, p.oid), '[]'::jsonb) as result
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where p.proname='get_my_enrollment' and p.prokind in ('f','p');

with expected as (
  select p.* from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_my_enrollment' and p.pronargs=0 and p.prokind='f'
), checks as (
  select
    (select oid from expected) as function_oid,
    exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where p.proname='get_my_enrollment' and n.nspname='public') as public_candidate_exists,
    exists(select 1 from pg_catalog.pg_proc where proname='get_my_enrollment') as any_candidate_exists,
    exists(select 1 from pg_catalog.pg_roles where rolname='authenticated') as authenticated_role_exists,
    exists(select 1 from pg_catalog.pg_roles where rolname='anon') as anon_role_exists,
    coalesce((select prorettype='pg_catalog.jsonb'::regtype and not proretset from expected),false) as return_shape_matches,
    coalesce((select prosecdef and provolatile='s' and coalesce(proconfig @> array['search_path=""'],false) from expected),false) as execution_shape_matches,
    case when exists(select 1 from pg_catalog.pg_roles where rolname='authenticated')
      then has_schema_privilege('authenticated','public','USAGE') else null end as authenticated_public_usage,
    case when exists(select 1 from pg_catalog.pg_roles where rolname='authenticated')
      then (select has_function_privilege('authenticated',oid,'EXECUTE') from expected) else null end as authenticated_execute,
    case when exists(select 1 from pg_catalog.pg_roles where rolname='anon')
      then (select has_function_privilege('anon',oid,'EXECUTE') from expected) else null end as anon_execute,
    coalesce((select exists(select 1 from aclexplode(coalesce(e.proacl,acldefault('f',e.proowner))) acl
      where acl.grantee=0 and acl.privilege_type='EXECUTE') from expected e),false) as public_execute
)
select 'rpc_contract' as check_name, jsonb_build_object(
  'expected_signature','public.get_my_enrollment()',
  'expected_return_type','jsonb',
  'function_present',function_oid is not null,
  'return_shape_matches',return_shape_matches,
  'execution_shape_matches',execution_shape_matches,
  'authenticated_role_exists',authenticated_role_exists,
  'anon_role_exists',anon_role_exists,
  'authenticated_public_usage',authenticated_public_usage,
  'authenticated_execute',authenticated_execute,
  'anon_execute',anon_execute,
  'public_execute',public_execute,
  'classification',case
    when function_oid is null and public_candidate_exists then 'SQL_SIGNATURE_MISMATCH'
    when function_oid is null and any_candidate_exists then 'FUNCTION_IN_OTHER_SCHEMA'
    when function_oid is null then 'SQL_FUNCTION_MISSING'
    when not return_shape_matches then 'SQL_SIGNATURE_MISMATCH'
    when not execution_shape_matches then 'SQL_SECURITY_CONTRACT_MISMATCH'
    when not authenticated_role_exists or not anon_role_exists then 'EXPECTED_API_ROLE_MISSING'
    when not authenticated_public_usage then 'AUTHENTICATED_SCHEMA_USAGE_MISSING'
    when not authenticated_execute then 'AUTHENTICATED_EXECUTE_MISSING'
    when anon_execute or public_execute then 'UNEXPECTED_ANONYMOUS_EXECUTE'
    else 'SQL_CONTRACT_PRESENT_API_STATE_UNVERIFIED'
  end
) as result from checks;

with required(signature) as (values
  ('auth.uid()'),('public.is_academic_admin()'),('public.is_academic_staff()'),
  ('public.student_has_academic_access(uuid)'),('public.can_teacher_access_student(uuid,uuid)')
)
select 'enrollment_helper_presence' as check_name,
  jsonb_agg(jsonb_build_object('signature',signature,'present',to_regprocedure(signature) is not null) order by signature) as result
from required;

-- These are prerequisites/objects to REVIEW, not replacement baseline DDL.
with required(relation,stage) as (values
  ('auth.users','baseline'),('public.profiles','baseline'),('public.teachers','baseline'),
  ('storage.objects','baseline'),('public.inbox_messages','baseline'),
  ('public.enrollments','created by 0013'),('public.academic_admins','created by 0013'),
  ('public.enrollment_invitations','created by 0013')
)
select 'baseline_relation_presence' as check_name,
  jsonb_agg(jsonb_build_object('relation',relation,'stage',stage,'present',to_regclass(relation) is not null) order by stage,relation) as result
from required;

with required(schema_name,relation_name,column_name,expected_type) as (values
  ('auth','users','id','uuid'),('auth','users','email','text'),
  ('auth','users','email_confirmed_at','timestamp with time zone'),('auth','users','raw_user_meta_data','jsonb'),
  ('public','teachers','id','uuid'),('public','profiles','id','uuid'),('public','profiles','name','text'),
  ('public','profiles','language','text'),('public','profiles','level','text'),('public','profiles','level_name','text'),
  ('public','profiles','progress','integer'),('public','profiles','lessons_completed','integer'),
  ('public','profiles','current_module','text'),('public','profiles','next_step','text'),
  ('storage','objects','bucket_id','text'),('storage','objects','name','text'),
  ('public','inbox_messages','id','uuid'),('public','inbox_messages','recipient_id','uuid'),
  ('public','inbox_messages','is_read','boolean'),('public','inbox_messages','read_at','timestamp with time zone'),
  ('public','inbox_messages','updated_at','timestamp with time zone')
)
select 'baseline_column_review' as check_name, jsonb_agg(jsonb_build_object(
  'relation',r.schema_name||'.'||r.relation_name,'column',r.column_name,
  'expected_type',case when r.expected_type='text' then 'text or varchar' else r.expected_type end,
  'observed_type',format_type(a.atttypid,a.atttypmod),
  'matches',coalesce(case when r.expected_type='text'
    then a.atttypid in ('pg_catalog.text'::regtype,'pg_catalog.varchar'::regtype)
    else format_type(a.atttypid,a.atttypmod)=r.expected_type end,false)
) order by r.schema_name,r.relation_name,r.column_name) as result
from required r left join pg_catalog.pg_namespace n on n.nspname=r.schema_name
left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=r.relation_name
left join pg_catalog.pg_attribute a on a.attrelid=c.oid and a.attname=r.column_name and a.attnum>0 and not a.attisdropped;

select 'migration_history_catalog' as check_name, jsonb_build_object(
  'relation','supabase_migrations.schema_migrations',
  'present',to_regclass('supabase_migrations.schema_migrations') is not null,
  'version_column_present',exists(select 1 from pg_catalog.pg_attribute where attrelid=to_regclass('supabase_migrations.schema_migrations') and attname='version' and attnum>0 and not attisdropped),
  'current_role_can_select',case when to_regclass('supabase_migrations.schema_migrations') is not null
    then has_table_privilege(current_user,to_regclass('supabase_migrations.schema_migrations'),'SELECT') else null end
) as result;

-- Read migration VERSION/NAME metadata only if its catalog and grants allow it.
-- Emits a NOTICE because optional history cannot be referenced in static SQL
-- when the relation is absent. No migration statement bodies are read.
do $diagnostic$
declare history regclass:=to_regclass('supabase_migrations.schema_migrations'); entries jsonb;
begin
  if history is null then
    raise notice 'enrollment_rpc_history: migration history unavailable; deployment state remains unverified';
  elsif not exists(select 1 from pg_catalog.pg_attribute where attrelid=history and attname='version' and attnum>0 and not attisdropped) then
    raise notice 'enrollment_rpc_history: migration history has no version column; review its format';
  elsif not has_table_privilege(current_user,history,'SELECT') then
    raise notice 'enrollment_rpc_history: migration history not readable by current role';
  else
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''version'',h.version::text,''name'',to_jsonb(h)->>''name'') order by h.version::text),''[]''::jsonb) from supabase_migrations.schema_migrations h where h.version::text in (''0012'',''0013'') or to_jsonb(h)->>''name'' in (''exercise_workflow'',''hybrid_enrollment'')' into entries;
    raise notice 'enrollment_rpc_history: %',entries;
  end if;
end $diagnostic$;

-- Only the allowlisted non-secret schema/search-path settings below are read.
select 'sql_session_api_settings' as check_name,jsonb_build_object(
  'pgrst.db_schemas',current_setting('pgrst.db_schemas',true),
  'pgrst.db_extra_search_path',current_setting('pgrst.db_extra_search_path',true),
  'scope','SQL session only; not proof of the running PostgREST process configuration'
) as result;

select 'visible_database_role_api_settings' as check_name,
  coalesce(jsonb_agg(jsonb_build_object(
    'role',coalesce(r.rolname,'all roles'),'database',coalesce(d.datname,'all databases'),
    'setting_name',split_part(config,'=',1),'setting_value',substring(config from position('=' in config)+1)
  ) order by s.setrole,s.setdatabase,config),'[]'::jsonb) as result
from pg_catalog.pg_db_role_setting s
left join pg_catalog.pg_roles r on r.oid=s.setrole
left join pg_catalog.pg_database d on d.oid=s.setdatabase
cross join lateral unnest(s.setconfig) config
where (s.setrole=0 or r.rolname in ('authenticator','authenticated','anon'))
  and (s.setdatabase=0 or d.datname=current_database())
  and split_part(config,'=',1) in ('pgrst.db_schemas','pgrst.db_extra_search_path');

rollback;
