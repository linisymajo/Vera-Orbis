-- 0019: student-specific learning plan drafts, immutable approved versions,
-- optimistic concurrency and audited objective completion.
-- Requires reviewed migrations through 0014 and canonical enrollment helpers.
begin;

create table if not exists public.learning_plan_versions(
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  version_number integer not null check(version_number>0),
  revision integer not null default 1 check(revision>0),
  status text not null default 'draft' check(status in ('draft','approved')),
  content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=60000),
  base_version_id uuid references public.learning_plan_versions(id) on delete restrict,
  prior_approved_version_id uuid references public.learning_plan_versions(id) on delete restrict,
  source_ai_draft_id uuid references public.ai_academic_drafts(id) on delete restrict,
  request_id uuid not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(teacher_id,student_id,version_number),
  unique(teacher_id,request_id),
  check((status='approved')=(approved_at is not null))
);
create table if not exists public.learning_plan_objective_progress(
  version_id uuid not null references public.learning_plan_versions(id) on delete restrict,
  objective_id uuid not null,
  completed boolean not null,
  revision integer not null check(revision>0),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key(version_id,objective_id)
);
create table if not exists public.learning_plan_objective_events(
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.learning_plan_versions(id) on delete restrict,
  objective_id uuid not null,
  completed boolean not null,
  revision integer not null check(revision>0),
  actor_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  expected_revision integer not null,
  created_at timestamptz not null default now(),
  unique(actor_id,request_id),
  unique(version_id,objective_id,revision)
);
create index if not exists learning_plan_versions_student_idx on public.learning_plan_versions(student_id,approved_at desc);
create index if not exists learning_plan_versions_author_idx on public.learning_plan_versions(teacher_id,student_id,version_number desc);

alter table public.learning_plan_versions enable row level security;
alter table public.learning_plan_objective_progress enable row level security;
alter table public.learning_plan_objective_events enable row level security;
revoke all on public.learning_plan_versions,public.learning_plan_objective_progress,public.learning_plan_objective_events from public,anon,authenticated;
grant select on public.learning_plan_versions,public.learning_plan_objective_progress,public.learning_plan_objective_events to authenticated;

drop policy if exists "learning plan author or approved student read" on public.learning_plan_versions;
create policy "learning plan author or approved student read" on public.learning_plan_versions for select to authenticated using(
  (teacher_id=(select auth.uid()) and public.can_teacher_access_student((select auth.uid()),student_id))
  or (student_id=(select auth.uid()) and status='approved' and public.student_has_academic_access((select auth.uid())))
);
drop policy if exists "learning objective progress read" on public.learning_plan_objective_progress;
create policy "learning objective progress read" on public.learning_plan_objective_progress for select to authenticated using(
  exists(select 1 from public.learning_plan_versions v where v.id=learning_plan_objective_progress.version_id and v.status='approved')
);
drop policy if exists "learning objective events read" on public.learning_plan_objective_events;
create policy "learning objective events read" on public.learning_plan_objective_events for select to authenticated using(
  exists(select 1 from public.learning_plan_versions v where v.id=learning_plan_objective_events.version_id and v.status='approved')
);

create or replace function public._validate_learning_plan_content(p_content jsonb,p_complete boolean)
returns void language plpgsql immutable set search_path='' as $$
declare o jsonb; s jsonb; k text; n integer; ids text[]:=array[]::text[];
begin
  if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>60000
    or not p_content ?& array['title','language','level','summary','objectives']
    or (select count(*) from jsonb_object_keys(p_content))<>5 then
    raise exception 'Invalid learning plan content' using errcode='22023'; end if;
  foreach k in array array['title','language','level','summary'] loop
    if jsonb_typeof(p_content->k) is distinct from 'string'
      or length(p_content->>k)>(case k when 'title' then 160 when 'language' then 80 when 'level' then 40 else 3000 end)
      or (p_complete and k<>'summary' and length(trim(p_content->>k))=0)
      or (p_content->>k) ~ '<[^>]+>' then
      raise exception 'Invalid learning plan text' using errcode='22023'; end if;
  end loop;
  if jsonb_typeof(p_content->'objectives') is distinct from 'array'
    or jsonb_array_length(p_content->'objectives')>10
    or (p_complete and jsonb_array_length(p_content->'objectives')=0) then
    raise exception 'Add between one and ten objectives before approval' using errcode='22023'; end if;
  for o in select value from jsonb_array_elements(p_content->'objectives') loop
    if jsonb_typeof(o) is distinct from 'object' or not o ?& array['id','title','success_criteria','steps']
      or (select count(*) from jsonb_object_keys(o))<>4
      or coalesce(o->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or lower(o->>'id')=any(ids) then
      raise exception 'Invalid or repeated objective ID' using errcode='22023'; end if;
    ids:=array_append(ids,lower(o->>'id'));
    foreach k in array array['title','success_criteria'] loop
      if jsonb_typeof(o->k) is distinct from 'string' or length(o->>k)>(case k when 'title' then 300 else 1000 end)
        or (p_complete and length(trim(o->>k))=0) or (o->>k) ~ '<[^>]+>' then
        raise exception 'Complete each objective and its success criteria' using errcode='22023'; end if;
    end loop;
    if jsonb_typeof(o->'steps') is distinct from 'array' or jsonb_array_length(o->'steps')<>4 then
      raise exception 'Use all four learning stages' using errcode='22023'; end if;
    n:=0;
    for s in select value from jsonb_array_elements(o->'steps') loop
      n:=n+1;
      if jsonb_typeof(s) is distinct from 'object' or not s ?& array['stage','activity']
        or (select count(*) from jsonb_object_keys(s))<>2
        or (s->>'stage') is distinct from (array['Listen','Repeat','Personalize','Use'])[n]
        or jsonb_typeof(s->'activity') is distinct from 'string' or length(s->>'activity')>2000
        or (p_complete and length(trim(s->>'activity'))=0) or (s->>'activity') ~ '<[^>]+>' then
        raise exception 'Complete Listen, Repeat, Personalize and Use in order' using errcode='22023'; end if;
    end loop;
  end loop;
end;
$$;

create or replace function public._protect_approved_learning_plan()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='approved' then
    raise exception 'Approved learning plan versions are immutable. Create a new draft version.' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists protect_approved_learning_plan on public.learning_plan_versions;
create trigger protect_approved_learning_plan before update or delete on public.learning_plan_versions
for each row execute function public._protect_approved_learning_plan();

create or replace function public.create_learning_plan_version(
  p_student_id uuid,p_base_version_id uuid default null,p_source_ai_draft_id uuid default null,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.learning_plan_versions%rowtype; base public.learning_plan_versions%rowtype;
  ai public.ai_academic_drafts%rowtype; profile public.profiles%rowtype; body jsonb; prior_id uuid; next_number integer;
begin
  if auth.uid() is null or not public.can_teacher_access_student(auth.uid(),p_student_id) then
    raise exception 'Authorized teacher and approved student required' using errcode='42501'; end if;
  if p_request_id is null or (p_base_version_id is not null and p_source_ai_draft_id is not null) then
    raise exception 'Choose one version source and a request ID' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('learning-plan:'||auth.uid()::text||':'||p_student_id::text,0));
  select * into v from public.learning_plan_versions where teacher_id=auth.uid() and request_id=p_request_id;
  if found then
    if v.student_id<>p_student_id or v.base_version_id is distinct from p_base_version_id or v.source_ai_draft_id is distinct from p_source_ai_draft_id then
      raise exception 'Request ID already used for another plan source' using errcode='22023'; end if;
    return to_jsonb(v);
  end if;
  select id into prior_id from public.learning_plan_versions
    where teacher_id=auth.uid() and student_id=p_student_id and status='approved' order by approved_at desc,version_number desc limit 1;
  if p_base_version_id is not null then
    select * into base from public.learning_plan_versions where id=p_base_version_id and teacher_id=auth.uid() and student_id=p_student_id and status='approved';
    if not found then raise exception 'Approved source version unavailable' using errcode='42501'; end if;
    body:=base.content;
  elsif p_source_ai_draft_id is not null then
    select * into ai from public.ai_academic_drafts where id=p_source_ai_draft_id and teacher_id=auth.uid() and student_id=p_student_id and kind='learning_plan' and status in ('draft','approved');
    if not found then raise exception 'AI learning draft unavailable' using errcode='42501'; end if;
    perform public._validate_academic_ai_content(ai.content,'learning_plan');
    body:=jsonb_build_object('title',ai.content->>'title','language',ai.content->>'language','level',ai.content->>'level','summary',ai.content->>'objective',
      'objectives',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title',left(ai.content->>'objective',300),'success_criteria','',
        'steps',ai.content->'steps')));
  else
    select * into profile from public.profiles where id=p_student_id;
    if not found then raise exception 'Student profile unavailable' using errcode='42501'; end if;
    body:=jsonb_build_object('title','Learning plan','language',left(coalesce(profile.language,''),80),'level',left(coalesce(profile.level,''),40),'summary',left(coalesce(profile.goal,''),3000),
      'objectives',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title','','success_criteria','','steps',jsonb_build_array(
        jsonb_build_object('stage','Listen','activity',''),jsonb_build_object('stage','Repeat','activity',''),
        jsonb_build_object('stage','Personalize','activity',''),jsonb_build_object('stage','Use','activity','')))));
  end if;
  perform public._validate_learning_plan_content(body,false);
  select coalesce(max(version_number),0)+1 into next_number from public.learning_plan_versions where teacher_id=auth.uid() and student_id=p_student_id;
  insert into public.learning_plan_versions(teacher_id,student_id,version_number,content,base_version_id,prior_approved_version_id,source_ai_draft_id,request_id)
    values(auth.uid(),p_student_id,next_number,body,p_base_version_id,prior_id,p_source_ai_draft_id,p_request_id) returning * into v;
  return to_jsonb(v);
end;
$$;

create or replace function public.save_learning_plan_version(p_version_id uuid,p_expected_revision integer,p_content jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.learning_plan_versions%rowtype;
begin
  select * into v from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid() for update;
  if not found or not public.can_teacher_access_student(auth.uid(),v.student_id) then
    raise exception 'Learning plan unavailable to this teacher' using errcode='42501'; end if;
  if v.status<>'draft' then raise exception 'Approved learning plan versions are immutable' using errcode='55000'; end if;
  if p_expected_revision is distinct from v.revision then raise exception 'Learning plan changed. Reload before saving.' using errcode='40001'; end if;
  perform public._validate_learning_plan_content(p_content,false);
  update public.learning_plan_versions set content=p_content,revision=revision+1,updated_at=now() where id=v.id returning * into v;
  return to_jsonb(v);
end;
$$;

create or replace function public.approve_learning_plan_version(p_version_id uuid,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.learning_plan_versions%rowtype; student uuid; prior_id uuid;
begin
  select student_id into student from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid();
  if student is null or not public.can_teacher_access_student(auth.uid(),student) then
    raise exception 'Learning plan unavailable to this teacher' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('learning-plan:'||auth.uid()::text||':'||student::text,0));
  select * into v from public.learning_plan_versions where id=p_version_id and teacher_id=auth.uid() for update;
  if v.status<>'draft' then raise exception 'Approved learning plan versions are immutable' using errcode='55000'; end if;
  if p_expected_revision is distinct from v.revision then raise exception 'Learning plan changed. Reload before approving.' using errcode='40001'; end if;
  select id into prior_id from public.learning_plan_versions where teacher_id=auth.uid() and student_id=student and status='approved'
    order by approved_at desc,version_number desc limit 1;
  if prior_id is distinct from v.prior_approved_version_id then
    raise exception 'The approved plan changed. Create a new version before approving.' using errcode='40001'; end if;
  perform public._validate_learning_plan_content(v.content,true);
  update public.learning_plan_versions set status='approved',approved_at=now(),updated_at=now(),revision=revision+1 where id=v.id returning * into v;
  return to_jsonb(v);
end;
$$;

create or replace function public.set_learning_objective_completion(
  p_version_id uuid,p_objective_id uuid,p_expected_revision integer,p_completed boolean,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.learning_plan_versions%rowtype; progress public.learning_plan_objective_progress%rowtype;
  event public.learning_plan_objective_events%rowtype; old_revision integer;
begin
  select * into v from public.learning_plan_versions where id=p_version_id and status='approved';
  if not found or auth.uid() is null or not(
    (v.teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),v.student_id))
    or (v.student_id=auth.uid() and public.student_has_academic_access(auth.uid()))
  ) then raise exception 'Approved learning plan unavailable' using errcode='42501'; end if;
  if p_completed is null or p_request_id is null or p_expected_revision is null or p_expected_revision<0
    or not exists(select 1 from jsonb_array_elements(v.content->'objectives') o where lower(o->>'id')=p_objective_id::text) then
    raise exception 'Invalid objective or completion request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('learning-objective:'||p_version_id::text||':'||p_objective_id::text,0));
  select * into event from public.learning_plan_objective_events where actor_id=auth.uid() and request_id=p_request_id;
  if found then
    if event.version_id<>p_version_id or event.objective_id<>p_objective_id or event.completed<>p_completed or event.expected_revision<>p_expected_revision then
      raise exception 'Request ID already used for another completion change' using errcode='22023'; end if;
    return jsonb_build_object('version_id',event.version_id,'objective_id',event.objective_id,'completed',event.completed,'revision',event.revision,'updated_by',event.actor_id,'updated_at',event.created_at);
  end if;
  select * into progress from public.learning_plan_objective_progress where version_id=p_version_id and objective_id=p_objective_id for update;
  old_revision:=coalesce(progress.revision,0);
  if old_revision<>p_expected_revision then raise exception 'Objective progress changed. Reload before saving.' using errcode='40001'; end if;
  insert into public.learning_plan_objective_progress(version_id,objective_id,completed,revision,updated_by)
    values(p_version_id,p_objective_id,p_completed,old_revision+1,auth.uid())
    on conflict(version_id,objective_id) do update set completed=excluded.completed,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now()
    returning * into progress;
  insert into public.learning_plan_objective_events(version_id,objective_id,completed,revision,actor_id,request_id,expected_revision)
    values(p_version_id,p_objective_id,p_completed,progress.revision,auth.uid(),p_request_id,p_expected_revision);
  return to_jsonb(progress);
end;
$$;

revoke all on function public._validate_learning_plan_content(jsonb,boolean),public._protect_approved_learning_plan() from public,anon,authenticated;
revoke all on function public.create_learning_plan_version(uuid,uuid,uuid,uuid),public.save_learning_plan_version(uuid,integer,jsonb),
  public.approve_learning_plan_version(uuid,integer),public.set_learning_objective_completion(uuid,uuid,integer,boolean,uuid) from public,anon;
grant execute on function public.create_learning_plan_version(uuid,uuid,uuid,uuid),public.save_learning_plan_version(uuid,integer,jsonb),
  public.approve_learning_plan_version(uuid,integer),public.set_learning_objective_completion(uuid,uuid,integer,boolean,uuid) to authenticated;

-- AI retrieval now prioritizes the actual current approved plan version.
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
  select jsonb_build_object('version',v.version_number,'content',left(v.content::text,3000)) into v_plan
    from public.learning_plan_versions v where v.teacher_id=auth.uid() and v.student_id=p_student_id
      and v.status='approved' order by v.approved_at desc,v.version_number desc limit 1;
  if v_plan is null then
  select jsonb_build_object('approved_plan', left(d.content::text,3000)) into v_plan
    from public.ai_academic_drafts d where d.teacher_id = auth.uid() and d.student_id = p_student_id
      and d.kind = 'learning_plan' and d.status = 'approved' order by d.reviewed_at desc limit 1;
  end if;
  return jsonb_build_object('profile',v_profile,'submissions',v_attempts,'feedback',v_feedback,
    'challenges',v_challenges,'approved_plan',v_plan);
end;
$$;


notify pgrst,'reload schema';
commit;
