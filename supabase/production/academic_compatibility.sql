-- PROPOSAL ONLY: production-specific supplement; separate approval required.
-- Run before 0012-0023 using a host-pinned approved production runner.
begin;
do $$ declare kind text;
begin
  if current_setting('app.vera_release_target',true) is distinct from 'iopgzmvaqobigjwibual' then
    raise exception 'Approved production release context required';
  end if;
  select data_type into kind from information_schema.columns
    where table_schema='public' and table_name='weekly_challenges' and column_name='end_date';
  if kind='date' then
    -- Preserve the UTC midnight represented by the existing date-only API values.
    -- Timed challenge publication otherwise truncates its deadline and fails the
    -- reviewed-snapshot trigger. No row is deleted and no date shifts in UTC.
    alter table public.weekly_challenges alter column end_date type timestamptz
      using (end_date::timestamp without time zone at time zone 'UTC');
  elsif kind is distinct from 'timestamp with time zone' then
    raise exception 'Unexpected challenge deadline type; stop for review';
  end if;
end $$;
commit;
