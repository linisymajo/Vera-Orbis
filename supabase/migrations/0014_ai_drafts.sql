-- 0014: consent-gated, teacher-reviewed academic AI drafts.
-- Additive. Requires 0004, 0009 and 0013 enrollment helpers. Do not apply
-- before reviewing the live schema and testing in a disposable database.
-- No provider key, service-role key, external tool grant, or published content.

begin;

create table if not exists public.academic_ai_consents (
  student_id uuid primary key references auth.users(id) on delete cascade,
  allowed boolean not null default false,
  policy_version text not null default 'academic-ai-v1',
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_ai_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('learning_plan', 'exercise', 'challenge', 'feedback')),
  status text not null default 'reserved' check (status in ('reserved', 'succeeded', 'failed')),
  input_tokens integer check (input_tokens between 0 and 40000),
  output_tokens integer check (output_tokens between 0 and 2500),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_academic_drafts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.academic_ai_requests(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('learning_plan', 'exercise', 'challenge', 'feedback')),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 24000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'approved' or reviewed_at is not null)
);
create index if not exists academic_ai_requests_teacher_time_idx on public.academic_ai_requests(teacher_id, created_at desc);
create index if not exists academic_ai_requests_time_idx on public.academic_ai_requests(created_at desc);
create index if not exists ai_academic_drafts_teacher_idx on public.ai_academic_drafts(teacher_id, created_at desc);

alter table public.academic_ai_consents enable row level security;
alter table public.academic_ai_requests enable row level security;
alter table public.ai_academic_drafts enable row level security;

drop policy if exists "students read own academic AI consent" on public.academic_ai_consents;
create policy "students read own academic AI consent" on public.academic_ai_consents for select to authenticated
  using (student_id = (select auth.uid()));
drop policy if exists "assigned teachers read AI consent" on public.academic_ai_consents;
create policy "assigned teachers read AI consent" on public.academic_ai_consents for select to authenticated
  using (public.can_teacher_access_student((select auth.uid()), student_id));
drop policy if exists "teachers read own AI usage" on public.academic_ai_requests;
create policy "teachers read own AI usage" on public.academic_ai_requests for select to authenticated
  using (teacher_id = (select auth.uid()) and public.can_teacher_access_student((select auth.uid()), student_id));
drop policy if exists "teachers read own academic AI drafts" on public.ai_academic_drafts;
create policy "teachers read own academic AI drafts" on public.ai_academic_drafts for select to authenticated
  using (teacher_id = (select auth.uid()) and public.can_teacher_access_student((select auth.uid()), student_id));

revoke all on public.academic_ai_consents, public.academic_ai_requests, public.ai_academic_drafts from public, anon, authenticated;
grant select on public.academic_ai_consents, public.academic_ai_requests, public.ai_academic_drafts to authenticated;

create or replace function public.set_academic_ai_consent(p_allowed boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_allowed is null or
      (p_allowed and not public.student_has_academic_access(auth.uid())) then
    raise exception 'Approved student account required' using errcode = '42501';
  end if;
  insert into public.academic_ai_consents(student_id, allowed, policy_version, updated_at)
    values (auth.uid(), p_allowed, 'academic-ai-v1', now())
    on conflict (student_id) do update set allowed = excluded.allowed,
      policy_version = excluded.policy_version, updated_at = excluded.updated_at;
  return jsonb_build_object('allowed', p_allowed, 'updated_at', now());
end;
$$;

create or replace function public._assert_academic_ai_access(p_student_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null
    or not public.can_teacher_access_student(auth.uid(), p_student_id)
    or not exists (select 1 from public.academic_ai_consents c
      where c.student_id = p_student_id and c.allowed and c.policy_version = 'academic-ai-v1')
  then raise exception 'Authorized teacher and student AI consent required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_academic_ai_context(p_student_id uuid, p_attempt_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile jsonb;
  v_attempts jsonb;
  v_feedback jsonb;
  v_challenges jsonb;
  v_plan jsonb;
begin
  perform public._assert_academic_ai_access(p_student_id);
  select jsonb_build_object('language', left(p.language,80), 'level', left(p.level,40),
    'goal', left(p.goal,1200), 'progress', p.progress, 'lessons_completed', p.lessons_completed)
    into v_profile from public.profiles p where p.id = p_student_id;
  if v_profile is null then raise exception 'Academic profile unavailable' using errcode = '42501'; end if;
  if p_attempt_id is not null and not exists (
    select 1 from public.exercise_attempts a
    join public.exercise_assignments x on x.id = a.assignment_id
    where a.id = p_attempt_id and a.student_id = p_student_id
      and x.student_id = p_student_id and x.teacher_id = auth.uid() and x.status <> 'revoked'
  ) then raise exception 'Submission unavailable to this teacher' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_attempts from (
    select left(coalesce(a.exercise_snapshot->>'title',e.title),160) as exercise,
      left(coalesce(a.exercise_snapshot->>'exercise_type',e.exercise_type),80) as exercise_type, left(e.objective,500) as objective,
      left(a.answers::text,1500) as answers, a.score, left(a.feedback,600) as feedback,
      left((select jsonb_agg(jsonb_build_object(
        'prompt',left(q.value->>'prompt',400), 'expected_answer',left(q.value->>'answer',300),
        'options',left((q.value->'options')::text,400), 'left',left((q.value->'left')::text,300),
        'right',left((q.value->'right')::text,300), 'items',left((q.value->'items')::text,300)
      ) order by q.ordinality)
      from jsonb_array_elements(case when jsonb_typeof(coalesce(a.exercise_snapshot->'questions',e.questions))='array' then coalesce(a.exercise_snapshot->'questions',e.questions) else '[]'::jsonb end)
        with ordinality as q(value,ordinality) where q.ordinality <= 8)::text,2000) as question_reference
    from public.exercise_attempts a
    join public.exercise_assignments x on x.id = a.assignment_id
    join public.exercises e on e.id = x.exercise_id and e.teacher_id = x.teacher_id
    where a.student_id = p_student_id and x.student_id = p_student_id
      and x.teacher_id = auth.uid() and x.status <> 'revoked'
      and (p_attempt_id is null or a.id = p_attempt_id)
    order by a.submitted_at desc limit 3
  ) t;
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_feedback from (
    select left(f.category,80) as category, left(f.message,600) as message
    from public.feedback f where f.student_id = p_student_id and f.teacher_id = auth.uid()
    order by f.created_at desc limit 3
  ) t;
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_challenges from (
    select left(w.title,160) as challenge, left(s.response,600) as response, left(s.teacher_feedback,500) as feedback
    from public.challenge_submissions s join public.weekly_challenges w on w.id = s.challenge_id
    where s.student_id = p_student_id and w.teacher_id = auth.uid()
      and (w.student_id = p_student_id or w.audience = 'all')
    order by s.created_at desc limit 2
  ) t;
  select jsonb_build_object('approved_plan', left(d.content::text,3000)) into v_plan
    from public.ai_academic_drafts d where d.teacher_id = auth.uid() and d.student_id = p_student_id
      and d.kind = 'learning_plan' and d.status = 'approved' order by d.reviewed_at desc limit 1;
  return jsonb_build_object('profile',v_profile,'submissions',v_attempts,'feedback',v_feedback,
    'challenges',v_challenges,'approved_plan',v_plan);
end;
$$;

create or replace function public.reserve_academic_ai_request(p_student_id uuid, p_kind text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._assert_academic_ai_access(p_student_id);
  if p_kind is null or p_kind not in ('learning_plan','exercise','challenge','feedback') then
    raise exception 'Invalid draft kind' using errcode = '22023'; end if;
  -- One transaction lock makes teacher/global count checks atomic across instances.
  -- Failed and expired requests still consume allowance; clients cannot reset it.
  perform pg_advisory_xact_lock(947031493);
  if (select count(*) from public.academic_ai_requests where teacher_id = auth.uid() and created_at > now()-interval '1 minute') >= 3
    or (select count(*) from public.academic_ai_requests where teacher_id = auth.uid() and created_at > now()-interval '24 hours') >= 10
    or (select count(*) from public.academic_ai_requests where created_at > now()-interval '24 hours') >= 100
  then raise exception 'ai_rate_limit' using errcode = 'P0001'; end if;
  insert into public.academic_ai_requests(teacher_id,student_id,kind)
    values(auth.uid(),p_student_id,p_kind) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public._validate_academic_ai_content(p_content jsonb, p_kind text)
returns void language plpgsql immutable set search_path = '' as $$
declare v_step jsonb; v_question jsonb; v_stage integer := 0; v_key text;
begin
  if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text) > 24000
    or not p_content ?& array['title','objective','language','level','steps','exercise_type','questions','feedback']
    or (select count(*) from jsonb_object_keys(p_content)) <> 8 then
    raise exception 'Invalid draft content' using errcode = '22023'; end if;
  foreach v_key in array array['title','objective','language','level'] loop
    if jsonb_typeof(p_content->v_key) is distinct from 'string'
      or length(trim(p_content->>v_key)) = 0
      or length(p_content->>v_key) > (case v_key when 'title' then 160 when 'objective' then 1000 when 'language' then 80 else 40 end)
    then raise exception 'Invalid draft field' using errcode = '22023'; end if;
  end loop;
  if jsonb_typeof(p_content->'steps') is distinct from 'array'
    or jsonb_array_length(p_content->'steps') <> 4
    or jsonb_typeof(p_content->'questions') is distinct from 'array'
    or jsonb_array_length(p_content->'questions') > 12 then
    raise exception 'Invalid draft structure' using errcode = '22023'; end if;
  for v_step in select value from jsonb_array_elements(p_content->'steps') loop
    v_stage := v_stage + 1;
    if jsonb_typeof(v_step) is distinct from 'object' or not v_step ?& array['stage','activity']
      or (select count(*) from jsonb_object_keys(v_step)) <> 2
      or (v_step->>'stage') is distinct from (array['Listen','Repeat','Personalize','Use'])[v_stage]
      or jsonb_typeof(v_step->'activity') is distinct from 'string'
      or length(trim(v_step->>'activity')) not between 1 and 2000 then
      raise exception 'Invalid methodology stages' using errcode = '22023'; end if;
  end loop;
  if p_kind = 'exercise' then
    if coalesce(p_content->>'exercise_type','') not in ('multiple_choice','true_false','fill_blank','matching','ordering','reading','listening','image_vocabulary','open_question','writing','conversation','pronunciation')
      or jsonb_array_length(p_content->'questions') = 0 then
      raise exception 'Exercise type and questions required' using errcode = '22023'; end if;
  elsif p_content->'exercise_type' is distinct from 'null'::jsonb or jsonb_array_length(p_content->'questions') <> 0 then
    raise exception 'Unexpected exercise questions' using errcode = '22023';
  end if;
  for v_question in select value from jsonb_array_elements(p_content->'questions') loop
    if jsonb_typeof(v_question) is distinct from 'object'
      or not v_question ?& array['prompt','options','answer','explanation','left','right','items','passage']
      or (select count(*) from jsonb_object_keys(v_question)) <> 8
      or jsonb_typeof(v_question->'prompt') is distinct from 'string'
      or length(trim(v_question->>'prompt')) not between 1 and 2000
      or jsonb_typeof(v_question->'options') is distinct from 'array'
      or jsonb_array_length(v_question->'options') > 8
      or (v_question->'answer' <> 'null'::jsonb and (jsonb_typeof(v_question->'answer') <> 'string' or length(v_question->>'answer') not between 1 and 1000))
      or (v_question->'explanation' <> 'null'::jsonb and (jsonb_typeof(v_question->'explanation') <> 'string' or length(v_question->>'explanation') not between 1 and 1000))
      or exists(select 1 from jsonb_array_elements(v_question->'options') o where jsonb_typeof(o) <> 'string' or length(o#>>'{}') not between 1 and 300)
    then raise exception 'Invalid exercise question' using errcode = '22023'; end if;
    foreach v_key in array array['left','right','items'] loop
      if jsonb_typeof(v_question->v_key) is distinct from 'array'
        or jsonb_array_length(v_question->v_key) > 8
        or exists(select 1 from jsonb_array_elements(v_question->v_key) o where jsonb_typeof(o) <> 'string' or length(o#>>'{}') not between 1 and 300)
      then raise exception 'Invalid exercise list' using errcode = '22023'; end if;
    end loop;
    if v_question->'passage' <> 'null'::jsonb and (jsonb_typeof(v_question->'passage') <> 'string' or length(v_question->>'passage') not between 1 and 2000) then
      raise exception 'Invalid passage' using errcode = '22023'; end if;
    if p_content->>'exercise_type' = 'matching' and (jsonb_array_length(v_question->'left') < 2 or jsonb_array_length(v_question->'left') <> jsonb_array_length(v_question->'right')) then
      raise exception 'Invalid matching pairs' using errcode = '22023'; end if;
    if p_content->>'exercise_type' = 'ordering' and jsonb_array_length(v_question->'items') < 2 then
      raise exception 'Invalid sentence blocks' using errcode = '22023'; end if;
    if p_content->>'exercise_type' in ('multiple_choice','true_false') and (
      jsonb_array_length(v_question->'options') < 2 or v_question->'answer' = 'null'::jsonb or
      not (v_question->'options' @> jsonb_build_array(v_question->'answer'))
    ) then raise exception 'Invalid exercise options or answer' using errcode = '22023'; end if;
  end loop;
  if p_kind = 'feedback' then
    if jsonb_typeof(p_content->'feedback') is distinct from 'string'
      or length(trim(p_content->>'feedback')) not between 1 and 5000 then
      raise exception 'Feedback text required' using errcode = '22023'; end if;
  elsif p_content->'feedback' is distinct from 'null'::jsonb then
    raise exception 'Unexpected feedback text' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.complete_academic_ai_request(p_request_id uuid, p_content jsonb, p_input_tokens integer, p_output_tokens integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_request public.academic_ai_requests%rowtype; v_draft public.ai_academic_drafts%rowtype;
begin
  select * into v_request from public.academic_ai_requests where id = p_request_id and teacher_id = auth.uid() for update;
  if not found or v_request.status <> 'reserved' or v_request.created_at < now()-interval '2 minutes' then
    raise exception 'AI reservation unavailable' using errcode = '42501'; end if;
  perform public._assert_academic_ai_access(v_request.student_id);
  perform public._validate_academic_ai_content(p_content, v_request.kind);
  if p_input_tokens is null or p_input_tokens not between 0 and 40000
    or p_output_tokens is null or p_output_tokens not between 0 and 2500 then
    raise exception 'Invalid AI usage' using errcode = '22023'; end if;
  insert into public.ai_academic_drafts(request_id,teacher_id,student_id,kind,content)
    values(v_request.id,auth.uid(),v_request.student_id,v_request.kind,p_content) returning * into v_draft;
  update public.academic_ai_requests set status = 'succeeded',
    input_tokens = p_input_tokens, output_tokens = p_output_tokens where id = v_request.id;
  return to_jsonb(v_draft);
end;
$$;

create or replace function public.fail_academic_ai_request(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.academic_ai_requests set status = 'failed'
    where id = p_request_id and teacher_id = auth.uid() and status = 'reserved';
  return found;
end;
$$;

create or replace function public.review_academic_ai_draft(p_draft_id uuid, p_content jsonb, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_draft public.ai_academic_drafts%rowtype;
begin
  select * into v_draft from public.ai_academic_drafts where id = p_draft_id and teacher_id = auth.uid() for update;
  if not found or not public.can_teacher_access_student(auth.uid(),v_draft.student_id) then
    raise exception 'AI draft unavailable' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('draft','approved','rejected') then
    raise exception 'Invalid review status' using errcode = '22023'; end if;
  perform public._validate_academic_ai_content(p_content,v_draft.kind);
  update public.ai_academic_drafts set content = p_content, status = p_status, updated_at = now(),
    reviewed_at = case when p_status in ('approved','rejected') then now() else null end
    where id = p_draft_id returning * into v_draft;
  -- This function intentionally never writes exercises, assignments or feedback.
  return to_jsonb(v_draft);
end;
$$;

revoke all on function public._assert_academic_ai_access(uuid) from public, anon, authenticated;
revoke all on function public._validate_academic_ai_content(jsonb,text) from public, anon, authenticated;
revoke all on function public.set_academic_ai_consent(boolean) from public, anon;
revoke all on function public.get_academic_ai_context(uuid,uuid) from public, anon;
revoke all on function public.reserve_academic_ai_request(uuid,text) from public, anon;
revoke all on function public.complete_academic_ai_request(uuid,jsonb,integer,integer) from public, anon;
revoke all on function public.fail_academic_ai_request(uuid) from public, anon;
revoke all on function public.review_academic_ai_draft(uuid,jsonb,text) from public, anon;
grant execute on function public.set_academic_ai_consent(boolean) to authenticated;
grant execute on function public.get_academic_ai_context(uuid,uuid) to authenticated;
grant execute on function public.reserve_academic_ai_request(uuid,text) to authenticated;
grant execute on function public.complete_academic_ai_request(uuid,jsonb,integer,integer) to authenticated;
grant execute on function public.fail_academic_ai_request(uuid) to authenticated;
grant execute on function public.review_academic_ai_draft(uuid,jsonb,text) to authenticated;


notify pgrst, 'reload schema';
commit;

