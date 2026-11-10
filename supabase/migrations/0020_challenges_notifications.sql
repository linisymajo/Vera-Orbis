-- Approved challenge publication and transactional in-app notifications.
-- Requires 0004,0008,0009,0010,0012,0013,0014,0016,0017. No email delivery.
begin;

create table if not exists public.challenge_publications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id),
  ai_draft_id uuid not null unique references public.ai_academic_drafts(id),
  request_id uuid not null,
  request_payload jsonb not null,
  content_snapshot jsonb not null,
  student_ids uuid[] not null,
  created_at timestamptz not null default now(),
  unique(teacher_id,request_id)
);
alter table public.challenge_publications enable row level security;
revoke all on public.challenge_publications from public,anon,authenticated;
grant select on public.challenge_publications to authenticated;
drop policy if exists "teachers read own challenge publications" on public.challenge_publications;
create policy "teachers read own challenge publications" on public.challenge_publications for select to authenticated
using(teacher_id=auth.uid() and public.is_academic_staff());
alter table public.weekly_challenges add column if not exists publication_id uuid references public.challenge_publications(id);
create unique index if not exists challenge_publication_student_idx on public.weekly_challenges(publication_id,student_id) where publication_id is not null;
alter table public.challenge_submissions add column if not exists request_id uuid;
alter table public.challenge_submissions add column if not exists challenge_snapshot jsonb;
-- Existing teacher feedback remains visible; new responses explicitly start draft.
alter table public.challenge_submissions add column if not exists feedback_status text not null default 'published';
alter table public.challenge_submissions add column if not exists feedback_published_at timestamptz;
create unique index if not exists challenge_submission_request_idx on public.challenge_submissions(student_id,request_id) where request_id is not null;

create or replace function public._validate_published_challenge()
returns trigger language plpgsql security definer set search_path='' as $$
declare p public.challenge_publications; expected_instructions text;
begin
  if tg_op='UPDATE' and old.publication_id is not null and new.publication_id is distinct from old.publication_id then
    raise exception 'Published recommendation linkage is immutable';
  end if;
  if new.publication_id is not null then
    select * into p from public.challenge_publications where id=new.publication_id;
    select string_agg((s.value->>'stage')||': '||(s.value->>'activity'), E'\n' order by s.ordinality)
      into expected_instructions from jsonb_array_elements(p.content_snapshot->'steps') with ordinality s(value,ordinality);
    if p.id is null or new.teacher_id is distinct from p.teacher_id or new.student_id is null
      or not(new.student_id=any(p.student_ids)) or new.audience<>'student'
      or new.title is distinct from p.content_snapshot->>'title'
      or new.description is distinct from p.content_snapshot->>'objective'
      or new.instructions is distinct from expected_instructions
      or new.points is distinct from (p.request_payload->>'points')::integer
      or new.end_date is distinct from (p.request_payload->>'end_at')::timestamptz then
      raise exception 'Published challenge must preserve the reviewed recommendation snapshot';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_published_challenge on public.weekly_challenges;
create trigger validate_published_challenge before insert or update on public.weekly_challenges
for each row execute function public._validate_published_challenge();

drop policy if exists "challenge active delivery boundary" on public.weekly_challenges;
create policy "challenge active delivery boundary" on public.weekly_challenges as restrictive for select to authenticated
using(case when public.is_academic_staff() then teacher_id=auth.uid()
  and(student_id is null or public.can_teacher_access_student(auth.uid(),student_id))
else public.student_has_academic_access(auth.uid()) and status='active' and(student_id=auth.uid() or audience='all') end);
-- Raw teacher feedback drafts must never be readable by students.
drop policy if exists "challenge teacher response boundary" on public.challenge_submissions;
create policy "challenge teacher response boundary" on public.challenge_submissions as restrictive for select to authenticated
using(public.is_academic_staff() and public.can_teacher_access_student(auth.uid(),student_id)
  and exists(select 1 from public.weekly_challenges c where c.id=challenge_id and c.teacher_id=auth.uid()));
revoke insert,update,delete on public.challenge_submissions from authenticated;
create or replace view public.student_challenge_submissions with(security_invoker=false,security_barrier=true) as
select s.id,s.challenge_id,s.student_id,s.response,s.status,
  case when s.feedback_status='published' then s.teacher_feedback else null end as teacher_feedback,
  s.feedback_status,s.created_at,s.updated_at
from public.challenge_submissions s where s.student_id=auth.uid() and public.student_has_academic_access(auth.uid());
revoke all on public.student_challenge_submissions from public,anon;
grant select on public.student_challenge_submissions to authenticated;

create or replace function public.publish_academic_challenge(p_draft_id uuid,p_student_ids uuid[],p_end_at timestamptz,p_points integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.ai_academic_drafts; p public.challenge_publications; ids uuid[]; payload jsonb; instruction_text text; result_ids jsonb;
begin
  if not public.is_academic_staff() or p_request_id is null then raise exception 'Verified teacher and publication request required'; end if;
  select array_agg(distinct x order by x) into ids from unnest(p_student_ids) x where x is not null;
  if coalesce(cardinality(ids),0) not between 1 and 200 or p_points is null or p_points not between 0 and 1000 then
    raise exception 'Select 1-200 students and points between 0 and 1000'; end if;
  payload:=jsonb_build_object('draft_id',p_draft_id,'students',ids,'end_at',p_end_at,'points',p_points);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':challenge-publish',0));
  select * into p from public.challenge_publications where teacher_id=auth.uid() and(request_id=p_request_id or ai_draft_id=p_draft_id) for update;
  if found then
    if p.request_payload<>payload then raise exception 'Publication request or recommendation already used with different selections'; end if;
    select jsonb_agg(id order by student_id) into result_ids from public.weekly_challenges where publication_id=p.id;
    return jsonb_build_object('publication_id',p.id,'challenge_ids',result_ids,'assignment_count',cardinality(ids));
  end if;
  select * into d from public.ai_academic_drafts where id=p_draft_id and teacher_id=auth.uid() for update;
  if not found or d.kind<>'challenge' or d.status<>'approved' or d.reviewed_at is null
    or not public.can_teacher_access_student(auth.uid(),d.student_id) then
    raise exception 'A reviewed and approved challenge recommendation is required' using errcode='42501'; end if;
  perform public._validate_academic_ai_content(d.content,'challenge');
  if p_end_at is not null and p_end_at<=now() then raise exception 'Challenge deadline must be in the future'; end if;
  if exists(select 1 from unnest(ids) sid where not public.can_teacher_access_student(auth.uid(),sid)) then
    raise exception 'Student access denied' using errcode='42501'; end if;
  insert into public.challenge_publications(teacher_id,ai_draft_id,request_id,request_payload,content_snapshot,student_ids)
    values(auth.uid(),d.id,p_request_id,payload,d.content,ids) returning * into p;
  select string_agg((s.value->>'stage')||': '||(s.value->>'activity'), E'\n' order by s.ordinality)
    into instruction_text from jsonb_array_elements(d.content->'steps') with ordinality s(value,ordinality);
  insert into public.weekly_challenges(teacher_id,student_id,audience,title,description,instructions,points,end_date,status,publication_id)
    select auth.uid(),sid,'student',d.content->>'title',d.content->>'objective',instruction_text,p_points,p_end_at,'active',p.id from unnest(ids) sid;
  select jsonb_agg(id order by student_id) into result_ids from public.weekly_challenges where publication_id=p.id;
  if jsonb_array_length(result_ids)<>cardinality(ids) then raise exception 'Challenge assignment persistence was not confirmed'; end if;
  return jsonb_build_object('publication_id',p.id,'challenge_ids',result_ids,'assignment_count',cardinality(ids));
end $$;

create or replace function public.submit_academic_challenge(p_challenge_id uuid,p_response text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.weekly_challenges; prior public.challenge_submissions; sid uuid;
begin
  if not public.student_has_academic_access(auth.uid()) then raise exception 'Approved student access required' using errcode='42501'; end if;
  if p_request_id is null or p_response is null or length(btrim(p_response)) not between 1 and 12000 then raise exception 'Add a response and a submission request'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':challenge-submit',0));
  select * into prior from public.challenge_submissions where student_id=auth.uid() and request_id=p_request_id;
  if found then
    if prior.challenge_id<>p_challenge_id or prior.response<>btrim(p_response) then raise exception 'Submission request already used for a different response'; end if;
    return jsonb_build_object('id',prior.id,'challenge_id',prior.challenge_id,'status',prior.status);
  end if;
  select * into c from public.weekly_challenges where id=p_challenge_id for share;
  if not found or c.status<>'active' or(c.student_id is distinct from auth.uid() and c.audience is distinct from 'all')
    or(c.end_date is not null and c.end_date<=now()) then raise exception 'Challenge unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.challenge_submissions where student_id=auth.uid() and challenge_id=c.id) then raise exception 'This challenge has already been submitted'; end if;
  insert into public.challenge_submissions(challenge_id,student_id,response,status,teacher_feedback,request_id,challenge_snapshot,feedback_status)
    values(c.id,auth.uid(),btrim(p_response),'submitted',null,p_request_id,to_jsonb(c),'draft') returning id into sid;
  return jsonb_build_object('id',sid,'challenge_id',c.id,'status','submitted');
end $$;

create or replace function public.review_challenge_submission(p_submission_id uuid,p_feedback text,p_release boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.challenge_submissions; c public.weekly_challenges;
begin
  select * into s from public.challenge_submissions where id=p_submission_id for update;
  select * into c from public.weekly_challenges where id=s.challenge_id;
  if s.id is null or c.teacher_id is distinct from auth.uid() or not public.can_teacher_access_student(auth.uid(),s.student_id) then
    raise exception 'Challenge submission access denied' using errcode='42501'; end if;
  if p_feedback is null or length(btrim(p_feedback)) not between 1 and 6000 or p_release is null then raise exception 'Add feedback and choose a review action'; end if;
  update public.challenge_submissions set teacher_feedback=btrim(p_feedback),status=case when p_release then 'reviewed' else 'submitted' end,
    feedback_status=case when p_release then 'published' else 'draft' end,feedback_published_at=case when p_release then now() else null end,updated_at=now()
    where id=s.id returning * into s;
  return jsonb_build_object('id',s.id,'status',s.status,'feedback_status',s.feedback_status);
end $$;

create table if not exists public.academic_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  entity_id uuid not null,
  target_view text not null check(target_view in('exercises','challenges','calendar','inbox','teacher','finals')),
  title text not null check(length(title) between 1 and 200),
  body text not null default '' check(length(body)<=1000),
  event_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(recipient_id,event_key)
);
create index if not exists academic_notifications_recipient_idx on public.academic_notifications(recipient_id,created_at desc);
alter table public.academic_notifications enable row level security;
revoke all on public.academic_notifications from public,anon,authenticated;
grant select on public.academic_notifications to authenticated;
drop policy if exists "users read own academic notifications" on public.academic_notifications;
create policy "users read own academic notifications" on public.academic_notifications for select to authenticated
using(recipient_id=auth.uid() and(public.student_has_academic_access(auth.uid()) or public.is_academic_staff()));
create or replace function public.mark_academic_notification_read(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.academic_notifications;
begin
  if not(public.student_has_academic_access(auth.uid()) or public.is_academic_staff()) then raise exception 'Approved academic access required'; end if;
  update public.academic_notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and recipient_id=auth.uid() returning * into n;
  if not found then raise exception 'Notification unavailable' using errcode='42501'; end if;
  return jsonb_build_object('id',n.id,'read_at',n.read_at);
end $$;
create or replace function public._add_academic_notification(p_recipient uuid,p_kind text,p_entity uuid,p_view text,p_title text,p_body text,p_key text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.student_has_academic_access(p_recipient) or exists(select 1 from public.teachers t join auth.users u on u.id=t.id where t.id=p_recipient and u.email_confirmed_at is not null) then
    insert into public.academic_notifications(recipient_id,kind,entity_id,target_view,title,body,event_key)
      values(p_recipient,p_kind,p_entity,p_view,left(p_title,200),left(coalesce(p_body,''),1000),p_key) on conflict(recipient_id,event_key) do nothing;
  end if;
end $$;

create or replace function public._notify_exercise_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare e public.exercises; key text;
begin
  if new.status='revoked' then return new; end if;
  if tg_op='UPDATE' and(new.status,new.due_at,new.available_from) is not distinct from(old.status,old.due_at,old.available_from) then return new; end if;
  if tg_op='UPDATE' and new.status='completed' then return new; end if;
  select * into e from public.exercises where id=new.exercise_id;
  if e.status='published' and public.can_teacher_access_student(new.teacher_id,new.student_id) then
    key:='exercise-assignment:'||new.id::text||case when tg_op='INSERT' then '' else ':'||gen_random_uuid()::text end;
    perform public._add_academic_notification(new.student_id,'exercise_assigned',new.id,
      case when e.settings->>'final_assessment'='true' then 'finals' else 'exercises' end,
      case when e.settings->>'final_assessment'='true' then 'Final assessment assigned' else 'Exercise assigned' end,e.title,key);
  end if;
  return new;
end $$;
drop trigger if exists notify_exercise_assignment on public.exercise_assignments;
create trigger notify_exercise_assignment after insert or update on public.exercise_assignments for each row execute function public._notify_exercise_assignment();

create or replace function public._notify_challenge_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare sid uuid; key text;
begin
  if new.status<>'active' then return new; end if;
  if tg_op='UPDATE' and(new.status,new.end_date,new.title,new.instructions) is not distinct from(old.status,old.end_date,old.title,old.instructions) then return new; end if;
  for sid in select e.student_id from public.enrollments e where(new.student_id=e.student_id or new.audience='all') and public.can_teacher_access_student(new.teacher_id,e.student_id) loop
    key:='challenge-assignment:'||new.id::text||case when tg_op='INSERT' then '' else ':'||gen_random_uuid()::text end;
    perform public._add_academic_notification(sid,'challenge_assigned',new.id,'challenges','Weekly challenge assigned',new.title,key);
  end loop;
  return new;
end $$;
drop trigger if exists notify_challenge_assignment on public.weekly_challenges;
create trigger notify_challenge_assignment after insert or update on public.weekly_challenges for each row execute function public._notify_challenge_assignment();

create or replace function public._notify_challenge_response()
returns trigger language plpgsql security definer set search_path='' as $$
declare c public.weekly_challenges;
begin
  select * into c from public.weekly_challenges where id=new.challenge_id;
  if not public.can_teacher_access_student(c.teacher_id,new.student_id) then return new; end if;
  if tg_op='INSERT' then
    perform public._add_academic_notification(c.teacher_id,'challenge_submitted',new.id,'challenges','Challenge response received',c.title,'challenge-response:'||new.id::text);
  elsif new.feedback_status='published' and(old.feedback_status is distinct from 'published' or new.teacher_feedback is distinct from old.teacher_feedback) then
    perform public._add_academic_notification(new.student_id,'challenge_feedback',new.id,'challenges','Teacher feedback is ready',c.title,'challenge-feedback:'||new.id::text||':'||md5(new.teacher_feedback));
  end if;
  return new;
end $$;
drop trigger if exists notify_challenge_response on public.challenge_submissions;
create trigger notify_challenge_response after insert or update on public.challenge_submissions for each row execute function public._notify_challenge_response();

create or replace function public._notify_exercise_response()
returns trigger language plpgsql security definer set search_path='' as $$
declare a public.exercise_assignments; e public.exercises;
begin
  select * into a from public.exercise_assignments where id=new.assignment_id;
  select * into e from public.exercises where id=a.exercise_id;
  if not public.can_teacher_access_student(a.teacher_id,new.student_id) then return new; end if;
  if tg_op='INSERT' then
    perform public._add_academic_notification(a.teacher_id,'exercise_submitted',new.id,
      case when e.settings->>'final_assessment'='true' then 'finals' else 'exercises' end,
      'Exercise response received',e.title,'exercise-response:'||new.id::text);
  elsif new.feedback_status='published' and(old.feedback_status is distinct from 'published' or new.feedback is distinct from old.feedback) then
    perform public._add_academic_notification(new.student_id,'exercise_feedback',new.id,
      case when e.settings->>'final_assessment'='true' then 'finals' else 'exercises' end,
      'Teacher feedback is ready',e.title,'exercise-feedback:'||new.id::text||':'||md5(new.feedback));
  end if;
  return new;
end $$;
drop trigger if exists notify_exercise_response on public.exercise_attempts;
create trigger notify_exercise_response after insert or update on public.exercise_attempts for each row execute function public._notify_exercise_response();

create or replace function public._notify_calendar()
returns trigger language plpgsql security definer set search_path='' as $$
declare c public.classes; sid uuid; event text;
begin
  if tg_table_name='class_participants' then
    select * into c from public.classes where id=new.class_id;
    if c.status in('scheduled','rescheduled') and public.can_teacher_access_student(c.teacher_id,new.student_id) then
      perform public._add_academic_notification(new.student_id,'calendar_scheduled',c.id,'calendar','Class scheduled',c.title||' · '||c.starts_at::text,'class-scheduled:'||c.id::text||':'||new.student_id::text);
    end if;
  else
    if(new.starts_at,new.status,new.duration_minutes,new.modality,new.title) is not distinct from(old.starts_at,old.status,old.duration_minutes,old.modality,old.title) then return new; end if;
    c:=new;
    event:=gen_random_uuid()::text;
    for sid in select student_id from public.class_participants where class_id=c.id loop
      if public.can_teacher_access_student(c.teacher_id,sid) then
        perform public._add_academic_notification(sid,'calendar_changed',c.id,'calendar','Class updated',c.title||' · '||c.starts_at::text||' · '||c.status,'class-updated:'||c.id::text||':'||event);
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists notify_calendar_participant on public.class_participants;
create trigger notify_calendar_participant after insert on public.class_participants for each row execute function public._notify_calendar();
drop trigger if exists notify_calendar_change on public.classes;
create trigger notify_calendar_change after update on public.classes for each row execute function public._notify_calendar();

create or replace function public._notify_inbox_message()
returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid;
begin
  if new.sender_role='student' and new.sender_id=new.recipient_id then
    for tid in select t.id from public.teachers t where public.can_teacher_access_student(t.id,new.sender_id) loop
      perform public._add_academic_notification(tid,'inbox_message',new.id,'inbox','New student message',new.subject,'inbox-message:'||new.id::text);
    end loop;
  else
    perform public._add_academic_notification(new.recipient_id,'inbox_message',new.id,'inbox','New message',new.subject,'inbox-message:'||new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_inbox_message on public.inbox_messages;
create trigger notify_inbox_message after insert on public.inbox_messages for each row execute function public._notify_inbox_message();

revoke all on function public._validate_published_challenge(),public._add_academic_notification(uuid,text,uuid,text,text,text,text),
  public._notify_exercise_assignment(),public._notify_challenge_assignment(),public._notify_challenge_response(),
  public._notify_exercise_response(),public._notify_calendar(),public._notify_inbox_message() from public,anon,authenticated;
revoke all on function public.publish_academic_challenge(uuid,uuid[],timestamptz,integer,uuid),public.submit_academic_challenge(uuid,text,uuid),
  public.review_challenge_submission(uuid,text,boolean),public.mark_academic_notification_read(uuid) from public,anon;
grant execute on function public.publish_academic_challenge(uuid,uuid[],timestamptz,integer,uuid),public.submit_academic_challenge(uuid,text,uuid),
  public.review_challenge_submission(uuid,text,boolean),public.mark_academic_notification_read(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
