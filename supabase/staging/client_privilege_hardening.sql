-- ADDITIONAL staging-only privilege supplement; requires separate approval.
-- It follows (and does not alter) the approved 22-file initialization plan:
-- 46a4d771b5113fc284a13bea495379f0d375d29b25edc14398aa62dc078f69f0.
-- No table data, ownership, managed schemas, role memberships or default ACLs change.
begin;
do $$ declare
  v_expected constant jsonb := '[
  {
    "file": "supabase/staging/initial_application_schema.sql",
    "sha256": "5f4b9eb97ae991b74c4dfc6ed3e32e338faed610a0b89058dd1a0f24c4b6f2fc",
    "version": null,
    "name": null
  },
  {
    "file": "supabase/staging/initialization_tracking.sql",
    "sha256": "aea91fbdcee879ce6d44a22afcc9b89dc2d7deeb0bf32382f4a87db0f3484c32",
    "version": null,
    "name": null
  },
  {
    "file": "supabase/migrations/0002_teacher_operations.sql",
    "sha256": "7d92f311a404dfa79aef3fa504a2c96d42fc378f225c7e44d319d7f0feeeba62",
    "version": "0002",
    "name": "teacher_operations"
  },
  {
    "file": "supabase/migrations/0004_exercise_studio.sql",
    "sha256": "0df7d548bf522f86bf29dfbc40342fc27b1a8df7430f76fa1135f2b40fa3793f",
    "version": "0004",
    "name": "exercise_studio"
  },
  {
    "file": "supabase/migrations/0005_materials_storage_policy.sql",
    "sha256": "f682ccc9857018f1688cf0b94074fb7fecf56c52b113bec73eead61a0e631544",
    "version": "0005",
    "name": "materials_storage_policy"
  },
  {
    "file": "supabase/migrations/0006_interface_language.sql",
    "sha256": "4ab6c9edefbbdfc8079936f632d7f8adb0759f818224e09a19165756b8e3a41f",
    "version": "0006",
    "name": "interface_language"
  },
  {
    "file": "supabase/migrations/0007_teacher_management_enhancements.sql",
    "sha256": "4fe31451b1df7206a5c85cc48ad5c4c43eea1c598e45041c9a10768e2bab719a",
    "version": "0007",
    "name": "teacher_management_enhancements"
  },
  {
    "file": "supabase/migrations/0008_teacher_management_security_patch.sql",
    "sha256": "72812c5c7c769792b3101c80cb1c024d769f42bc135561e367d401bea40e7fc8",
    "version": "0008",
    "name": "teacher_management_security_patch"
  },
  {
    "file": "supabase/migrations/0009_academic_sync_challenges_feedback.sql",
    "sha256": "8cd86de925e427319c46d67ac9ab1cc08ddc165debda6024d4158040e14a849c",
    "version": "0009",
    "name": "academic_sync_challenges_feedback"
  },
  {
    "file": "supabase/migrations/0010_inbox_messaging.sql",
    "sha256": "ade8449428a4a55278c44458b48f2fb46bcb5cdc18a6a6fd8cde06a8d1d8fee6",
    "version": "0010",
    "name": "inbox_messaging"
  },
  {
    "file": "supabase/migrations/0011_material_office_formats.sql",
    "sha256": "2a6242b769bce79f065db00ccc37c0364d3d89dccc65906316e2ee549cdbf8ad",
    "version": "0011",
    "name": "material_office_formats"
  },
  {
    "file": "supabase/migrations/0012_exercise_workflow.sql",
    "sha256": "2948fda844f726bc612c651762e8ed7e9b4e3be56513624b8a2db3181bcc7f10",
    "version": "0012",
    "name": "exercise_workflow"
  },
  {
    "file": "supabase/migrations/0013_hybrid_enrollment.sql",
    "sha256": "88b37326445127eee2d5d11954390d000122df4a799e5c0b8606f54efa9a21fc",
    "version": "0013",
    "name": "hybrid_enrollment"
  },
  {
    "file": "supabase/migrations/0014_ai_drafts.sql",
    "sha256": "9c134d44d7bb3a405552e236ee0a20a1303c80e4c4c50f0a385255e06f582e62",
    "version": "0014",
    "name": "ai_drafts"
  },
  {
    "file": "supabase/migrations/0015_material_owner_boundary.sql",
    "sha256": "d3979ac3d9219d700523ba824df4e3f2dee0f8eaf6a2e8567c8571e85866f787",
    "version": "0015",
    "name": "material_owner_boundary"
  },
  {
    "file": "supabase/migrations/0016_academic_teacher_scope.sql",
    "sha256": "ae8117c3fb8497db50c8781853dc56ddf2407978a0d1771671dd14124811f5a6",
    "version": "0016",
    "name": "academic_teacher_scope"
  },
  {
    "file": "supabase/migrations/0017_inbox_authorization.sql",
    "sha256": "22103240cc8f7bb09ae373db1e8e13a7d3a7785083e639c57977edf41ff01692",
    "version": "0017",
    "name": "inbox_authorization"
  },
  {
    "file": "supabase/migrations/0018_student_attachments.sql",
    "sha256": "04bcd4c8970d1f02f6278d2f8391a9d45ec1bc95e62cede595f3de2da7cb185b",
    "version": "0018",
    "name": "student_attachments"
  },
  {
    "file": "supabase/migrations/0019_learning_plans.sql",
    "sha256": "a89cc573f9f34c8d8cb1fc9e6265b264cd50a9559f9e20a3fdde73cd1a148024",
    "version": "0019",
    "name": "learning_plans"
  },
  {
    "file": "supabase/migrations/0020_challenges_notifications.sql",
    "sha256": "806949a4b1e14c96d992ca33f83eab6ca4d87667b976367af72df8586959b61d",
    "version": "0020",
    "name": "challenges_notifications"
  },
  {
    "file": "supabase/migrations/0021_final_assessments.sql",
    "sha256": "a57d743088ed1545ade4fef89ed9c917bbcfcbfb4dc303552b894d6e6f6a91b7",
    "version": "0021",
    "name": "final_assessments"
  },
  {
    "file": "supabase/staging/application_access.sql",
    "sha256": "7b8e635d818cb6fdba38450c04fa14856506383333b3d1058e5b69f3453b066e",
    "version": null,
    "name": null
  }
]'::jsonb;
  v_privileges text[] := array['TRUNCATE','TRIGGER','REFERENCES'];
  v_privilege text;
  v_table record;
  v_columns text;
begin
  if to_regclass('public.vera_staging_environment') is null
    or to_regclass('public.vera_staging_setup_checksums') is null
    or to_regclass('public.vera_staging_migration_checksums') is null
    or to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Completed approved staging initialization evidence is required';
  end if;
  lock table public.vera_staging_environment,public.vera_staging_setup_checksums,
    public.vera_staging_migration_checksums,supabase_migrations.schema_migrations in share mode;
  if (select count(*) from public.vera_staging_environment) <> 1
    or not exists(select 1 from public.vera_staging_environment
      where environment='staging' and project_ref='duinvkphfnugoyvvlbbq'
        and project_name='vera-orbis-staging') then
    raise exception 'Exact isolated staging marker is required';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 19
    or exists(select 1
      from jsonb_to_recordset(v_expected) expected(file text,sha256 text,version text,name text)
      left join supabase_migrations.schema_migrations actual on actual.version=expected.version
      where expected.version is not null and
        (actual.version is null or actual.name is distinct from expected.name)) then
    raise exception 'Exact approved migration history is required';
  end if;
  if (select count(*) from public.vera_staging_migration_checksums) <> 11
    or exists(select 1
      from jsonb_to_recordset(v_expected) expected(file text,sha256 text,version text,name text)
      left join public.vera_staging_migration_checksums actual on actual.version=expected.version
      where expected.version >= '0011' and
        (actual.version is null or actual.sha256 is distinct from expected.sha256)) then
    raise exception 'Exact approved release checksums are required';
  end if;
  if (select count(*) from public.vera_staging_setup_checksums
      where file_path <> 'supabase/staging/client_privilege_hardening.sql') <> 22
    or exists(select 1
      from jsonb_to_recordset(v_expected) expected(file text,sha256 text,version text,name text)
      left join public.vera_staging_setup_checksums actual on actual.file_path=expected.file
      where actual.file_path is null or actual.sha256 is distinct from expected.sha256) then
    raise exception 'Exact approved 22-file setup checksums including prior activation are required';
  end if;
  if to_regclass('public.profiles') is null
    or not exists(select 1 from pg_catalog.pg_policy
      where polrelid='public.profiles'::regclass and polname='baseline authorized profile reads')
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgrelid='public.profiles'::regclass and tgname='protect_profile_academic_fields'
        and not tgisinternal and tgenabled <> 'D') then
    raise exception 'Prior application access activation must be installed';
  end if;

  if current_setting('server_version_num')::integer >= 170000 then
    v_privileges := array_append(v_privileges,'MAINTAIN');
  end if;
  for v_table in
    select c.oid,n.nspname,c.relname from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and not exists(select 1 from pg_catalog.pg_depend d
        where d.classid='pg_catalog.pg_class'::regclass and d.objid=c.oid
          and d.refclassid='pg_catalog.pg_extension'::regclass and d.deptype='e')
  loop
    execute format('revoke %s on table %I.%I from authenticated',
      array_to_string(v_privileges,','),v_table.nspname,v_table.relname);
    -- Separate column REFERENCES grants survive a table-level REVOKE.
    select string_agg(format('%I',a.attname),',' order by a.attnum) into v_columns
      from pg_catalog.pg_attribute a where a.attrelid=v_table.oid
        and a.attnum>0 and not a.attisdropped;
    if v_columns is not null then
      execute format('revoke references (%s) on table %I.%I from authenticated',
        v_columns,v_table.nspname,v_table.relname);
    end if;
  end loop;
  foreach v_privilege in array v_privileges loop
    if exists(select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p')
        and not exists(select 1 from pg_catalog.pg_depend d
          where d.classid='pg_catalog.pg_class'::regclass and d.objid=c.oid
            and d.refclassid='pg_catalog.pg_extension'::regclass and d.deptype='e')
        and has_table_privilege('authenticated',c.oid,v_privilege)) then
      raise exception 'Authenticated retains effective % privileges; scoped hardening refused',v_privilege;
    end if;
  end loop;
  if exists(select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and not exists(select 1 from pg_catalog.pg_depend d
        where d.classid='pg_catalog.pg_class'::regclass and d.objid=c.oid
          and d.refclassid='pg_catalog.pg_extension'::regclass and d.deptype='e')
      and has_any_column_privilege('authenticated',c.oid,'REFERENCES')) then
    raise exception 'Authenticated retains effective column REFERENCES privileges; scoped hardening refused';
  end if;
end $$;
commit;
