-- Proposal only. Installs deletion capability; deletes NO accounts/data at deployment.
-- Requires 0030, 0018, 0021, 0029. Execution requires a separate typed admin confirmation.
begin;
create table public.student_retention_holds(
 id uuid primary key default gen_random_uuid(),student_id uuid not null,
 reason text not null check(length(btrim(reason)) between 1 and 1000),
 active boolean not null default true,created_by uuid not null,created_at timestamptz not null default now()
);
create table public.student_deletion_jobs(
 id uuid primary key default gen_random_uuid(),student_id uuid not null,actor_id uuid not null,
 request_id uuid not null,stage text not null default 'preview' check(stage in('preview','files','database','auth','complete')),
 snapshot text not null,files jsonb not null,counts jsonb not null,lease uuid,lease_until timestamptz,
 failure_code text,retention_reviewed boolean not null default false,shared_reviewed boolean not null default false,
 created_at timestamptz not null default now(),approved_at timestamptz,completed_at timestamptz,
 unique(actor_id,request_id)
);
create unique index one_pending_student_deletion on public.student_deletion_jobs(student_id) where stage in('files','database','auth');
alter table public.student_retention_holds enable row level security;
alter table public.student_deletion_jobs enable row level security;
revoke all on public.student_retention_holds,public.student_deletion_jobs from public,anon,authenticated;
-- Jobs contain leases/file paths and are deliberately available only through bounded RPCs.
grant select on public.student_retention_holds to authenticated;
create policy "administrator retention decisions" on public.student_retention_holds for select to authenticated using(public.is_academic_admin());

create function public._student_deletion_pending(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.student_deletion_jobs where student_id=sid and stage in('files','database','auth'))
$$;
-- Revoke academic access independently of a previously issued Auth session.
create or replace function public.student_has_academic_access(p_student_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.enrollments e join auth.users u on u.id=e.student_id where e.student_id=p_student_id and e.status='approved' and u.email_confirmed_at is not null)
 and not public._student_deletion_pending(p_student_id)
$$;
revoke all on function public._student_deletion_pending(uuid) from public,anon;
grant execute on function public._student_deletion_pending(uuid) to authenticated;

create function public._student_deletion_inventory(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare counts jsonb:='{}'; fingerprints jsonb:='{}'; files jsonb; blockers jsonb:='[]'; t text; n bigint; fp text; u auth.users; p public.profiles; r record;
begin
 select * into u from auth.users where id=sid;select * into p from public.profiles where id=sid;
 if u.id is null or p.id is null then blockers:=blockers||'"account_or_profile_missing"'::jsonb; end if;
 if exists(select 1 from public.teachers where id=sid) or exists(select 1 from public.academic_admins where user_id=sid) then blockers:=blockers||'"account_has_staff_role"'::jsonb;end if;
 if exists(select 1 from public.student_retention_holds where student_id=sid and active) then blockers:=blockers||'"active_retention_hold"'::jsonb;end if;
 if exists(select 1 from public.payments where student_id=sid) then blockers:=blockers||'"accounting_records_require_retention"'::jsonb;end if;
 if exists(select 1 from public.student_packages sp join public.packages pk on pk.id=sp.package_id where sp.student_id=sid and(pk.price>0 or(sp.status='active' and sp.classes_consumed<pk.class_count))) then blockers:=blockers||'"course_or_contract_requires_review"'::jsonb;end if;
 if exists(select 1 from public.class_participants cp join public.classes c on c.id=cp.class_id where cp.student_id=sid and c.status in('scheduled','rescheduled') and c.starts_at>=now()) then blockers:=blockers||'"future_classes_require_resolution"'::jsonb;end if;
 if exists(select 1 from public.learning_plan_versions v join public.learning_plan_versions other on other.base_version_id=v.id or other.prior_approved_version_id=v.id where v.student_id=sid and other.student_id<>sid)
 or exists(select 1 from public.learning_plan_objective_events x join public.learning_plan_versions v on v.id=x.version_id where x.actor_id=sid and v.student_id<>sid)
 or exists(select 1 from public.learning_plan_objective_progress x join public.learning_plan_versions v on v.id=x.version_id where x.updated_by=sid and v.student_id<>sid)
 or exists(select 1 from public.enrollments where approved_by=sid and student_id<>sid) then blockers:=blockers||'"cross_account_reference_requires_review"'::jsonb;end if;
 if exists(select 1 from public.challenge_publications x join public.ai_academic_drafts d on d.id=x.ai_draft_id where d.student_id=sid and exists(select 1 from unnest(x.student_ids) s where s<>sid))
 or exists(select 1 from public.weekly_challenges c join public.challenge_submissions s on s.challenge_id=c.id where c.student_id=sid and s.student_id<>sid)
 then blockers:=blockers||'"shared_challenge_requires_review"'::jsonb;end if;
 if exists(select 1 from public.materials m join public.learning_journey_bindings b on b.student_id<>sid where m.student_id=sid and exists(select 1 from jsonb_each(b.lessons) l where l.value->'material_ids' ? m.id::text)) then blockers:=blockers||'"shared_material_reference_requires_review"'::jsonb;end if;
 if exists(select 1 from public.materials where student_id=sid and audience='all') then blockers:=blockers||'"shared_material_requires_review"'::jsonb;end if;
 -- Unknown future direct references fail closed instead of being cascaded away.
 for r in select n.nspname ns,c.relname tab,a.attname col from pg_constraint fk join pg_class c on c.oid=fk.conrelid join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum=any(fk.conkey)
 where fk.contype='f' and fk.confrelid in('public.profiles'::regclass,'auth.users'::regclass) and n.nspname='public' loop
  if r.tab not in('profiles','teachers','academic_admins','academic_ai_consents','academic_ai_requests','academic_context_reviews','academic_notifications','ai_academic_drafts','challenge_submissions','class_participants','enrollment_invitations','enrollments','exercise_assignments','exercise_attachment_versions','exercise_attachments','exercise_attempts','exercise_correction_results','exercise_practice_drafts','exercise_question_checks','feedback','inbox_messages','learning_architect_runs','learning_journey_bindings','learning_plan_objective_events','learning_plan_objective_progress','learning_plan_publications','learning_plan_versions','material_text_versions','materials','onboarding_responses','payments','student_packages','student_roster_states','teacher_notes','unified_academic_runs','weekly_challenges','work_plans') then
   execute format('select count(*) from %I.%I where %I=$1',r.ns,r.tab,r.col) into n using sid;if n>0 then blockers:=blockers||to_jsonb('unreviewed_reference:'||r.tab);end if;
  elsif not(r.col='student_id' or(r.tab='profiles' and r.col='id') or(r.tab='academic_notifications' and r.col='recipient_id') or(r.tab='inbox_messages' and r.col in('sender_id','recipient_id')) or(r.tab='enrollment_invitations' and r.col='accepted_by') or(r.tab='learning_plan_objective_events' and r.col='actor_id') or(r.tab='learning_plan_objective_progress' and r.col='updated_by')) then
   execute format('select count(*) from %I.%I where %I=$1',r.ns,r.tab,r.col) into n using sid;if n>0 then blockers:=blockers||to_jsonb('retained_role_reference:'||r.tab||'.'||r.col);end if;
  end if;
 end loop;
 select md5(coalesce(string_agg(v,'' order by v),'')) into fp from(
 select md5(to_jsonb(x)::text) v from public.exercise_feedback_versions x where attempt_id in(select id from public.exercise_attempts where student_id=sid)
 union all select md5(to_jsonb(x)::text) from public.final_results x where attempt_id in(select id from public.exercise_attempts where student_id=sid)
 union all select md5(to_jsonb(x)::text) from public.learning_plan_objective_events x where version_id in(select id from public.learning_plan_versions where student_id=sid)
 union all select md5(to_jsonb(x)::text) from public.learning_plan_objective_progress x where version_id in(select id from public.learning_plan_versions where student_id=sid)
 union all select md5(to_jsonb(x)::text) from public.inbox_messages x where sender_id=sid or recipient_id=sid
 union all select md5(to_jsonb(x)::text) from public.academic_notifications x where recipient_id=sid
 union all select md5(to_jsonb(x)::text) from public.enrollment_invitations x where accepted_by=sid
 ) indirect;
 fingerprints:=fingerprints||jsonb_build_object('indirect',fp);
 foreach t in array array['profiles','enrollments','academic_ai_consents','academic_ai_requests','academic_context_reviews','ai_academic_drafts','challenge_submissions','class_participants','exercise_assignments','exercise_attachment_versions','exercise_attachments','exercise_attempts','exercise_correction_results','exercise_practice_drafts','exercise_question_checks','feedback','learning_architect_runs','learning_journey_bindings','learning_plan_publications','learning_plan_versions','material_text_versions','materials','onboarding_responses','payments','student_packages','student_roster_states','teacher_notes','unified_academic_runs','weekly_challenges','work_plans'] loop
  if to_regclass('public.'||t) is not null then
   execute format('select count(*),md5(coalesce(string_agg(v,'''' order by v),'''')) from(select md5(to_jsonb(x)::text)v from public.%I x where %I=$1)q',t,case when t='profiles' then 'id' else 'student_id' end) into n,fp using sid;
   counts:=counts||jsonb_build_object(t,n);fingerprints:=fingerprints||jsonb_build_object(t,fp);
  end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('bucket',o.bucket_id,'path',o.name,'id',o.id,'fingerprint',md5(to_jsonb(o)::text)) order by o.bucket_id,o.name),'[]') into files from storage.objects o where
 (o.bucket_id='academic-submissions' and split_part(o.name,'/',1)=sid::text)
 or(o.bucket_id='materials' and exists(select 1 from public.materials m where m.student_id=sid and m.file_path=o.name and m.teacher_id::text=split_part(o.name,'/',1))
 and not exists(select 1 from public.materials other where other.file_path=o.name and other.student_id is distinct from sid));
 if exists(select 1 from public.exercise_attachments a where a.student_id=sid and(split_part(a.file_path,'/',1)<>sid::text or a.file_path ~ '(^|/)\.\.(/|$)'))
 or exists(select 1 from public.materials m where m.student_id=sid and m.file_path is not null and(split_part(m.file_path,'/',1)<>m.teacher_id::text or m.file_path ~ '(^|/)\.\.(/|$)')) then blockers:=blockers||'"unreviewed_private_file_path"'::jsonb;end if;
 -- A second bucket owned by this user requires its own reviewed cleanup policy.
 if exists(select 1 from storage.objects o where coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=sid::text and o.bucket_id not in('materials','academic-submissions')) then blockers:=blockers||'"unreviewed_storage_bucket"'::jsonb;end if;
 if exists(select 1 from storage.objects o where coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=sid::text and not exists(select 1 from jsonb_array_elements(files) f where f->>'id'=o.id::text)) then blockers:=blockers||'"unreviewed_owned_storage_object"'::jsonb;end if;
 if jsonb_array_length(files)>200 then blockers:=blockers||'"file_count_requires_operator_review"'::jsonb;end if;
 return jsonb_build_object('counts',counts,'files',files,'blockers',blockers,'eligible',jsonb_array_length(blockers)=0,
 'snapshot',md5(coalesce(to_jsonb(u)::text,'')||coalesce(to_jsonb(p)::text,'')||fingerprints::text||files::text),
 'shared_classes',(select count(*) from public.classes c join public.class_participants cp on cp.class_id=c.id where cp.student_id=sid),
 'teacher_count',(select count(distinct teacher_id) from(
 select teacher_id from public.student_packages where student_id=sid
 union all select teacher_id from public.enrollments where student_id=sid
 union all select teacher_id from public.learning_plan_versions where student_id=sid
 union all select c.teacher_id from public.classes c join public.class_participants cp on cp.class_id=c.id where cp.student_id=sid
 union all select teacher_id from public.materials where student_id=sid
 union all select teacher_id from public.exercise_assignments where student_id=sid
 ) owners));
end $$;
revoke all on function public._student_deletion_inventory(uuid) from public,anon,authenticated;

create function public.preview_student_deletion(p_student_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv jsonb;j public.student_deletion_jobs;u auth.users;p public.profiles;
begin
 if not public.is_academic_admin() or p_student_id=auth.uid() then raise exception 'Academy administrator required; self deletion is excluded' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Request ID required' using errcode='22023';end if;
 inv:=public._student_deletion_inventory(p_student_id);select * into u from auth.users where id=p_student_id;select * into p from public.profiles where id=p_student_id;
 if u.id is null then raise exception 'Account unavailable' using errcode='22023';end if;
 insert into public.student_deletion_jobs(student_id,actor_id,request_id,snapshot,files,counts) values(p_student_id,auth.uid(),p_request_id,inv->>'snapshot',inv->'files',inv->'counts')
 on conflict(actor_id,request_id) do nothing;
 select * into j from public.student_deletion_jobs where actor_id=auth.uid() and request_id=p_request_id;
 if j.student_id<>p_student_id then raise exception 'Request ID conflict' using errcode='22023';end if;
 return jsonb_build_object('job_id',j.id,'student_id',p_student_id,'name',p.name,'email',u.email,'eligible',inv->'eligible','blockers',inv->'blockers','counts',inv->'counts','private_files',jsonb_array_length(inv->'files'),'shared_classes_retained',inv->'shared_classes','teacher_count',inv->'teacher_count','reversible',false,'expires_at',j.created_at+interval '10 minutes','stage',j.stage);
end $$;
create function public.confirm_student_deletion(p_job_id uuid,p_confirmation text,p_retention_reviewed boolean,p_shared_reviewed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;inv jsonb;email text;
begin
 if not public.is_academic_admin() then raise exception 'Academy administrator required' using errcode='42501';end if;
 select * into j from public.student_deletion_jobs where id=p_job_id and actor_id=auth.uid() for update;
 if not found then raise exception 'Authorized deletion preview required' using errcode='42501';end if;
 if j.stage<>'preview' then return jsonb_build_object('job_id',j.id,'stage',j.stage);end if;
 if j.created_at<now()-interval '10 minutes' or not p_retention_reviewed or not p_shared_reviewed then raise exception 'Fresh preview and explicit retention/shared-resource review required' using errcode='22023';end if;
 select lower(btrim(u.email)) into email from auth.users u where u.id=j.student_id;
 if lower(btrim(p_confirmation)) is distinct from 'delete '||email then raise exception 'Type DELETE followed by the exact account email' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('student-management:'||j.student_id::text,0));
 inv:=public._student_deletion_inventory(j.student_id);
 if not(inv->>'eligible')::boolean or inv->>'snapshot'<>j.snapshot then raise exception 'Account or retention conditions changed. Review again.' using errcode='40001';end if;
 update public.enrollments set status='suspended',updated_at=now() where student_id=j.student_id;
 update public.student_deletion_jobs set stage='files',approved_at=now(),retention_reviewed=true,shared_reviewed=true where id=j.id;
 insert into public.student_management_events(student_id,actor_id,teacher_id,action,request_id,revision,details)
 select j.student_id,auth.uid(),e.teacher_id,'delete_confirmed',j.id,0,jsonb_build_object('job_id',j.id,'counts',j.counts) from public.enrollments e where e.student_id=j.student_id;
 return jsonb_build_object('job_id',j.id,'stage','files');
end $$;
create function public.student_deletion_status(p_job_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare j public.student_deletion_jobs;
begin
 if not public.is_academic_admin() then raise exception 'Academy administrator required' using errcode='42501';end if;
 select * into j from public.student_deletion_jobs where id=p_job_id;
 if not found then raise exception 'Deletion unavailable' using errcode='42501';end if;
 return jsonb_build_object('job_id',j.id,'student_id',j.student_id,'stage',j.stage,'failure_code',j.failure_code,'completed_at',j.completed_at,'private_files',jsonb_array_length(j.files),'counts',j.counts);
end $$;
create function public.list_student_deletion_jobs() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_academic_admin() then raise exception 'Academy administrator required' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('job_id',id,'student_id',student_id,'stage',stage,'failure_code',failure_code)),'[]') from(select * from public.student_deletion_jobs where actor_id=auth.uid() and stage in('files','database','auth') order by created_at desc limit 50)j);
end $$;
create function public.set_student_retention_hold(p_student_id uuid,p_reason text,p_active boolean,p_hold_id uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_academic_admin() then raise exception 'Academy administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('student-management:'||p_student_id::text,0));
 if p_active then insert into public.student_retention_holds(student_id,reason,created_by) values(p_student_id,p_reason,auth.uid());
 else update public.student_retention_holds set active=false where id=p_hold_id and student_id=p_student_id;end if;
end $$;

-- Only the administrator-validated server endpoint can use worker/lease functions.
create function public.claim_student_deletion(p_job_id uuid,p_actor_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;inv jsonb;
begin
 if not exists(select 1 from public.academic_admins a join auth.users u on u.id=a.user_id where a.user_id=p_actor_id and u.email_confirmed_at is not null) then raise exception 'Current administrator required' using errcode='42501';end if;
 select * into j from public.student_deletion_jobs where id=p_job_id for update;
 if not found or j.actor_id<>p_actor_id or j.stage='preview' then raise exception 'Confirmed authorized job required' using errcode='42501';end if;
 if j.stage='complete' then return jsonb_build_object('job_id',j.id,'stage','complete');end if;
 if exists(select 1 from public.student_retention_holds where student_id=j.student_id and active) or exists(select 1 from public.payments where student_id=j.student_id) or exists(select 1 from public.teachers where id=j.student_id) or exists(select 1 from public.academic_admins where user_id=j.student_id) then raise exception 'Retention or staff protection prevents deletion' using errcode='42501';end if;
 if j.stage in('files','database') then inv:=public._student_deletion_inventory(j.student_id);if not(inv->>'eligible')::boolean then raise exception 'Retention or shared references require review' using errcode='42501';end if;end if;
 if j.lease_until>now() then raise exception 'Deletion is already processing' using errcode='55P03';end if;
 update public.student_deletion_jobs set lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',failure_code=null where id=j.id returning * into j;
 return jsonb_build_object('job_id',j.id,'student_id',j.student_id,'stage',j.stage,'lease',j.lease,'files',j.files);
end $$;
create function public._assert_student_deletion_lease(jid uuid,token uuid) returns public.student_deletion_jobs language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;
begin
 select * into j from public.student_deletion_jobs where id=jid and lease=token and lease_until>now() for update;
 if not found or j.stage in('preview','complete') then raise exception 'Active worker lease required' using errcode='42501';end if;
 if not exists(select 1 from public.academic_admins a join auth.users u on u.id=a.user_id where a.user_id=j.actor_id and u.email_confirmed_at is not null) then raise exception 'Current administrator required' using errcode='42501';end if;
 if exists(select 1 from public.student_retention_holds where student_id=j.student_id and active) or exists(select 1 from public.payments where student_id=j.student_id) or exists(select 1 from public.teachers where id=j.student_id) or exists(select 1 from public.academic_admins where user_id=j.student_id) then raise exception 'Retention or staff protection prevents deletion' using errcode='42501';end if;
 return j;
end $$;
create function public.record_student_deletion_files(p_job_id uuid,p_lease uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;f jsonb;
begin
 j:=public._assert_student_deletion_lease(p_job_id,p_lease);
 if j.stage<>'files' then raise exception 'File stage required' using errcode='55000';end if;
 for f in select value from jsonb_array_elements(j.files) loop
 if exists(select 1 from storage.objects o where o.bucket_id=f->>'bucket' and o.name=f->>'path') then raise exception 'Private Storage cleanup incomplete' using errcode='55000';end if;end loop;
 update public.student_deletion_jobs set stage='database' where id=j.id;
 return jsonb_build_object('stage','database');
end $$;
create function public.validate_student_deletion_file(p_job_id uuid,p_lease uuid,p_index integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs; f jsonb;o storage.objects;
begin
 j:=public._assert_student_deletion_lease(p_job_id,p_lease);
 if j.stage<>'files' or p_index<0 or p_index>=jsonb_array_length(j.files) then raise exception 'File stage and manifest index required' using errcode='55000';end if;
 f:=j.files->p_index;
 select * into o from storage.objects where bucket_id=f->>'bucket' and name=f->>'path';
 if not found then return f||jsonb_build_object('exists',false);end if;
 if o.id::text<>f->>'id' or md5(to_jsonb(o)::text)<>f->>'fingerprint' then raise exception 'Storage object changed; manual review required' using errcode='40001';end if;
 if o.bucket_id='materials' and exists(select 1 from public.materials m where m.file_path=o.name and m.student_id is distinct from j.student_id) then raise exception 'Shared Storage object cannot be deleted' using errcode='42501';end if;
 return f||jsonb_build_object('exists',true);
end $$;
create function public.validate_student_deletion_auth(p_job_id uuid,p_lease uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;
begin
 j:=public._assert_student_deletion_lease(p_job_id,p_lease);
 if j.stage<>'auth' or exists(select 1 from public.profiles where id=j.student_id) or exists(select 1 from public.enrollments where student_id=j.student_id)
 or exists(select 1 from storage.objects o where coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=j.student_id::text) then raise exception 'Profile or private Storage cleanup incomplete' using errcode='55000';end if;
 return jsonb_build_object('stage','auth');
end $$;
-- Narrow exception for confirmed deletion; normal approved plans stay immutable.
create or replace function public._protect_approved_learning_plan() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='approved' and not(tg_op='DELETE' and exists(select 1 from public.student_deletion_jobs j where j.student_id=old.student_id and j.stage='database' and j.lease::text=current_setting('vera.student_deletion_lease',true) and j.lease_until>now())) then
 raise exception 'Approved learning plan versions are immutable. Create a new draft version.' using errcode='55000';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
-- Existing trigger runs for ordinary users too: hide privileged job lookup behind
-- a fixed-search-path definer without granting direct job-table access.
alter function public._protect_approved_learning_plan() security definer;
revoke all on function public._protect_approved_learning_plan() from public,anon,authenticated;

create function public.cleanup_student_deletion_data(p_job_id uuid,p_lease uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;sid uuid;t text;n integer;remaining integer;inv jsonb;
begin
 j:=public._assert_student_deletion_lease(p_job_id,p_lease);sid:=j.student_id;
 if j.stage<>'database' then raise exception 'Database stage required' using errcode='55000';end if;
 if exists(select 1 from public.payments where student_id=sid) or exists(select 1 from public.student_retention_holds where student_id=sid and active) then raise exception 'Retention protection prevents deletion' using errcode='42501';end if;
 inv:=public._student_deletion_inventory(sid);if not(inv->>'eligible')::boolean then raise exception 'Shared references or retention require review' using errcode='42501';end if;
 perform set_config('vera.student_deletion_lease',p_lease::text,true);
 delete from public.final_results where attempt_id in(select id from public.exercise_attempts where student_id=sid);
 delete from public.exercise_feedback_versions where attempt_id in(select id from public.exercise_attempts where student_id=sid);
 delete from public.challenge_submissions where student_id=sid;
 delete from public.weekly_challenges where student_id=sid;
 delete from public.challenge_publications where ai_draft_id in(select id from public.ai_academic_drafts where student_id=sid);
 foreach t in array array['exercise_attachment_versions','exercise_attachments','exercise_question_checks','exercise_correction_results','exercise_practice_drafts','unified_academic_runs','learning_architect_runs','learning_journey_bindings','learning_plan_publications'] loop execute format('delete from public.%I where student_id=$1',t) using sid;end loop;
 delete from public.learning_plan_objective_events where version_id in(select id from public.learning_plan_versions where student_id=sid);
 delete from public.learning_plan_objective_progress where version_id in(select id from public.learning_plan_versions where student_id=sid);
 loop
 delete from public.learning_plan_versions v where v.student_id=sid and not exists(select 1 from public.learning_plan_versions x where x.base_version_id=v.id or x.prior_approved_version_id=v.id);
 get diagnostics n=row_count;select count(*) into remaining from public.learning_plan_versions where student_id=sid;exit when remaining=0;
 if n=0 then raise exception 'Plan dependency requires manual review' using errcode='55000';end if;
 end loop;
 foreach t in array array['ai_academic_drafts','academic_ai_requests','exercise_attempts','exercise_assignments','material_text_versions','academic_context_reviews','feedback','teacher_notes','onboarding_responses','class_participants','student_packages','student_roster_states','materials'] loop execute format('delete from public.%I where student_id=$1',t) using sid;end loop;
 if to_regclass('public.work_plans') is not null then execute 'delete from public.work_plans where student_id=$1' using sid;end if;
 delete from public.inbox_messages where sender_id=sid or recipient_id=sid;
 delete from public.academic_notifications where recipient_id=sid;
 delete from public.academic_ai_consents where student_id=sid;
 delete from public.enrollment_invitations where accepted_by=sid;
 delete from public.enrollments where student_id=sid;
 delete from public.profiles where id=sid;
 update public.student_deletion_jobs set stage='auth' where id=j.id;
 return jsonb_build_object('stage','auth');
end $$;
create function public.finish_student_deletion(p_job_id uuid,p_lease uuid,p_failure text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.student_deletion_jobs;
begin
 select * into j from public.student_deletion_jobs where id=p_job_id and lease=p_lease and lease_until>now() for update;
 if not found then raise exception 'Active worker lease required' using errcode='42501';end if;
 if p_failure is not null then
 update public.student_deletion_jobs set failure_code=left(p_failure,64),lease=null,lease_until=null where id=j.id;return jsonb_build_object('stage',j.stage,'failure_code',left(p_failure,64));end if;
 j:=public._assert_student_deletion_lease(p_job_id,p_lease);
 if j.stage<>'auth' or exists(select 1 from auth.users where id=j.student_id) or exists(select 1 from public.profiles where id=j.student_id) then raise exception 'Auth/profile cleanup is not complete' using errcode='55000';end if;
 update public.student_deletion_jobs set stage='complete',completed_at=now(),lease=null,lease_until=null,files='[]',snapshot='' where id=j.id;
 insert into public.student_management_events(student_id,actor_id,action,request_id,revision,details) values(j.student_id,j.actor_id,'delete_completed',gen_random_uuid(),0,jsonb_build_object('job_id',j.id,'counts',j.counts,'files_removed',jsonb_array_length(j.files)));
 return jsonb_build_object('job_id',j.id,'stage','complete');
end $$;

alter function public.manage_student_enrollment(uuid,text,integer,uuid,boolean) rename to _manage_student_enrollment_before_deletion;
revoke all on function public._manage_student_enrollment_before_deletion(uuid,text,integer,uuid,boolean) from public,anon,authenticated;
create function public.manage_student_enrollment(p_student_id uuid,p_action text,p_expected_revision integer,p_request_id uuid,p_confirm_completed boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('student-management:'||p_student_id::text,0));
 if public._student_deletion_pending(p_student_id) then raise exception 'Account deletion is already confirmed' using errcode='55000';end if;
 return public._manage_student_enrollment_before_deletion(p_student_id,p_action,p_expected_revision,p_request_id,p_confirm_completed);
end $$;
revoke all on function public.manage_student_enrollment(uuid,text,integer,uuid,boolean) from public,anon;
grant execute on function public.manage_student_enrollment(uuid,text,integer,uuid,boolean) to authenticated;

create function public._student_deletion_storage_unlocked(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.student_deletion_jobs j where j.stage in('files','database','auth') and(
 (bucket='academic-submissions' and split_part(path,'/',1)=j.student_id::text)
 or exists(select 1 from jsonb_array_elements(j.files) f where f->>'bucket'=bucket and f->>'path'=path)))
$$;
revoke all on function public._student_deletion_storage_unlocked(text,text) from public,anon;
grant execute on function public._student_deletion_storage_unlocked(text,text) to authenticated;
create policy "confirmed student deletion storage boundary" on storage.objects as restrictive for all to authenticated
using(public._student_deletion_storage_unlocked(bucket_id,name)) with check(public._student_deletion_storage_unlocked(bucket_id,name));

-- Block concurrent academic mutations during a confirmed deletion. No row rewrite.
create function public._guard_pending_student_mutation() returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;ids uuid[]:='{}';sid uuid;ref uuid;
begin
 for payload in select value from jsonb_array_elements(jsonb_build_array(case when tg_op<>'INSERT' then to_jsonb(old) else '{}'::jsonb end,case when tg_op<>'DELETE' then to_jsonb(new) else '{}'::jsonb end)) loop
  if tg_table_name in('profiles','teachers') then ids:=array_append(ids,(payload->>'id')::uuid);
  elsif tg_table_name='academic_admins' then ids:=array_append(ids,(payload->>'user_id')::uuid);
  elsif tg_table_name='inbox_messages' then ids:=ids||array[(payload->>'sender_id')::uuid,(payload->>'recipient_id')::uuid];
  elsif tg_table_name='academic_notifications' then ids:=array_append(ids,(payload->>'recipient_id')::uuid);
  elsif tg_table_name='enrollment_invitations' then ids:=array_append(ids,(payload->>'accepted_by')::uuid);
  elsif tg_table_name in('exercise_feedback_versions','final_results') then select student_id into ref from public.exercise_attempts where id=(payload->>'attempt_id')::uuid;ids:=array_append(ids,ref);
  elsif tg_table_name in('learning_plan_objective_progress','learning_plan_objective_events') then select student_id into ref from public.learning_plan_versions where id=(payload->>'version_id')::uuid;ids:=array_append(ids,ref);
  elsif tg_table_name='challenge_publications' then select student_id into ref from public.ai_academic_drafts where id=(payload->>'ai_draft_id')::uuid;ids:=array_append(ids,ref);ids:=ids||array(select jsonb_array_elements_text(coalesce(payload->'student_ids','[]'))::uuid);
  else ids:=array_append(ids,(payload->>'student_id')::uuid);end if;
 end loop;
 for sid in select distinct x from unnest(ids) x where x is not null order by x loop
  perform pg_advisory_xact_lock(hashtextextended('student-management:'||sid::text,0));
  if public._student_deletion_pending(sid) and not exists(select 1 from public.student_deletion_jobs j where j.student_id=sid and j.stage='database' and j.lease::text=current_setting('vera.student_deletion_lease',true) and j.lease_until>now()) then raise exception 'Confirmed deletion freezes academic changes' using errcode='55000';end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function public._guard_pending_student_mutation() from public,anon,authenticated;
do $$ declare t text;
begin
 foreach t in array array['profiles','teachers','academic_admins','enrollments','materials','exercise_attachments','exercise_attachment_versions','exercise_assignments','exercise_attempts','learning_plan_versions','student_packages','class_participants','academic_context_reviews','onboarding_responses','student_roster_states','academic_ai_consents','academic_ai_requests','academic_notifications','ai_academic_drafts','challenge_submissions','challenge_publications','exercise_correction_results','exercise_practice_drafts','exercise_question_checks','exercise_feedback_versions','feedback','final_results','inbox_messages','learning_architect_runs','learning_journey_bindings','learning_plan_objective_events','learning_plan_objective_progress','learning_plan_publications','material_text_versions','payments','teacher_notes','unified_academic_runs','weekly_challenges','work_plans','enrollment_invitations'] loop
 if to_regclass('public.'||t) is not null then execute format('create trigger confirmed_student_deletion_freeze before insert or update or delete on public.%I for each row execute function public._guard_pending_student_mutation()',t);end if;
 end loop;
end $$;
do $$ declare t text;col text;
begin
 foreach t in array array['profiles','enrollments','materials','exercise_attachments','exercise_attachment_versions','exercise_assignments','exercise_attempts','learning_plan_versions','student_packages','class_participants','academic_context_reviews','onboarding_responses','student_roster_states'] loop
 col:=case when t='profiles' then 'id' else 'student_id' end;
 execute format('create policy "pending student deletion boundary" on public.%I as restrictive for all to authenticated using(not public._student_deletion_pending(%I)) with check(not public._student_deletion_pending(%I))',t,col,col);
 end loop;
end $$;
revoke all on function public.list_student_deletion_jobs(),public.preview_student_deletion(uuid,uuid),public.confirm_student_deletion(uuid,text,boolean,boolean),public.student_deletion_status(uuid),public.set_student_retention_hold(uuid,text,boolean,uuid) from public,anon;
grant execute on function public.list_student_deletion_jobs(),public.preview_student_deletion(uuid,uuid),public.confirm_student_deletion(uuid,text,boolean,boolean),public.student_deletion_status(uuid),public.set_student_retention_hold(uuid,text,boolean,uuid) to authenticated;
revoke all on function public.claim_student_deletion(uuid,uuid),public._assert_student_deletion_lease(uuid,uuid),public.record_student_deletion_files(uuid,uuid),public.validate_student_deletion_file(uuid,uuid,integer),public.validate_student_deletion_auth(uuid,uuid),public.cleanup_student_deletion_data(uuid,uuid),public.finish_student_deletion(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_student_deletion(uuid,uuid),public.record_student_deletion_files(uuid,uuid),public.validate_student_deletion_file(uuid,uuid,integer),public.validate_student_deletion_auth(uuid,uuid),public.cleanup_student_deletion_data(uuid,uuid),public.finish_student_deletion(uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
