-- Corrective migration for a legacy installation of teacher operations.
-- Do not run this together with 0002. It is safe to run after checking the
-- current schema: existing columns, constraints and rows are preserved.

do $$
begin
  if to_regclass('public.classes') is null
     or to_regclass('public.packages') is null
     or to_regclass('public.student_packages') is null
     or to_regclass('public.payments') is null then
    raise exception '0003 requires the legacy classes, packages, student_packages and payments tables';
  end if;
end $$;

alter table public.classes add column if not exists teacher_id uuid;

do $$
begin
  if exists (
    select 1 from public.classes where teacher_id is null
  ) then
    raise exception '0003 cannot infer teacher_id for existing classes; review and backfill those rows first';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.classes'::regclass
      and c.contype in ('p', 'u')
      and c.conkey = array[
        (select attnum from pg_attribute where attrelid = c.conrelid and attname = 'id'),
        (select attnum from pg_attribute where attrelid = c.conrelid and attname = 'teacher_id')
      ]::smallint[]
  ) then
    alter table public.classes add constraint classes_id_teacher_key unique (id, teacher_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.packages'::regclass
      and c.contype in ('p', 'u')
      and c.conkey = array[
        (select attnum from pg_attribute where attrelid = c.conrelid and attname = 'id'),
        (select attnum from pg_attribute where attrelid = c.conrelid and attname = 'teacher_id')
      ]::smallint[]
  ) then
    alter table public.packages add constraint packages_id_teacher_key unique (id, teacher_id);
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

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'classes'
      and column_name = 'student_id'
  ) then
    execute $query$
      insert into public.class_participants (class_id, teacher_id, student_id)
      select id, teacher_id, student_id
      from public.classes
      where student_id is not null
      on conflict (class_id, student_id) do nothing
    $query$;
  end if;
end $$;

alter table public.student_packages add column if not exists assignment_id uuid default gen_random_uuid();
alter table public.student_packages add column if not exists teacher_id uuid;

update public.student_packages sp
set teacher_id = p.teacher_id
from public.packages p
where p.id = sp.package_id and sp.teacher_id is null;

do $$
begin
  if exists (select 1 from public.student_packages where teacher_id is null) then
    raise exception '0003 cannot infer teacher_id for existing package assignments; review and backfill those rows first';
  end if;

  alter table public.student_packages alter column assignment_id set not null;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_packages'::regclass
      and conname = 'student_packages_teacher_required'
  ) then
    alter table public.student_packages
      add constraint student_packages_teacher_required check (teacher_id is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_packages'::regclass
      and conname = 'student_packages_package_teacher_fk'
  ) then
    alter table public.student_packages
      add constraint student_packages_package_teacher_fk
      foreign key (package_id, teacher_id)
      references public.packages(id, teacher_id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_packages'::regclass
      and contype = 'p'
      and conkey = array[
        (select attnum from pg_attribute
         where attrelid = 'public.student_packages'::regclass
           and attname = 'assignment_id')
      ]::smallint[]
  ) then
    if exists (
      select 1 from pg_constraint
      where conrelid = 'public.student_packages'::regclass
        and contype = 'p'
    ) then
      execute format(
        'alter table public.student_packages drop constraint %I',
        (select conname from pg_constraint
         where conrelid = 'public.student_packages'::regclass
           and contype = 'p'
         limit 1)
      );
    end if;
    alter table public.student_packages add primary key (assignment_id);
  end if;
end $$;

alter table public.payments add column if not exists assignment_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_assignment_fk'
  ) then
    alter table public.payments
      add constraint payments_assignment_fk
      foreign key (assignment_id)
      references public.student_packages(assignment_id)
      on delete restrict;
  end if;
end $$;

-- Existing package_id/payment rows are retained. Mapping a payment to a
-- repeated assignment requires an explicit business decision and is not
-- guessed by this migration.
drop policy if exists "students read their payments" on public.payments;

create or replace view public.student_payment_summary
with (security_invoker = false) as
select id, student_id, assignment_id, amount, currency, status, paid_at, created_at
from public.payments
where student_id = (select auth.uid());

revoke all on public.student_payment_summary from public;
grant select on public.student_payment_summary to authenticated;
