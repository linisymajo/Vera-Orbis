-- Transactional exercise delivery. Additive; legacy attempts and assignments retained.
-- Review against live schema. Does not run automatically during a build.
begin;

-- Transitional helpers: 0013 replaces these with enrollment-scoped decisions.
create or replace function public.student_has_academic_access(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_student_id and u.email_confirmed_at is not null)
$$;
create or replace function public.can_teacher_access_student(p_teacher_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.teachers t where t.id = p_teacher_id)
    and public.student_has_academic_access(p_student_id)
$$;
revoke all on function public.student_has_academic_access(uuid), public.can_teacher_access_student(uuid,uuid) from public, anon;
grant execute on function public.student_has_academic_access(uuid), public.can_teacher_access_student(uuid,uuid) to authenticated;

alter table public.exercise_attempts add column if not exists request_id uuid;
alter table public.exercise_attempts add column if not exists exercise_snapshot jsonb;
alter table public.exercise_attempts add column if not exists feedback_status text not null default 'draft';
alter table public.exercise_attempts add column if not exists feedback_published_at timestamptz;
create unique index if not exists exercise_attempt_request_idx on public.exercise_attempts(student_id, request_id) where request_id is not null;

create or replace function public.validate_exercise_questions(p_type text, p_questions jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare q jsonb;
begin
  if p_type not in ('multiple_choice','true_false','fill_blank','matching','ordering','reading','listening','image_vocabulary','open_question','writing','conversation','pronunciation') then
    raise exception 'Unsupported activity type';
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'Questions must be an array'; end if;
  if jsonb_array_length(p_questions) not between 1 and 100 then raise exception 'Add between 1 and 100 questions'; end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q) is distinct from 'object' or jsonb_typeof(q->'prompt') is distinct from 'string'
      or length(btrim(q->>'prompt')) not between 1 and 4000 then raise exception 'Every question needs a prompt'; end if;
    if p_type = 'multiple_choice' then
      if jsonb_typeof(q->'options') is distinct from 'array' then raise exception 'Options must be an array'; end if;
      if jsonb_array_length(q->'options') not between 2 and 12
        or exists(select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o) <> 'string' or length(btrim(o#>>'{}')) = 0)
        or (select count(distinct o) from jsonb_array_elements(q->'options') o) <> jsonb_array_length(q->'options')
        or jsonb_typeof(q->'answer') is distinct from 'string'
        or not (q->'options' @> jsonb_build_array(q->'answer')) then raise exception 'Choose a valid answer from 2-12 distinct options'; end if;
    end if;
    if p_type = 'matching' then
      if jsonb_typeof(q->'left') is distinct from 'array' or jsonb_typeof(q->'right') is distinct from 'array' then raise exception 'Add matching lists'; end if;
      if jsonb_array_length(q->'left') not between 2 and 100
        or jsonb_array_length(q->'left') <> jsonb_array_length(q->'right') then
        raise exception 'Matching lists must have equal length between 2 and 100';
      end if;
      if exists(select 1 from jsonb_array_elements((q->'left') || (q->'right')) item
          where jsonb_typeof(item) <> 'string' or length(btrim(item#>>'{}')) not between 1 and 4000) then
        raise exception 'Matching lists require nonempty strings of up to 4000 characters';
      end if;
    end if;
    if p_type = 'ordering' then
      if jsonb_typeof(q->'items') is distinct from 'array' then raise exception 'Add sentence blocks'; end if;
      if jsonb_array_length(q->'items') not between 2 and 100 then raise exception 'Add between 2 and 100 sentence blocks'; end if;
      if exists(select 1 from jsonb_array_elements(q->'items') item
          where jsonb_typeof(item) <> 'string' or length(btrim(item#>>'{}')) not between 1 and 4000) then
        raise exception 'Sentence blocks require nonempty strings of up to 4000 characters';
      end if;
    end if;
    if (q ? 'audio_url' and coalesce(q->>'audio_url','') <> '' and q->>'audio_url' !~* '^https://')
      or (q ? 'image_url' and coalesce(q->>'image_url','') <> '' and q->>'image_url' !~* '^https://') then raise exception 'Media must use HTTPS'; end if;
  end loop;
end $$;

create or replace function public.check_published_exercise()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' then
    if length(btrim(new.title)) not between 1 and 160 or length(btrim(new.language)) = 0 then raise exception 'Title and language required'; end if;
    perform public.validate_exercise_questions(new.exercise_type, new.questions);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists validate_published_exercise on public.exercises;
create trigger validate_published_exercise before insert or update on public.exercises for each row execute function public.check_published_exercise();

create or replace function public.publish_exercise(p_exercise_id uuid, p_student_ids uuid[], p_due_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.exercises%rowtype; ids uuid[]; n integer;
begin
  if auth.uid() is null or not exists(select 1 from public.teachers where id = auth.uid()) then raise exception 'Teacher access required' using errcode='42501'; end if;
  select * into e from public.exercises where id = p_exercise_id and teacher_id = auth.uid() for update;
  if not found then raise exception 'Exercise unavailable' using errcode='42501'; end if;
  select array_agg(distinct x) into ids from unnest(p_student_ids) x where x is not null;
  n := coalesce(cardinality(ids),0);
  if n not between 1 and 200 then raise exception 'Select between 1 and 200 students'; end if;
  if p_due_at is not null and p_due_at <= now() then raise exception 'Deadline must be in the future'; end if;
  if exists(select 1 from unnest(ids) sid where not public.can_teacher_access_student(auth.uid(),sid)) then raise exception 'Student access denied' using errcode='42501'; end if;
  perform public.validate_exercise_questions(e.exercise_type,e.questions);
  update public.exercises set status = 'published', updated_at = now() where id = e.id;
  -- Assignment set replaces availability without deleting history or attempts.
  update public.exercise_assignments set status = 'revoked' where exercise_id = e.id and not(student_id = any(ids));
  insert into public.exercise_assignments(exercise_id,teacher_id,student_id,due_at,status)
    select e.id, auth.uid(), sid, p_due_at, 'assigned' from unnest(ids) sid
    on conflict(exercise_id,student_id) do update set due_at=excluded.due_at,
      status=case when public.exercise_assignments.status='completed' then 'completed' else 'assigned' end;
  if (select count(*) from public.exercise_assignments where exercise_id=e.id and student_id=any(ids) and status<>'revoked') <> n then raise exception 'Assignment verification failed'; end if;
  return jsonb_build_object('exercise_id',e.id,'assignment_count',n,'status','published');
end $$;
revoke all on function public.publish_exercise(uuid,uuid[],timestamptz) from public, anon;
grant execute on function public.publish_exercise(uuid,uuid[],timestamptz) to authenticated;

create or replace function public.submit_exercise(p_assignment_id uuid,p_answers jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.exercise_assignments%rowtype; e public.exercises%rowtype; prior public.exercise_attempts%rowtype; answer jsonb; matching_choices jsonb; answer_index integer; attempt_id uuid; max_count integer;
begin
  if auth.uid() is null or not public.student_has_academic_access(auth.uid()) then raise exception 'Approved student access required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'Submission request ID required'; end if;
  -- Serialize per student as well as assignment so request-ID retries are deterministic.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into prior from public.exercise_attempts where student_id=auth.uid() and request_id=p_request_id;
  if found then
    if prior.assignment_id <> p_assignment_id or prior.answers <> p_answers then raise exception 'Request ID already used for different answers'; end if;
    return jsonb_build_object('id',prior.id,'assignment_id',prior.assignment_id);
  end if;
  -- Match publication's lock order: exercise first, then its assignment.
  -- The initial lookup only locates the exercise; re-read and validate the
  -- assignment after both locks, since publication may have changed it meanwhile.
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid();
  if not found then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  select * into e from public.exercises where id=a.exercise_id and status='published' for share;
  if not found then raise exception 'Activity unavailable' using errcode='42501'; end if;
  select * into a from public.exercise_assignments
    where id=p_assignment_id and student_id=auth.uid() and exercise_id=e.id for update;
  if not found or a.status='revoked' or (a.available_from is not null and a.available_from>now()) then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  if a.due_at is not null and a.due_at<now() and coalesce(e.settings->>'allow_late','false')<>'true' then raise exception 'The deadline has passed'; end if;
  perform public.validate_exercise_questions(e.exercise_type,e.questions);
  if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Answers must be an array'; end if;
  if jsonb_array_length(p_answers)<>jsonb_array_length(e.questions) then raise exception 'Complete every question'; end if;
  if (select count(distinct value->'index') from jsonb_array_elements(p_answers))<>jsonb_array_length(p_answers) then raise exception 'Duplicate answer index'; end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer->'index') is distinct from 'number' or (answer->>'index') !~ '^[0-9]+$'
      or jsonb_typeof(answer->'answer') is distinct from 'string' or length(btrim(answer->>'answer')) not between 1 and 12000 then raise exception 'Complete every answer'; end if;
    answer_index := (answer->>'index')::integer;
    if answer_index>=jsonb_array_length(e.questions) then raise exception 'Invalid answer index'; end if;
    if e.exercise_type='multiple_choice' and not(e.questions->answer_index->'options' @> jsonb_build_array(answer->'answer')) then raise exception 'Choose an available option'; end if;
    if e.exercise_type='true_false' and answer->>'answer' not in ('True','False') then raise exception 'Choose True or False'; end if;
    if e.exercise_type='matching' then
      begin
        matching_choices := (answer->>'answer')::jsonb;
      exception when invalid_text_representation then
        raise exception 'Matching answers must be a JSON array of choices';
      end;
      if jsonb_typeof(matching_choices) is distinct from 'array' then
        raise exception 'Matching answers must be a JSON array of choices';
      end if;
      if jsonb_array_length(matching_choices) <> jsonb_array_length(e.questions->answer_index->'left') then
        raise exception 'Complete every matching choice';
      end if;
      if exists(select 1 from jsonb_array_elements(matching_choices) choice
          where jsonb_typeof(choice) <> 'string' or length(btrim(choice#>>'{}')) = 0
            or not (e.questions->answer_index->'right' @> jsonb_build_array(choice))) then
        raise exception 'Choose an available option for every matching expression';
      end if;
    end if;
  end loop;
  max_count := case when e.settings->>'max_attempts' ~ '^[1-9][0-9]?$' then (e.settings->>'max_attempts')::integer else 1 end;
  if (select count(*) from public.exercise_attempts where assignment_id=a.id and student_id=auth.uid())>=max_count then raise exception 'Maximum attempts reached'; end if;
  insert into public.exercise_attempts(assignment_id,student_id,answers,request_id,exercise_snapshot) values(a.id,auth.uid(),p_answers,p_request_id,jsonb_build_object('title',e.title,'exercise_type',e.exercise_type,'questions',e.questions)) returning id into attempt_id;
  update public.exercise_assignments set status='completed' where id=a.id;
  return jsonb_build_object('id',attempt_id,'assignment_id',a.id);
end $$;
revoke all on function public.submit_exercise(uuid,jsonb,uuid) from public, anon;
grant execute on function public.submit_exercise(uuid,jsonb,uuid) to authenticated;
-- Submissions must pass the server validator; direct insert/update cannot bypass it.
revoke insert,update,delete on public.exercise_attempts from authenticated;
revoke insert,update,delete on public.exercise_assignments from authenticated;
drop policy if exists "students read own exercise attempts" on public.exercise_attempts;

create or replace function public.review_exercise_attempt(p_attempt_id uuid,p_feedback text,p_release boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.exercise_assignments%rowtype;
begin
  select ea.* into a from public.exercise_assignments ea join public.exercise_attempts t on t.assignment_id=ea.id where t.id=p_attempt_id and ea.teacher_id=auth.uid();
  if not found or not public.can_teacher_access_student(auth.uid(),a.student_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  if length(btrim(p_feedback)) not between 1 and 12000 then raise exception 'Add specific feedback'; end if;
  update public.exercise_attempts set feedback=p_feedback, feedback_status=case when p_release then 'published' else 'draft' end,
    feedback_published_at=case when p_release then now() else null end where id=p_attempt_id;
  return jsonb_build_object('id',p_attempt_id,'feedback_status',case when p_release then 'published' else 'draft' end);
end $$;
revoke all on function public.review_exercise_attempt(uuid,text,boolean) from public,anon;
grant execute on function public.review_exercise_attempt(uuid,text,boolean) to authenticated;

-- Keep original view columns in order, append progress/approved feedback only.
create or replace view public.student_exercises with (security_invoker=false) as
select a.id as assignment_id,a.student_id,a.available_from,a.due_at,
  e.id as exercise_id,e.title,e.instructions,e.language,e.level,e.objective,e.exercise_type,
  coalesce((select jsonb_agg((select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
    from jsonb_each(q) where key in ('prompt','options','left','right','items','passage','audio_url','image_url')) order by ord)
    from jsonb_array_elements(case when jsonb_typeof(e.questions)='array' then e.questions else '[]'::jsonb end) with ordinality v(q,ord)), '[]'::jsonb) as questions,
  a.status as assignment_status,
  (select count(*) from public.exercise_attempts t where t.assignment_id=a.id and t.student_id=auth.uid()) as attempt_count,
  (select feedback from public.exercise_attempts t where t.assignment_id=a.id and t.student_id=auth.uid() and feedback_status='published' order by feedback_published_at desc limit 1) as feedback
from public.exercise_assignments a join public.exercises e on e.id=a.exercise_id
where a.student_id=auth.uid() and public.student_has_academic_access(auth.uid())
  and a.status<>'revoked' and e.status='published' and (a.available_from is null or a.available_from<=now());
revoke all on public.student_exercises from public,anon;
grant select on public.student_exercises to authenticated;
commit;