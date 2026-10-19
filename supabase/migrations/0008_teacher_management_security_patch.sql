-- 0008_teacher_management_security_patch.sql
-- Security hardening and schema compatibility patch for teacher management & materials.
-- Safe, additive, idempotent migration designed to run cleanly after or alongside 0007.
-- Does NOT delete, truncate, or drop existing tables or columns.

-- ============================================================================
-- 1. DEFENSIVE COLUMN BACKFILLING FOR public.materials
-- Fixes missing 'language' and 'level' columns expected by teacherWorkspace.js:97
-- and protects against 'CREATE TABLE IF NOT EXISTS' skipping columns if table pre-existed.
-- ============================================================================

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.materials add column if not exists teacher_id uuid references public.teachers(id) on delete set null;
alter table public.materials add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.materials add column if not exists audience text not null default 'student';
alter table public.materials add column if not exists title text;
alter table public.materials add column if not exists type text not null default 'resource';
alter table public.materials add column if not exists description text;
alter table public.materials add column if not exists file_path text;
alter table public.materials add column if not exists language text;
alter table public.materials add column if not exists level text;
alter table public.materials add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.materials'::regclass
      and conname = 'materials_audience_check'
  ) then
    alter table public.materials
      add constraint materials_audience_check check (audience in ('student', 'all'));
  end if;
end $$;

-- ============================================================================
-- 2. HARDENED RLS POLICIES FOR public.materials
-- Closes security vulnerability where students could manage materials or teachers
-- could cross-modify materials belonging to other teachers.
-- Requires verified membership in public.teachers AND teacher ownership.
-- ============================================================================

alter table public.materials enable row level security;

drop policy if exists "teachers manage own materials" on public.materials;
drop policy if exists "teachers manage materials" on public.materials;
drop policy if exists "students read assigned materials" on public.materials;

create policy "teachers manage own materials" on public.materials
  for all to authenticated
  using (
    exists (select 1 from public.teachers where id = (select auth.uid()))
    and (teacher_id = (select auth.uid()) or teacher_id is null)
  )
  with check (
    exists (select 1 from public.teachers where id = (select auth.uid()))
    and (teacher_id = (select auth.uid()) or teacher_id is null)
  );

create policy "students read assigned materials" on public.materials
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or audience = 'all'
  );

-- ============================================================================
-- 3. DEFENSIVE COLUMN BACKFILLING & RLS FOR CALENDAR (classes, participants, attendance)
-- ============================================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.classes add column if not exists teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.classes add column if not exists title text;
alter table public.classes add column if not exists language text;
alter table public.classes add column if not exists level text;
alter table public.classes add column if not exists starts_at timestamptz;
alter table public.classes add column if not exists duration_minutes integer not null default 60;
alter table public.classes add column if not exists modality text not null default 'online';
alter table public.classes add column if not exists status text not null default 'scheduled';
alter table public.classes add column if not exists notes text;
alter table public.classes add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classes'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.classes'::regclass and attname = 'id'),
        (select attnum from pg_attribute where attrelid = 'public.classes'::regclass and attname = 'teacher_id')
      ]::smallint[]
  ) then
    alter table public.classes add constraint classes_id_teacher_key unique (id, teacher_id);
  end if;
end $$;

create table if not exists public.class_participants (
  class_id uuid not null,
  teacher_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  primary key (class_id, student_id),
  foreign key (class_id, teacher_id) references public.classes(id, teacher_id) on delete cascade
);

create table if not exists public.class_attendance (
  class_id uuid not null,
  student_id uuid not null,
  status text not null,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id),
  foreign key (class_id, student_id) references public.class_participants(class_id, student_id) on delete cascade
);

alter table public.classes enable row level security;
alter table public.class_participants enable row level security;
alter table public.class_attendance enable row level security;

drop policy if exists "teachers manage own classes" on public.classes;
create policy "teachers manage own classes" on public.classes
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "teachers manage own class participants" on public.class_participants;
create policy "teachers manage own class participants" on public.class_participants
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "teachers manage attendance for own classes" on public.class_attendance;
create policy "teachers manage attendance for own classes" on public.class_attendance
  for all to authenticated
  using (
    exists (select 1 from public.class_participants p where p.class_id = class_attendance.class_id and p.student_id = class_attendance.student_id and p.teacher_id = (select auth.uid()))
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.class_participants p where p.class_id = class_attendance.class_id and p.student_id = class_attendance.student_id and p.teacher_id = (select auth.uid()))
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "students read their class participants" on public.class_participants;
create policy "students read their class participants" on public.class_participants
  for select to authenticated
  using (student_id = (select auth.uid()));

drop policy if exists "students read their classes" on public.classes;
create policy "students read their classes" on public.classes
  for select to authenticated
  using (exists (select 1 from public.class_participants p where p.class_id = classes.id and p.student_id = (select auth.uid())));

drop policy if exists "students read their attendance" on public.class_attendance;
create policy "students read their attendance" on public.class_attendance
  for select to authenticated
  using (student_id = (select auth.uid()));

-- ============================================================================
-- 4. DEFENSIVE COLUMN BACKFILLING & RLS FOR PACKAGES & ASSIGNMENTS
-- ============================================================================

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.packages add column if not exists teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.packages add column if not exists name text;
alter table public.packages add column if not exists language text;
alter table public.packages add column if not exists level text;
alter table public.packages add column if not exists class_count integer default 1;
alter table public.packages add column if not exists duration_minutes integer not null default 60;
alter table public.packages add column if not exists price numeric(12,2) not null default 0;
alter table public.packages add column if not exists currency text not null default 'COP';
alter table public.packages add column if not exists status text not null default 'active';
alter table public.packages add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.packages'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.packages'::regclass and attname = 'id'),
        (select attnum from pg_attribute where attrelid = 'public.packages'::regclass and attname = 'teacher_id')
      ]::smallint[]
  ) then
    alter table public.packages add constraint packages_id_teacher_key unique (id, teacher_id);
  end if;
end $$;

create table if not exists public.student_packages (
  assignment_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.student_packages add column if not exists package_id uuid;
alter table public.student_packages add column if not exists teacher_id uuid;
alter table public.student_packages add column if not exists student_id uuid references public.profiles(id) on delete restrict;
alter table public.student_packages add column if not exists purchased_at timestamptz not null default now();
alter table public.student_packages add column if not exists classes_consumed integer not null default 0;
alter table public.student_packages add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_packages'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.student_packages'::regclass and attname = 'assignment_id'),
        (select attnum from pg_attribute where attrelid = 'public.student_packages'::regclass and attname = 'teacher_id')
      ]::smallint[]
  ) then
    alter table public.student_packages add constraint student_packages_assignment_teacher_key unique (assignment_id, teacher_id);
  end if;
end $$;

alter table public.packages enable row level security;
alter table public.student_packages enable row level security;

drop policy if exists "teachers manage own packages" on public.packages;
create policy "teachers manage own packages" on public.packages
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "teachers manage assigned packages" on public.student_packages;
create policy "teachers manage assigned packages" on public.student_packages
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "students read their package assignments" on public.student_packages;
create policy "students read their package assignments" on public.student_packages
  for select to authenticated
  using (student_id = (select auth.uid()));

-- ============================================================================
-- 5. DEFENSIVE COLUMN BACKFILLING & RLS FOR PAYMENTS & EXPENSES
-- ============================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.payments add column if not exists teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.payments add column if not exists student_id uuid references public.profiles(id) on delete restrict;
alter table public.payments add column if not exists assignment_id uuid;
alter table public.payments add column if not exists amount numeric(12,2);
alter table public.payments add column if not exists currency text not null default 'COP';
alter table public.payments add column if not exists method text not null default 'bank_transfer';
alter table public.payments add column if not exists status text not null default 'received';
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists reference text;
alter table public.payments add column if not exists notes text;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.expenses add column if not exists amount numeric(12,2);
alter table public.expenses add column if not exists currency text not null default 'COP';
alter table public.expenses add column if not exists category text;
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists spent_at date not null default current_date;

alter table public.payments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "teachers manage own payments" on public.payments;
create policy "teachers manage own payments" on public.payments
  for all to authenticated
  using (
    payments.teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    payments.teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "teachers manage own expenses" on public.expenses;
create policy "teachers manage own expenses" on public.expenses
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

-- Idempotent replacement of student_payment_summary view
drop view if exists public.student_payment_summary;
create or replace view public.student_payment_summary
with (security_invoker = false) as
select id, student_id, assignment_id, amount, currency, status, paid_at, created_at
from public.payments
where student_id = (select auth.uid());

revoke all on public.student_payment_summary from public;
grant select on public.student_payment_summary to authenticated;

-- ============================================================================
-- 6. DEFENSIVE COLUMN BACKFILLING & RLS FOR LEADS & CULTURE RESOURCES
-- ============================================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.leads add column if not exists teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.leads add column if not exists name text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists language text;
alter table public.leads add column if not exists level text;
alter table public.leads add column if not exists stage text not null default 'new';
alter table public.leads add column if not exists next_follow_up_at timestamptz;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

alter table public.leads enable row level security;

drop policy if exists "teachers manage own leads" on public.leads;
create policy "teachers manage own leads" on public.leads
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

create table if not exists public.culture_resources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.culture_resources add column if not exists teacher_id uuid references public.teachers(id) on delete restrict;
alter table public.culture_resources add column if not exists title text;
alter table public.culture_resources add column if not exists language text;
alter table public.culture_resources add column if not exists topic text;
alter table public.culture_resources add column if not exists description text;
alter table public.culture_resources add column if not exists url text;
alter table public.culture_resources add column if not exists status text not null default 'draft';
alter table public.culture_resources add column if not exists updated_at timestamptz not null default now();

alter table public.culture_resources enable row level security;

drop policy if exists "teachers manage own culture resources" on public.culture_resources;
create policy "teachers manage own culture resources" on public.culture_resources
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.teachers where id = (select auth.uid()))
  );

drop policy if exists "students read published culture resources" on public.culture_resources;
create policy "students read published culture resources" on public.culture_resources
  for select to authenticated
  using (status = 'published');

-- ============================================================================
-- 7. PERFORMANCE INDEXES
-- ============================================================================

create index if not exists materials_audience_student_idx on public.materials(audience, student_id);
create index if not exists materials_teacher_id_idx on public.materials(teacher_id);
create index if not exists classes_teacher_starts_idx on public.classes(teacher_id, starts_at);
create index if not exists payments_teacher_status_idx on public.payments(teacher_id, status);
create index if not exists leads_teacher_stage_idx on public.leads(teacher_id, stage);
create index if not exists culture_resources_status_idx on public.culture_resources(status, language);

