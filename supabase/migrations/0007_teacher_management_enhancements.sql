-- 0007_teacher_management_enhancements.sql
-- Teacher dashboard comprehensive operational enhancements:
-- Materials RLS & management, Calendar, Finance, Leads, and Culture idempotency.

-- 1. Ensure public.materials table exists and has proper RLS policies
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,
  audience text not null default 'student' check (audience in ('student', 'all')),
  title text not null,
  type text not null default 'resource',
  description text,
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.materials enable row level security;

drop policy if exists "teachers manage own materials" on public.materials;
drop policy if exists "teachers manage materials" on public.materials;
drop policy if exists "students read assigned materials" on public.materials;

create policy "teachers manage own materials" on public.materials
  for all to authenticated
  using (
    teacher_id = (select auth.uid())
    or exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    teacher_id = (select auth.uid())
    or exists (select 1 from public.teachers where id = (select auth.uid()))
  );

create policy "students read assigned materials" on public.materials
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or audience = 'all'
  );

-- 2. Ensure public.classes table and participants exist with proper RLS
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  title text not null,
  language text,
  level text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 240),
  modality text not null default 'online' check (modality in ('online', 'in_person', 'hybrid')),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

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
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
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
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists "teachers manage own class participants" on public.class_participants;
create policy "teachers manage own class participants" on public.class_participants
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists "teachers manage attendance for own classes" on public.class_attendance;
create policy "teachers manage attendance for own classes" on public.class_attendance
  for all to authenticated
  using (exists (select 1 from public.class_participants p where p.class_id = class_attendance.class_id and p.student_id = class_attendance.student_id and p.teacher_id = (select auth.uid())))
  with check (exists (select 1 from public.class_participants p where p.class_id = class_attendance.class_id and p.student_id = class_attendance.student_id and p.teacher_id = (select auth.uid())));

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

-- 3. Ensure packages & student_packages exist with proper RLS
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  name text not null,
  language text,
  level text,
  class_count integer not null check (class_count > 0),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 240),
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'COP',
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

create table if not exists public.student_packages (
  assignment_id uuid primary key default gen_random_uuid(),
  package_id uuid not null,
  teacher_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete restrict,
  purchased_at timestamptz not null default now(),
  classes_consumed integer not null default 0 check (classes_consumed >= 0),
  status text not null default 'active' check (status in ('active', 'exhausted', 'expired', 'cancelled')),
  foreign key (package_id, teacher_id) references public.packages(id, teacher_id) on delete restrict,
  unique (assignment_id, teacher_id)
);

alter table public.packages enable row level security;
alter table public.student_packages enable row level security;

drop policy if exists "teachers manage own packages" on public.packages;
create policy "teachers manage own packages" on public.packages
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists "teachers manage assigned packages" on public.student_packages;
create policy "teachers manage assigned packages" on public.student_packages
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists "students read their package assignments" on public.student_packages;
create policy "students read their package assignments" on public.student_packages
  for select to authenticated
  using (student_id = (select auth.uid()));

-- 4. Ensure payments & expenses exist with strict isolation
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  assignment_id uuid,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'COP',
  method text not null check (method in ('bank_transfer', 'nequi', 'daviplata', 'cash')),
  status text not null default 'received' check (status in ('pending', 'partial', 'received', 'cancelled', 'refunded')),
  paid_at timestamptz,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (assignment_id, teacher_id) references public.student_packages(assignment_id, teacher_id) on delete restrict
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'COP',
  category text not null,
  description text,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "teachers manage own payments" on public.payments;
create policy "teachers manage own payments" on public.payments
  for all to authenticated
  using (payments.teacher_id = (select auth.uid()))
  with check (payments.teacher_id = (select auth.uid()));

drop policy if exists "teachers manage own expenses" on public.expenses;
create policy "teachers manage own expenses" on public.expenses
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- Students have NO direct select policy on public.payments or public.expenses.
-- Instead, non-sensitive payment information is provided via student_payment_summary view.
create or replace view public.student_payment_summary
with (security_invoker = false) as
select id, student_id, assignment_id, amount, currency, status, paid_at, created_at
from public.payments
where student_id = (select auth.uid());

revoke all on public.student_payment_summary from public;
grant select on public.student_payment_summary to authenticated;

-- 5. Ensure leads table exists with strict isolation
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  name text not null,
  email text,
  phone text,
  language text,
  level text,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'assessment', 'offer', 'payment_pending', 'converted', 'lost')),
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "teachers manage own leads" on public.leads;
create policy "teachers manage own leads" on public.leads
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- 6. Ensure culture_resources table exists with teacher management & student read of published resources
create table if not exists public.culture_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  title text not null,
  language text not null,
  topic text,
  description text,
  url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.culture_resources enable row level security;

drop policy if exists "teachers manage own culture resources" on public.culture_resources;
create policy "teachers manage own culture resources" on public.culture_resources
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists "students read published culture resources" on public.culture_resources;
create policy "students read published culture resources" on public.culture_resources
  for select to authenticated
  using (status = 'published');

-- Indexes for performance
create index if not exists materials_audience_student_idx on public.materials(audience, student_id);
create index if not exists classes_teacher_starts_idx on public.classes(teacher_id, starts_at);
create index if not exists payments_teacher_status_idx on public.payments(teacher_id, status);
create index if not exists leads_teacher_stage_idx on public.leads(teacher_id, stage);
create index if not exists culture_resources_status_idx on public.culture_resources(status, language);
