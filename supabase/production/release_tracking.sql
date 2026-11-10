-- PROPOSAL ONLY. Records only SQL actually applied in the approved release.
-- Existing untracked 0002-0010 definitions are NOT retroactively marked applied.
begin;
do $$ begin
  if current_setting('app.vera_release_target',true) is distinct from 'iopgzmvaqobigjwibual' then
    raise exception 'Approved production release context required';
  end if;
end $$;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations(
  version text primary key, statements text[], name text
);
revoke all on schema supabase_migrations from public,anon,authenticated;
revoke all on supabase_migrations.schema_migrations from public,anon,authenticated;
create table public.vera_production_release_checksums(
  file_path text primary key,
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  migration_version text unique references supabase_migrations.schema_migrations(version),
  applied_at timestamptz not null default now()
);
alter table public.vera_production_release_checksums enable row level security;
revoke all on public.vera_production_release_checksums from public,anon,authenticated;
commit;
