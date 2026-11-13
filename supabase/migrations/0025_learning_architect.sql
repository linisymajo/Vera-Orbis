-- Proposal: Learning Architect only. Depends on 0014,0019,0022,0023, not 0024.
-- No provider activation, secrets, account changes or existing-plan rewrite.
begin;

create table public.learning_architect_runs(
  request_id uuid primary key references public.academic_ai_requests(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  client_request_id uuid not null,
  settings jsonb not null,
  result_version_id uuid references public.learning_plan_versions(id) on delete restrict,
  unique(teacher_id,client_request_id)
);
create table public.learning_plan_publications(
  version_id uuid primary key references public.learning_plan_versions(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  published_at timestamptz not null default now()
);
alter table public.learning_architect_runs enable row level security;
alter table public.learning_plan_publications enable row level security;
revoke all on public.learning_architect_runs,public.learning_plan_publications from public,anon,authenticated;
grant select on public.learning_architect_runs,public.learning_plan_publications to authenticated;
create policy "architect author read" on public.learning_architect_runs for select to authenticated
  using(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id));
create policy "plan publication read" on public.learning_plan_publications for select to authenticated
  using((teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id))
    or(student_id=auth.uid() and public.student_has_academic_access(auth.uid())));
drop policy "learning plan author or approved student read" on public.learning_plan_versions;
create policy "learning plan author or approved student read" on public.learning_plan_versions for select to authenticated using(
  (teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id))
  or(student_id=auth.uid() and status='approved' and public.student_has_academic_access(auth.uid())
    and(not(content?'architect') or exists(select 1 from public.learning_plan_publications p where p.version_id=id)))
);

-- Only architect course requests may account for a longer structured response.
alter table public.academic_ai_requests drop constraint academic_ai_requests_output_tokens_check;
alter table public.academic_ai_requests add constraint academic_ai_requests_output_tokens_check
  check(output_tokens between 0 and case when kind='learning_plan' then 12000 else 2500 end);

alter function public._validate_learning_plan_content(jsonb,boolean) rename to _validate_learning_plan_content_v1;
create function public._architect_keys(p jsonb,keys text[]) returns boolean language sql immutable set search_path='' as $$
  select case when jsonb_typeof(p)='object' then p?&keys and (select count(*) from jsonb_object_keys(p))=cardinality(keys) else false end
$$;
create function public._validate_learning_plan_content(p_content jsonb,p_complete boolean)
returns void language plpgsql immutable set search_path='' as $$
declare a jsonb; s jsonb; k text; item jsonb; n integer; total integer;
begin
  perform public._validate_learning_plan_content_v1(p_content-'architect',p_complete);
  if not(p_content?'architect') then return; end if;
  a:=p_content->'architect';
  if not public._architect_keys(a,array['goal','session_minutes','known','missing','provisional','needs','approach','adaptations','revisit','sessions'])
    or jsonb_typeof(a->'session_minutes') is distinct from 'number'
    or coalesce(a->>'session_minutes','')!~'^[0-9]+$' or (a->>'session_minutes')::integer not between 20 and 120
    or jsonb_typeof(a->'provisional') is distinct from 'boolean'
    or jsonb_typeof(a->'sessions') is distinct from 'array'
    or jsonb_array_length(a->'sessions')<>jsonb_array_length(p_content->'objectives')
    or jsonb_array_length(a->'sessions') not between 1 and 10
    or p_content->>'language' not in('English','French','Mandarin')
    or p_content->>'level' not in('A1','A2','B1','B2','C1','C2') then
    raise exception 'Invalid architect course settings' using errcode='22023'; end if;
  foreach k in array array['goal','needs','approach'] loop
    if jsonb_typeof(a->k) is distinct from 'string' or length(trim(a->>k)) not between 1 and 2000 or (a->>k)~'<[^>]+>' then
      raise exception 'Complete architect overview' using errcode='22023'; end if;
  end loop;
  foreach k in array array['known','missing','adaptations','revisit'] loop
    if jsonb_typeof(a->k) is distinct from 'array' or jsonb_array_length(a->k)>8
      or(k in('adaptations','revisit') and jsonb_array_length(a->k)=0) then
      raise exception 'Invalid evidence or adaptation list' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(a->k) loop
      if jsonb_typeof(item) is distinct from 'string' or length(trim(item#>>'{}')) not between 1 and 300 or (item#>>'{}')~'<[^>]+>' then
        raise exception 'Invalid architect list text' using errcode='22023'; end if;
    end loop;
  end loop;
  for s in select value from jsonb_array_elements(a->'sessions') loop
    if not public._architect_keys(s,array['title','power_expressions','vocabulary','contextual_input','guided_practice','personalization','task','activities','homework','checkpoint','minutes']) then
      raise exception 'Invalid session fields' using errcode='22023'; end if;
    foreach k in array array['title','contextual_input','guided_practice','personalization','task','homework','checkpoint'] loop
      if jsonb_typeof(s->k) is distinct from 'string' or length(trim(s->>k)) not between 1 and 600 or (s->>k)~'<[^>]+>' then
        raise exception 'Complete each session' using errcode='22023'; end if;
    end loop;
    foreach k in array array['power_expressions','vocabulary','activities'] loop
      if jsonb_typeof(s->k) is distinct from 'array' or jsonb_array_length(s->k) not between 1 and 8 then
        raise exception 'Invalid session list' using errcode='22023'; end if;
      for item in select value from jsonb_array_elements(s->k) loop
        if jsonb_typeof(item) is distinct from 'string' or length(trim(item#>>'{}')) not between 1 and 300 or (item#>>'{}')~'<[^>]+>' then
          raise exception 'Invalid session list text' using errcode='22023'; end if;
      end loop;
    end loop;
    if jsonb_typeof(s->'minutes') is distinct from 'array' or jsonb_array_length(s->'minutes')<>4 then
      raise exception 'Four stage durations required' using errcode='22023'; end if;
    total:=0;
    for item in select value from jsonb_array_elements(s->'minutes') loop
      if jsonb_typeof(item) is distinct from 'number' or item::text!~'^[0-9]+$' or item::text::integer not between 1 and 120 then
        raise exception 'Invalid stage minutes' using errcode='22023'; end if;
      total:=total+item::text::integer;
    end loop;
    if total<>(a->>'session_minutes')::integer then raise exception 'Session exceeds the class duration' using errcode='22023'; end if;
  end loop;
end $$;

create function public.get_learning_architect_context(p_student_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare context jsonb; assessment jsonb; lessons jsonb; prior_plan jsonb;
begin
  perform public._assert_academic_ai_access(p_student_id);
  context:=public.get_academic_ai_context(p_student_id);
  -- No raw answers, reference answer keys, contact details, private notes or files.
  context:=jsonb_build_object('profile',context->'profile','approved_plan',context->'approved_plan',
    'reviewed_exercise_outcomes',context->'reviewed_exercise_outcomes',
    'submissions',(select coalesce(jsonb_agg(jsonb_build_object('exercise',s->'exercise','objective',s->'objective','score',s->'score','feedback',s->'feedback')),'[]'::jsonb) from jsonb_array_elements(coalesce(context->'submissions','[]'::jsonb))s),
    'feedback',context->'feedback','challenges',(select coalesce(jsonb_agg(jsonb_build_object('challenge',s->'challenge','feedback',s->'feedback')),'[]'::jsonb) from jsonb_array_elements(coalesce(context->'challenges','[]'::jsonb))s));
  select jsonb_build_object('learning_goals',left(to_jsonb(o)->>'learning_goals',1000),'assessed_level',left(to_jsonb(o)->>'assessed_level',40)) into assessment
    from public.onboarding_responses o where o.student_id=p_student_id limit 1;
  -- Goals alone are not evidence of an actual initial assessment.
  if assessment->>'assessed_level' is null then assessment:=null; end if;
  select jsonb_build_object('title',v.content->>'title','language',v.content->>'language','level',v.content->>'level',
    'summary',left(v.content->>'summary',1600),'objectives',(select jsonb_agg(jsonb_build_object('title',o->>'title','evidence',o->>'success_criteria'))
      from(select value o from jsonb_array_elements(v.content->'objectives') limit 4)items)) into prior_plan
    from public.learning_plan_versions v where v.teacher_id=auth.uid() and v.student_id=p_student_id and v.status='approved'
    order by v.approved_at desc,v.version_number desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('starts_at',c.starts_at,'status',to_jsonb(c)->>'status','record_type','scheduled_past_class','attendance_verified',false)),'[]'::jsonb) into lessons
    from (select cl.* from public.classes cl join public.class_participants cp on cp.class_id=cl.id
      where cp.student_id=p_student_id and cl.teacher_id=auth.uid() and cl.starts_at<now() order by cl.starts_at desc limit 5)c;
  return context||jsonb_build_object('assessment',assessment,'lessons',lessons,'approved_plan',prior_plan);
end $$;

create function public.get_learning_architect_profile(p_student_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_teacher_access_student(auth.uid(),p_student_id) then raise exception 'Authorized teacher required' using errcode='42501'; end if;
  return(select jsonb_build_object('language',p.language,'level',p.level,'goal',p.goal,
    'ai_consent',coalesce((select allowed from public.academic_ai_consents where student_id=p.id),false),
    'request_count_24h',(select count(*) from public.academic_ai_requests where teacher_id=auth.uid() and created_at>now()-interval '24 hours'),
    'input_tokens_24h',(select coalesce(sum(input_tokens),0) from public.academic_ai_requests where teacher_id=auth.uid() and created_at>now()-interval '24 hours'),
    'output_tokens_24h',(select coalesce(sum(output_tokens),0) from public.academic_ai_requests where teacher_id=auth.uid() and created_at>now()-interval '24 hours')) from public.profiles p where p.id=p_student_id);
end $$;

create function public.get_learning_architect_draft(p_version_id uuid,p_expected_revision integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v public.learning_plan_versions%rowtype;
begin
  select * into v from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid() and status='draft';
  if not found then raise exception 'Private draft unavailable' using errcode='42501'; end if;
  perform public._assert_academic_ai_access(v.student_id);
  if v.revision is distinct from p_expected_revision or not(v.content?'architect') then raise exception 'Reload the saved architect draft' using errcode='40001'; end if;
  return to_jsonb(v);
end $$;

create function public.reserve_learning_architect_request(p_student_id uuid,p_client_request_id uuid,p_settings jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior public.learning_architect_runs%rowtype; req uuid; v jsonb;
begin
  perform public._assert_academic_ai_access(p_student_id);
  if p_client_request_id is null or jsonb_typeof(p_settings) is distinct from 'object' or octet_length(p_settings::text)>6000 then raise exception 'Invalid request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client_request_id::text,0));
  select * into prior from public.learning_architect_runs where teacher_id=auth.uid() and client_request_id=p_client_request_id;
  if found then
    if prior.student_id<>p_student_id or prior.settings<>p_settings then raise exception 'Request ID conflict' using errcode='22023'; end if;
    if prior.result_version_id is not null then
      select to_jsonb(x) into v from public.learning_plan_versions x where x.id=prior.result_version_id and x.status='draft';
      if v is not null then return jsonb_build_object('version',v); end if;
    end if;
    raise exception 'Request already handled; reload saved plans before a new generation' using errcode='55000';
  end if;
  req:=public.reserve_academic_ai_request(p_student_id,'learning_plan');
  insert into public.learning_architect_runs(request_id,teacher_id,student_id,client_request_id,settings) values(req,auth.uid(),p_student_id,p_client_request_id,p_settings);
  return jsonb_build_object('request_id',req);
end $$;

create function public.complete_learning_architect_request(p_request_id uuid,p_content jsonb,p_input_tokens integer,p_output_tokens integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare run public.learning_architect_runs%rowtype; req public.academic_ai_requests%rowtype; v jsonb; prior jsonb; idx integer; k text;
begin
  select * into run from public.learning_architect_runs where request_id=p_request_id and teacher_id=auth.uid() for update;
  if not found then raise exception 'AI run unavailable' using errcode='42501'; end if;
  perform public._assert_academic_ai_access(run.student_id);
  select * into req from public.academic_ai_requests where id=p_request_id and teacher_id=auth.uid() for update;
  if req.status<>'reserved' or req.created_at<now()-interval '2 minutes' then raise exception 'AI reservation unavailable' using errcode='42501'; end if;
  if p_input_tokens is null or p_input_tokens not between 0 and 40000 or p_output_tokens is null or p_output_tokens not between 0 and 12000 then raise exception 'Invalid usage accounting' using errcode='22023'; end if;
  perform public._validate_learning_plan_content(p_content,true);
  if not(p_content?'architect') or p_content->>'language' is distinct from run.settings->>'language' or p_content->>'level' is distinct from run.settings->>'level'
    or jsonb_array_length(p_content->'objectives') is distinct from (run.settings->>'classes')::integer
    or p_content#>>'{architect,session_minutes}' is distinct from run.settings->>'duration' then raise exception 'Course settings mismatch' using errcode='22023'; end if;
  if run.settings->'regenerate'<>'null'::jsonb then
    prior:=public.get_learning_architect_draft((run.settings#>>'{regenerate,versionId}')::uuid,(run.settings#>>'{regenerate,revision}')::integer);
    if prior->>'student_id'<>run.student_id::text then raise exception 'Student mismatch' using errcode='42501'; end if;
    idx:=(run.settings#>>'{regenerate,session}')::integer;
    if idx<0 or idx>=jsonb_array_length(prior#>'{content,objectives}')
      or (p_content-'objectives'-'architect')<>((prior->'content')-'objectives'-'architect')
      or((p_content->'architect')-'sessions')<>((prior#>'{content,architect}')-'sessions')
      or((p_content->'objectives')-idx)<>((prior#>'{content,objectives}')-idx)
      or((p_content#>'{architect,sessions}')-idx)<>((prior#>'{content,architect,sessions}')-idx)
      or p_content#>>array['objectives',idx::text,'id'] is distinct from prior#>>array['content','objectives',idx::text,'id'] then
      raise exception 'Regeneration may replace only the selected session' using errcode='22023'; end if;
    v:=public.save_learning_plan_version((prior->>'id')::uuid,(prior->>'revision')::integer,p_content);
  else
    v:=public.create_learning_plan_version(run.student_id,null,null,run.client_request_id);
    v:=public.save_learning_plan_version((v->>'id')::uuid,(v->>'revision')::integer,p_content);
  end if;
  update public.academic_ai_requests set status='succeeded',input_tokens=p_input_tokens,output_tokens=p_output_tokens where id=p_request_id;
  update public.learning_architect_runs set result_version_id=(v->>'id')::uuid where request_id=p_request_id;
  return v;
end $$;

create function public.publish_learning_architect_plan(p_version_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.learning_plan_versions%rowtype; publication public.learning_plan_publications%rowtype;
begin
  select * into v from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid() and status='approved';
  if not found or not public.can_teacher_access_student(auth.uid(),v.student_id) or not(v.content?'architect') then raise exception 'Approved architect plan unavailable' using errcode='42501'; end if;
  insert into public.learning_plan_publications(version_id,teacher_id,student_id) values(v.id,v.teacher_id,v.student_id) on conflict(version_id) do nothing;
  select * into publication from public.learning_plan_publications where version_id=v.id;
  return to_jsonb(publication);
end $$;

revoke all on function public._validate_learning_plan_content_v1(jsonb,boolean),public._validate_learning_plan_content(jsonb,boolean),public._architect_keys(jsonb,text[]) from public,anon,authenticated;
revoke all on function public.get_learning_architect_context(uuid),public.get_learning_architect_profile(uuid),public.get_learning_architect_draft(uuid,integer),
  public.reserve_learning_architect_request(uuid,uuid,jsonb),public.complete_learning_architect_request(uuid,jsonb,integer,integer),public.publish_learning_architect_plan(uuid) from public,anon;
grant execute on function public.get_learning_architect_context(uuid),public.get_learning_architect_profile(uuid),public.get_learning_architect_draft(uuid,integer),
  public.reserve_learning_architect_request(uuid,uuid,jsonb),public.complete_learning_architect_request(uuid,jsonb,integer,integer),public.publish_learning_architect_plan(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
