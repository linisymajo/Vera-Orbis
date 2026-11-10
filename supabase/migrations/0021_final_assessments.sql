-- Finals reuse exercise authoring, assignments, validated attempts and private attachments.
-- Requires 0012, 0013 and 0018. New result revisions remain private until explicitly released.
begin;

create table if not exists public.final_assessments (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null unique references public.exercises(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  criteria jsonb not null,
  material_ids uuid[] not null default '{}',
  request_id uuid not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(teacher_id,request_id)
);
create table if not exists public.final_results (
  id uuid primary key default gen_random_uuid(),
  final_id uuid not null references public.final_assessments(id) on delete restrict,
  attempt_id uuid not null references public.exercise_attempts(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  revision integer not null check(revision > 0),
  criteria_snapshot jsonb not null,
  scores jsonb not null,
  grade numeric(5,2) not null check(grade between 0 and 100),
  feedback text not null check(length(btrim(feedback)) between 1 and 12000),
  request_id uuid not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(attempt_id,revision), unique(teacher_id,request_id)
);
create index if not exists final_results_final_idx on public.final_results(final_id,created_at desc);
alter table public.final_assessments enable row level security;
alter table public.final_results enable row level security;
drop policy if exists "teachers read own finals" on public.final_assessments;
create policy "teachers read own finals" on public.final_assessments for select to authenticated
  using(teacher_id=(select auth.uid()) and public.is_academic_staff());
drop policy if exists "teachers read own final results" on public.final_results;
create policy "teachers read own final results" on public.final_results for select to authenticated
  using(teacher_id=(select auth.uid()) and exists(select 1 from public.exercise_attempts t join public.exercise_assignments a on a.id=t.assignment_id
    where t.id=final_results.attempt_id and a.teacher_id=(select auth.uid()) and public.can_teacher_access_student((select auth.uid()),a.student_id)));
revoke all on public.final_assessments,public.final_results from public,anon,authenticated;
grant select on public.final_assessments,public.final_results to authenticated;

create or replace function public.validate_final_criteria(p_criteria jsonb)
returns void language plpgsql immutable set search_path='' as $$
declare c jsonb; total numeric := 0; points numeric;
begin
  if jsonb_typeof(p_criteria) is distinct from 'array' then raise exception 'Assessment criteria must be an array'; end if;
  if jsonb_array_length(p_criteria) not between 1 and 20 then raise exception 'Add between 1 and 20 assessment criteria'; end if;
  for c in select value from jsonb_array_elements(p_criteria) loop
    if jsonb_typeof(c) is distinct from 'object' or jsonb_typeof(c->'label') is distinct from 'string'
      or length(btrim(c->>'label')) not between 1 and 160 or jsonb_typeof(c->'max_points') is distinct from 'number' then
      raise exception 'Each criterion needs a label and positive points';
    end if;
    points := (c->>'max_points')::numeric;
    if points<=0 or points>100 or round(points,2)<>points then raise exception 'Invalid criterion points'; end if;
    total := total+points;
  end loop;
  if total<>100 then raise exception 'Assessment criteria must total 100 points'; end if;
end $$;
revoke all on function public.validate_final_criteria(jsonb) from public,anon;
grant execute on function public.validate_final_criteria(jsonb) to authenticated;

create or replace function public.save_final_draft(p_final_id uuid,p_draft jsonb,p_criteria jsonb,p_material_ids uuid[],p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.final_assessments%rowtype; e public.exercises%rowtype; ids uuid[]; normalized jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.teachers where id=auth.uid()) or not public.is_academic_staff() then raise exception 'Teacher access required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'Save request ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':final-draft',0));
  perform public.validate_final_criteria(p_criteria);
  select jsonb_agg(jsonb_build_object('label',btrim(c->>'label'),'max_points',c->'max_points') order by ord)
    into normalized from jsonb_array_elements(p_criteria) with ordinality t(c,ord);
  if jsonb_typeof(p_draft) is distinct from 'object' or length(btrim(p_draft->>'title')) not between 1 and 160
    or coalesce(length(btrim(p_draft->>'language')),0) not between 1 and 80
    or coalesce(length(btrim(p_draft->>'instructions')),0) not between 1 and 12000
    or coalesce(length(p_draft->>'level'),0)>80 or coalesce(length(p_draft->>'objective'),0)>1000 then
    raise exception 'Add a title, language and final instructions within their limits';
  end if;
  perform public.validate_exercise_questions(p_draft->>'exercise_type',p_draft->'questions');
  if coalesce(p_draft->>'attachment_mode','optional') not in ('none','optional','required') then raise exception 'Invalid submission file mode'; end if;
  select coalesce(array_agg(distinct x),'{}'::uuid[]) into ids from unnest(coalesce(p_material_ids,'{}'::uuid[])) x;
  if cardinality(ids)>20 or exists(select 1 from unnest(ids) mid where not exists(select 1 from public.materials m where m.id=mid and m.teacher_id=auth.uid())) then
    raise exception 'Choose up to 20 materials owned by this teacher' using errcode='42501';
  end if;
  if p_final_id is null then select * into f from public.final_assessments where teacher_id=auth.uid() and request_id=p_request_id for update;
  else select * into f from public.final_assessments where id=p_final_id and teacher_id=auth.uid() for update;
    if not found then raise exception 'Final unavailable' using errcode='42501'; end if;
  end if;
  if f.id is not null then
    select * into e from public.exercises where id=f.exercise_id and teacher_id=auth.uid() for update;
    if not found or e.status<>'draft' or f.published_at is not null or exists(select 1 from public.exercise_assignments where exercise_id=e.id) then raise exception 'Assigned finals cannot be edited; create a new final'; end if;
    update public.exercises set title=btrim(p_draft->>'title'),language=btrim(p_draft->>'language'),level=p_draft->>'level',objective=p_draft->>'objective',
      instructions=btrim(p_draft->>'instructions'),exercise_type=p_draft->>'exercise_type',questions=p_draft->'questions',updated_at=now(),
      settings=jsonb_build_object('final_assessment',true,'max_attempts',1,'allow_late',false,'attachment_mode',coalesce(p_draft->>'attachment_mode','optional'),'allow_attachment_revisions',false) where id=e.id;
    update public.final_assessments set criteria=normalized,material_ids=ids where id=f.id;
  else
    insert into public.exercises(teacher_id,title,language,level,objective,instructions,exercise_type,questions,settings)
      values(auth.uid(),btrim(p_draft->>'title'),btrim(p_draft->>'language'),p_draft->>'level',p_draft->>'objective',btrim(p_draft->>'instructions'),p_draft->>'exercise_type',p_draft->'questions',
        jsonb_build_object('final_assessment',true,'max_attempts',1,'allow_late',false,'attachment_mode',coalesce(p_draft->>'attachment_mode','optional'),'allow_attachment_revisions',false)) returning * into e;
    insert into public.final_assessments(exercise_id,teacher_id,criteria,material_ids,request_id)
      values(e.id,auth.uid(),normalized,ids,p_request_id) returning * into f;
  end if;
  return jsonb_build_object('id',f.id,'exercise_id',e.id);
end $$;

create or replace function public.publish_final_assessment(p_final_id uuid,p_student_ids uuid[],p_due_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.final_assessments%rowtype; result jsonb;
begin
  select * into f from public.final_assessments where id=p_final_id and teacher_id=auth.uid() for update;
  if not found or not public.is_academic_staff() then raise exception 'Final unavailable' using errcode='42501'; end if;
  perform public.validate_final_criteria(f.criteria);
  if exists(select 1 from unnest(f.material_ids) mid where not exists(select 1 from public.materials m where m.id=mid and m.teacher_id=auth.uid()
      and (m.audience='all' or (m.student_id is not null and not exists(select 1 from unnest(p_student_ids) sid where sid is distinct from m.student_id))))) then
    raise exception 'Supporting materials must already be shared with every selected student' using errcode='42501';
  end if;
  result := public.publish_exercise(f.exercise_id,p_student_ids,p_due_at);
  update public.final_assessments set published_at=coalesce(published_at,now()) where id=f.id;
  return result||jsonb_build_object('id',f.id);
end $$;

-- Freeze the tested final definition after any assignment exists, including revoked history.
create or replace function public.protect_assigned_final_definition()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.final_assessments f where f.exercise_id=old.id and (f.published_at is not null or exists(select 1 from public.exercise_assignments a where a.exercise_id=old.id)))
    and (new.title,new.language,new.level,new.objective,new.instructions,new.exercise_type,new.questions,new.settings,new.teacher_id)
      is distinct from (old.title,old.language,old.level,old.objective,old.instructions,old.exercise_type,old.questions,old.settings,old.teacher_id) then
    raise exception 'Assigned final definition is immutable; create a new final';
  end if;
  return new;
end $$;
drop trigger if exists protect_assigned_final_definition on public.exercises;
create trigger protect_assigned_final_definition before update on public.exercises for each row execute function public.protect_assigned_final_definition();

create or replace function public.save_final_result(p_attempt_id uuid,p_scores jsonb,p_feedback text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.final_assessments%rowtype; a public.exercise_assignments%rowtype; prior public.final_results%rowtype;
  result_id uuid; rev integer; points numeric; total numeric:=0; i integer;
begin
  select ea.* into a from public.exercise_attempts t join public.exercise_assignments ea on ea.id=t.assignment_id where t.id=p_attempt_id and ea.teacher_id=auth.uid();
  if not found or not public.can_teacher_access_student(auth.uid(),a.student_id) then raise exception 'Final submission access denied' using errcode='42501'; end if;
  select * into f from public.final_assessments where exercise_id=a.exercise_id and teacher_id=auth.uid();
  if not found then raise exception 'Final unavailable' using errcode='42501'; end if;
  if p_request_id is null or coalesce(length(btrim(p_feedback)),0) not between 1 and 12000 then raise exception 'Add specific feedback and a request ID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':final-result',0));
  select * into prior from public.final_results where teacher_id=auth.uid() and request_id=p_request_id;
  if found then
    if prior.attempt_id<>p_attempt_id or prior.scores is distinct from p_scores or prior.feedback<>btrim(p_feedback) then raise exception 'Request ID already used for another assessment'; end if;
    return jsonb_build_object('id',prior.id,'grade',prior.grade,'revision',prior.revision,'status','draft');
  end if;
  if jsonb_typeof(p_scores) is distinct from 'array' then raise exception 'Add every criterion score'; end if;
  if jsonb_array_length(p_scores)<>jsonb_array_length(f.criteria) then raise exception 'Add every criterion score'; end if;
  for i in 0..jsonb_array_length(f.criteria)-1 loop
    if jsonb_typeof(p_scores->i) is distinct from 'number' then raise exception 'Invalid criterion score'; end if;
    points := (p_scores->>i)::numeric;
    if points<0 or points>(f.criteria->i->>'max_points')::numeric or round(points,2)<>points then raise exception 'Criterion score outside its range'; end if;
    total:=total+points;
  end loop;
  select coalesce(max(revision),0)+1 into rev from public.final_results where attempt_id=p_attempt_id;
  insert into public.final_results(final_id,attempt_id,teacher_id,revision,criteria_snapshot,scores,grade,feedback,request_id)
    values(f.id,p_attempt_id,auth.uid(),rev,f.criteria,p_scores,total,btrim(p_feedback),p_request_id) returning id into result_id;
  return jsonb_build_object('id',result_id,'grade',total,'revision',rev,'status','draft');
end $$;

create or replace function public.publish_final_result(p_result_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.final_results%rowtype; a public.exercise_assignments%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':final-result',0));
  select * into r from public.final_results where id=p_result_id and teacher_id=auth.uid() for update;
  if not found then raise exception 'Result unavailable' using errcode='42501'; end if;
  select ea.* into a from public.exercise_attempts t join public.exercise_assignments ea on ea.id=t.assignment_id where t.id=r.attempt_id;
  if a.teacher_id is distinct from auth.uid() or not public.can_teacher_access_student(auth.uid(),a.student_id) then raise exception 'Result access denied' using errcode='42501'; end if;
  if exists(select 1 from public.final_results newer where newer.attempt_id=r.attempt_id and newer.revision>r.revision) then raise exception 'A newer assessment revision exists; review it before publication'; end if;
  update public.final_results set published_at=coalesce(published_at,now()) where id=r.id;
  if r.published_at is null and to_regprocedure('public._add_academic_notification(uuid,text,uuid,text,text,text,text)') is not null then
    perform public._add_academic_notification(a.student_id,'final_result',r.id,'finals','Final evaluation is ready',
      'Your teacher has published your final assessment results.','final-result:'||r.id::text);
  end if;
  return jsonb_build_object('id',r.id,'status','published','grade',r.grade,'revision',r.revision);
end $$;

revoke all on function public.save_final_draft(uuid,jsonb,jsonb,uuid[],uuid),public.publish_final_assessment(uuid,uuid[],timestamptz),
  public.save_final_result(uuid,jsonb,text,uuid),public.publish_final_result(uuid),public.protect_assigned_final_definition() from public,anon;
grant execute on function public.save_final_draft(uuid,jsonb,jsonb,uuid[],uuid),public.publish_final_assessment(uuid,uuid[],timestamptz),
  public.save_final_result(uuid,jsonb,text,uuid),public.publish_final_result(uuid) to authenticated;

-- The underlying view already enforces approved enrollment, assignment and publication.
create or replace view public.student_finals with(security_invoker=false) as
select v.*,f.id as final_id,f.criteria,
  coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'file_path',m.file_path) order by m.title)
    from public.materials m where m.id=any(f.material_ids) and m.teacher_id=f.teacher_id and (m.student_id=auth.uid() or m.audience='all')),'[]'::jsonb) as supporting_materials,
  r.id as result_id,r.grade as result_grade,r.scores as result_scores,r.feedback as result_feedback,r.revision as result_revision,r.published_at as result_published_at
from public.student_exercises v join public.final_assessments f on f.exercise_id=v.exercise_id
left join lateral(select fr.* from public.final_results fr join public.exercise_attempts t on t.id=fr.attempt_id
  where fr.final_id=f.id and t.assignment_id=v.assignment_id and t.student_id=auth.uid() and fr.published_at is not null
  order by fr.revision desc limit 1) r on true
where v.student_id=auth.uid() and public.student_has_academic_access(auth.uid());
revoke all on public.student_finals from public,anon;
grant select on public.student_finals to authenticated;
commit;
