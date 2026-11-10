-- PROPOSAL ONLY. Execute after the approved academic migrations.
-- Hosted default ALL privileges include management rights that RLS does not stop.
-- Preserve ordinary academic privileges, ownership, rows and role memberships.
begin;
do $$ declare item record; management text;
begin
  if current_setting('app.vera_release_target',true) is distinct from 'iopgzmvaqobigjwibual' then
    raise exception 'Approved production release context required';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity) then
    raise exception 'Public table without RLS; stop for review';
  end if;
  management := 'truncate,references,trigger' ||
    case when current_setting('server_version_num')::integer>=170000 then ',maintain' else '' end;
  for item in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in('r','p')
      and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass
        and d.objid=c.oid and d.refclassid='pg_extension'::regclass and d.deptype='e')
  loop
    execute format('revoke %s on table public.%I from anon,authenticated',management,item.relname);
  end loop;
end $$;
commit;
