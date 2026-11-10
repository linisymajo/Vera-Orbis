-- Final access activation for the new staging baseline AFTER 0021. This is not
-- a production patch. No membership, enrollment approval or Auth user is seeded.
begin;
do $$ declare
  -- Exact successfully executed files from the reviewed empty-staging plan.
  -- The 0011-0021 hashes are pinned to staging-manifest.reviewed.json;
  -- this guard verifies evidence and never creates or repairs history records.
  v_expected constant jsonb := '[
  {
    "version": "0002",
    "name": "teacher_operations",
    "sha256": null
  },
  {
    "version": "0004",
    "name": "exercise_studio",
    "sha256": null
  },
  {
    "version": "0005",
    "name": "materials_storage_policy",
    "sha256": null
  },
  {
    "version": "0006",
    "name": "interface_language",
    "sha256": null
  },
  {
    "version": "0007",
    "name": "teacher_management_enhancements",
    "sha256": null
  },
  {
    "version": "0008",
    "name": "teacher_management_security_patch",
    "sha256": null
  },
  {
    "version": "0009",
    "name": "academic_sync_challenges_feedback",
    "sha256": null
  },
  {
    "version": "0010",
    "name": "inbox_messaging",
    "sha256": null
  },
  {
    "version": "0011",
    "name": "material_office_formats",
    "sha256": "2a6242b769bce79f065db00ccc37c0364d3d89dccc65906316e2ee549cdbf8ad"
  },
  {
    "version": "0012",
    "name": "exercise_workflow",
    "sha256": "2948fda844f726bc612c651762e8ed7e9b4e3be56513624b8a2db3181bcc7f10"
  },
  {
    "version": "0013",
    "name": "hybrid_enrollment",
    "sha256": "88b37326445127eee2d5d11954390d000122df4a799e5c0b8606f54efa9a21fc"
  },
  {
    "version": "0014",
    "name": "ai_drafts",
    "sha256": "9c134d44d7bb3a405552e236ee0a20a1303c80e4c4c50f0a385255e06f582e62"
  },
  {
    "version": "0015",
    "name": "material_owner_boundary",
    "sha256": "d3979ac3d9219d700523ba824df4e3f2dee0f8eaf6a2e8567c8571e85866f787"
  },
  {
    "version": "0016",
    "name": "academic_teacher_scope",
    "sha256": "ae8117c3fb8497db50c8781853dc56ddf2407978a0d1771671dd14124811f5a6"
  },
  {
    "version": "0017",
    "name": "inbox_authorization",
    "sha256": "22103240cc8f7bb09ae373db1e8e13a7d3a7785083e639c57977edf41ff01692"
  },
  {
    "version": "0018",
    "name": "student_attachments",
    "sha256": "04bcd4c8970d1f02f6278d2f8391a9d45ec1bc95e62cede595f3de2da7cb185b"
  },
  {
    "version": "0019",
    "name": "learning_plans",
    "sha256": "a89cc573f9f34c8d8cb1fc9e6265b264cd50a9559f9e20a3fdde73cd1a148024"
  },
  {
    "version": "0020",
    "name": "challenges_notifications",
    "sha256": "806949a4b1e14c96d992ca33f83eab6ca4d87667b976367af72df8586959b61d"
  },
  {
    "version": "0021",
    "name": "final_assessments",
    "sha256": "a57d743088ed1545ade4fef89ed9c917bbcfcbfb4dc303552b894d6e6f6a91b7"
  }
]'::jsonb;
begin
  if to_regclass('public.vera_staging_environment') is null
    or to_regclass('supabase_migrations.schema_migrations') is null
    or to_regclass('public.vera_staging_migration_checksums') is null then
    raise exception 'Reviewed staging initialization and full release history are required';
  end if;
  lock table public.vera_staging_environment,
    supabase_migrations.schema_migrations,public.vera_staging_migration_checksums in share mode;
  if not exists(select 1 from public.vera_staging_environment
    where environment='staging' and project_ref='duinvkphfnugoyvvlbbq'
      and project_name='vera-orbis-staging')
    or to_regprocedure('public.get_my_enrollment()') is null
    or to_regclass('public.student_finals') is null then
    raise exception 'Reviewed staging initialization and full release are required';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 19
    or exists(select 1
      from jsonb_to_recordset(v_expected) as expected(version text,name text,sha256 text)
      left join supabase_migrations.schema_migrations actual on actual.version=expected.version
      where actual.version is null or actual.name is distinct from expected.name) then
    raise exception 'Exact reviewed 19 migration versions and names are required before access activation';
  end if;
  if (select count(*) from public.vera_staging_migration_checksums) <> 11
    or exists(select 1
      from jsonb_to_recordset(v_expected) as expected(version text,name text,sha256 text)
      left join public.vera_staging_migration_checksums actual on actual.version=expected.version
      where expected.sha256 is not null
        and (actual.version is null or actual.sha256 is distinct from expected.sha256)) then
    raise exception 'Exact reviewed 11 release checksums are required before access activation';
  end if;
end $$;

-- Supabase project defaults may grant anon access to newly created tables.
-- Remove anonymous relation grants explicitly without reopening RPC-only writes.
revoke all on all tables in schema public from public,anon;
grant usage on schema public to authenticated;
grant select on public.teachers to authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update on public.onboarding_responses to authenticated;
grant select,insert,update,delete on public.materials,public.teacher_notes,
  public.teacher_settings,public.classes,public.class_participants,
  public.class_attendance,public.courses,public.packages,public.student_packages,
  public.payments,public.expenses,public.leads,public.culture_resources to authenticated;

create policy "baseline authorized profile reads" on public.profiles for select to authenticated
  using(id=auth.uid() or public.is_academic_admin()
    or public.can_teacher_access_student(auth.uid(),id));
create policy "baseline authorized profile updates" on public.profiles for update to authenticated
  using(id=auth.uid() or public.is_academic_admin()
    or public.can_teacher_access_student(auth.uid(),id))
  with check(id=auth.uid() or public.is_academic_admin()
    or public.can_teacher_access_student(auth.uid(),id));

-- A student may change interface language, not teacher-controlled progress,
-- lesson counts, goals, name or academic plan fields through direct profile SQL.
create function public.protect_profile_academic_fields()
returns trigger language plpgsql set search_path=''
as $$ begin
  if not public.is_academic_staff() and
    ((to_jsonb(new)-'interface_language'-'updated_at') is distinct from
     (to_jsonb(old)-'interface_language'-'updated_at')) then
    raise exception 'Only authorized staff can change academic profile fields';
  end if;
  new.updated_at:=now();
  return new;
end $$;
revoke all on function public.protect_profile_academic_fields() from public,anon,authenticated;
create trigger protect_profile_academic_fields before update on public.profiles
  for each row execute function public.protect_profile_academic_fields();

create policy "baseline authorized intake reads" on public.onboarding_responses for select to authenticated
  using(student_id=auth.uid() or public.is_academic_admin()
    or public.can_teacher_access_student(auth.uid(),student_id));
create policy "baseline applicants save own intake" on public.onboarding_responses for insert to authenticated
  with check(student_id=auth.uid());
create policy "baseline applicants update own intake" on public.onboarding_responses for update to authenticated
  using(student_id=auth.uid()) with check(student_id=auth.uid());
create policy "baseline teachers manage assigned notes" on public.teacher_notes for all to authenticated
  using(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id))
  with check(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id));

-- 0012's RPC-only assignment/submission grants and all later private result,
-- learning-plan, notification and attachment policies remain unchanged.
notify pgrst,'reload schema';
commit;
