-- Exercise Studio: additive, private-by-owner authoring and student attempts.
-- Apply only after reviewing the live schema and migration history.

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  title text not null,
  instructions text,
  language text not null,
  level text,
  objective text,
  exercise_type text not null check (exercise_type in (
    'multiple_choice', 'true_false', 'fill_blank', 'matching',
    'ordering', 'reading', 'listening', 'image_vocabulary',
    'open_question', 'writing', 'conversation', 'pronunciation'
  )),
  questions jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

create table if not exists public.exercise_assignments (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  available_from timestamptz,
  due_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned', 'completed', 'revoked')),
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (exercise_id, teacher_id) references public.exercises(id, teacher_id) on delete cascade,
  unique (exercise_id, student_id)
);

create table if not exists public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.exercise_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  answers jsonb not null default '[]'::jsonb,
  score numeric(6,2),
  feedback text,
  submitted_at timestamptz not null default now()
);

create index if not exists exercises_teacher_status_idx on public.exercises(teacher_id, status);
create index if not exists exercise_assignments_student_idx on public.exercise_assignments(student_id, status);
create index if not exists exercise_attempts_assignment_idx on public.exercise_attempts(assignment_id, submitted_at desc);

alter table public.exercises enable row level security;
alter table public.exercise_assignments enable row level security;
alter table public.exercise_attempts enable row level security;

-- Idempotent RLS Policies
drop policy if exists "teachers manage own exercises" on public.exercises;
create policy "teachers manage own exercises" on public.exercises for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists "teachers manage own exercise assignments" on public.exercise_assignments;
create policy "teachers manage own exercise assignments" on public.exercise_assignments for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_assignments.exercise_id
        and e.teacher_id = (select auth.uid())
    )
  );

drop policy if exists "students read assigned published exercises" on public.exercise_assignments;
drop policy if exists "students read own exercise assignments" on public.exercise_assignments;
create policy "students read own exercise assignments" on public.exercise_assignments for select to authenticated
  using (
    student_id = (select auth.uid())
    and status <> 'revoked'
  );

-- Ensure students cannot query raw exercises table to bypass sanitized view
drop policy if exists "students read assigned exercise content" on public.exercises;

drop policy if exists "students manage own exercise attempts" on public.exercise_attempts;
drop policy if exists "students insert own exercise attempts" on public.exercise_attempts;
create policy "students insert own exercise attempts" on public.exercise_attempts for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.exercise_assignments a
      where a.id = exercise_attempts.assignment_id
        and a.student_id = (select auth.uid())
        and a.status <> 'revoked'
    )
  );

drop policy if exists "students read own exercise attempts" on public.exercise_attempts;
create policy "students read own exercise attempts" on public.exercise_attempts for select to authenticated
  using (student_id = (select auth.uid()));

drop policy if exists "teachers read own exercise attempts" on public.exercise_attempts;
drop policy if exists "teachers manage own exercise attempts" on public.exercise_attempts;
create policy "teachers manage own exercise attempts" on public.exercise_attempts for all to authenticated
  using (exists (
    select 1
    from public.exercise_assignments a
    where a.id = exercise_attempts.assignment_id
      and a.teacher_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.exercise_assignments a
    where a.id = exercise_attempts.assignment_id
      and a.teacher_id = (select auth.uid())
  ));

-- Sanitized Student View: strips answers and explanations so students never see the key
create or replace view public.student_exercises
with (security_invoker = false) as
select
  a.id as assignment_id,
  a.student_id,
  a.available_from,
  a.due_at,
  e.id as exercise_id,
  e.title,
  e.instructions,
  e.language,
  e.level,
  e.objective,
  e.exercise_type,
  case
    when jsonb_typeof(e.questions) = 'array' then
      coalesce((
        select jsonb_agg(q - 'answer' - 'explanation' order by ordinality)
        from jsonb_array_elements(e.questions) with ordinality as question(q, ordinality)
      ), '[]'::jsonb)
    else '[]'::jsonb
  end as questions
from public.exercise_assignments a
join public.exercises e on e.id = a.exercise_id
where a.student_id = (select auth.uid())
  and a.status <> 'revoked'
  and e.status = 'published'
  and (a.available_from is null or a.available_from <= now());

-- Grant permissions to authenticated role
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.exercise_assignments to authenticated;
grant select, insert, update, delete on public.exercise_attempts to authenticated;
revoke all on public.student_exercises from public;
grant select on public.student_exercises to authenticated;
