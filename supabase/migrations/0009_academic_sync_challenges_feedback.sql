-- Migration 0009: Academic Synchronization, Weekly Challenges, Challenge Submissions, and Feedback
-- Idempotent, non-destructive migration ensuring all tables, columns, indexes, and RLS policies
-- required for seamless Teacher Dashboard <-> Student Platform synchronization.

-- ============================================================================
-- 1. PROFILES ENHANCEMENTS & TEACHER MANAGEMENT RLS
-- ============================================================================

-- Ensure all academic and configuration columns exist on public.profiles
alter table public.profiles add column if not exists language text default 'English';
alter table public.profiles add column if not exists level text default 'A1';
alter table public.profiles add column if not exists level_name text default 'Beginner';
alter table public.profiles add column if not exists progress integer default 0;
alter table public.profiles add column if not exists lessons_completed integer default 0;
alter table public.profiles add column if not exists total_lessons integer;
alter table public.profiles add column if not exists current_module text default 'Getting Started';
alter table public.profiles add column if not exists next_step text default 'Complete your onboarding';
alter table public.profiles add column if not exists goal text;
alter table public.profiles add column if not exists interface_language text default 'es';

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Student profile view policy (own profile or verified teacher)
drop policy if exists "users can view own profile" on public.profiles;
drop policy if exists "students view own profile" on public.profiles;
drop policy if exists "teachers can view student profiles" on public.profiles;
create policy "users can view own profile" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (select 1 from public.teachers where id = (select auth.uid()))
  );

-- Student profile update policy: students can update own profile
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "students update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Teacher profile update policy: verified teachers can update student academic profiles
drop policy if exists "teachers can update student profiles" on public.profiles;
create policy "teachers can update student profiles" on public.profiles
  for update to authenticated
  using (exists (select 1 from public.teachers where id = (select auth.uid())))
  with check (exists (select 1 from public.teachers where id = (select auth.uid())));


-- ============================================================================
-- 2. WEEKLY CHALLENGES TABLE & RLS
-- ============================================================================

create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,
  audience text not null default 'student' check (audience in ('student', 'all', 'class')),
  title text not null,
  description text,
  instructions text,
  points integer default 10,
  end_date timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill missing columns defensively
alter table public.weekly_challenges add column if not exists teacher_id uuid references public.teachers(id) on delete set null;
alter table public.weekly_challenges add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.weekly_challenges add column if not exists audience text not null default 'student';
alter table public.weekly_challenges add column if not exists title text;
alter table public.weekly_challenges add column if not exists description text;
alter table public.weekly_challenges add column if not exists instructions text;
alter table public.weekly_challenges add column if not exists points integer default 10;
alter table public.weekly_challenges add column if not exists end_date timestamptz;
alter table public.weekly_challenges add column if not exists status text not null default 'active';
alter table public.weekly_challenges add column if not exists created_at timestamptz not null default now();
alter table public.weekly_challenges add column if not exists updated_at timestamptz not null default now();

-- Indexes for performance
create index if not exists weekly_challenges_student_idx on public.weekly_challenges(student_id);
create index if not exists weekly_challenges_audience_idx on public.weekly_challenges(audience);
create index if not exists weekly_challenges_status_idx on public.weekly_challenges(status);
create index if not exists weekly_challenges_created_idx on public.weekly_challenges(created_at desc);

-- Enable RLS
alter table public.weekly_challenges enable row level security;

-- Teachers can manage all weekly challenges
drop policy if exists "teachers manage challenges" on public.weekly_challenges;
drop policy if exists "teachers manage weekly challenges" on public.weekly_challenges;
create policy "teachers manage weekly challenges" on public.weekly_challenges
  for all to authenticated
  using (exists (select 1 from public.teachers where id = (select auth.uid())))
  with check (exists (select 1 from public.teachers where id = (select auth.uid())));

-- Students can read challenges assigned to them or global ('all' or student_id is null)
drop policy if exists "students read assigned challenges" on public.weekly_challenges;
create policy "students read assigned challenges" on public.weekly_challenges
  for select to authenticated
 using (
  student_id = (select auth.uid())
  or audience = 'all'
);


-- ============================================================================
-- 3. CHALLENGE SUBMISSIONS TABLE & RLS
-- ============================================================================

create table if not exists public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  response text not null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'completed')),
  teacher_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill missing columns defensively
alter table public.challenge_submissions add column if not exists challenge_id uuid references public.weekly_challenges(id) on delete cascade;
alter table public.challenge_submissions add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.challenge_submissions add column if not exists response text;
alter table public.challenge_submissions add column if not exists status text not null default 'submitted';
alter table public.challenge_submissions add column if not exists teacher_feedback text;
alter table public.challenge_submissions add column if not exists created_at timestamptz not null default now();
alter table public.challenge_submissions add column if not exists updated_at timestamptz not null default now();

-- Handle legacy user_id column if it pre-existed
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'challenge_submissions' and column_name = 'user_id'
  ) then
    execute 'update public.challenge_submissions set student_id = coalesce(student_id, user_id) where student_id is null';
  end if;
end $$;

-- Indexes for challenge submissions
create index if not exists challenge_submissions_student_idx on public.challenge_submissions(student_id);
create index if not exists challenge_submissions_challenge_idx on public.challenge_submissions(challenge_id);
create index if not exists challenge_submissions_created_idx on public.challenge_submissions(created_at desc);

-- Enable RLS
alter table public.challenge_submissions enable row level security;

-- Teachers can manage all challenge submissions
drop policy if exists "teachers manage challenge submissions" on public.challenge_submissions;
create policy "teachers manage challenge submissions" on public.challenge_submissions
  for all to authenticated
  using (exists (select 1 from public.teachers where id = (select auth.uid())))
  with check (exists (select 1 from public.teachers where id = (select auth.uid())));

-- Students can read their own submissions
drop policy if exists "students read own submissions" on public.challenge_submissions;
create policy "students read own submissions" on public.challenge_submissions
  for select to authenticated
  using (student_id = (select auth.uid()));

-- Students can insert their own submissions
drop policy if exists "students insert own submissions" on public.challenge_submissions;
create policy "students insert own submissions" on public.challenge_submissions
  for insert to authenticated
  with check (student_id = (select auth.uid()));


-- ============================================================================
-- 4. FEEDBACK TABLE & RLS
-- ============================================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'General',
  title text not null default 'Feedback',
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill missing columns defensively
alter table public.feedback add column if not exists teacher_id uuid references public.teachers(id) on delete set null;
alter table public.feedback add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.feedback add column if not exists category text not null default 'General';
alter table public.feedback add column if not exists title text not null default 'Feedback';
alter table public.feedback add column if not exists message text not null default '';
alter table public.feedback add column if not exists created_at timestamptz not null default now();
alter table public.feedback add column if not exists updated_at timestamptz not null default now();

-- Handle legacy columns if feedback pre-existed with notes / type
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'feedback' and column_name = 'notes'
  ) then
    execute 'update public.feedback set message = coalesce(nullif(message, ''''), notes) where message = '''' or message is null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'feedback' and column_name = 'type'
  ) then
    execute 'update public.feedback set title = coalesce(nullif(title, ''''), type) where title = '''' or title = ''Feedback''';
  end if;
end $$;

-- Indexes for feedback
create index if not exists feedback_student_idx on public.feedback(student_id, created_at desc);

-- Enable RLS
alter table public.feedback enable row level security;

-- Teachers can manage all feedback
drop policy if exists "teachers manage feedback" on public.feedback;
create policy "teachers manage feedback" on public.feedback
  for all to authenticated
  using (exists (select 1 from public.teachers where id = (select auth.uid())))
  with check (exists (select 1 from public.teachers where id = (select auth.uid())));

-- Students can read their own feedback
drop policy if exists "students read own feedback" on public.feedback;
create policy "students read own feedback" on public.feedback
  for select to authenticated
  using (student_id = (select auth.uid()));

-- Permissions
grant select, insert, update, delete on public.weekly_challenges to authenticated;
grant select, insert, update, delete on public.challenge_submissions to authenticated;
grant select, insert, update, delete on public.feedback to authenticated;
grant select, update on public.profiles to authenticated;

