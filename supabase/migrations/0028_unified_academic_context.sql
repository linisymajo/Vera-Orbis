-- Proposal only. Additive context/index/provenance for existing academic records.
-- Depends on 0002,0013,0014,0019,0022,0023,0025,0026; excludes 0024 and 0027.
begin;
-- Backward-compatible optional accepted variants in private AI exercise drafts.
-- The original validator still validates every original field and draft kind.
alter function public._validate_academic_ai_content(jsonb,text) rename to _validate_academic_ai_content_before_unified;
create function public._validate_academic_ai_content(p_content jsonb,p_kind text) returns void language plpgsql immutable set search_path='' as $$
declare clean jsonb; q jsonb; v jsonb;
begin
 clean:=p_content;
 if p_kind='exercise' and jsonb_typeof(p_content->'questions')='array' then
 for q in select value from jsonb_array_elements(p_content->'questions') loop
 if q?'accepted_answers' then
 if jsonb_typeof(q->'accepted_answers') is distinct from 'array' or jsonb_array_length(q->'accepted_answers')>20 then raise exception 'Invalid accepted variants' using errcode='22023'; end if;
 for v in select value from jsonb_array_elements(q->'accepted_answers') loop
 if jsonb_typeof(v) is distinct from 'string' or length(trim(v#>>'{}')) not between 1 and 300 then raise exception 'Invalid accepted variant text' using errcode='22023'; end if; end loop;
 end if; end loop;
 clean:=jsonb_set(clean,'{questions}',(select coalesce(jsonb_agg(value-'accepted_answers'),'[]') from jsonb_array_elements(p_content->'questions')));
 end if;
 perform public._validate_academic_ai_content_before_unified(clean,p_kind);
end $$;
revoke all on function public._validate_academic_ai_content(jsonb,text),public._validate_academic_ai_content_before_unified(jsonb,text) from public,anon,authenticated;
create table public.academic_context_reviews (
 teacher_id uuid not null references public.teachers(id), student_id uuid not null references public.profiles(id),
 revision integer not null default 1, settings jsonb not null, source_snapshot jsonb not null, updated_at timestamptz not null default now(),
 primary key(teacher_id,student_id)
);
create table public.material_text_versions (
 id uuid primary key default gen_random_uuid(), material_id uuid not null references public.materials(id) on delete cascade,
 teacher_id uuid not null references public.teachers(id), student_id uuid references public.profiles(id), language text, uploaded_at timestamptz,
 source_reference text not null, source_fingerprint text not null,
 content_hash text not null, parser_version text not null, status text not null check(status in('ready','ocr_required','unsupported','failed')),
 sections jsonb not null, created_at timestamptz not null default now(),
 unique(material_id,source_fingerprint,parser_version)
);
create table public.unified_academic_runs (
 request_id uuid primary key references public.academic_ai_requests(id), teacher_id uuid not null references public.teachers(id),
 student_id uuid not null references public.profiles(id), client_request_id uuid not null,
 settings jsonb not null, sources jsonb not null, review_revision integer not null,
 result jsonb, citations jsonb, created_at timestamptz not null default now(), unique(teacher_id,client_request_id)
);
alter table public.academic_context_reviews enable row level security;
alter table public.material_text_versions enable row level security;
alter table public.unified_academic_runs enable row level security;
revoke all on public.academic_context_reviews,public.material_text_versions,public.unified_academic_runs from public,anon,authenticated;
grant select on public.academic_context_reviews,public.material_text_versions,public.unified_academic_runs to authenticated;
create policy "context owner reads" on public.academic_context_reviews for select to authenticated using(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id));
create policy "run owner reads" on public.unified_academic_runs for select to authenticated using(teacher_id=auth.uid() and public.can_teacher_access_student(auth.uid(),student_id));
create policy "material index owner reads" on public.material_text_versions for select to authenticated using(teacher_id=auth.uid() and exists(select 1 from public.materials m where m.id=material_id and m.teacher_id=auth.uid() and (m.student_id is null or public.can_teacher_access_student(auth.uid(),m.student_id))));

create function public._assert_context_teacher(sid uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.teachers where id=auth.uid()) or not public.can_teacher_access_student(auth.uid(),sid) then
 raise exception 'Assigned verified teacher required' using errcode='42501'; end if;
end $$;
create function public._academic_material_fingerprint(mid uuid) returns text language sql stable security definer set search_path='' as $$
 select md5(concat(m.file_path,m.updated_at::text,m.description,m.title,o.updated_at::text,o.metadata::text))
 from public.materials m left join storage.objects o on o.bucket_id='materials' and o.name=m.file_path where m.id=mid
$$;
create function public.get_academic_material_source(p_student_id uuid,p_material_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.materials;
begin
 perform public._assert_context_teacher(p_student_id);
 select * into m from public.materials where id=p_material_id and teacher_id=auth.uid()
  and (student_id=p_student_id or(student_id is null and audience='all' and (language is null or language=(select language from public.profiles where id=p_student_id))));
 if not found then raise exception 'Authorized material unavailable' using errcode='42501'; end if;
 if m.file_path is not null and (split_part(m.file_path,'/',1)<>auth.uid()::text or m.file_path ~ '(^|/)\.\.(/|$)' or m.file_path ~ '^https?:') then
 raise exception 'Private material path unavailable' using errcode='42501'; end if;
 return jsonb_build_object('id',m.id,'file_path',m.file_path,'title',m.title,'description',m.description,'language',m.language,
  'student_id',m.student_id,'uploaded_at',m.created_at,'fingerprint',public._academic_material_fingerprint(m.id));
end $$;
create function public.save_academic_material_text(p_student_id uuid,p_material_id uuid,p_fingerprint text,p_content_hash text,p_parser_version text,p_status text,p_sections jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare src jsonb; v public.material_text_versions;
begin
 src:=public.get_academic_material_source(p_student_id,p_material_id);
 if src->>'fingerprint' is distinct from p_fingerprint then raise exception 'Material changed; reprocess' using errcode='40001'; end if;
 if p_content_hash is null or p_content_hash !~ '^[a-f0-9]{64}$' or p_parser_version is null or length(p_parser_version) not between 1 and 40 or p_status is null or p_status not in('ready','ocr_required','unsupported','failed')
 or jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections)>200 or octet_length(p_sections::text)>120000 then
 raise exception 'Invalid extraction' using errcode='22023'; end if;
 insert into public.material_text_versions(material_id,teacher_id,student_id,language,uploaded_at,source_reference,source_fingerprint,content_hash,parser_version,status,sections)
 values(p_material_id,auth.uid(),(src->>'student_id')::uuid,src->>'language',(src->>'uploaded_at')::timestamptz,'material:'||p_material_id,p_fingerprint,p_content_hash,p_parser_version,p_status,p_sections)
 on conflict(material_id,source_fingerprint,parser_version) do nothing;
 select * into v from public.material_text_versions where material_id=p_material_id and source_fingerprint=p_fingerprint and parser_version=p_parser_version;
 return jsonb_build_object('id',v.id,'status',v.status,'created_at',v.created_at,'content_hash',v.content_hash);
end $$;

create function public.get_student_academic_context(p_student_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sources jsonb; review jsonb; profile jsonb; packages jsonb; verified integer;
begin
 perform public._assert_context_teacher(p_student_id);
 select jsonb_build_object('language',language,'level',level,'goal',goal,'recorded_total',total_lessons,'recorded_completed',lessons_completed) into profile from public.profiles where id=p_student_id;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]') into packages from(
 select sp.assignment_id,p.name,p.class_count,sp.classes_consumed,sp.status,p.duration_minutes from public.student_packages sp join public.packages p on p.id=sp.package_id and p.teacher_id=sp.teacher_id
 where sp.student_id=p_student_id and sp.teacher_id=auth.uid() and sp.status in('active','exhausted') order by sp.purchased_at desc limit 10)t;
 select count(*) into verified from public.classes c join public.class_participants cp on cp.class_id=c.id and cp.teacher_id=c.teacher_id
 join public.class_attendance a on a.class_id=c.id and a.student_id=cp.student_id
 where c.teacher_id=auth.uid() and cp.student_id=p_student_id and c.status='completed' and a.status in('present','late');
 select to_jsonb(r)-'teacher_id'-'student_id' into review from public.academic_context_reviews r where r.teacher_id=auth.uid() and r.student_id=p_student_id;
 select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('fingerprint',md5(s.payload::text)) order by s.ref),'[]') into sources from (
 select 'profile:'||p_student_id::text ref,'profile' kind,'Recorded learning profile' title,'recorded' evidence_state,null::timestamptz recorded_at,profile payload
 union all
 select 'intake:'||o.id,'assessment','Initial intake',case when to_jsonb(o)->>'assessed_level' is null then 'intake_only' else 'assessment_record' end,o.updated_at,
 jsonb_build_object('learning_goals',left(o.learning_goals,1500),'assessed_level',to_jsonb(o)->>'assessed_level','previous_experience',left(o.previous_experience,1500),'difficulties',left(o.difficulties,1000)) from public.onboarding_responses o where o.student_id=p_student_id
 union all
 select 'plan:'||v.id,'plan',v.content->>'title','approved_plan',v.approved_at,v.content from (select * from public.learning_plan_versions where student_id=p_student_id and teacher_id=auth.uid() and status='approved' order by approved_at desc limit 3)v
 union all
 select 'lesson:'||c.id,'lesson',c.title,case when c.status='completed' and a.status in('present','late') then 'completion_and_attendance_verified' else 'calendar_record_only' end,c.starts_at,
 jsonb_build_object('status',c.status,'attendance',a.status,'notes',left(c.notes,2000),'attendance_notes',left(a.notes,1000)) from (select cl.* from public.classes cl join public.class_participants cp on cp.class_id=cl.id and cp.teacher_id=cl.teacher_id where cl.teacher_id=auth.uid() and cp.student_id=p_student_id order by cl.starts_at desc limit 40)c left join public.class_attendance a on a.class_id=c.id and a.student_id=p_student_id
 union all
 select 'attempt:'||a.id,'response',coalesce(a.exercise_snapshot->>'title',e.title),'submitted_response',a.submitted_at,
 jsonb_build_object('answers',a.answers,'questions',coalesce(a.exercise_snapshot->'questions',e.questions),'objective',e.objective,'score',a.score,
 'released_feedback',(select f.content from public.exercise_feedback_versions f where f.attempt_id=a.id and f.released_at is not null order by f.version desc limit 1),
 'legacy_released_feedback',case when a.feedback_status='published' then a.feedback else null end)
 from (select at.* from public.exercise_attempts at join public.exercise_assignments x on x.id=at.assignment_id and x.student_id=at.student_id where at.student_id=p_student_id and x.teacher_id=auth.uid() and x.status<>'revoked' order by at.submitted_at desc limit 15)a join public.exercise_assignments x on x.id=a.assignment_id join public.exercises e on e.id=x.exercise_id and e.teacher_id=x.teacher_id
 union all
 select 'assignment:'||x.id,'assignment',e.title,'assigned_not_evidence_of_mastery',x.assigned_at,jsonb_build_object('status',x.status,'objective',e.objective,'instructions',left(e.instructions,2000)) from public.exercise_assignments x join public.exercises e on e.id=x.exercise_id and e.teacher_id=x.teacher_id where x.student_id=p_student_id and x.teacher_id=auth.uid() and x.status<>'revoked'
 union all
 select 'observation:'||p_student_id,'observation','Private teacher observations','teacher_observation',n.updated_at,jsonb_build_object('notes',left(n.notes,4000)) from public.teacher_notes n where n.teacher_id=auth.uid() and n.student_id=p_student_id
 union all
 select 'challenge:'||s.id,'challenge',w.title,'submitted_challenge',s.created_at,jsonb_build_object('response',left(s.response,2000),'feedback',left(s.teacher_feedback,1500),'status',s.status) from public.challenge_submissions s join public.weekly_challenges w on w.id=s.challenge_id where s.student_id=p_student_id and w.teacher_id=auth.uid() and (w.student_id=p_student_id or w.audience='all')
 union all
 select 'material:'||m.id,'material',m.title,case when idx.id is null then 'not_indexed_or_changed' else idx.status end,m.created_at,
 jsonb_build_object('material_id',m.id,'language',m.language,'content_version',idx.id,'content_hash',idx.content_hash,'sections',coalesce(idx.sections,'[]'),'description',left(m.description,2000),'has_file',m.file_path is not null,'media_available',m.type in('audio','video') and m.file_path is not null)
 from public.materials m left join lateral(select i.* from public.material_text_versions i where i.material_id=m.id and i.source_fingerprint=public._academic_material_fingerprint(m.id) order by created_at desc limit 1)idx on true
 where m.teacher_id=auth.uid() and (m.student_id=p_student_id or(m.student_id is null and m.audience='all' and(m.language is null or m.language=profile->>'language')))
 )s;
 return jsonb_build_object('student_id',p_student_id,'profile',profile,'packages',packages,'verified_completed',verified,'review',review,'sources',sources,
 'ai_consent',coalesce((select allowed from public.academic_ai_consents where student_id=p_student_id),false),
 'warnings',jsonb_build_array('Scheduled classes do not prove attendance or completion.','Missing responses are unknown evidence, not weaknesses.','Recorded counts and teacher-confirmed counts have distinct provenance.'));
end $$;

create function public.save_academic_context_review(p_student_id uuid,p_expected_revision integer,p_settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.academic_context_reviews; ctx jsonb; k text; n integer;
begin
 ctx:=public.get_student_academic_context(p_student_id);
 if not public._architect_keys(p_settings,array['language','level','goal','total','completed','duration','priorities','excluded','corrections','confirmed'])
 or p_settings->>'language' not in('English','French','Mandarin') or p_settings->>'level' not in('A1','A2','B1','B2','C1','C2')
 or jsonb_typeof(p_settings->'goal') is distinct from 'string' or length(trim(p_settings->>'goal')) not between 1 and 1000
 or jsonb_typeof(p_settings->'priorities') is distinct from 'string' or length(p_settings->>'priorities')>2000 or p_settings->'confirmed' is distinct from 'true'::jsonb
 or jsonb_typeof(p_settings->'excluded') is distinct from 'array' or jsonb_array_length(p_settings->'excluded')>200
 or jsonb_typeof(p_settings->'corrections') is distinct from 'object' or octet_length(p_settings::text)>20000 then raise exception 'Confirm valid academic context settings' using errcode='22023'; end if;
 foreach k in array array['total','completed','duration'] loop
 if jsonb_typeof(p_settings->k) is distinct from 'number' or (p_settings->>k)!~'^[0-9]+$' then raise exception 'Integer course counts required' using errcode='22023'; end if; end loop;
 if (p_settings->>'total')::int not between 1 and 120 or (p_settings->>'completed')::int not between 0 and (p_settings->>'total')::int or (p_settings->>'duration')::int not between 20 and 120 then raise exception 'Invalid course count or duration' using errcode='22023'; end if;
 for k in select jsonb_array_elements_text(p_settings->'excluded') union select jsonb_object_keys(p_settings->'corrections') loop
 if not exists(select 1 from jsonb_array_elements(ctx->'sources') s where s->>'ref'=k) then raise exception 'Source unavailable to this student' using errcode='42501'; end if;
 if p_settings->'corrections'?k and (jsonb_typeof(p_settings->'corrections'->k) is distinct from 'string' or length(p_settings->'corrections'->>k)>2000) then raise exception 'Bounded correction text required' using errcode='22023'; end if; end loop;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_student_id::text,0));
 select * into r from public.academic_context_reviews where teacher_id=auth.uid() and student_id=p_student_id for update;
 if coalesce(r.revision,0) is distinct from p_expected_revision then raise exception 'Reload context before saving' using errcode='40001'; end if;
 insert into public.academic_context_reviews(teacher_id,student_id,settings,source_snapshot) values(auth.uid(),p_student_id,p_settings,
 (select coalesce(jsonb_object_agg(s->>'ref',s->>'fingerprint'),'{}') from jsonb_array_elements(ctx->'sources') s))
 on conflict(teacher_id,student_id) do update set settings=excluded.settings,source_snapshot=excluded.source_snapshot,revision=public.academic_context_reviews.revision+1,updated_at=now() returning * into r;
 return to_jsonb(r)-'teacher_id'-'student_id';
end $$;

-- Atomically reserve against existing consent, quotas and plan idempotency.
create function public.reserve_unified_academic_request(p_student_id uuid,p_client_request_id uuid,p_review_revision integer,p_settings jsonb,p_sources jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.academic_context_reviews; prior public.unified_academic_runs; req uuid; saved jsonb; ctx jsonb; src jsonb;
begin
 perform public._assert_academic_ai_access(p_student_id);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client_request_id::text,0));
 select * into prior from public.unified_academic_runs where teacher_id=auth.uid() and client_request_id=p_client_request_id;
 if found then
 if prior.student_id<>p_student_id or prior.settings<>p_settings or prior.review_revision<>p_review_revision or prior.sources<>p_sources then raise exception 'Request ID conflict' using errcode='22023'; end if;
 if prior.result is not null then
 if prior.settings->>'kind'='learning_plan' then select to_jsonb(v) into saved from public.learning_plan_versions v where v.id=(prior.result->>'id')::uuid and v.teacher_id=auth.uid() and v.status='draft';
 else select to_jsonb(v) into saved from public.ai_academic_drafts v where v.id=(prior.result->>'id')::uuid and v.teacher_id=auth.uid() and v.status='draft'; end if;
 if saved is not null then return jsonb_build_object('result',saved,'request_id',prior.request_id,'citations',prior.citations); end if; end if;
 raise exception 'Request already reserved; reload drafts' using errcode='55000'; end if;
 select * into r from public.academic_context_reviews where teacher_id=auth.uid() and student_id=p_student_id;
 if r.revision is distinct from p_review_revision or r.settings->'confirmed' is distinct from 'true'::jsonb then raise exception 'Review current academic context first' using errcode='40001'; end if;
 if p_settings->>'kind' not in('learning_plan','exercise') or octet_length(p_settings::text)>6000 or jsonb_typeof(p_sources) is distinct from 'array' or octet_length(p_sources::text)>24000 then raise exception 'Invalid generation settings' using errcode='22023'; end if;
 ctx:=public.get_student_academic_context(p_student_id);
 for src in select value from jsonb_array_elements(p_sources) loop
 if not exists(select 1 from jsonb_array_elements(ctx->'sources') s where s->>'ref'=src->>'ref' and s->>'fingerprint'=src->>'source_fingerprint' and s->>'fingerprint'=r.source_snapshot->>(src->>'ref'))
 or (r.settings->'excluded') ? (src->>'ref') then raise exception 'Reviewed source unavailable' using errcode='42501'; end if; end loop;
 if p_settings->>'kind'='learning_plan' then
 if (p_settings->>'classes')::int is distinct from ((r.settings->>'total')::int-(r.settings->>'completed')::int) or (p_settings->>'classes')::int not between 1 and 12 then raise exception 'Generate the confirmed remaining lessons (1-12)' using errcode='22023'; end if;
 saved:=public.reserve_learning_architect_request(p_student_id,p_client_request_id,p_settings); req:=(saved->>'request_id')::uuid;
 else req:=public.reserve_academic_ai_request(p_student_id,'exercise'); end if;
 insert into public.unified_academic_runs(request_id,teacher_id,student_id,client_request_id,settings,sources,review_revision) values(req,auth.uid(),p_student_id,p_client_request_id,p_settings,p_sources,p_review_revision);
 return jsonb_build_object('request_id',req);
end $$;
create function public.complete_unified_academic_request(p_request_id uuid,p_content jsonb,p_citations jsonb,p_input_tokens integer,p_output_tokens integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.unified_academic_runs; v_result jsonb; c jsonb;
begin
 select * into r from public.unified_academic_runs where request_id=p_request_id and teacher_id=auth.uid() for update;
 if not found then raise exception 'Authorized generation unavailable' using errcode='42501'; end if;
 perform public._assert_academic_ai_access(r.student_id);
 if r.result is not null then return r.result; end if;
 if jsonb_typeof(p_citations) is distinct from 'array' or jsonb_array_length(p_citations) not between 1 and 40 or octet_length(p_citations::text)>24000 then raise exception 'Invalid source citations' using errcode='22023'; end if;
 for c in select value from jsonb_array_elements(p_citations) loop
 if not exists(select 1 from jsonb_array_elements(r.sources) s where s->>'handle'=c->>'source' and s->>'ref'=c->>'ref' and s->'locators' ? (c->>'locator')) then raise exception 'Source citation unavailable' using errcode='22023'; end if; end loop;
 if r.settings->>'kind'='learning_plan' then v_result:=public.complete_learning_architect_request(p_request_id,p_content,p_input_tokens,p_output_tokens);
 else v_result:=public.complete_academic_ai_request(p_request_id,p_content,p_input_tokens,p_output_tokens); end if;
 update public.unified_academic_runs set result=v_result,citations=p_citations where request_id=p_request_id;
 return v_result;
end $$;
create function public.get_unified_academic_provenance(p_result_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.unified_academic_runs;
begin
 select * into r from public.unified_academic_runs where result->>'id'=p_result_id::text and teacher_id=auth.uid() order by created_at desc limit 1;
 if not found then return null; end if;
 perform public._assert_context_teacher(r.student_id);
 return jsonb_build_object('request_id',r.request_id,'sources',r.sources,'citations',r.citations,'review_revision',r.review_revision);
end $$;

revoke all on function public._assert_context_teacher(uuid),public._academic_material_fingerprint(uuid) from public,anon,authenticated;
revoke all on function public.get_student_academic_context(uuid),public.save_academic_context_review(uuid,integer,jsonb),public.get_academic_material_source(uuid,uuid),public.save_academic_material_text(uuid,uuid,text,text,text,text,jsonb),public.reserve_unified_academic_request(uuid,uuid,integer,jsonb,jsonb),public.complete_unified_academic_request(uuid,jsonb,jsonb,integer,integer),public.get_unified_academic_provenance(uuid) from public,anon;
grant execute on function public.get_student_academic_context(uuid),public.save_academic_context_review(uuid,integer,jsonb),public.get_academic_material_source(uuid,uuid),public.save_academic_material_text(uuid,uuid,text,text,text,text,jsonb),public.reserve_unified_academic_request(uuid,uuid,integer,jsonb,jsonb),public.complete_unified_academic_request(uuid,jsonb,jsonb,integer,integer),public.get_unified_academic_provenance(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
