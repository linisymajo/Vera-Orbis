-- Exercise Experience 4.0. ADDITIVE PROPOSAL: local tests first; staging approval
-- required before application. Existing assignments/attempts/files are retained.
begin;

alter table public.academic_ai_requests add column feedback_attempt_id uuid references public.exercise_attempts(id) on delete restrict;
alter table public.ai_academic_drafts add column feedback_attempt_id uuid references public.exercise_attempts(id) on delete restrict;
create function public.reserve_exercise_feedback_request(p_student_id uuid,p_attempt_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
  if p_attempt_id is null then raise exception 'Submission required'; end if;
  perform public.get_academic_ai_context(p_student_id,p_attempt_id);
  request_id:=public.reserve_academic_ai_request(p_student_id,'feedback');
  update public.academic_ai_requests set feedback_attempt_id=p_attempt_id where id=request_id;
  return request_id;
end $$;
create function public._bind_exercise_feedback_draft()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  select feedback_attempt_id into new.feedback_attempt_id from public.academic_ai_requests where id=new.request_id;
  return new;
end $$;
create trigger bind_exercise_feedback_draft before insert on public.ai_academic_drafts for each row execute function public._bind_exercise_feedback_draft();

create table public.exercise_correction_results (
  attempt_id uuid primary key references public.exercise_attempts(id) on delete restrict,
  assignment_id uuid not null references public.exercise_assignments(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  policy jsonb not null, question_results jsonb not null,
  attempt_number integer not null check(attempt_number>0), unique(assignment_id,attempt_number),
  raw_score numeric(6,2), awarded_score numeric(6,2),
  state text not null check(state in('awaiting_review','objective_complete','generation_failed')),
  created_at timestamptz not null default now()
);
create function public.exercise_experience_capabilities()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_academic_staff() then raise exception 'Verified teacher access required' using errcode='42501'; end if;
  return jsonb_build_object('version',1,'ai_generation_enabled',false);
end $$;
create table public.exercise_question_checks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.exercise_assignments(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  question_index integer not null check(question_index between 0 and 99),
  answer text not null, correct boolean not null, request_id uuid not null,
  check_number integer not null check(check_number>0), unique(assignment_id,question_index,check_number),
  created_at timestamptz not null default now(), unique(student_id,request_id)
);
create index exercise_checks_question_idx on public.exercise_question_checks(assignment_id,question_index,created_at,id);
create table public.exercise_feedback_versions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exercise_attempts(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  version integer not null check(version>0), content jsonb not null,
  source text not null check(source in('teacher','ai_draft')),
  ai_draft_id uuid references public.ai_academic_drafts(id) on delete restrict,
  request_id uuid not null, released_at timestamptz,
  created_at timestamptz not null default now(),
  unique(attempt_id,version), unique(teacher_id,request_id)
);
create table public.exercise_practice_drafts (
  assignment_id uuid primary key references public.exercise_assignments(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  answers jsonb not null, revision integer not null check(revision>0), updated_at timestamptz not null default now()
);
alter table public.exercise_practice_drafts enable row level security;
revoke all on public.exercise_practice_drafts from public,anon,authenticated;
alter table public.exercise_correction_results enable row level security;
alter table public.exercise_question_checks enable row level security;
alter table public.exercise_feedback_versions enable row level security;
-- Hosted defaults include management rights; remove ALL before scoped grants.
revoke all on public.exercise_correction_results,public.exercise_question_checks,public.exercise_feedback_versions from public,anon,authenticated;
grant select on public.exercise_correction_results,public.exercise_feedback_versions to authenticated;
create policy "teachers read scoped correction results" on public.exercise_correction_results for select to authenticated
  using(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id));
create policy "teachers read scoped feedback versions" on public.exercise_feedback_versions for select to authenticated
  using(teacher_id=auth.uid() and exists(select 1 from public.exercise_attempts t join public.exercise_assignments a on a.id=t.assignment_id
    where t.id=attempt_id and public.can_teacher_access_student(auth.uid(),a.student_id)));

create function public._exercise_correction_policy(p_settings jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare c jsonb := coalesce(p_settings->'correction','{}'); result jsonb;
begin
  if jsonb_typeof(c)<>'object' or exists(select 1 from jsonb_object_keys(c) k where k not in
    ('version','mode','timing','retry_incorrect_only','reveal_after_attempt','hide_solutions_until_complete','show_score','scoring','retry_penalty','ai_auto_authorized')) then raise exception 'Invalid correction settings'; end if;
  result := '{"version":1,"mode":"teacher_only","timing":"after_submission","retry_incorrect_only":false,"reveal_after_attempt":99,"hide_solutions_until_complete":true,"show_score":false,"scoring":"first","retry_penalty":10,"ai_auto_authorized":false}'::jsonb || c;
  if result->'version' is distinct from '1'::jsonb or coalesce(result->>'mode','') not in('teacher_only','objective','ai_draft','ai_auto')
    or coalesce(result->>'timing','') not in('immediate','after_submission') or coalesce(result->>'scoring','') not in('first','best','penalized')
    or coalesce(result->>'reveal_after_attempt','') !~ '^[1-9][0-9]?$'
    or coalesce(result->>'retry_penalty','') !~ '^(100|[1-9]?[0-9])$'
    or jsonb_typeof(result->'retry_penalty')<>'number' or jsonb_typeof(result->'reveal_after_attempt')<>'number'
    or exists(select 1 from jsonb_each(result) v where v.key in('retry_incorrect_only','hide_solutions_until_complete','show_score','ai_auto_authorized') and jsonb_typeof(v.value)<>'boolean')
    or(result->>'mode'='ai_auto' and result->>'ai_auto_authorized'<>'true')
    or(result->>'timing'='immediate' and result->>'mode'<>'objective') then raise exception 'Invalid correction, retry or reveal policy'; end if;
  if p_settings ? 'correction' and (coalesce(p_settings->>'max_attempts','1') !~ '^[1-9][0-9]?$' or(p_settings ? 'max_attempts' and jsonb_typeof(p_settings->'max_attempts')<>'number')) then raise exception 'Choose 1-99 attempts'; end if;
  return result;
end $$;

-- Preserve legacy validation, add per-question formats without a parallel store.
alter function public.validate_exercise_questions(text,jsonb) rename to _validate_exercise_questions_v1;
create function public.validate_exercise_questions(p_type text,p_questions jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare q jsonb; kind text;
begin
  if jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'Questions must be an array'; end if;
  if jsonb_array_length(p_questions) not between 1 and 100 then raise exception 'Add between 1 and 100 questions'; end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    kind:=coalesce(q->>'response_type',p_type);
    perform public._validate_exercise_questions_v1(kind,jsonb_build_array(q));
    if q ? 'accepted_answers' and(jsonb_typeof(q->'accepted_answers')<>'array') then raise exception 'Accepted answers must be a list'; end if;
    if q ? 'accepted_answers' then
      if jsonb_array_length(q->'accepted_answers')>20 or exists(select 1 from jsonb_array_elements(q->'accepted_answers') a
        where jsonb_typeof(a)<>'string' or length(btrim(a#>>'{}')) not between 1 and 4000) then raise exception 'Invalid accepted alternatives'; end if;
    end if;
    if q ? 'explanation' and q->'explanation'<>'null'::jsonb and(jsonb_typeof(q->'explanation')<>'string' or length(q->>'explanation')>2000) then raise exception 'Explanation must be bounded text'; end if;
  end loop;
end $$;

create function public._exercise_policy_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare c jsonb; q jsonb; kind text;
begin
  c:=public._exercise_correction_policy(new.settings);
  if tg_op='UPDATE' and old.settings ? 'correction' and exists(select 1 from public.exercise_assignments a where a.exercise_id=old.id)
    and(new.questions,new.settings,new.exercise_type) is distinct from(old.questions,old.settings,old.exercise_type) then raise exception 'Duplicate this activity to change reviewed content or correction rules'; end if;
  if not(new.settings ? 'correction') then return new; end if;
  perform public.validate_exercise_questions(new.exercise_type,new.questions);
  if new.settings->>'final_assessment'='true' and c->>'mode' not in('teacher_only','ai_draft') then raise exception 'Final assessments require teacher review'; end if;
  if c->>'mode'='objective' then
    for q in select value from jsonb_array_elements(new.questions) loop
      kind:=coalesce(q->>'response_type',new.exercise_type);
      if kind not in('multiple_choice','true_false','fill_blank','matching','ordering','image_vocabulary') then raise exception 'Open responses require teacher review'; end if;
      if kind='matching' then
        if jsonb_typeof(q->'answer') is distinct from 'array' then raise exception 'Define correct matching pairs'; end if;
        if jsonb_array_length(q->'answer')<>jsonb_array_length(q->'left') or exists(select 1 from jsonb_array_elements(q->'answer') a where jsonb_typeof(a)<>'string' or not(q->'right' @> jsonb_build_array(a))) then raise exception 'Define every correct match'; end if;
      elsif jsonb_typeof(q->'answer') is distinct from 'string' or length(btrim(q->>'answer')) not between 1 and 4000 then raise exception 'Define the expected answer'; end if;
      if kind='true_false' and q->>'answer' not in('True','False') then raise exception 'Choose True or False'; end if;
    end loop;
  end if;
  return new;
end $$;
create trigger exercise_correction_policy before insert or update on public.exercises for each row execute function public._exercise_policy_guard();

create function public._exercise_answer_matches(p_question jsonb,p_type text,p_answer text)
returns boolean language plpgsql immutable set search_path='' as $$
declare candidate text; parsed jsonb;
begin
  if p_type='matching' then
    begin parsed:=p_answer::jsonb; exception when invalid_text_representation then return false; end;
    return parsed=p_question->'answer';
  end if;
  for candidate in select value#>>'{}' from jsonb_array_elements(jsonb_build_array(p_question->'answer')||coalesce(p_question->'accepted_answers','[]')) loop
    if p_type in('multiple_choice','true_false') then
      if candidate=p_answer then return true; end if;
    elsif lower(regexp_replace(btrim(candidate),'\s+',' ','g'))=lower(regexp_replace(btrim(p_answer),'\s+',' ','g')) then return true; end if;
  end loop;
  return false;
end $$;

-- Upgrade the existing attachment-protected writer in place; both public
-- submission RPCs retain their attachment safeguards and this stays private.
create or replace function public._submit_exercise_answers(p_assignment_id uuid,p_answers jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.exercise_assignments; e public.exercises; prior public.exercise_attempts;
  answer jsonb; question jsonb; choices jsonb; kind text; ordinal integer; max_n integer; attempt uuid;
begin
  if auth.uid() is null or not public.student_has_academic_access(auth.uid()) then raise exception 'Approved student access required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'Submission request ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into prior from public.exercise_attempts where student_id=auth.uid() and request_id=p_request_id;
  if found then
    if prior.assignment_id<>p_assignment_id or prior.answers<>p_answers then raise exception 'Request ID already used for different answers'; end if;
    return jsonb_build_object('id',prior.id,'assignment_id',prior.assignment_id);
  end if;
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid();
  if not found then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  select * into e from public.exercises where id=a.exercise_id and status='published' for share;
  if not found then raise exception 'Activity unavailable' using errcode='42501'; end if;
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid() and exercise_id=e.id for update;
  if not found or a.status='revoked' or a.available_from>now() then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  if a.due_at<now() and coalesce(e.settings->>'allow_late','false')<>'true' then raise exception 'The deadline has passed'; end if;
  perform public.validate_exercise_questions(e.exercise_type,e.questions);
  if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Answers must be an array'; end if;
  if jsonb_array_length(p_answers)<>jsonb_array_length(e.questions) then raise exception 'Complete every question'; end if;
  if(select count(distinct value->'index') from jsonb_array_elements(p_answers))<>jsonb_array_length(p_answers) then raise exception 'Duplicate answer index'; end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer->'index') is distinct from 'number' or coalesce(answer->>'index','') !~ '^[0-9]{1,2}$'
      or jsonb_typeof(answer->'answer') is distinct from 'string' or length(btrim(answer->>'answer')) not between 1 and 12000 then raise exception 'Complete every answer'; end if;
    ordinal:=(answer->>'index')::int;
    if ordinal>=jsonb_array_length(e.questions) then raise exception 'Invalid answer index'; end if;
    question:=e.questions->ordinal;kind:=coalesce(question->>'response_type',e.exercise_type);
    if kind='multiple_choice' and not(question->'options' @> jsonb_build_array(answer->'answer')) then raise exception 'Choose an available option'; end if;
    if kind='true_false' and answer->>'answer' not in('True','False') then raise exception 'Choose True or False'; end if;
    if kind='matching' then
      begin choices:=(answer->>'answer')::jsonb; exception when invalid_text_representation then raise exception 'Matching answers must be a JSON array of choices'; end;
      if jsonb_typeof(choices) is distinct from 'array' then raise exception 'Matching answers must be a JSON array of choices'; end if;
      if jsonb_array_length(choices)<>jsonb_array_length(question->'left') then raise exception 'Complete every matching choice'; end if;
      if exists(select 1 from jsonb_array_elements(choices) choice where jsonb_typeof(choice)<>'string' or length(btrim(choice#>>'{}'))=0 or not(question->'right' @> jsonb_build_array(choice))) then raise exception 'Choose an available option for every matching expression'; end if;
    end if;
  end loop;
  max_n:=case when e.settings->>'max_attempts' ~ '^[1-9][0-9]?$' then(e.settings->>'max_attempts')::int else 1 end;
  if(select count(*) from public.exercise_attempts where assignment_id=a.id and student_id=auth.uid())>=max_n then raise exception 'Maximum attempts reached'; end if;
  insert into public.exercise_attempts(assignment_id,student_id,answers,request_id,exercise_snapshot)
    values(a.id,auth.uid(),p_answers,p_request_id,jsonb_build_object('title',e.title,'exercise_type',e.exercise_type,'questions',e.questions)) returning id into attempt;
  update public.exercise_assignments set status='completed' where id=a.id;
  return jsonb_build_object('id',attempt,'assignment_id',a.id);
end $$;
revoke all on function public._submit_exercise_answers(uuid,jsonb,uuid) from public,anon,authenticated;

create function public._record_exercise_correction()
returns trigger language plpgsql security definer set search_path='' as $$
declare e public.exercises; a public.exercise_assignments; c jsonb; results jsonb:='[]'; q jsonb; answer jsonb; kind text; matched boolean;
  previous_result public.exercise_correction_results; previous_attempt public.exercise_attempts; checked public.exercise_question_checks;
  correct_count integer:=0; checks integer; ordinal integer; count_attempts integer; raw numeric; awarded numeric; first_score numeric;
begin
  select * into a from public.exercise_assignments where id=new.assignment_id;
  select * into e from public.exercises where id=a.exercise_id;
  if not(e.settings ? 'correction') then return new; end if;
  c:=public._exercise_correction_policy(e.settings);
  select count(*)::int into count_attempts from public.exercise_attempts where assignment_id=a.id and id<>new.id;
  select t.* into previous_attempt from public.exercise_attempts t left join public.exercise_correction_results r on r.attempt_id=t.id
    where t.assignment_id=a.id and t.id<>new.id order by r.attempt_number desc nulls last,t.submitted_at desc,t.id desc limit 1;
  select * into previous_result from public.exercise_correction_results where attempt_id=previous_attempt.id;
  for answer in select value from jsonb_array_elements(new.answers) loop
    ordinal:=(answer->>'index')::int; q:=e.questions->ordinal; kind:=coalesce(q->>'response_type',e.exercise_type);
    -- The existing submit RPC performs full-response validation. Mixed objective
    -- questions additionally validate their own format here before persistence.
    if kind='multiple_choice' and not(q->'options' @> jsonb_build_array(answer->'answer')) then raise exception 'Choose an available option'; end if;
    if kind='true_false' and answer->>'answer' not in('True','False') then raise exception 'Choose True or False'; end if;
    if c->>'mode'='objective' then
      if c->>'retry_incorrect_only'='true' and previous_result.attempt_id is not null and exists(select 1 from jsonb_array_elements(previous_result.question_results) r where(r->>'index')::int=ordinal and r->>'correct'='true')
        and not exists(select 1 from jsonb_array_elements(previous_attempt.answers) v where(v->>'index')::int=ordinal and v->>'answer'=answer->>'answer') then raise exception 'Keep previously correct answers when retrying'; end if;
      select * into checked from public.exercise_question_checks where assignment_id=a.id and question_index=ordinal order by check_number desc limit 1;
      if c->>'timing'='immediate' and checked.id is not null and checked.answer<>answer->>'answer' then raise exception 'Check the revised answer before submitting'; end if;
      matched:=public._exercise_answer_matches(q,kind,answer->>'answer');
      if matched then correct_count:=correct_count+1; end if;
      results:=results||jsonb_build_array(jsonb_build_object('index',ordinal,'correct',matched));
    end if;
  end loop;
  if c->>'mode'='objective' then
    raw:=round(100.0*correct_count/jsonb_array_length(e.questions),2);
    select awarded_score into first_score from public.exercise_correction_results where assignment_id=a.id order by attempt_number limit 1;
    if first_score is null and exists(select 1 from public.exercise_question_checks where assignment_id=a.id) then
      select round(100.0*count(*) filter(where coalesce(first_check.correct,(answer_result->>'correct')::boolean))/jsonb_array_length(e.questions),2) into first_score
      from jsonb_array_elements(results) answer_result left join lateral
        (select qc.correct from public.exercise_question_checks qc where qc.assignment_id=a.id and qc.question_index=(answer_result->>'index')::int order by qc.check_number limit 1) first_check on true;
    end if;
    select greatest(count_attempts,coalesce(max(n-1),0)) into checks from(select count(*)::int n from public.exercise_question_checks where assignment_id=a.id group by question_index) counts;
    awarded:=case c->>'scoring' when 'first' then coalesce(first_score,raw) when 'penalized' then greatest(0,raw-checks*(c->>'retry_penalty')::int) else raw end;
    if c->>'scoring'='best' then select greatest(awarded,coalesce(max(awarded_score),0)) into awarded from public.exercise_correction_results where assignment_id=a.id; end if;
  end if;
  insert into public.exercise_correction_results(attempt_id,assignment_id,student_id,teacher_id,policy,question_results,attempt_number,raw_score,awarded_score,state)
    values(new.id,a.id,new.student_id,a.teacher_id,c,results,count_attempts+1,raw,awarded,case when c->>'mode'='objective' then 'objective_complete' else 'awaiting_review' end);
  delete from public.exercise_practice_drafts where assignment_id=a.id and student_id=new.student_id;
  -- Snapshot policy beside existing private question snapshot; never change answers.
  update public.exercise_attempts set exercise_snapshot=exercise_snapshot||jsonb_build_object('correction',c),score=awarded where id=new.id;
  return new;
end $$;
create trigger record_exercise_correction after insert on public.exercise_attempts for each row execute function public._record_exercise_correction();

create function public._exercise_question_feedback(p_question jsonb,p_correct boolean,p_reveal boolean,p_explain boolean)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('correct',p_correct,'message',case when p_correct then 'Exactly! You''ve got it.' else 'Good try! Let''s give it another go.' end,
   'expected_answer',case when p_reveal then p_question->'answer' else null end,
   'explanation',case when p_explain and p_reveal then p_question->>'explanation' else null end)
$$;

create function public.check_exercise_question(p_assignment_id uuid,p_index integer,p_answer text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.exercise_assignments; e public.exercises; c jsonb; q jsonb; kind text; prior public.exercise_question_checks; n integer; max_n integer; correct boolean;
begin
  if auth.uid() is null or not public.student_has_academic_access(auth.uid()) then raise exception 'Approved student access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid();
  if not found then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  select * into e from public.exercises where id=a.exercise_id for share;
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid() for update;
  if a.status='revoked' or e.status<>'published' or(a.available_from is not null and a.available_from>now()) or(a.due_at<now() and coalesce(e.settings->>'allow_late','false')<>'true') then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  c:=public._exercise_correction_policy(e.settings);
  if c->>'mode'<>'objective' or c->>'timing'<>'immediate' then raise exception 'Immediate checking is not enabled'; end if;
  if p_request_id is null or p_index is null or p_index<0 or p_index>=jsonb_array_length(e.questions) or p_answer is null or length(btrim(p_answer)) not between 1 and 12000 then raise exception 'Complete this answer'; end if;
  q:=e.questions->p_index; kind:=coalesce(q->>'response_type',e.exercise_type);
  select * into prior from public.exercise_question_checks where student_id=auth.uid() and request_id=p_request_id;
  if found then
    if prior.assignment_id<>a.id or prior.question_index<>p_index or prior.answer<>p_answer then raise exception 'Request ID already used'; end if;
    correct:=prior.correct;
  else
    max_n:=coalesce((e.settings->>'max_attempts')::int,1);
    if (select count(*) from public.exercise_attempts where assignment_id=a.id)>=max_n then raise exception 'Maximum attempts reached'; end if;
    select count(*)::int into n from public.exercise_question_checks where assignment_id=a.id and question_index=p_index;
    if n>=max_n then raise exception 'Maximum question checks reached'; end if;
    if c->>'retry_incorrect_only'='true' and exists(select 1 from public.exercise_question_checks ck where ck.assignment_id=a.id and ck.question_index=p_index and ck.correct) then raise exception 'This answer is already correct'; end if;
    correct:=public._exercise_answer_matches(q,kind,p_answer);
    insert into public.exercise_question_checks(assignment_id,student_id,question_index,answer,correct,request_id,check_number) values(a.id,auth.uid(),p_index,p_answer,correct,p_request_id,n+1);
  end if;
  select count(*)::int into n from public.exercise_question_checks where assignment_id=a.id and question_index=p_index;
  return jsonb_build_object('index',p_index,'checks',n,'remaining',greatest(0,coalesce((e.settings->>'max_attempts')::int,1)-n))||
    public._exercise_question_feedback(q,correct,c->>'hide_solutions_until_complete'='false' and n>=(c->>'reveal_after_attempt')::int,true);
end $$;

create function public.get_exercise_practice_state(p_assignment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.exercise_assignments; e public.exercises; c jsonb; t public.exercise_attempts; r public.exercise_correction_results;
  n integer; limit_n integer; results jsonb:='[]'; item jsonb; reveal boolean; released jsonb; check_answers jsonb;
begin
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid();
  if not found or not public.student_has_academic_access(auth.uid()) then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  select * into e from public.exercises where id=a.exercise_id;
  if e.status<>'published' or a.status='revoked' or a.available_from>now() then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  c:=public._exercise_correction_policy(e.settings); limit_n:=coalesce((e.settings->>'max_attempts')::int,1);
  select count(*)::int into n from public.exercise_attempts where assignment_id=a.id;
  select attempt.* into t from public.exercise_attempts attempt left join public.exercise_correction_results result on result.attempt_id=attempt.id
    where attempt.assignment_id=a.id order by result.attempt_number desc nulls last,attempt.submitted_at desc,attempt.id desc limit 1;
  select * into r from public.exercise_correction_results where attempt_id=t.id;
  reveal:=n>=(c->>'reveal_after_attempt')::int and(c->>'hide_solutions_until_complete'='false' or n>=limit_n);
  for item in select value from jsonb_array_elements(coalesce(r.question_results,'[]')) loop
    results:=results||jsonb_build_array(jsonb_build_object('index',(item->>'index')::int)||public._exercise_question_feedback(t.exercise_snapshot->'questions'->((item->>'index')::int),(item->>'correct')::boolean,reveal,true));
  end loop;
  select jsonb_build_object('version',version,'content',content,'released_at',released_at) into released from public.exercise_feedback_versions where attempt_id=t.id and released_at is not null order by version desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('index',question_index,'answer',answer) order by question_index),'[]') into check_answers from
    (select distinct on(question_index) question_index,answer from public.exercise_question_checks where assignment_id=a.id order by question_index,check_number desc) latest;
  return jsonb_build_object('assignment_id',a.id,'attempt_id',t.id,'attempt_count',n,'attempt_limit',limit_n,'policy',c,
    'answers',coalesce((select answers from public.exercise_practice_drafts where assignment_id=a.id and student_id=auth.uid()),case when t.id is not null then t.answers else check_answers end),
    'draft_revision',coalesce((select revision from public.exercise_practice_drafts where assignment_id=a.id and student_id=auth.uid()),0),
    'question_results',results,'released_feedback',released,
    'feedback_history',(select coalesce(jsonb_agg(jsonb_build_object('attempt_id',f.attempt_id,'version',f.version,'content',f.content,'released_at',f.released_at) order by f.released_at desc,f.version desc),'[]')
      from public.exercise_feedback_versions f join public.exercise_attempts history_attempt on history_attempt.id=f.attempt_id where history_attempt.assignment_id=a.id and f.released_at is not null),
    'score',case when c->>'show_score'='true' then r.awarded_score else null end,
    'state',coalesce(r.state,case when t.id is null then 'not_started' else 'awaiting_review' end),
    'ai_available',false,'can_retry',n<limit_n and(e.settings->>'allow_late'='true' or a.due_at is null or a.due_at>=now()));
end $$;

create function public.save_exercise_progress(p_assignment_id uuid,p_answers jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.exercise_assignments; e public.exercises; v integer; answer jsonb;
begin
  if auth.uid() is null or not public.student_has_academic_access(auth.uid()) then raise exception 'Approved student access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid();
  if not found then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  select * into e from public.exercises where id=a.exercise_id for share;
  select * into a from public.exercise_assignments where id=p_assignment_id and student_id=auth.uid() for update;
  if e.status<>'published' or a.status='revoked' or a.available_from>now() or(a.due_at<now() and coalesce(e.settings->>'allow_late','false')<>'true') then raise exception 'Assignment unavailable' using errcode='42501'; end if;
  if not(e.settings ? 'correction') then raise exception 'Saved progress is unavailable for this legacy activity'; end if;
  if(select count(*) from public.exercise_attempts where assignment_id=a.id)>=coalesce((e.settings->>'max_attempts')::int,1) then raise exception 'Maximum attempts reached'; end if;
  if p_expected_revision is null or p_expected_revision<0 or jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Valid progress and revision required'; end if;
  if jsonb_array_length(p_answers)>jsonb_array_length(e.questions) or(select count(distinct value->'index') from jsonb_array_elements(p_answers))<>jsonb_array_length(p_answers) then raise exception 'Invalid progress answers'; end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer->'index') is distinct from 'number' or coalesce(answer->>'index','') !~ '^[0-9]{1,2}$'
      or(answer->>'index')::int>=jsonb_array_length(e.questions) or jsonb_typeof(answer->'answer') is distinct from 'string' or length(answer->>'answer')>12000 then raise exception 'Invalid progress answer'; end if;
  end loop;
  select revision into v from public.exercise_practice_drafts where assignment_id=a.id for update;
  if coalesce(v,0)<>p_expected_revision then raise exception 'Progress changed in another window. Reload before saving'; end if;
  insert into public.exercise_practice_drafts(assignment_id,student_id,answers,revision) values(a.id,auth.uid(),p_answers,coalesce(v,0)+1)
    on conflict(assignment_id) do update set answers=excluded.answers,revision=excluded.revision,updated_at=now();
  return jsonb_build_object('assignment_id',a.id,'revision',coalesce(v,0)+1);
end $$;

create function public.save_exercise_feedback(p_attempt_id uuid,p_content jsonb,p_expected_version integer,p_request_id uuid,p_release boolean default false,p_ai_draft_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.exercise_assignments; t public.exercise_attempts; prior public.exercise_feedback_versions; v integer; field text; draft public.ai_academic_drafts;
begin
  select * into t from public.exercise_attempts where id=p_attempt_id for update;
  select * into a from public.exercise_assignments where id=t.assignment_id;
  if t.id is null or a.teacher_id<>auth.uid() or not public.can_teacher_access_student(auth.uid(),a.student_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  if p_request_id is null or p_release is null or p_expected_version is null or p_expected_version<0 then raise exception 'Review version and request required'; end if;
  if jsonb_typeof(p_content) is distinct from 'object' or not(p_content ? 'message') or exists(select 1 from jsonb_each(p_content) f where f.key not in('message','strengths','natural_alternative','explanation','practical_tip','encouragement') or jsonb_typeof(f.value)<>'string' or length(f.value#>>'{}')>4000)
    or length(btrim(p_content->>'message')) not between 1 and 4000
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
  insert into public.exercise_feedback_versions(attempt_id,teacher_id,version,content,source,ai_draft_id,request_id,released_at)
    values(t.id,auth.uid(),v+1,p_content,case when p_ai_draft_id is null then 'teacher' else 'ai_draft' end,p_ai_draft_id,p_request_id,case when p_release then now() else null end);
  -- Keep the established release/notification/view contract working. A later
  -- private revision does not erase the immutable released version above.
  update public.exercise_attempts set feedback=p_content->>'message',feedback_status=case when p_release then 'published' else 'draft' end,
    feedback_published_at=case when p_release then now() else null end where id=t.id;
  return jsonb_build_object('attempt_id',t.id,'version',v+1,'released',p_release);
end $$;

create function public.get_exercise_teacher_review(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.exercise_assignments; t public.exercise_attempts; versions jsonb;
begin
  select * into t from public.exercise_attempts where id=p_attempt_id;
  select * into a from public.exercise_assignments where id=t.assignment_id;
  if t.id is null or a.teacher_id<>auth.uid() or not public.can_teacher_access_student(auth.uid(),a.student_id) then raise exception 'Submission access denied' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('version',version,'content',content,'source',source,'released_at',released_at) order by version desc),'[]') into versions from public.exercise_feedback_versions where attempt_id=t.id;
  return jsonb_build_object('attempt_id',t.id,'version',coalesce((versions->0->>'version')::int,0),'history',versions,'answers',t.answers);
end $$;

-- Legacy clients also use versioned saves. No historical response is rewritten.
create or replace function public.review_exercise_attempt(p_attempt_id uuid,p_feedback text,p_release boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v integer; saved jsonb;
begin
  perform 1 from public.exercise_attempts where id=p_attempt_id for update;
  select coalesce(max(version),0) into v from public.exercise_feedback_versions where attempt_id=p_attempt_id;
  saved:=public.save_exercise_feedback(p_attempt_id,jsonb_build_object('message',p_feedback),v,gen_random_uuid(),p_release,null);
  return jsonb_build_object('id',p_attempt_id,'version',saved->'version','feedback_status',case when p_release then 'published' else 'draft' end);
end $$;

-- Append allowlisted public policy only, never private settings or answer keys.
create view public.exercise_learning_outcomes with(security_invoker=false,security_barrier=true) as
select t.id as attempt_id,a.student_id,a.teacher_id,t.exercise_snapshot->>'title' as title,e.objective,
  r.state as correction_state,
  case when r.policy->>'show_score'='true' or a.teacher_id=auth.uid() then r.awarded_score else null end as objective_score,
  (select count(*)::int from public.exercise_attempts other where other.assignment_id=a.id) as attempts,
  f.content->>'strengths' as reviewed_strengths,f.content->>'practical_tip' as reviewed_next_step,
  f.released_at as teacher_reviewed_at,t.submitted_at
from public.exercise_attempts t join public.exercise_assignments a on a.id=t.assignment_id
join public.exercises e on e.id=a.exercise_id left join public.exercise_correction_results r on r.attempt_id=t.id
left join lateral(select content,released_at from public.exercise_feedback_versions where attempt_id=t.id and released_at is not null order by version desc limit 1) f on true
where(a.student_id=auth.uid() and public.student_has_academic_access(auth.uid()))
  or(a.teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),a.student_id));
revoke all on public.exercise_learning_outcomes from public,anon,authenticated;
grant select on public.exercise_learning_outcomes to authenticated;

alter function public.get_academic_ai_context(uuid,uuid) rename to _get_academic_ai_context_before_experience;
create function public.get_academic_ai_context(p_student_id uuid,p_attempt_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare context jsonb; outcomes jsonb;
begin
  context:=public._get_academic_ai_context_before_experience(p_student_id,p_attempt_id);
  select coalesce(jsonb_agg(to_jsonb(v)),'[]') into outcomes from
    (select title,objective,reviewed_strengths,reviewed_next_step,teacher_reviewed_at from public.exercise_learning_outcomes
      where student_id=p_student_id and teacher_id=auth.uid() and teacher_reviewed_at is not null order by submitted_at desc limit 10) v;
  return context||jsonb_build_object('reviewed_exercise_outcomes',outcomes);
end $$;
revoke all on function public._get_academic_ai_context_before_experience(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_academic_ai_context(uuid,uuid) from public,anon;
grant execute on function public.get_academic_ai_context(uuid,uuid) to authenticated;

do $$ declare definition text; begin
  select pg_get_viewdef('public.student_exercises'::regclass,true) into definition;
  definition:=regexp_replace(definition,';\s*$','');
  execute format('create or replace view public.student_exercises with(security_invoker=false,security_barrier=true) as select v.*,case when e.settings ? ''correction'' then e.settings->''correction'' else null end as correction_settings,(select jsonb_agg(jsonb_build_object(''response_type'',q->>''response_type'',''hint'',q->>''hint'') order by ord) from jsonb_array_elements(e.questions) with ordinality x(q,ord)) as question_formats from (%s) v join public.exercises e on e.id=v.exercise_id where public.student_has_academic_access(auth.uid())',definition);
end $$;
revoke all on public.student_exercises from public,anon;
grant select on public.student_exercises to authenticated;

revoke all on function public._bind_exercise_feedback_draft(),public._exercise_correction_policy(jsonb),public._validate_exercise_questions_v1(text,jsonb),public._exercise_policy_guard(),public._exercise_answer_matches(jsonb,text,text),public._record_exercise_correction(),public._exercise_question_feedback(jsonb,boolean,boolean,boolean) from public,anon,authenticated;
revoke all on function public.reserve_exercise_feedback_request(uuid,uuid) from public,anon;
grant execute on function public.reserve_exercise_feedback_request(uuid,uuid) to authenticated;
revoke all on function public.exercise_experience_capabilities() from public,anon;
grant execute on function public.exercise_experience_capabilities() to authenticated;
revoke all on function public.save_exercise_progress(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_exercise_progress(uuid,jsonb,integer) to authenticated;
revoke all on function public.get_exercise_teacher_review(uuid) from public,anon;
grant execute on function public.get_exercise_teacher_review(uuid) to authenticated;
revoke all on function public.validate_exercise_questions(text,jsonb),public.check_exercise_question(uuid,integer,text,uuid),public.get_exercise_practice_state(uuid),public.save_exercise_feedback(uuid,jsonb,integer,uuid,boolean,uuid) from public,anon;
grant execute on function public.validate_exercise_questions(text,jsonb),public.check_exercise_question(uuid,integer,text,uuid),public.get_exercise_practice_state(uuid),public.save_exercise_feedback(uuid,jsonb,integer,uuid,boolean,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
