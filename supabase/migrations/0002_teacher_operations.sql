-- Teacher operations schema. Apply only after reviewing the live schema.
-- All ownership links are composite where a related record can otherwise be
-- crossed between two teachers.

create table if not exists public.teacher_settings (
  teacher_id uuid primary key references public.teachers(id) on delete cascade,
  business_name text,
  default_currency text not null default 'COP',
  available_languages text[] not null default '{}',
  available_levels text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  name text not null,
  language text not null,
  level text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

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

create index if not exists classes_teacher_start_idx on public.classes(teacher_id, starts_at);
create index if not exists class_participants_student_idx on public.class_participants(student_id);
create index if not exists payments_teacher_date_idx on public.payments(teacher_id, paid_at);
create index if not exists leads_teacher_followup_idx on public.leads(teacher_id, next_follow_up_at);

alter table public.teacher_settings enable row level security;
alter table public.classes enable row level security;
alter table public.class_participants enable row level security;
alter table public.class_attendance enable row level security;
alter table public.courses enable row level security;
alter table public.packages enable row level security;
alter table public.student_packages enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.leads enable row level security;
alter table public.culture_resources enable row level security;

create policy "teachers manage own settings" on public.teacher_settings for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage own classes" on public.classes for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage own class participants" on public.class_participants for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage attendance for own classes" on public.class_attendance for all to authenticated
  using (exists (select 1 from public.class_participants p where p.class_id = class_attendance.class_id and p.student_id = class_attendance.student_id and p.teacher_id = (select auth.uid())))
  with check (exists (select 1 from public.class_participants p where p.class_id = class_attendance.class_id and p.student_id = class_attendance.student_id and p.teacher_id = (select auth.uid())));
create policy "teachers manage own courses" on public.courses for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage own packages" on public.packages for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage assigned packages" on public.student_packages for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage own payments" on public.payments for all to authenticated
  using (payments.teacher_id = (select auth.uid()) and (payments.assignment_id is null or exists (select 1 from public.student_packages a where a.assignment_id = payments.assignment_id and a.teacher_id = (select auth.uid()) and a.student_id = payments.student_id)))
  with check (payments.teacher_id = (select auth.uid()) and (payments.assignment_id is null or exists (select 1 from public.student_packages a where a.assignment_id = payments.assignment_id and a.teacher_id = (select auth.uid()) and a.student_id = payments.student_id)));
create policy "teachers manage own expenses" on public.expenses for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage own leads" on public.leads for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers manage own culture resources" on public.culture_resources for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

create policy "students read their class participants" on public.class_participants for select to authenticated
  using (student_id = (select auth.uid()));
create policy "students read their classes" on public.classes for select to authenticated
  using (exists (select 1 from public.class_participants p where p.class_id = classes.id and p.student_id = (select auth.uid())));
create policy "students read their attendance" on public.class_attendance for select to authenticated
  using (student_id = (select auth.uid()));
create policy "students read their package assignments" on public.student_packages for select to authenticated
  using (student_id = (select auth.uid()));

-- No SELECT policy is granted on payments to students. This view exposes only
-- non-sensitive fields and filters by the authenticated student's own UUID.
create or replace view public.student_payment_summary
with (security_invoker = false) as
select id, student_id, assignment_id, amount, currency, status, paid_at, created_at
from public.payments
where student_id = (select auth.uid());
revoke all on public.student_payment_summary from public;
grant select on public.student_payment_summary to authenticated;
