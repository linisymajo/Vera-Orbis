-- 0013: Hybrid enrollment. Review and apply to staging after 0012.
-- Existing profile accounts keep access via an explicit legacy enrollment.
-- New Auth accounts always start pending. User metadata never grants a role.
begin;

create table if not exists public.academic_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.enrollments (
  student_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  source text not null default 'self' check (source in ('self','invitation','legacy')),
  teacher_id uuid references public.teachers(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.enrollment_invitations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists enrollments_status_idx on public.enrollments(status, requested_at);
alter table public.academic_admins enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_invitations enable row level security;
revoke all on public.academic_admins, public.enrollments, public.enrollment_invitations from public, anon, authenticated;
grant select on public.academic_admins, public.enrollments to authenticated;
-- Invitations are accessible only through narrowly scoped RPCs.

create or replace function public.is_academic_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.academic_admins a join auth.users u on u.id = a.user_id
  where a.user_id = auth.uid() and u.email_confirmed_at is not null
); $$;

create or replace function public.is_academic_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_academic_admin() or exists (
  select 1 from public.teachers t join auth.users u on u.id = t.id
  where t.id = auth.uid() and u.email_confirmed_at is not null
); $$;

create or replace function public.student_has_academic_access(p_student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.enrollments e join auth.users u on u.id = e.student_id
  where e.student_id = p_student_id and e.status = 'approved'
    and u.email_confirmed_at is not null
); $$;

create or replace function public.can_teacher_access_student(p_teacher_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.teachers t
  join auth.users u on u.id = t.id
  join public.enrollments e on e.student_id = p_student_id
  where t.id = p_teacher_id and u.email_confirmed_at is not null
    and public.student_has_academic_access(p_student_id)
    and (e.teacher_id = p_teacher_id or e.source = 'legacy'
      or exists (select 1 from public.academic_admins a where a.user_id = p_teacher_id))
); $$;

drop policy if exists "admins read own membership" on public.academic_admins;
create policy "admins read own membership" on public.academic_admins
for select to authenticated using (user_id = auth.uid());
drop policy if exists "users read authorized enrollment" on public.enrollments;
create policy "users read authorized enrollment" on public.enrollments
for select to authenticated using (
  student_id = auth.uid() or public.is_academic_admin()
  or (teacher_id = auth.uid() and public.is_academic_staff())
);

-- Bootstrap an administrator only through a reviewed privileged SQL operation:
-- insert into public.academic_admins(user_id) values ('<verified-auth-user-id>');
-- Never derive membership from editable auth user_metadata or profile fields.
insert into public.enrollments(student_id, status, source, approved_at)
select p.id, 'approved', 'legacy', now()
from public.profiles p join auth.users u on u.id = p.id
on conflict (student_id) do nothing;
insert into public.enrollments(student_id)
select u.id from auth.users u
on conflict (student_id) do nothing;

create or replace function public.create_pending_enrollment()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.enrollments(student_id) values (new.id)
  on conflict (student_id) do nothing;
  return new;
end; $$;
drop trigger if exists vera_orbis_pending_enrollment on auth.users;
create trigger vera_orbis_pending_enrollment after insert on auth.users
for each row execute function public.create_pending_enrollment();

create or replace function public.initialize_student_profile()
returns uuid language plpgsql security definer set search_path = ''
as $$ declare v_user auth.users;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Verified authentication required';
  end if;
  insert into public.profiles(id, name, language, level, level_name, progress, lessons_completed, current_module, next_step)
  values(v_user.id, coalesce(nullif(left(v_user.raw_user_meta_data->>'name', 120), ''), split_part(v_user.email, '@', 1)),
    'English', 'A1', 'Beginner', 0, 0, 'Getting Started', 'Complete your onboarding')
  on conflict (id) do nothing;
  return v_user.id;
end; $$;

create or replace function public.get_my_enrollment()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$ declare v_user auth.users; v_enrollment public.enrollments;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then raise exception 'Authentication required'; end if;
  select * into v_enrollment from public.enrollments where student_id = v_user.id;
  return jsonb_build_object(
    'student_id', v_user.id,
    'role', case when public.is_academic_admin() then 'admin'
      when public.is_academic_staff() then 'teacher' else 'student' end,
    'status', coalesce(v_enrollment.status, 'pending'),
    'email_verified', v_user.email_confirmed_at is not null,
    'academic_access', public.is_academic_staff() or public.student_has_academic_access(v_user.id)
  );
end; $$;

create or replace function public.create_student_invitation(p_email text)
returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_token text; v_id uuid;
begin
  if not public.is_academic_staff()
    or not exists (select 1 from public.teachers where id = auth.uid()) then
    raise exception 'Verified teacher access required';
  end if;
  if length(trim(p_email)) > 254 or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid student email is required';
  end if;
  if (select count(*) from public.enrollment_invitations
      where teacher_id = auth.uid() and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Daily invitation limit reached';
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.enrollment_invitations(teacher_id, email, token_hash)
    values(auth.uid(), lower(trim(p_email)), encode(sha256(convert_to(v_token, 'UTF8')), 'hex'))
    returning id into v_id;
  return jsonb_build_object('id', v_id, 'token', v_token, 'expires_at', now() + interval '7 days');
end; $$;

create or replace function public.accept_student_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_user auth.users; v_invite public.enrollment_invitations; v_enrollment public.enrollments;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Verify your email before accepting an invitation';
  end if;
  if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid or expired invitation'; end if;
  select * into v_invite from public.enrollment_invitations
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if v_invite.id is null or v_invite.expires_at <= now()
    or lower(v_user.email) <> v_invite.email then
    raise exception 'Invalid or expired invitation for this email';
  end if;
  if v_invite.accepted_at is not null then
    if v_invite.accepted_by = v_user.id then return public.get_my_enrollment(); end if;
    raise exception 'Invitation has already been used';
  end if;
  if not exists (select 1 from public.teachers t join auth.users u on u.id = t.id
      where t.id = v_invite.teacher_id and u.email_confirmed_at is not null) then
    raise exception 'Invitation teacher is no longer authorized';
  end if;
  insert into public.enrollments(student_id) values (v_user.id) on conflict do nothing;
  select * into v_enrollment from public.enrollments where student_id = v_user.id for update;
  if v_enrollment.status <> 'pending' then
    raise exception 'This enrollment requires administrator review';
  end if;
  update public.enrollments set status = 'approved', source = 'invitation',
    teacher_id = v_invite.teacher_id, approved_by = v_invite.teacher_id,
    approved_at = now(), updated_at = now() where student_id = v_user.id;
  update public.enrollment_invitations set accepted_by = v_user.id, accepted_at = now()
    where id = v_invite.id;
  return public.get_my_enrollment();
end; $$;

create or replace function public.list_enrollment_teachers()
returns table(id uuid, email text)
language plpgsql stable security definer set search_path = ''
as $$ begin
  if not public.is_academic_admin() then raise exception 'Administrator access required'; end if;
  return query select t.id, u.email::text from public.teachers t
    join auth.users u on u.id = t.id
    where u.email_confirmed_at is not null order by u.email;
end; $$;

create or replace function public.list_pending_enrollments()
returns table(student_id uuid, email text, name text, requested_at timestamptz, email_verified boolean)
language plpgsql stable security definer set search_path = ''
as $$ begin
  if not public.is_academic_admin() then raise exception 'Administrator access required'; end if;
  return query select e.student_id, u.email::text,
    coalesce(p.name, u.raw_user_meta_data->>'name', ''), e.requested_at,
    u.email_confirmed_at is not null
  from public.enrollments e join auth.users u on u.id = e.student_id
  left join public.profiles p on p.id = e.student_id
  where e.status = 'pending'
    and not exists (select 1 from public.teachers t where t.id = e.student_id)
    and not exists (select 1 from public.academic_admins a where a.user_id = e.student_id)
  order by e.requested_at limit 200;
end; $$;

create or replace function public.review_student_enrollment(p_student_id uuid, p_approve boolean, p_teacher_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$ declare v_result public.enrollments;
begin
  if not public.is_academic_admin() then raise exception 'Administrator access required'; end if;
  if p_approve and not exists (select 1 from auth.users where id = p_student_id and email_confirmed_at is not null) then
    raise exception 'The student must verify their email before approval';
  end if;
  if p_approve and (p_teacher_id is null or not exists (
      select 1 from public.teachers t join auth.users u on u.id = t.id
      where t.id = p_teacher_id and u.email_confirmed_at is not null)) then
    raise exception 'Assign a verified teacher before approval';
  end if;
  update public.enrollments set status = case when p_approve then 'approved' else 'rejected' end,
    teacher_id = case when p_approve then p_teacher_id else null end,
    approved_by = auth.uid(), approved_at = case when p_approve then now() else null end,
    updated_at = now()
  where student_id = p_student_id and status = 'pending' returning * into v_result;
  if v_result.student_id is null then raise exception 'Pending enrollment not found'; end if;
  return to_jsonb(v_result);
end; $$;

-- Roles cannot be self-assigned through the browser, even if a legacy policy was broad.
revoke all on public.teachers from anon, authenticated;
grant select on public.teachers to authenticated;
alter table public.teachers enable row level security;
drop policy if exists "enrollment teacher membership boundary" on public.teachers;
create policy "enrollment teacher membership boundary" on public.teachers as restrictive
for select to authenticated using (id = auth.uid());
drop policy if exists "teachers read own trusted membership" on public.teachers;
create policy "teachers read own trusted membership" on public.teachers
for select to authenticated using (id = auth.uid());

-- Restrictive policies AND the existing assignment/ownership policies. They do
-- not grant any extra content access to an approved student or a teacher.
do $$ declare v_table text;
begin
  foreach v_table in array array[
    'materials','weekly_challenges','challenge_submissions','feedback',
    'exercises','exercise_assignments','exercise_attempts','classes',
    'class_participants','class_attendance','courses','packages',
    'student_packages','payments','culture_resources','inbox_messages'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('revoke all on public.%I from anon', v_table);
      execute format('drop policy if exists "approved academic enrollment" on public.%I', v_table);
      execute format('create policy "approved academic enrollment" on public.%I as restrictive for all to authenticated using (public.is_academic_staff() or public.student_has_academic_access(auth.uid())) with check (public.is_academic_staff() or public.student_has_academic_access(auth.uid()))', v_table);
    end if;
  end loop;
  foreach v_table in array array['teacher_notes','leads','expenses','teacher_settings'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('revoke all on public.%I from anon', v_table);
      execute format('drop policy if exists "verified staff boundary" on public.%I', v_table);
      execute format('create policy "verified staff boundary" on public.%I as restrictive for all to authenticated using (public.is_academic_staff()) with check (public.is_academic_staff())', v_table);
    end if;
  end loop;
end; $$;

-- Intake remains available to the applicant. Other students' profiles and intake
-- are visible only to admins, legacy authorized teachers, or the assigned teacher.
alter table public.profiles enable row level security;
drop policy if exists "enrollment profile privacy" on public.profiles;
create policy "enrollment profile privacy" on public.profiles as restrictive
for all to authenticated
using (id = auth.uid() or public.is_academic_admin() or public.can_teacher_access_student(auth.uid(), id))
with check (id = auth.uid() or public.is_academic_admin() or public.can_teacher_access_student(auth.uid(), id));
do $$ begin
  if to_regclass('public.onboarding_responses') is not null then
    alter table public.onboarding_responses enable row level security;
    drop policy if exists "enrollment intake privacy" on public.onboarding_responses;
    create policy "enrollment intake privacy" on public.onboarding_responses as restrictive
      for all to authenticated
      using (student_id = auth.uid() or public.is_academic_admin() or public.can_teacher_access_student(auth.uid(), student_id))
      with check (student_id = auth.uid() or public.is_academic_admin() or public.can_teacher_access_student(auth.uid(), student_id));
  end if;
end; $$;

drop policy if exists "enrollment materials storage boundary" on storage.objects;
create policy "enrollment materials storage boundary" on storage.objects as restrictive
for all to authenticated
using (bucket_id <> 'materials' or public.is_academic_staff() or public.student_has_academic_access(auth.uid()))
with check (bucket_id <> 'materials' or public.is_academic_staff());

-- Owner-executed student views bypass table RLS. Preserve their existing columns
-- and answer sanitization while applying the enrollment condition explicitly.
do $$ declare v_view text; v_definition text;
begin
  foreach v_view in array array['student_exercises','student_payment_summary'] loop
    if to_regclass('public.' || v_view) is not null then
      v_definition := rtrim(pg_get_viewdef(to_regclass('public.' || v_view), true), E';\n ');
      execute format('create or replace view public.%I with (security_invoker = false, security_barrier = true) as select * from (%s) enrollment_content where public.student_has_academic_access(auth.uid())', v_view, v_definition);
      execute format('revoke all on public.%I from public, anon', v_view);
      execute format('grant select on public.%I to authenticated', v_view);
    end if;
  end loop;
end; $$;

-- Existing SECURITY DEFINER message mutation must perform its own access check.
create or replace function public.mark_inbox_message_as_read(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$ declare v_count integer;
begin
  if auth.uid() is null or not (public.is_academic_staff() or public.student_has_academic_access(auth.uid())) then
    raise exception 'Approved academic access required';
  end if;
  update public.inbox_messages set is_read = true, read_at = coalesce(read_at, now()), updated_at = now()
  where id = p_message_id and recipient_id = auth.uid();
  get diagnostics v_count = row_count;
  return v_count > 0;
end; $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; revoke every new function.
revoke all on function public.is_academic_admin(), public.is_academic_staff(),
  public.student_has_academic_access(uuid), public.can_teacher_access_student(uuid,uuid),
  public.create_pending_enrollment(), public.initialize_student_profile(), public.get_my_enrollment(),
  public.create_student_invitation(text), public.accept_student_invitation(text),
  public.list_enrollment_teachers(), public.list_pending_enrollments(), public.review_student_enrollment(uuid,boolean,uuid),
  public.mark_inbox_message_as_read(uuid) from public, anon;
grant execute on function public.is_academic_admin(), public.is_academic_staff(),
  public.student_has_academic_access(uuid), public.can_teacher_access_student(uuid,uuid),
  public.initialize_student_profile(), public.get_my_enrollment(), public.create_student_invitation(text),
  public.accept_student_invitation(text), public.list_enrollment_teachers(), public.list_pending_enrollments(),
  public.review_student_enrollment(uuid,boolean,uuid), public.mark_inbox_message_as_read(uuid)
to authenticated;
notify pgrst, 'reload schema';
commit;
