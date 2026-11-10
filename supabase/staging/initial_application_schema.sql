-- Proposed initial application schema for the independently inspected EMPTY
-- vera-orbis-staging project only. This is a new repository-derived baseline,
-- not a production schema export or evidence of historical migrations.
-- Requires explicit approval of this file and the complete initialization plan.
-- Managed Auth/Storage schemas and their existing records are not recreated.
begin;
do $$ begin
  if exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n
    on n.oid=c.relnamespace where n.nspname='public'
      and c.relkind in ('r','p','v','m','S','f','c')
      and not exists(select 1 from pg_catalog.pg_depend d
        where d.classid='pg_catalog.pg_class'::regclass and d.objid=c.oid
          and d.refclassid='pg_catalog.pg_extension'::regclass and d.deptype='e'))
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n
      on n.oid=p.pronamespace where n.nspname='public'
      and not exists(select 1 from pg_catalog.pg_depend d
        where d.classid='pg_catalog.pg_proc'::regclass and d.objid=p.oid
          and d.refclassid='pg_catalog.pg_extension'::regclass and d.deptype='e')) then
    raise exception 'Initial staging schema requires an empty public application schema';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is not null
    or to_regclass('public.vera_staging_environment') is not null
    or to_regclass('public.vera_staging_migration_checksums') is not null
    or to_regclass('public.vera_staging_setup_checksums') is not null then
    raise exception 'Initial staging schema refuses existing migration history or initialization markers';
  end if;
  if to_regclass('auth.users') is null or to_regclass('storage.objects') is null
    or to_regclass('storage.buckets') is null
    or to_regprocedure('auth.uid()') is null then
    raise exception 'Managed Supabase Auth and Storage are required';
  end if;
  if exists(select 1 from storage.buckets where id in ('materials','academic-submissions')) then
    raise exception 'Initial staging schema requires absent academic storage buckets';
  end if;
end $$;

create table public.teachers (
  id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  language text not null default 'English',
  level text not null default 'A1',
  level_name text not null default 'Beginner',
  progress integer not null default 0 check(progress between 0 and 100),
  lessons_completed integer not null default 0 check(lessons_completed>=0),
  total_lessons integer check(total_lessons>0),
  goal text,
  current_module text not null default 'Getting Started',
  next_step text not null default 'Complete your onboarding',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  learning_goals text, motivation text, previous_experience text,
  real_life_needs text, preferred_topics text, learning_preferences text,
  difficulties text, about_you text, most_important text,
  experience_positive text, experience_negative text, challenge_context text,
  lesson_preferences text, vision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 0005 needs material metadata before 0007's additive definition runs.
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,
  audience text not null default 'student' check(audience in ('student','all')),
  title text not null,
  type text not null default 'resource',
  description text, file_path text, language text, level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.teacher_notes (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now(),
  primary key(teacher_id,student_id)
);

alter table public.teachers enable row level security;
alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.materials enable row level security;
alter table public.teacher_notes enable row level security;
revoke all on public.teachers,public.profiles,public.onboarding_responses,
  public.materials,public.teacher_notes from public,anon,authenticated;
-- These tables stay inaccessible until the reviewed migrations and final access
-- file have installed the real enrollment helpers and least-privilege policies.
commit;
