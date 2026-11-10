-- Additional, separately reviewed staging-only mutations. No fake applied
-- versions are inserted here. Record a migration only AFTER its SQL succeeds.
begin;
create table public.vera_staging_environment (
  singleton boolean primary key default true check(singleton),
  environment text not null check(environment='staging'),
  project_ref text not null check(project_ref='duinvkphfnugoyvvlbbq'),
  project_name text not null check(project_name='vera-orbis-staging')
);
insert into public.vera_staging_environment(environment,project_ref,project_name)
values('staging','duinvkphfnugoyvvlbbq','vera-orbis-staging');
create table public.vera_staging_migration_checksums (
  version text primary key check(version ~ '^00(1[1-9]|2[01])$'),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$')
);
create table public.vera_staging_setup_checksums (
  file_path text primary key,
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz not null default now()
);
alter table public.vera_staging_environment enable row level security;
alter table public.vera_staging_migration_checksums enable row level security;
alter table public.vera_staging_setup_checksums enable row level security;
revoke all on public.vera_staging_environment,public.vera_staging_migration_checksums,
  public.vera_staging_setup_checksums from public,anon,authenticated;

create schema if not exists supabase_migrations;
create table supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
revoke all on schema supabase_migrations from public,anon,authenticated;
revoke all on supabase_migrations.schema_migrations from public,anon,authenticated;
commit;
