-- Explicit course/resource links and a fresh, sanitized student Journey projection.
-- Requires 0019, 0022, 0023 and 0025; no dependency on 0024/0027/0028.
begin;
create table public.learning_journey_bindings(
 version_id uuid not null references public.learning_plan_versions(id) on delete restrict,
 revision integer not null check(revision>0),
 teacher_id uuid not null references public.teachers(id) on delete restrict,
 student_id uuid not null references public.profiles(id) on delete restrict,
 package_assignment_id uuid references public.student_packages(assignment_id) on delete restrict,
 lessons jsonb not null check(jsonb_typeof(lessons)='object' and octet_length(lessons::text)<=24000),
 created_at timestamptz not null default now(),primary key(version_id,revision)
);
alter table public.learning_journey_bindings enable row level security;
revoke all on public.learning_journey_bindings from public,anon,authenticated;
grant select on public.learning_journey_bindings to authenticated;
create policy "journey author binding history" on public.learning_journey_bindings for select to authenticated
using(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id));

-- Copying an approved plan keeps stable objective IDs. Inherit resource links from
-- its nearest ancestor without changing either immutable plan or binding history.
create function public._learning_journey_binding(p_version_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with recursive chain as(
  select id,base_version_id,0 depth from public.learning_plan_versions where id=p_version_id
  union all select v.id,v.base_version_id,c.depth+1 from public.learning_plan_versions v join chain c on v.id=c.base_version_id where c.depth<100
 ) select coalesce((select to_jsonb(b)||jsonb_build_object('inherited',c.depth>0,'revision',case when c.depth=0 then b.revision else 0 end)
 from chain c join public.learning_journey_bindings b on b.version_id=c.id order by c.depth,b.revision desc limit 1),
 jsonb_build_object('revision',0,'package_assignment_id',null,'lessons','{}'::jsonb,'inherited',false))
$$;
create function public.get_learning_journey_binding(p_version_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v public.learning_plan_versions;
begin
 select * into v from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid();
 if not found or not public.can_teacher_access_student(auth.uid(),v.student_id) then raise exception 'Authorized plan unavailable' using errcode='42501'; end if;
 return public._learning_journey_binding(v.id);
end $$;
create function public.get_learning_journey_options(p_student_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_teacher_access_student(auth.uid(),p_student_id) or not exists(select 1 from public.teachers t where t.id=auth.uid()) then raise exception 'Authorized student unavailable' using errcode='42501'; end if;
 return jsonb_build_object(
 'classes',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'starts_at',c.starts_at,'status',c.status) order by c.starts_at desc),'[]') from public.classes c join public.class_participants cp on cp.class_id=c.id where c.teacher_id=auth.uid() and cp.student_id=p_student_id),
 'packages',(select coalesce(jsonb_agg(jsonb_build_object('id',sp.assignment_id,'name',p.name,'total',p.class_count,'recorded_consumed',sp.classes_consumed)),'[]') from public.student_packages sp join public.packages p on p.id=sp.package_id where sp.teacher_id=auth.uid() and sp.student_id=p_student_id and sp.status<>'cancelled'),
 'materials',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'language',m.language)),'[]') from public.materials m where m.teacher_id=auth.uid() and(m.student_id=p_student_id or m.audience='all')));
end $$;
create function public.save_learning_journey_binding(p_version_id uuid,p_expected_revision integer,p_package_assignment_id uuid,p_lessons jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.learning_plan_versions; b jsonb; entry record; mid jsonb; cid uuid; seen uuid[]:=array[]::uuid[];
begin
 select * into v from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid() and status='approved';
 if not found or not public.can_teacher_access_student(auth.uid(),v.student_id) then raise exception 'Authorized approved plan unavailable' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('journey-binding:'||v.id::text,0));
 b:=public._learning_journey_binding(v.id);
 if p_expected_revision is null or p_expected_revision<>(b->>'revision')::int then raise exception 'Journey links changed. Reload before saving.' using errcode='40001'; end if;
 if p_package_assignment_id is not null and not exists(select 1 from public.student_packages sp where sp.assignment_id=p_package_assignment_id and sp.teacher_id=v.teacher_id and sp.student_id=v.student_id and sp.status<>'cancelled') then raise exception 'Authorized course unavailable' using errcode='42501'; end if;
 if jsonb_typeof(p_lessons) is distinct from 'object' or octet_length(p_lessons::text)>24000 then raise exception 'Invalid Journey links' using errcode='22023'; end if;
 for entry in select * from jsonb_each(p_lessons) loop
  if not exists(select 1 from jsonb_array_elements(v.content->'objectives') o where o->>'id'=entry.key)
   or jsonb_typeof(entry.value) is distinct from 'object' or not(entry.value ?& array['class_id','material_ids'])
   or (select count(*) from jsonb_object_keys(entry.value))<>2
   or jsonb_typeof(entry.value->'material_ids') is distinct from 'array' or jsonb_array_length(entry.value->'material_ids')>30
   then raise exception 'Invalid lesson links' using errcode='22023'; end if;
  cid:=nullif(entry.value->>'class_id','')::uuid;
  if cid is not null then
   if cid=any(seen) or not exists(select 1 from public.classes c join public.class_participants cp on cp.class_id=c.id where c.id=cid and c.teacher_id=v.teacher_id and cp.student_id=v.student_id) then raise exception 'Class is unavailable or already linked' using errcode='42501'; end if;
   -- One actual class cannot count toward two separately purchased courses.
   if exists(select 1 from public.learning_journey_bindings other where other.student_id=v.student_id and other.version_id<>v.id
    and other.package_assignment_id is distinct from p_package_assignment_id
    and other.revision=(select max(x.revision) from public.learning_journey_bindings x where x.version_id=other.version_id)
    and exists(select 1 from jsonb_each(other.lessons) l where l.value->>'class_id'=cid::text)) then raise exception 'Class already belongs to another course' using errcode='22023'; end if;
   seen:=array_append(seen,cid);
  end if;
  for mid in select value from jsonb_array_elements(entry.value->'material_ids') loop
   if jsonb_typeof(mid)<>'string' or not exists(select 1 from public.materials m where m.id=(mid#>>'{}')::uuid and m.teacher_id=v.teacher_id
    and(m.student_id=v.student_id or(m.audience='all' and(m.language is null or m.language=v.content->>'language')))) then raise exception 'Authorized material unavailable' using errcode='42501'; end if;
  end loop;
 end loop;
 insert into public.learning_journey_bindings(version_id,revision,teacher_id,student_id,package_assignment_id,lessons)
 values(v.id,p_expected_revision+1,v.teacher_id,v.student_id,p_package_assignment_id,p_lessons);
 return public._learning_journey_binding(v.id);
end $$;

-- A lesson association remains on the original exercise. No exercise copy, new
-- enrollment or second assignment system. Published assignment RPC is unchanged.
create function public._guard_exercise_journey_link() returns trigger
language plpgsql security definer set search_path='' as $$
declare j jsonb; v public.learning_plan_versions;
begin
 j:=new.settings->'learning_journey'; if j is null then return new; end if;
 if jsonb_typeof(j) is distinct from 'object' or not(j ?& array['version_id','objective_id','student_id']) or(select count(*) from jsonb_object_keys(j))<>3 then raise exception 'Invalid lesson association' using errcode='22023'; end if;
 select * into v from public.learning_plan_versions where id=(j->>'version_id')::uuid and teacher_id=new.teacher_id and student_id=(j->>'student_id')::uuid and status='approved';
 if not found or not public.can_teacher_access_student(new.teacher_id,v.student_id)
  or(v.content?'architect' and not exists(select 1 from public.learning_plan_publications p where p.version_id=v.id))
  or not exists(select 1 from jsonb_array_elements(v.content->'objectives') o where o->>'id'=j->>'objective_id') then raise exception 'Published lesson unavailable' using errcode='42501'; end if;
 return new;
end $$;
create trigger exercise_journey_link_guard before insert or update of settings,teacher_id on public.exercises for each row execute function public._guard_exercise_journey_link();
create function public._guard_journey_assignment() returns trigger language plpgsql security definer set search_path='' as $$
declare linked text;
begin
 select e.settings->'learning_journey'->>'student_id' into linked from public.exercises e where e.id=new.exercise_id;
 if linked is not null and linked<>new.student_id::text then raise exception 'Lesson activity belongs to a different student' using errcode='42501'; end if;
 return new;
end $$;
create trigger journey_assignment_guard before insert or update of student_id,exercise_id on public.exercise_assignments for each row execute function public._guard_journey_assignment();

create function public.get_student_learning_journey(p_student_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare plans jsonb:='[]'; lessons jsonb; v record; o record; binding jsonb; link jsonb; cls jsonb; mats jsonb; acts jsonb; progress jsonb; course jsonb; history jsonb;
begin
 if auth.uid() is null or not((auth.uid()=p_student_id and public.student_has_academic_access(auth.uid())) or public.can_teacher_access_student(auth.uid(),p_student_id)) then raise exception 'Authorized Journey unavailable' using errcode='42501'; end if;
 -- Only approved, student-visible plans from the currently assigned teacher.
 for v in
 with recursive ancestry as(
  select lp.id child,lp.id ancestor,lp.base_version_id,0 depth from public.learning_plan_versions lp where lp.student_id=p_student_id
  union all select a.child,p.id,p.base_version_id,a.depth+1 from ancestry a join public.learning_plan_versions p on p.id=a.base_version_id where a.depth<100 and p.student_id=p_student_id
 ), roots as(select distinct on(child) child,ancestor root from ancestry order by child,depth desc), visible as(
  select lp.*,r.root,public._learning_journey_binding(lp.id) binding from public.learning_plan_versions lp join roots r on r.child=lp.id
  where lp.student_id=p_student_id and lp.status='approved' and public.can_teacher_access_student(lp.teacher_id,p_student_id)
  and(not(lp.content?'architect') or exists(select 1 from public.learning_plan_publications pub where pub.version_id=lp.id))
 ), grouped as(select vis.*,coalesce(vis.binding->>'package_assignment_id',vis.root::text) course_key from visible vis)
 select g.*,row_number() over(partition by g.course_key order by g.approved_at desc,g.version_number desc) course_order from grouped g order by g.approved_at desc,g.version_number desc
 loop
  binding:=v.binding; lessons:='[]';
  for o in select value,ordinality n from jsonb_array_elements(v.content->'objectives') with ordinality loop
   link:=binding->'lessons'->(o.value->>'id'); cls:=null;
   select jsonb_build_object('id',c.id,'title',c.title,'starts_at',c.starts_at,'status',c.status,'attendance',ca.status,
    'completed',c.status='completed' and coalesce(ca.status in('present','late'),false)) into cls
   from public.classes c join public.class_participants cp on cp.class_id=c.id and cp.student_id=p_student_id
   left join public.class_attendance ca on ca.class_id=c.id and ca.student_id=p_student_id
   where c.id=nullif(link->>'class_id','')::uuid and c.teacher_id=v.teacher_id;
   -- Stable objective IDs inherit only progress within this course/lineage.
   with recursive family as(select lp.id,lp.base_version_id from public.learning_plan_versions lp where lp.id=v.id
    union all select p.id,p.base_version_id from public.learning_plan_versions p join family f on p.id=f.base_version_id)
   select jsonb_build_object('completed',p.completed,'teacher_recorded',true,'updated_at',p.created_at) into progress
   from public.learning_plan_objective_events p join family f on f.id=p.version_id
   where p.objective_id=(o.value->>'id')::uuid and p.actor_id=v.teacher_id order by p.created_at desc,p.revision desc limit 1;
   select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'type',m.type) order by m.title),'[]') into mats
   from public.materials m where link->'material_ids' ? m.id::text and m.teacher_id=v.teacher_id
   and(m.student_id=p_student_id or(m.audience='all' and(m.language is null or m.language=v.content->>'language')));
   select coalesce(jsonb_agg(jsonb_build_object('assignment_id',a.id,'title',e.title,'exercise_id',e.id,'submitted',exists(select 1 from public.exercise_attempts t where t.assignment_id=a.id and t.student_id=p_student_id),
    'started',exists(select 1 from public.exercise_practice_drafts d where d.assignment_id=a.id and d.student_id=p_student_id),
    'feedback',(select f.content from public.exercise_feedback_versions f join public.exercise_attempts t on t.id=f.attempt_id where t.assignment_id=a.id and t.student_id=p_student_id and f.released_at is not null order by f.released_at desc,f.version desc limit 1)) order by a.created_at),'[]') into acts
   from public.exercise_assignments a join public.exercises e on e.id=a.exercise_id
   join public.learning_plan_versions linked on linked.id=(e.settings->'learning_journey'->>'version_id')::uuid
   where a.student_id=p_student_id and a.teacher_id=v.teacher_id and a.status<>'revoked' and(a.available_from is null or a.available_from<=now()) and e.status='published'
   and e.settings->'learning_journey'->>'student_id'=p_student_id::text and e.settings->'learning_journey'->>'objective_id'=o.value->>'id'
   and linked.student_id=p_student_id and linked.teacher_id=v.teacher_id and linked.status='approved'
   and(not(linked.content?'architect') or exists(select 1 from public.learning_plan_publications pub where pub.version_id=linked.id))
   and((binding->>'package_assignment_id' is not null and public._learning_journey_binding(linked.id)->>'package_assignment_id'=binding->>'package_assignment_id')
    or(binding->>'package_assignment_id' is null and linked.id in(with recursive family as(select p.id,p.base_version_id from public.learning_plan_versions p where p.id=v.id union all select p.id,p.base_version_id from public.learning_plan_versions p join family f on p.id=f.base_version_id) select id from family)));
   if v.course_order=1 or coalesce((cls->>'completed')::boolean,false) or(coalesce((progress->>'completed')::boolean,false) and coalesce((progress->>'teacher_recorded')::boolean,false)) then
    lessons:=lessons||jsonb_build_array(jsonb_build_object('objective_id',o.value->>'id','number',o.n,'title',coalesce(v.content->'architect'->'sessions'->(o.n::int-1)->>'title',o.value->>'title'),
     'objective',o.value->>'title','success_criteria',o.value->>'success_criteria','steps',o.value->'steps','power_expressions',coalesce(v.content->'architect'->'sessions'->(o.n::int-1)->'power_expressions','[]'),
     'activities',coalesce(v.content->'architect'->'sessions'->(o.n::int-1)->'activities','[]'),'class',cls,'materials',mats,'exercises',acts,'progress',progress));
   end if;
  end loop;
  if jsonb_array_length(lessons)>0 then
   course:=null;
   select jsonb_build_object('id',sp.assignment_id,'name',pk.name,'total',pk.class_count,'recorded_consumed',sp.classes_consumed) into course
   from public.student_packages sp join public.packages pk on pk.id=sp.package_id where sp.assignment_id=nullif(binding->>'package_assignment_id','')::uuid and sp.student_id=p_student_id and sp.teacher_id=v.teacher_id;
   plans:=plans||jsonb_build_array(jsonb_build_object('id',v.id,'version',v.version_number,'title',v.content->>'title','language',v.content->>'language','level',v.content->>'level','published_at',v.approved_at,'course_key',v.course_key,'course',course,'historical',v.course_order>1,'lessons',lessons));
  end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'starts_at',c.starts_at) order by c.starts_at),'[]') into history
 from public.classes c join public.class_participants cp on cp.class_id=c.id and cp.student_id=p_student_id
 join public.class_attendance ca on ca.class_id=c.id and ca.student_id=p_student_id and ca.status in('present','late')
 where c.status='completed' and public.can_teacher_access_student(c.teacher_id,p_student_id)
 and not exists(select 1 from jsonb_array_elements(plans) p cross join lateral jsonb_array_elements(p->'lessons') l where l->'class'->>'id'=c.id::text);
 return jsonb_build_object('plans',plans,'completed_classes',history,'refreshed_at',now());
end $$;
revoke all on function public._learning_journey_binding(uuid),public._guard_exercise_journey_link(),public._guard_journey_assignment() from public,anon,authenticated;
revoke all on function public.get_learning_journey_binding(uuid),public.get_learning_journey_options(uuid),public.save_learning_journey_binding(uuid,integer,uuid,jsonb),public.get_student_learning_journey(uuid) from public,anon;
grant execute on function public.get_learning_journey_binding(uuid),public.get_learning_journey_options(uuid),public.save_learning_journey_binding(uuid,integer,uuid,jsonb),public.get_student_learning_journey(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
