-- Compatibility supplement to 0022. No historical rows are rewritten during
-- deployment. The first subsequent review retains legacy feedback in history.
-- Explicit staging approval is required before application.
begin;
create or replace function public.save_exercise_feedback(p_attempt_id uuid,p_content jsonb,p_expected_version integer,p_request_id uuid,p_release boolean default false,p_ai_draft_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.exercise_assignments; t public.exercise_attempts; prior public.exercise_feedback_versions; v integer; draft public.ai_academic_drafts;
begin
  select * into t from public.exercise_attempts where id=p_attempt_id for update;
  select * into a from public.exercise_assignments where id=t.assignment_id;
  if t.id is null or a.teacher_id<>auth.uid() or not public.can_teacher_access_student(auth.uid(),a.student_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  if p_request_id is null or p_release is null or p_expected_version is null or p_expected_version<0 then raise exception 'Review version and request required'; end if;
  if jsonb_typeof(p_content) is distinct from 'object' or not(p_content ? 'message') or exists(select 1 from jsonb_each(p_content) f
    where f.key not in('message','strengths','natural_alternative','explanation','practical_tip','encouragement')
      or jsonb_typeof(f.value)<>'string' or length(f.value#>>'{}')>case when f.key='message' then 12000 else 4000 end)
    or length(btrim(p_content->>'message')) not between 1 and 12000
    or exists(select 1 from jsonb_each_text(p_content) f where f.value ~ '<[^>]+>') then raise exception 'Add bounded, specific plain-text feedback'; end if;
  select * into prior from public.exercise_feedback_versions where teacher_id=auth.uid() and request_id=p_request_id;
  if found then
    if prior.attempt_id<>p_attempt_id or prior.content<>p_content or(prior.released_at is not null)<>p_release or prior.ai_draft_id is distinct from p_ai_draft_id then raise exception 'Request ID already used'; end if;
    return jsonb_build_object('attempt_id',p_attempt_id,'version',prior.version,'released',prior.released_at is not null);
  end if;
  select coalesce(max(version),0) into v from public.exercise_feedback_versions where attempt_id=p_attempt_id;
  if v<>p_expected_version then raise exception 'Feedback changed. Reload before saving'; end if;
  if p_ai_draft_id is not null then
    select * into draft from public.ai_academic_drafts where id=p_ai_draft_id and teacher_id=auth.uid() and student_id=a.student_id and kind='feedback' and status='approved';
    if not found or draft.feedback_attempt_id is distinct from t.id then raise exception 'Approve the matching AI draft first'; end if;
  end if;
  -- Preserve the pre-versioning observation before replacing the compatibility
  -- column. Existing versioned histories remain untouched.
  if v=0 and nullif(btrim(t.feedback),'') is not null then
    insert into public.exercise_feedback_versions(attempt_id,teacher_id,version,content,source,request_id,released_at)
      values(t.id,a.teacher_id,1,jsonb_build_object('message',t.feedback),'teacher',gen_random_uuid(),
        case when t.feedback_status='published' then coalesce(t.feedback_published_at,now()) else null end);
    v:=1;
  end if;
  insert into public.exercise_feedback_versions(attempt_id,teacher_id,version,content,source,ai_draft_id,request_id,released_at)
    values(t.id,auth.uid(),v+1,p_content,case when p_ai_draft_id is null then 'teacher' else 'ai_draft' end,p_ai_draft_id,p_request_id,case when p_release then now() else null end);
  update public.exercise_attempts set feedback=p_content->>'message',feedback_status=case when p_release then 'published' else 'draft' end,
    feedback_published_at=case when p_release then now() else null end where id=t.id;
  return jsonb_build_object('attempt_id',t.id,'version',v+1,'released',p_release);
end $$;
revoke all on function public.save_exercise_feedback(uuid,jsonb,integer,uuid,boolean,uuid) from public,anon;
grant execute on function public.save_exercise_feedback(uuid,jsonb,integer,uuid,boolean,uuid) to authenticated;

-- Preserve view columns/types/order and existing enrollment/assignment scope.
-- Legacy student renderers retain released feedback during a new private draft.
do $$ declare definition text; columns text; begin
  select pg_get_viewdef('public.student_exercises'::regclass,true) into definition;
  definition:=regexp_replace(definition,';\s*$','');
  select string_agg(case when attname='feedback' then
    '(coalesce((select f.content->>''message'' from public.exercise_feedback_versions f join public.exercise_attempts t on t.id=f.attempt_id where t.assignment_id=v.assignment_id and f.released_at is not null order by f.released_at desc,f.version desc limit 1),v.feedback)) as feedback'
    else format('v.%I',attname) end,',' order by attnum) into columns
    from pg_attribute where attrelid='public.student_exercises'::regclass and attnum>0 and not attisdropped;
  if columns is null or to_regprocedure('public.get_exercise_practice_state(uuid)') is null then raise exception 'Complete 0022 is required'; end if;
  execute format('create or replace view public.student_exercises with(security_invoker=false,security_barrier=true) as select %s from (%s) v where public.student_has_academic_access(auth.uid())',columns,definition);
end $$;
revoke all on public.student_exercises from public,anon;
grant select on public.student_exercises to authenticated;
notify pgrst,'reload schema';
commit;
