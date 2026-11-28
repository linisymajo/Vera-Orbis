-- Adult-only academy admission. Existing account eligibility is established by
-- the founder's explicit 2026-11-28 confirmation, not inferred from birth dates.
-- No Auth password, profile, enrollment status or academic record is rewritten.
begin;
create table public.adult_admissions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 attested_at timestamptz,
 verified_at timestamptz,
 verified_by uuid references auth.users(id) on delete set null,
 method text not null check(method in('pending','founder_existing_adults','teacher_verified')),
 check((verified_at is null and method='pending') or (verified_at is not null and method<>'pending'))
);
alter table public.adult_admissions enable row level security;
revoke all on public.adult_admissions from public,anon,authenticated;
grant select on public.adult_admissions to authenticated;
create policy "read own adult admission" on public.adult_admissions for select to authenticated using(user_id=auth.uid());
insert into public.adult_admissions(user_id,verified_at,method)
 select id,now(),'founder_existing_adults' from auth.users;

create function public.has_adult_admission(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.adult_admissions where user_id=p_user_id and verified_at is not null)
$$;
create function public.require_adult_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_user_meta_data->'adult_18_plus' is distinct from 'true'::jsonb or new.raw_user_meta_data->'service_region_eligible' is distinct from 'true'::jsonb then
  raise exception 'Vera Orbis admits adults aged 18+ only. Adult admission declaration is required.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger vera_orbis_adult_signup before insert on auth.users for each row execute function public.require_adult_signup();
create function public.record_adult_admission_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.adult_admissions(user_id,attested_at,method) values(new.id,now(),'pending');
 return new;
end $$;
create trigger vera_orbis_adult_request after insert on auth.users for each row execute function public.record_adult_admission_request();

create or replace function public.is_academic_staff() returns boolean language sql stable security definer set search_path='' as $$
 select public.has_adult_admission(auth.uid()) and (public.is_academic_admin() or exists(
 select 1 from public.teachers t join auth.users u on u.id=t.id where t.id=auth.uid() and u.email_confirmed_at is not null))
$$;
create or replace function public.student_has_academic_access(p_student_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_adult_admission(p_student_id) and exists(select 1 from public.enrollments e join auth.users u on u.id=e.student_id
 where e.student_id=p_student_id and e.status='approved' and u.email_confirmed_at is not null) and not public._student_deletion_pending(p_student_id)
$$;
create or replace function public.can_teacher_access_student(p_teacher_id uuid,p_student_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_adult_admission(p_teacher_id) and exists(
 select 1 from public.teachers t join auth.users u on u.id=t.id join public.enrollments e on e.student_id=p_student_id
 where t.id=p_teacher_id and u.email_confirmed_at is not null and public.student_has_academic_access(p_student_id)
 and(e.teacher_id=p_teacher_id or e.source='legacy' or exists(select 1 from public.academic_admins a where a.user_id=p_teacher_id)))
$$;
create function public.guard_adult_enrollment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and not public.has_adult_admission(new.student_id) then
  raise exception 'Verify adult admission before approving academic access.' using errcode='42501';
 end if;
 return new;
end $$;
create trigger vera_orbis_adult_enrollment before insert or update of status on public.enrollments for each row execute function public.guard_adult_enrollment();

create table public.adult_invitation_verifications (
 invitation_id uuid primary key references public.enrollment_invitations(id) on delete cascade,
 verified_by uuid not null references auth.users(id), verified_at timestamptz not null default now()
);
alter table public.adult_invitation_verifications enable row level security;
revoke all on public.adult_invitation_verifications from public,anon,authenticated;
-- Earlier invitations have not established the new admission verification.
alter function public.create_student_invitation(text) rename to _adult_previous_create_invitation;
revoke all on function public._adult_previous_create_invitation(text) from public,anon,authenticated,service_role;
create function public.create_student_invitation(p_email text,p_adult_verified boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_academic_staff() or p_adult_verified is distinct from true then raise exception 'A verified adult teacher must confirm adult admission and eligible service region.' using errcode='42501'; end if;
 result:=public._adult_previous_create_invitation(p_email);
 insert into public.adult_invitation_verifications(invitation_id,verified_by) values((result->>'id')::uuid,auth.uid());
 return result;
end $$;
alter function public.accept_student_invitation(text) rename to _adult_previous_accept_invitation;
revoke all on function public._adult_previous_accept_invitation(text) from public,anon,authenticated,service_role;
create function public.accept_student_invitation(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare invitation public.enrollment_invitations; verifier uuid;
begin
 if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation' using errcode='42501'; end if;
 select * into invitation from public.enrollment_invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 select v.verified_by into verifier from public.adult_invitation_verifications v where v.invitation_id=invitation.id;
 if not public.has_adult_admission(auth.uid()) then
  if verifier is null or not public.has_adult_admission(verifier)
   or not exists(select 1 from public.adult_admissions where user_id=auth.uid() and attested_at is not null)
   or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and lower(email)=invitation.email) then
   raise exception 'Adult admission verification is required. Ask the teacher to review your enrollment.' using errcode='42501';
  end if;
  update public.adult_admissions set verified_at=now(),verified_by=verifier,method='teacher_verified' where user_id=auth.uid();
 end if;
 return public._adult_previous_accept_invitation(p_token);
end $$;
alter function public.review_student_enrollment(uuid,boolean,uuid) rename to _adult_previous_review_enrollment;
revoke all on function public._adult_previous_review_enrollment(uuid,boolean,uuid) from public,anon,authenticated,service_role;
create function public.review_student_enrollment(p_student_id uuid,p_approve boolean,p_teacher_id uuid default null,p_adult_verified boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_academic_admin() or not public.is_academic_staff() then raise exception 'Verified adult administrator required' using errcode='42501'; end if;
 if p_approve then
  if p_adult_verified is distinct from true then raise exception 'Verify that the learner is 18+ before approving admission.' using errcode='42501'; end if;
  if not exists(select 1 from public.adult_admissions where user_id=p_student_id and (attested_at is not null or verified_at is not null)) then raise exception 'Adult admission declaration required' using errcode='42501'; end if;
  update public.adult_admissions set verified_at=now(),verified_by=auth.uid(),method='teacher_verified' where user_id=p_student_id;
 end if;
 return public._adult_previous_review_enrollment(p_student_id,p_approve,p_teacher_id);
end $$;
alter function public.get_my_enrollment() rename to _adult_previous_get_enrollment;
revoke all on function public._adult_previous_get_enrollment() from public,anon,authenticated,service_role;
create function public.get_my_enrollment() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 return public._adult_previous_get_enrollment() || jsonb_build_object('adult_admitted',public.has_adult_admission(auth.uid()));
end $$;

revoke all on function public.has_adult_admission(uuid),public.require_adult_signup(),public.record_adult_admission_request(),public.guard_adult_enrollment(),
 public.can_teacher_access_student(uuid,uuid),public.create_student_invitation(text,boolean),public.accept_student_invitation(text),public.review_student_enrollment(uuid,boolean,uuid,boolean),public.get_my_enrollment() from public,anon;
revoke all on function public.require_adult_signup(),public.record_adult_admission_request(),public.guard_adult_enrollment() from authenticated;
grant execute on function public.has_adult_admission(uuid),public.can_teacher_access_student(uuid,uuid),public.create_student_invitation(text,boolean),public.accept_student_invitation(text),public.review_student_enrollment(uuid,boolean,uuid,boolean),public.get_my_enrollment() to authenticated;

-- Preserve generated accepted variants without changing the legacy content
-- validator or corrupting previous drafts and their edit/approval contracts.
alter table public.ai_academic_drafts add column accepted_variants jsonb not null default '[]'::jsonb;
create function public.complete_pedagogical_exercise_request(p_request_id uuid,p_content jsonb,p_input_tokens integer,p_output_tokens integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare clean jsonb:=p_content;variants jsonb:='[]';q jsonb;v jsonb;result jsonb;
begin
 if not public.is_academic_staff() then raise exception 'Adult teacher required' using errcode='42501'; end if;
 for q in select value from jsonb_array_elements(p_content->'questions') loop
  v:=q->'accepted_answers';
  if jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v)>20 or exists(select 1 from jsonb_array_elements(v) s where jsonb_typeof(s)<>'string' or length(trim(s#>>'{}')) not between 1 and 300) then raise exception 'Invalid accepted variants' using errcode='22023'; end if;
  variants:=variants||jsonb_build_array(v);
 end loop;
 clean:=jsonb_set(clean,'{questions}',(select jsonb_agg(value-'accepted_answers') from jsonb_array_elements(p_content->'questions')));
 if not exists(select 1 from public.academic_ai_requests where id=p_request_id and teacher_id=auth.uid() and kind='exercise') then raise exception 'Exercise reservation required' using errcode='42501'; end if;
 result:=public.complete_academic_ai_request(p_request_id,clean,p_input_tokens,p_output_tokens);
 update public.ai_academic_drafts set accepted_variants=variants where id=(result->>'id')::uuid and teacher_id=auth.uid() returning to_jsonb(ai_academic_drafts.*) into result;
 return result;
end $$;
revoke all on function public.complete_pedagogical_exercise_request(uuid,jsonb,integer,integer) from public,anon;
grant execute on function public.complete_pedagogical_exercise_request(uuid,jsonb,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
