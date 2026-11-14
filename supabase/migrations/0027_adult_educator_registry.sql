-- Vera Orbis — Adult Educator Eligibility Registry & Verification Boundary
-- Mandatory administrator-controlled registry for verified adult instructors (18+).
-- Enforces server-side authorization boundary inside Supabase PostgreSQL.
begin;

create table if not exists public.adult_educator_registry (
  teacher_id uuid primary key references public.teachers(id) on delete cascade,
  verified_adult boolean not null default true,
  notes text not null default 'Administrator confirmed adult educator (18+)',
  verified_at timestamptz not null default now()
);

alter table public.adult_educator_registry enable row level security;
revoke all on public.adult_educator_registry from public, anon, authenticated;
grant select on public.adult_educator_registry to authenticated;

drop policy if exists "adult educator registry read own" on public.adult_educator_registry;
create policy "adult educator registry read own" on public.adult_educator_registry
  for select to authenticated
  using (teacher_id = auth.uid());

-- Authorize the verified production teacher account
insert into public.adult_educator_registry (teacher_id, verified_adult, notes)
values ('55049846-f72c-4343-83e1-a5b486a2773d', true, 'Founder & Lead Teacher (18+ verified)')
on conflict (teacher_id) do update set verified_adult = true;

-- Backend server-side verification function
create or replace function public.verify_adult_teacher_eligibility()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users;
  v_teacher public.teachers;
  v_registry public.adult_educator_registry;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_user from auth.users where id = v_uid;
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Instructor email must be verified' using errcode = '42501';
  end if;

  select * into v_teacher from public.teachers where id = v_uid;
  if v_teacher.id is null then
    raise exception 'Access Denied: Instructor role required. Student accounts and non-instructional profiles are forbidden.' using errcode = '42501';
  end if;

  select * into v_registry from public.adult_educator_registry where teacher_id = v_uid;
  if v_registry.teacher_id is null or v_registry.verified_adult is not true then
    raise exception 'Access Denied: No valid adult educator eligibility registry confirms this account.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'teacher_id', v_uid,
    'email', coalesce(v_user.email, ''),
    'role', 'teacher',
    'adult_verified', true,
    'verified_at', v_registry.verified_at
  );
end;
$$;

revoke all on function public.verify_adult_teacher_eligibility() from public, anon;
grant execute on function public.verify_adult_teacher_eligibility() to authenticated;

notify pgrst, 'reload schema';

commit;
