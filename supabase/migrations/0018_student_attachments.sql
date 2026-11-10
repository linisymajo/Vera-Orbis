-- 0018: private, verified exercise/final attachments and immutable revision sets.
-- Requires 0004, 0012 and 0013; creates a new private bucket, never changes materials.
begin;
-- Managed Storage can grant policy management without granting table ownership.
-- Skip an owner-only ALTER when RLS is already active; otherwise require ownership.
do $storage_rls$
begin
  if not (select c.relrowsecurity from pg_catalog.pg_class c
    where c.oid = 'storage.objects'::regclass) then
    alter table storage.objects enable row level security;
  end if;
end $storage_rls$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academic-submissions','academic-submissions',false,10485760,array[
 'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/ogg','video/mp4'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.exercise_attachments(
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.exercise_assignments(id) on delete restrict,
 student_id uuid not null references public.profiles(id) on delete restrict,
 teacher_id uuid not null references public.teachers(id) on delete restrict,
 attempt_id uuid references public.exercise_attempts(id) on delete restrict,
 file_name text not null check(length(file_name) between 1 and 200),
 mime_type text not null,
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 file_path text not null unique,
 status text not null default 'reserved' check(status in ('reserved','uploaded','submitted')),
 created_at timestamptz not null default now(),
 uploaded_at timestamptz,
 unique(id,student_id)
);
create table if not exists public.exercise_attachment_versions(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.exercise_attempts(id) on delete restrict,
 student_id uuid not null references public.profiles(id) on delete restrict,
 request_id uuid not null,
 version_number integer not null check(version_number>0),
 attachment_ids uuid[] not null default '{}',
 created_at timestamptz not null default now(),
 unique(student_id,request_id),unique(attempt_id,version_number)
);
create index if not exists exercise_attachments_assignment_idx on public.exercise_attachments(assignment_id,attempt_id);
alter table public.exercise_attachments enable row level security;
alter table public.exercise_attachment_versions enable row level security;
revoke all on public.exercise_attachments,public.exercise_attachment_versions from public,anon,authenticated;
grant select on public.exercise_attachments,public.exercise_attachment_versions to authenticated;

create or replace function public.can_read_exercise_attachment(p_assignment_id uuid,p_submitted boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.exercise_assignments a where a.id=p_assignment_id and (
  (a.student_id=auth.uid() and a.status<>'revoked' and public.student_has_academic_access(auth.uid()))
  or (p_submitted and a.teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),a.student_id))
 ));
$$;
revoke all on function public.can_read_exercise_attachment(uuid,boolean) from public,anon;
grant execute on function public.can_read_exercise_attachment(uuid,boolean) to authenticated;
drop policy if exists "attachments authorized reader" on public.exercise_attachments;
create policy "attachments authorized reader" on public.exercise_attachments for select to authenticated
 using(public.can_read_exercise_attachment(assignment_id,attempt_id is not null));
drop policy if exists "attachment versions authorized reader" on public.exercise_attachment_versions;
create policy "attachment versions authorized reader" on public.exercise_attachment_versions for select to authenticated
 using(exists(select 1 from public.exercise_attempts t where t.id=attempt_id and public.can_read_exercise_attachment(t.assignment_id,true))
   or (student_id=auth.uid() and public.student_has_academic_access(auth.uid())));

create or replace function public.validate_exercise_attachment_settings()
returns trigger language plpgsql set search_path='' as $$
begin
 if coalesce(new.settings->>'attachment_mode','none') not in ('none','optional','required') then raise exception 'Invalid attachment setting'; end if;
 if new.settings ? 'allow_attachment_revisions' and jsonb_typeof(new.settings->'allow_attachment_revisions')<>'boolean' then raise exception 'Attachment revisions must be true or false'; end if;
 return new;
end $$;
drop trigger if exists exercise_attachment_settings on public.exercises;
create trigger exercise_attachment_settings before insert or update of settings on public.exercises
 for each row execute function public.validate_exercise_attachment_settings();

create or replace function public._exercise_attachment_context(p_assignment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v record;
begin
 select a.*,e.settings,e.status exercise_status into v from public.exercise_assignments a join public.exercises e on e.id=a.exercise_id
 where a.id=p_assignment_id and a.student_id=auth.uid();
 if not found or not public.student_has_academic_access(auth.uid()) or v.status='revoked' or v.exercise_status<>'published'
  or (v.available_from is not null and v.available_from>now()) then raise exception 'Attachment assignment unavailable' using errcode='42501'; end if;
 if v.due_at is not null and v.due_at<now() and coalesce(v.settings->>'allow_late','false')<>'true' then raise exception 'The deadline has passed'; end if;
 return jsonb_build_object('teacher_id',v.teacher_id,'student_id',v.student_id,'status',v.status,
  'attachment_mode',coalesce(v.settings->>'attachment_mode','none'),
  'allow_revisions',coalesce(v.settings->>'allow_attachment_revisions','false')='true');
end $$;
revoke all on function public._exercise_attachment_context(uuid) from public,anon,authenticated;

create or replace function public.reserve_exercise_attachment(p_assignment_id uuid,p_file_name text,p_mime_type text,p_size_bytes bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; ext text; expected text; item public.exercise_attachments%rowtype; path text;
begin
 ctx:=public._exercise_attachment_context(p_assignment_id);
 if ctx->>'attachment_mode'='none' or (ctx->>'status'='completed' and not (ctx->>'allow_revisions')::boolean) then raise exception 'Attachments are disabled for this submission'; end if;
 if p_request_id is null or p_file_name is null or length(p_file_name) not between 1 and 200 or p_size_bytes is null or p_size_bytes not between 1 and 10485760 then raise exception 'Choose a nonempty academic file up to 10 MiB'; end if;
 ext:=lower(substring(p_file_name from '\.([A-Za-z0-9]+)$'));
 expected:=case ext when 'pdf' then 'application/pdf' when 'doc' then 'application/msword'
  when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  when 'ppt' then 'application/vnd.ms-powerpoint' when 'pptx' then 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  when 'xls' then 'application/vnd.ms-excel' when 'xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  when 'jpg' then 'image/jpeg' when 'jpeg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp'
  when 'mp3' then 'audio/mpeg' when 'wav' then 'audio/wav' when 'ogg' then 'audio/ogg' when 'mp4' then 'video/mp4' else null end;
 if expected is null or p_mime_type is distinct from expected then raise exception 'Unsupported attachment type'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into item from public.exercise_attachments where id=p_request_id;
 if found then
  if item.student_id<>auth.uid() or item.assignment_id<>p_assignment_id or item.file_name<>p_file_name or item.mime_type<>expected or item.size_bytes<>p_size_bytes then raise exception 'Attachment request was already used'; end if;
  return to_jsonb(item);
 end if;
 if (select count(*) from public.exercise_attachments where student_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Attachment upload limit reached; try again later'; end if;
 path:=auth.uid()::text||'/'||p_assignment_id::text||'/'||p_request_id::text||'.'||ext;
 insert into public.exercise_attachments(id,assignment_id,student_id,teacher_id,file_name,mime_type,size_bytes,file_path)
 values(p_request_id,p_assignment_id,auth.uid(),(ctx->>'teacher_id')::uuid,p_file_name,expected,p_size_bytes,path) returning * into item;
 return to_jsonb(item);
end $$;

create or replace function public.confirm_exercise_attachment(p_attachment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.exercise_attachments%rowtype; meta jsonb;
begin
 select * into item from public.exercise_attachments where id=p_attachment_id and student_id=auth.uid() for update;
 if not found then raise exception 'Attachment unavailable' using errcode='42501'; end if;
 perform public._exercise_attachment_context(item.assignment_id);
 select metadata into meta from storage.objects where bucket_id='academic-submissions' and name=item.file_path;
 if meta is null or coalesce(meta->>'size','') !~ '^[0-9]+$' then raise exception 'Storage has not confirmed this upload'; end if;
 if (meta->>'size')::bigint<>item.size_bytes or meta->>'mimetype' is distinct from item.mime_type then raise exception 'Uploaded file metadata does not match'; end if;
 if item.status='reserved' then
  update public.exercise_attachments set status='uploaded',uploaded_at=now() where id=item.id returning * into item;
 end if;
 return to_jsonb(item);
end $$;

-- Preserve the original answer validator as a private implementation. All public
-- submission paths below enforce attachment settings before invoking it.
do $$ begin
 if to_regprocedure('public._submit_exercise_answers(uuid,jsonb,uuid)') is null then
  alter function public.submit_exercise(uuid,jsonb,uuid) rename to _submit_exercise_answers;
 end if;
end $$;
revoke all on function public._submit_exercise_answers(uuid,jsonb,uuid) from public,anon,authenticated;

create or replace function public.submit_exercise_with_attachments(p_assignment_id uuid,p_answers jsonb,p_request_id uuid,p_attachment_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; ids uuid[]; saved jsonb; prior public.exercise_attempts%rowtype; previous_ids uuid[];
begin
 if auth.uid() is null or not public.student_has_academic_access(auth.uid()) or p_request_id is null then raise exception 'Verified student and request required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select coalesce(array_agg(distinct id order by id),'{}'::uuid[]) into ids from unnest(coalesce(p_attachment_ids,'{}'::uuid[])) id where id is not null;
 if cardinality(ids)>5 then raise exception 'Use at most five attachments'; end if;
 select * into prior from public.exercise_attempts where student_id=auth.uid() and request_id=p_request_id;
 if found then
  select attachment_ids into previous_ids from public.exercise_attachment_versions where attempt_id=prior.id and version_number=1;
  if prior.assignment_id<>p_assignment_id or prior.answers<>p_answers or coalesce(previous_ids,'{}'::uuid[])<>ids then raise exception 'Submission request already used for different content'; end if;
  return jsonb_build_object('id',prior.id,'assignment_id',prior.assignment_id);
 end if;
 -- Lock in the same order as publication and the answer validator.
 perform 1 from public.exercises e join public.exercise_assignments a on a.exercise_id=e.id where a.id=p_assignment_id for share of e;
 perform 1 from public.exercise_assignments where id=p_assignment_id for update;
 ctx:=public._exercise_attachment_context(p_assignment_id);
 if ctx->>'attachment_mode'='none' and cardinality(ids)>0 then raise exception 'Attachments are disabled'; end if;
 if ctx->>'attachment_mode'='required' and cardinality(ids)=0 then raise exception 'This activity requires an attachment'; end if;
 if (select count(*) from public.exercise_attachments where id=any(ids) and assignment_id=p_assignment_id and student_id=auth.uid() and status='uploaded' and attempt_id is null)<>cardinality(ids) then raise exception 'Finish uploading every selected attachment'; end if;
 saved:=public._submit_exercise_answers(p_assignment_id,p_answers,p_request_id);
 update public.exercise_attachments set attempt_id=(saved->>'id')::uuid,status='submitted' where id=any(ids);
 insert into public.exercise_attachment_versions(attempt_id,student_id,request_id,version_number,attachment_ids)
 values((saved->>'id')::uuid,auth.uid(),p_request_id,1,ids);
 return saved;
end $$;
create or replace function public.submit_exercise(p_assignment_id uuid,p_answers jsonb,p_request_id uuid)
returns jsonb language sql security definer set search_path='' as $$
 select public.submit_exercise_with_attachments(p_assignment_id,p_answers,p_request_id,'{}'::uuid[])
$$;

create or replace function public.revise_exercise_attachments(p_attempt_id uuid,p_attachment_ids uuid[],p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt public.exercise_attempts%rowtype; ctx jsonb; ids uuid[]; v integer; previous public.exercise_attachment_versions%rowtype;
begin
 if p_request_id is null or not public.student_has_academic_access(auth.uid()) then raise exception 'Verified student and request required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into attempt from public.exercise_attempts where id=p_attempt_id and student_id=auth.uid();
 if not found then raise exception 'Submission unavailable' using errcode='42501'; end if;
 select coalesce(array_agg(distinct id order by id),'{}'::uuid[]) into ids from unnest(coalesce(p_attachment_ids,'{}'::uuid[])) id where id is not null;
 select * into previous from public.exercise_attachment_versions where student_id=auth.uid() and request_id=p_request_id;
 if found then
  if previous.attempt_id<>attempt.id or previous.attachment_ids<>ids then raise exception 'Revision request already used'; end if;
  return jsonb_build_object('attempt_id',attempt.id,'version_number',previous.version_number);
 end if;
 perform 1 from public.exercises e join public.exercise_assignments a on a.exercise_id=e.id where a.id=attempt.assignment_id for share of e;
 perform 1 from public.exercise_assignments where id=attempt.assignment_id for update;
 ctx:=public._exercise_attachment_context(attempt.assignment_id);
 if not (ctx->>'allow_revisions')::boolean or ctx->>'attachment_mode'='none' then raise exception 'Attachment revisions are disabled'; end if;
 if cardinality(ids)>5 or (ctx->>'attachment_mode'='required' and cardinality(ids)=0) then raise exception 'Choose between one and five files for a required attachment'; end if;
 if (select count(*) from public.exercise_attachments where id=any(ids) and assignment_id=attempt.assignment_id and student_id=auth.uid()
  and ((status='uploaded' and attempt_id is null) or (status='submitted' and attempt_id=attempt.id)))<>cardinality(ids) then raise exception 'Finish uploading every revision file'; end if;
 select coalesce(max(version_number),0)+1 into v from public.exercise_attachment_versions where attempt_id=attempt.id;
 insert into public.exercise_attachment_versions(attempt_id,student_id,request_id,version_number,attachment_ids) values(attempt.id,auth.uid(),p_request_id,v,ids);
 update public.exercise_attachments set attempt_id=attempt.id,status='submitted' where id=any(ids) and attempt_id is null;
 return jsonb_build_object('attempt_id',attempt.id,'version_number',v);
end $$;

create or replace function public.list_exercise_attachments(p_assignment_id uuid)
returns table(id uuid,attempt_id uuid,file_name text,mime_type text,size_bytes bigint,file_path text,status text,version_number integer,is_current boolean)
language sql stable security definer set search_path='' as $$
 select f.id,f.attempt_id,f.file_name,f.mime_type,f.size_bytes,f.file_path,f.status,v.version_number,
  coalesce(v.version_number=(select max(v2.version_number) from public.exercise_attachment_versions v2 where v2.attempt_id=f.attempt_id),false)
 from public.exercise_attachments f left join public.exercise_attachment_versions v on f.id=any(v.attachment_ids)
 where f.assignment_id=p_assignment_id and public.can_read_exercise_attachment(f.assignment_id,f.attempt_id is not null)
 order by v.version_number desc nulls first,f.created_at;
$$;

create or replace function public.can_upload_exercise_attachment(p_file_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.exercise_attachments f join public.exercise_assignments a on a.id=f.assignment_id join public.exercises e on e.id=a.exercise_id
 where f.file_path=p_file_path and f.student_id=auth.uid() and f.status='reserved' and a.status<>'revoked' and e.status='published'
 and public.student_has_academic_access(auth.uid()) and coalesce(e.settings->>'attachment_mode','none')<>'none'
 and (a.status<>'completed' or coalesce(e.settings->>'allow_attachment_revisions','false')='true')
 and (a.available_from is null or a.available_from<=now()) and (a.due_at is null or a.due_at>=now() or coalesce(e.settings->>'allow_late','false')='true'));
$$;
revoke all on function public.can_upload_exercise_attachment(text) from public,anon;
grant execute on function public.can_upload_exercise_attachment(text) to authenticated;
-- Restrictive boundaries also guard against any unrelated permissive policies.
drop policy if exists "academic submission read" on storage.objects;
create policy "academic submission read" on storage.objects for select to authenticated using(bucket_id='academic-submissions' and exists(
 select 1 from public.exercise_attachments f where f.file_path=name and f.status in ('uploaded','submitted') and public.can_read_exercise_attachment(f.assignment_id,f.attempt_id is not null)));
drop policy if exists "academic submission read boundary" on storage.objects;
create policy "academic submission read boundary" on storage.objects as restrictive for select to authenticated using(bucket_id<>'academic-submissions' or exists(
 select 1 from public.exercise_attachments f where f.file_path=name and f.status in ('uploaded','submitted') and public.can_read_exercise_attachment(f.assignment_id,f.attempt_id is not null)));
drop policy if exists "academic submission upload" on storage.objects;
create policy "academic submission upload" on storage.objects for insert to authenticated with check(bucket_id='academic-submissions' and public.can_upload_exercise_attachment(name));
drop policy if exists "academic submission insert boundary" on storage.objects;
create policy "academic submission insert boundary" on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'academic-submissions' or public.can_upload_exercise_attachment(name));drop policy if exists "academic submission update boundary" on storage.objects;
create policy "academic submission update boundary" on storage.objects as restrictive for update to authenticated using(bucket_id<>'academic-submissions') with check(bucket_id<>'academic-submissions');
drop policy if exists "academic submission delete boundary" on storage.objects;
create policy "academic submission delete boundary" on storage.objects as restrictive for delete to authenticated using(bucket_id<>'academic-submissions');
drop policy if exists "academic submission anonymous boundary" on storage.objects;
create policy "academic submission anonymous boundary" on storage.objects as restrictive for all to anon using(bucket_id<>'academic-submissions') with check(bucket_id<>'academic-submissions');

-- Append settings only; no raw settings/keys are exposed to students.
do $$ declare definition text;
begin
 definition:=rtrim(pg_get_viewdef('public.student_exercises'::regclass,true),E';\n ');
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='student_exercises' and column_name='attachment_mode') then
  execute format('create or replace view public.student_exercises with (security_invoker=false,security_barrier=true) as select v.*,coalesce(e.settings->>''attachment_mode'',''none'') as attachment_mode,(coalesce(e.settings->>''allow_attachment_revisions'',''false'')=''true'') as allow_revisions,case when e.settings->>''max_attempts'' ~ ''^[1-9][0-9]?$'' then (e.settings->>''max_attempts'')::integer else 1 end as attempt_limit,(select t.id from public.exercise_attempts t where t.assignment_id=v.assignment_id and t.student_id=auth.uid() order by t.submitted_at desc,t.id desc limit 1) as latest_attempt_id from (%s) v join public.exercises e on e.id=v.exercise_id where public.student_has_academic_access(auth.uid())',definition);
 end if;
end $$;
revoke all on function public.reserve_exercise_attachment(uuid,text,text,bigint,uuid),public.confirm_exercise_attachment(uuid),public.submit_exercise(uuid,jsonb,uuid),public.submit_exercise_with_attachments(uuid,jsonb,uuid,uuid[]),public.revise_exercise_attachments(uuid,uuid[],uuid),public.list_exercise_attachments(uuid) from public,anon;
grant execute on function public.reserve_exercise_attachment(uuid,text,text,bigint,uuid),public.confirm_exercise_attachment(uuid),public.submit_exercise(uuid,jsonb,uuid),public.submit_exercise_with_attachments(uuid,jsonb,uuid,uuid[]),public.revise_exercise_attachments(uuid,uuid[],uuid),public.list_exercise_attachments(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
