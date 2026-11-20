-- Proposal only. Requires explicit approval to grant the existing founder account
-- academy administrator rights. The operator pins the privately verified Auth UUID.
-- No accounts/profiles/passwords are created, reset or deleted.
begin;
do $$
declare owner_id uuid:=nullif(current_setting('app.vera_owner_bootstrap_user',true),'')::uuid;
begin
 if current_setting('app.vera_release_target',true) is distinct from 'iopgzmvaqobigjwibual' or owner_id is null then
  raise exception 'Explicit approved production target and founder UUID required' using errcode='42501';
 end if;
 if not exists(select 1 from public.teachers t join auth.users u on u.id=t.id where t.id=owner_id and u.email_confirmed_at is not null) then
  raise exception 'Existing confirmed founder teacher required' using errcode='42501';
 end if;
 if exists(select 1 from public.academic_admins where user_id<>owner_id) then
  raise exception 'Administrator membership changed; review before bootstrapping' using errcode='40001';
 end if;
 insert into public.academic_admins(user_id) values(owner_id) on conflict(user_id) do nothing;
end $$;
commit;
