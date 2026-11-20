-- Proposal: scoped roster management; no deployment-time row rewrite/deletion.
-- Requires 0013, 0018, 0019, 0029. Existing single enrollment remains authoritative.
begin;
create table public.student_roster_states(
 student_id uuid primary key references public.profiles(id) on delete restrict,
 teacher_id uuid not null references public.teachers(id) on delete restrict,
 state text not null check(state in('active','inactive','completed','archived','removed')),
 revision integer not null default 1 check(revision>0),
 updated_by uuid not null references auth.users(id) on delete restrict,
 updated_at timestamptz not null default now()
);
create table public.student_management_events(
 id uuid primary key default gen_random_uuid(),student_id uuid not null,
 actor_id uuid not null,teacher_id uuid,action text not null,
 request_id uuid not null,revision integer not null,details jsonb not null default '{}',
 created_at timestamptz not null default now(),unique(actor_id,request_id)
);
alter table public.student_roster_states enable row level security;
alter table public.student_management_events enable row level security;
revoke all on public.student_roster_states,public.student_management_events from public,anon,authenticated;
grant select on public.student_roster_states,public.student_management_events to authenticated;
create policy "roster owner history" on public.student_roster_states for select to authenticated
using(public.is_academic_admin() or(teacher_id=auth.uid() and public.is_academic_staff()));
create policy "roster action audit" on public.student_management_events for select to authenticated
using(public.is_academic_admin() or(teacher_id=auth.uid() and public.is_academic_staff()));

create function public.can_manage_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_academic_staff() and(public.is_academic_admin() or exists(
 select 1 from public.enrollments e where e.student_id=p_student_id and e.teacher_id=auth.uid())
 or exists(select 1 from public.student_roster_states s where s.student_id=p_student_id and s.teacher_id=auth.uid() and s.state<>'removed'))
$$;
-- Read-only review of already-submitted files remains available to the current
-- roster owner while inactive/archived. This grants no upload/assignment rights.
create or replace function public.can_read_exercise_attachment(p_assignment_id uuid,p_submitted boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.exercise_assignments a where a.id=p_assignment_id and(
 (a.student_id=auth.uid() and a.status<>'revoked' and public.student_has_academic_access(auth.uid()))
 or(p_submitted and a.teacher_id=auth.uid() and(public.can_teacher_access_student(auth.uid(),a.student_id) or public.can_manage_student(a.student_id)))
 ))
$$;
-- History reads are independent of active enrollment. This never grants new-work access.
create function public.get_student_management_capabilities() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('staff',public.is_academic_staff(),'admin',public.is_academic_admin())
$$;
create function public.get_managed_students() returns jsonb
language sql stable security definer set search_path='' as $$
 select case when public.is_academic_staff() then coalesce(jsonb_agg(item order by item->>'name'),'[]'::jsonb) else '[]'::jsonb end from(
 select jsonb_build_object('id',p.id,'name',p.name,'email',u.email,'email_verified',u.email_confirmed_at is not null,
 'language',p.language,'level',p.level,'progress',p.progress,'goal',p.goal,
 'recorded_completed',p.lessons_completed,'recorded_total',p.total_lessons,
 'teacher_id',e.teacher_id,'enrollment_status',e.status,'revision',coalesce(s.revision,0),
 'teacher_name',(select coalesce(nullif(u.raw_user_meta_data->>'name',''),u.email) from auth.users u where u.id=coalesce(e.teacher_id,s.teacher_id)),
 'state',case when s.state='removed' and e.teacher_id is not null and e.teacher_id<>s.teacher_id then 'removed'
 when s.state is not null then s.state when e.status='approved' then 'active' else 'inactive' end,
 'can_manage',public.is_academic_admin() or e.teacher_id=auth.uid(),
 'is_admin',public.is_academic_admin(),
 'verified_completed',(select count(*) from public.class_participants cp join public.classes c on c.id=cp.class_id
 join public.class_attendance a on a.class_id=c.id and a.student_id=cp.student_id where cp.student_id=p.id and c.teacher_id=coalesce(e.teacher_id,s.teacher_id) and c.status='completed' and a.status in('present','late')),
 'pending_assignments',(select count(*) from public.exercise_assignments a where a.student_id=p.id and a.teacher_id=coalesce(e.teacher_id,s.teacher_id) and a.status<>'revoked'
 and not exists(select 1 from public.exercise_attempts t where t.assignment_id=a.id)),
 'courses',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.assignment_id,'name',pk.name,'total',pk.class_count,'consumed',sp.classes_consumed,'status',sp.status)),'[]') from public.student_packages sp join public.packages pk on pk.id=sp.package_id where sp.student_id=p.id and(public.is_academic_admin() or sp.teacher_id=auth.uid()))) item
 from public.profiles p join auth.users u on u.id=p.id left join public.enrollments e on e.student_id=p.id
 left join public.student_roster_states s on s.student_id=p.id
 where public.can_manage_student(p.id) and not exists(select 1 from public.teachers t where t.id=p.id)
 )q
$$;

create function public.get_managed_student_history(p_student_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=p_student_id; owner_id uuid; result jsonb;
begin
 if not public.can_manage_student(sid) then raise exception 'Assigned teacher or administrator required' using errcode='42501'; end if;
 select coalesce(e.teacher_id,s.teacher_id) into owner_id from public.enrollments e left join public.student_roster_states s on s.student_id=e.student_id where e.student_id=sid;
 -- A former teacher cannot read a new teacher's records after transfer.
 if not public.is_academic_admin() then owner_id:=auth.uid(); end if;
 select jsonb_build_object('profile',to_jsonb(p),'email',u.email,'email_verified',u.email_confirmed_at is not null,
 'enrollment',to_jsonb(e),'roster',to_jsonb(s),'is_admin',public.is_academic_admin()) into result
 from public.profiles p join auth.users u on u.id=p.id left join public.enrollments e on e.student_id=p.id left join public.student_roster_states s on s.student_id=p.id where p.id=sid;
 return result||jsonb_build_object(
 'classes',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'starts_at',c.starts_at,'status',c.status,'attendance',a.status) order by c.starts_at desc),'[]') from public.class_participants cp join public.classes c on c.id=cp.class_id left join public.class_attendance a on a.class_id=c.id and a.student_id=cp.student_id where cp.student_id=sid and c.teacher_id=owner_id),
 'plans',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'title',v.content->>'title','status',v.status,'created_at',v.created_at,'published',exists(select 1 from public.learning_plan_publications pp where pp.version_id=v.id)) order by v.created_at desc),'[]') from public.learning_plan_versions v where v.student_id=sid and v.teacher_id=owner_id),
 'materials',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'type',m.type,'language',m.language,'created_at',m.created_at,'file_path',m.file_path)),'[]') from public.materials m where m.student_id=sid and m.teacher_id=owner_id),
 'files',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.file_name,'file_path',f.file_path,'assignment_id',f.assignment_id)),'[]') from public.exercise_attachments f where f.student_id=sid and f.teacher_id=owner_id and f.attempt_id is not null),
 'submissions',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'exercise',ex.title,'submitted_at',t.submitted_at,'answers',t.answers,'feedback',t.feedback) order by t.submitted_at desc),'[]') from public.exercise_attempts t join public.exercise_assignments a on a.id=t.assignment_id join public.exercises ex on ex.id=a.exercise_id where a.student_id=sid and a.teacher_id=owner_id),
 'events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from public.student_management_events x where x.student_id=sid and(x.teacher_id=owner_id or public.is_academic_admin())));
end $$;

create function public.manage_student_enrollment(p_student_id uuid,p_action text,p_expected_revision integer,p_request_id uuid,p_confirm_completed boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.enrollments; s public.student_roster_states; prior public.student_management_events; desired text; tid uuid;
begin
 if not public.is_academic_staff() or p_request_id is null then raise exception 'Verified teacher required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('student-management:'||p_student_id::text,0));
 select * into prior from public.student_management_events where actor_id=auth.uid() and request_id=p_request_id;
 if found then
 if prior.student_id<>p_student_id or prior.action<>p_action then raise exception 'Request ID conflict' using errcode='22023'; end if;
 return jsonb_build_object('student_id',prior.student_id,'revision',prior.revision,'state',prior.details->>'state'); end if;
 select * into e from public.enrollments where student_id=p_student_id for update;
 if not found or(e.teacher_id is distinct from auth.uid() and not public.is_academic_admin())
 or exists(select 1 from public.teachers where id=p_student_id) or exists(select 1 from public.academic_admins where user_id=p_student_id) then raise exception 'Current enrollment owner required' using errcode='42501'; end if;
 select * into s from public.student_roster_states where student_id=p_student_id for update;
 if coalesce(s.revision,0) is distinct from p_expected_revision then raise exception 'Student state changed. Reload before retrying.' using errcode='40001'; end if;
 tid:=coalesce(e.teacher_id,s.teacher_id);
 if tid is null then raise exception 'Assign an enrollment teacher before management' using errcode='22023'; end if;
 desired:=case p_action when 'deactivate' then 'inactive' when 'reactivate' then 'active' when 'complete' then 'completed' when 'archive' then 'archived' when 'remove' then 'removed' end;
 if desired is null then raise exception 'Unsupported student action' using errcode='22023'; end if;
 if p_action in('complete','archive') and not p_confirm_completed then raise exception 'Confirm course completion before archiving' using errcode='22023'; end if;
 if p_action='reactivate' and(e.teacher_id is null or e.status in('pending','rejected') or s.state='removed') then raise exception 'A new enrollment approval is required after roster removal or rejection' using errcode='42501'; end if;
 if p_action in('complete','archive') and(exists(select 1 from public.student_packages sp join public.packages pk on pk.id=sp.package_id where sp.student_id=p_student_id and sp.teacher_id=tid and sp.status='active' and sp.classes_consumed<pk.class_count)
 or exists(select 1 from public.classes c join public.class_participants cp on cp.class_id=c.id where cp.student_id=p_student_id and c.teacher_id=tid and c.status in('scheduled','rescheduled') and c.starts_at>=now())) then raise exception 'Resolve remaining purchased or scheduled classes first' using errcode='22023'; end if;
 update public.enrollments set status=case when desired in('active','completed') then 'approved' when desired='removed' then 'pending' else 'suspended' end,
 teacher_id=case when desired='removed' then null else tid end,updated_at=now() where student_id=p_student_id;
 insert into public.student_roster_states(student_id,teacher_id,state,revision,updated_by) values(p_student_id,tid,desired,coalesce(s.revision,0)+1,auth.uid())
 on conflict(student_id) do update set teacher_id=excluded.teacher_id,state=excluded.state,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning * into s;
 insert into public.student_management_events(student_id,actor_id,teacher_id,action,request_id,revision,details)
 values(p_student_id,auth.uid(),tid,p_action,p_request_id,s.revision,jsonb_build_object('state',desired,'previous_status',e.status));
 return jsonb_build_object('student_id',p_student_id,'revision',s.revision,'state',desired);
end $$;

-- An administrator's existing enrollment approval transfers the roster atomically.
create function public._sync_managed_student_approval() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and new.teacher_id is not null and exists(select 1 from public.student_roster_states s where s.student_id=new.student_id and(s.state='removed' or s.teacher_id<>new.teacher_id)) then
 update public.student_roster_states set teacher_id=new.teacher_id,state='active',revision=revision+1,updated_by=coalesce(auth.uid(),new.teacher_id),updated_at=now() where student_id=new.student_id;
 end if; return new;
end $$;
create trigger managed_enrollment_approval after update of teacher_id,status on public.enrollments for each row execute function public._sync_managed_student_approval();
revoke all on function public._sync_managed_student_approval() from public,anon,authenticated;

-- All new assignments check the current enrollment, including direct table writes.
create function public._guard_managed_student_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.student_roster_states s where s.student_id=new.student_id and s.state<>'active')
 or not public.can_teacher_access_student(new.teacher_id,new.student_id) then raise exception 'Student is not accepting new academic assignments' using errcode='42501'; end if;
 return new;
end $$;
create trigger managed_exercise_assignment before insert or update of student_id,teacher_id,status on public.exercise_assignments for each row execute function public._guard_managed_student_assignment();
create trigger managed_class_assignment before insert or update of student_id,teacher_id on public.class_participants for each row execute function public._guard_managed_student_assignment();
create trigger managed_package_assignment before insert or update of student_id,teacher_id,status on public.student_packages for each row execute function public._guard_managed_student_assignment();
revoke all on function public._guard_managed_student_assignment() from public,anon,authenticated;
revoke all on function public.get_student_management_capabilities(),public.can_manage_student(uuid),public.get_managed_students(),public.get_managed_student_history(uuid),public.manage_student_enrollment(uuid,text,integer,uuid,boolean) from public,anon;
grant execute on function public.get_student_management_capabilities(),public.can_manage_student(uuid),public.get_managed_students(),public.get_managed_student_history(uuid),public.manage_student_enrollment(uuid,text,integer,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
