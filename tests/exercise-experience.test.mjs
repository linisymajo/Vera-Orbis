import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { buildStagingInitializationPlan } from '../scripts/staging-initialization-plan.mjs'
import { correctionSettings, validateCorrectionDefinition, checkPreviewAnswer, reorderQuestion } from '../src/lib/exerciseExperience.js'
import { generateAcademicDraft, buildProviderRequest } from '../supabase/functions/academic-ai/core.js'
import { validateCoachFeedback } from '../supabase/functions/academic-ai/feedback-coach.js'

const ids = ['10000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000072','20000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000072','20000000-0000-4000-8000-000000000073']
const [T,OT,S,OS,P] = ids
const question = {prompt:'Say you are excited about a trip.',answer:'I am looking forward to it.',accepted_answers:["I'm looking forward to it."],explanation:'Use this expression for something you are excited to do.'}
const policy = (extra={}) => ({correction:{version:1,mode:'objective',...extra},max_attempts:2})
const sql = file => readFile(new URL('../'+file,import.meta.url),'utf8')
const aiContent={title:'A private coaching draft',objective:'Express a travel goal naturally.',language:'English',level:'A1',steps:['Listen','Repeat','Personalize','Use'].map(stage=>({stage,activity:'Use your own travel example.'})),exercise_type:null,questions:[],feedback:'Your travel reason is clear. Try adding to after want, then say it with your next destination.'}

test('AI feedback uses a submission-bound reservation and warm instructions; structured sections reject unsafe output',async()=>{
  const calls=[],reservation=crypto.randomUUID(),draft=crypto.randomUUID(),attempt=crypto.randomUUID()
  const client={rpc:async(name,args)=>{
    calls.push({name,args})
    return {data:name==='get_academic_ai_context'?{submission:'Synthetic test response'}:name==='reserve_exercise_feedback_request'?reservation:{id:draft,status:'draft',content:aiContent}}
  }}
  await generateAcademicDraft(client,{kind:'feedback',studentId:S,attemptId:attempt,brief:'Coach this saved response.'},async()=>({content:aiContent,inputTokens:100,outputTokens:100}))
  assert.deepEqual(calls[1],{name:'reserve_exercise_feedback_request',args:{p_student_id:S,p_attempt_id:attempt}})
  const request=buildProviderRequest({kind:'feedback',brief:'Give a useful tip.'},{submission:'Synthetic test response'},'approved-model')
  assert.match(request.instructions,/Celebrate, Improve, Explain Simply, Encourage/)
  assert.match(request.instructions,/Valid alternative wording is not a mistake/)
  assert.equal(validateCoachFeedback({message:'A clear idea.',strengths:'You explained your reason.'}).strengths,'You explained your reason.')
  for(const value of[{message:' '},{message:'<script>unsafe</script>'},{message:'Good',secret:'internal'},{message:'x'.repeat(12001)},{message:'Good',explanation:'x'.repeat(4001)}])assert.throws(()=>validateCoachFeedback(value))
})

test('shared policy defaults, accepted wording, open response and immutable builder operations',()=>{
  assert.equal(correctionSettings().mode,'teacher_only')
  for(const correction of [{mode:null},{mode:'invented'},{timing:'immediate'},{show_score:'true'},{reveal_after_attempt:0},{retry_penalty:101},{mode:'ai_auto'}]) assert.throws(()=>correctionSettings({correction}))
  assert.equal(checkPreviewAnswer(question,"  I'M  looking forward to it. ",'fill_blank').correct,true)
  assert.equal(checkPreviewAnswer(question,'I am looking forwards to it.','fill_blank').correct,false)
  assert.equal(checkPreviewAnswer({},'a different valid expression','writing').correct,null)
  assert.throws(()=>validateCorrectionDefinition({exercise_type:'writing',questions:[{prompt:'Tell a story'}],settings:policy()}),/teacher/)
  assert.deepEqual(reorderQuestion([{prompt:'A'},{prompt:'B'}],0,1),[{prompt:'B'},{prompt:'A'}])
})

test('actual PostgreSQL correction, privacy, immediate checks and versioned teacher release',async t=>{
  const db = new PGlite()
  const as = async(user,work)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await work()}finally{await db.exec('reset role')}}
  const rpc = async(user,name,args=[]) => (await as(user,()=>db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) data`,args))).rows[0].data
  const create = async({type='fill_blank',questions=[question],settings=policy()}={})=>{
    const id=crypto.randomUUID()
    await as(T,()=>db.query("insert into exercises(id,teacher_id,title,language,exercise_type,questions,settings) values($1,$2,'A real expression','English',$3,$4,$5)",[id,T,type,JSON.stringify(questions),JSON.stringify(settings)]))
    await rpc(T,'publish_exercise',[id,[S],null])
    const assignment=(await db.query('select id from exercise_assignments where exercise_id=$1',[id])).rows[0].id
    return {id,assignment}
  }
  const submit = (assignment,answer,request=crypto.randomUUID())=>rpc(S,'submit_exercise',[assignment,JSON.stringify([{index:0,answer}]),request])
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
      create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
      alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;`)
    const plan=await buildStagingInitializationPlan()
    for(const entry of plan.entries){
      await db.exec(await sql(entry.file))
      if(entry.order===2)for(const prior of plan.entries.slice(0,2))await db.query('insert into vera_staging_setup_checksums(file_path,sha256) values($1,$2)',[prior.file,prior.sha256])
      else if(entry.order>2)await db.query('insert into vera_staging_setup_checksums(file_path,sha256) values($1,$2)',[entry.file,entry.sha256])
      if(entry.migration_version){
        await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)',[entry.migration_version,entry.migration_name])
        if(entry.migration_version>='0011')await db.query('insert into vera_staging_migration_checksums values($1,$2)',[entry.migration_version,entry.sha256])
      }
    }
    await db.exec(await sql('supabase/staging/client_privilege_hardening.sql'))
    await db.exec(await sql('supabase/migrations/0022_exercise_experience.sql'))
    await db.exec(await sql('supabase/migrations/0023_legacy_exercise_feedback.sql'))
    for(const id of ids)await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@example.test'])
    await db.query('insert into teachers(id) values($1),($2)',[T,OT])
    for(const id of[S,OS,P])await rpc(id,'initialize_student_profile')
    await db.query("update enrollments set status='approved',teacher_id=case when student_id=$1 then $2::uuid else $3::uuid end where student_id=any($4::uuid[])",[S,T,OT,[S,OS]])

    await t.test('new hosted-default tables expose no management rights or direct student writes',async()=>{
      for(const table of['exercise_correction_results','exercise_question_checks','exercise_feedback_versions']){
        for(const right of['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',['authenticated',table,right])).rows[0].allowed,false)
      }
    })
    await t.test('malformed policy/nulls and objective open responses fail on server',async()=>{
      for(const correction of[{mode:null},{mode:'wrong'},{show_score:null},{version:'1'},{mode:'ai_auto'},{mode:'objective',timing:null}])await assert.rejects(create({settings:{correction}}),/correction|policy|retry/)
      await assert.rejects(create({type:'writing'}),/Open responses/)
    })
    const activity=await create({settings:policy({show_score:true,reveal_after_attempt:2,retry_incorrect_only:true})})
    await t.test('saved progress survives reopening, rejects stale edits and stays private',async()=>{
      const answers=[{index:0,answer:'A response still in progress'}]
      assert.equal((await rpc(S,'save_exercise_progress',[activity.assignment,JSON.stringify(answers),0])).revision,1)
      assert.deepEqual((await rpc(S,'get_exercise_practice_state',[activity.assignment])).answers,answers)
      await assert.rejects(rpc(S,'save_exercise_progress',[activity.assignment,JSON.stringify(answers),0]),/another window/)
      await assert.rejects(rpc(OS,'save_exercise_progress',[activity.assignment,JSON.stringify(answers),1]),/unavailable/)
      await assert.rejects(rpc(S,'save_exercise_progress',[activity.assignment,JSON.stringify([{index:99,answer:'bad index'}]),1]),/Invalid progress/)
      await assert.rejects(as(S,()=>db.query('select * from exercise_practice_drafts')),/permission denied/)
    })
    await t.test('student projection hides every private answer and alternative; unrelated/pending denied',async()=>{
      const view=(await as(S,()=>db.query('select * from student_exercises where assignment_id=$1',[activity.assignment]))).rows[0]
      assert.doesNotMatch(JSON.stringify(view),/accepted_answers|excited to do|I am looking forward/)
      await assert.rejects(rpc(OS,'get_exercise_practice_state',[activity.assignment]),/unavailable/)
      await assert.rejects(rpc(P,'get_exercise_practice_state',[activity.assignment]),/unavailable/)
    })
    let first
    await t.test('submission precedes correction; request retry creates exactly one result, zero credit for incorrect answer',async()=>{
      const request=crypto.randomUUID();first=await submit(activity.assignment,'I am looking backwards.',request)
      assert.equal((await submit(activity.assignment,'I am looking backwards.',request)).id,first.id)
      const state=await rpc(S,'get_exercise_practice_state',[activity.assignment])
      assert.equal(state.score,0);assert.equal(state.question_results[0].correct,false)
      assert.equal(state.question_results[0].expected_answer,null);assert.equal(state.question_results[0].explanation,null)
      assert.equal((await db.query('select count(*)::int n from exercise_correction_results where assignment_id=$1',[activity.assignment])).rows[0].n,1)
      assert.equal((await db.query('select count(*)::int n from exercise_practice_drafts where assignment_id=$1',[activity.assignment])).rows[0].n,0)
    })
    await t.test('accepted variant passes; first-attempt scoring stays zero; reveal waits for configured completion',async()=>{
      await submit(activity.assignment," I'M  looking forward to it. ")
      const state=await rpc(S,'get_exercise_practice_state',[activity.assignment])
      assert.equal(state.question_results[0].correct,true);assert.equal(state.score,0)
      assert.equal(state.question_results[0].expected_answer,question.answer)
      assert.equal(state.question_results[0].explanation,question.explanation)
      await assert.rejects(submit(activity.assignment,question.answer),/Maximum attempts/)
    })
    await t.test('teacher cannot change correction rules after responses; legacy exercises still submit unchanged',async()=>{
      await assert.rejects(as(T,()=>db.query("update exercises set settings='{}' where id=$1",[activity.id])),/Duplicate/)
      const legacy=await create({type:'writing',questions:[{prompt:'Tell a story.'}],settings:{}})
      await submit(legacy.assignment,'There was a small cafe near my home.')
      assert.equal((await db.query('select count(*)::int n from exercise_correction_results where assignment_id=$1',[legacy.assignment])).rows[0].n,0)
    })
    const immediate=await create({settings:policy({timing:'immediate',show_score:true,scoring:'penalized',retry_penalty:20})})
    await t.test('incorrect-only retries reject changing a previously correct response',async()=>{
      const correctOnly=await create({settings:policy({retry_incorrect_only:true})})
      await submit(correctOnly.assignment,question.answer)
      await assert.rejects(submit(correctOnly.assignment,'different wording'),/Keep previously correct/)
      assert.equal((await rpc(S,'get_exercise_practice_state',[correctOnly.assignment])).attempt_count,1)
    })
    await t.test('immediate response is stored before feedback; retries idempotent and reveal stays private',async()=>{
      const request=crypto.randomUUID();const args=[immediate.assignment,0,'I look backwards.',request]
      const checked=await rpc(S,'check_exercise_question',args)
      assert.equal(checked.correct,false);assert.equal(checked.expected_answer,null)
      assert.deepEqual(await rpc(S,'check_exercise_question',args),checked)
      const state=await rpc(S,'get_exercise_practice_state',[immediate.assignment])
      assert.equal(state.answers[0].answer,'I look backwards.')
      await assert.rejects(submit(immediate.assignment,question.answer),/Check the revised/)
      await rpc(S,'check_exercise_question',[immediate.assignment,0,question.answer,crypto.randomUUID()])
      await submit(immediate.assignment,question.answer)
      assert.equal((await rpc(S,'get_exercise_practice_state',[immediate.assignment])).score,80)
      await assert.rejects(rpc(S,'check_exercise_question',[immediate.assignment,0,'guess',crypto.randomUUID()]),/Maximum question/)
    })
    await t.test('first-check score cannot become full credit after immediate retry; best scoring is explicit',async()=>{
      const firstCheck=await create({settings:policy({timing:'immediate',scoring:'first',show_score:true})})
      await rpc(S,'check_exercise_question',[firstCheck.assignment,0,'not the expression',crypto.randomUUID()])
      await rpc(S,'check_exercise_question',[firstCheck.assignment,0,question.answer,crypto.randomUUID()])
      await submit(firstCheck.assignment,question.answer)
      assert.equal((await rpc(S,'get_exercise_practice_state',[firstCheck.assignment])).score,0)
      const best=await create({settings:policy({scoring:'best',show_score:true})})
      await submit(best.assignment,'wrong');await submit(best.assignment,question.answer)
      assert.equal((await rpc(S,'get_exercise_practice_state',[best.assignment])).score,100)
    })
    await t.test('private matching keys and accepted ordering variants are deterministically checked',async()=>{
      const matching=await create({type:'matching',questions:[{prompt:'Connect',left:['Hello','Thanks'],right:['Merci','Bonjour'],answer:['Bonjour','Merci']}]})
      await submit(matching.assignment,JSON.stringify(['Bonjour','Merci']))
      assert.equal((await rpc(S,'get_exercise_practice_state',[matching.assignment])).question_results[0].correct,true)
      const ordering=await create({type:'ordering',questions:[{prompt:'Build',items:['tea','like','I'],answer:'I like tea',accepted_answers:['I like tea.']}]})
      await submit(ordering.assignment,'I like tea.')
      assert.equal((await rpc(S,'get_exercise_practice_state',[ordering.assignment])).question_results[0].correct,true)
    })
    await t.test('mixed response formats share one definition and enforce each answer format on the server',async()=>{
      const mixed=await create({type:'multiple_choice',questions:[
        {prompt:'Greet a colleague',response_type:'multiple_choice',options:['Hello','Goodbye'],answer:'Hello'},
        {prompt:'Tell a short story',response_type:'writing'}
      ],settings:{correction:{version:1,mode:'teacher_only'},max_attempts:1}})
      const invalid=[{index:0,answer:'forged option'},{index:1,answer:'A useful story.'}]
      await assert.rejects(rpc(S,'submit_exercise',[mixed.assignment,JSON.stringify(invalid),crypto.randomUUID()]),/available option/)
      await rpc(S,'submit_exercise',[mixed.assignment,JSON.stringify([{index:0,answer:'Hello'},invalid[1]]),crypto.randomUUID()])
      const state=await rpc(S,'get_exercise_practice_state',[mixed.assignment])
      assert.equal(state.state,'awaiting_review');assert.deepEqual(state.question_results,[])
      const row=(await as(S,()=>db.query('select * from student_exercises where assignment_id=$1',[mixed.assignment]))).rows[0]
      assert.equal(row.question_formats[1].response_type,'writing')
      await assert.rejects(rpc(S,'_submit_exercise_answers',[mixed.assignment,'[]',crypto.randomUUID()]),/permission denied/)
    })
    const open=await create({type:'writing',questions:[{prompt:'Tell us about your next trip.'}],settings:{correction:{mode:'ai_draft'},max_attempts:1}})
    const openAttempt=await submit(open.assignment,'I want travel to France because I like the culture.')
    await t.test('unconfigured AI remains pending manual review with no invented correctness/score',async()=>{
      const state=await rpc(S,'get_exercise_practice_state',[open.assignment])
      assert.equal(state.state,'awaiting_review');assert.equal(state.ai_available,false);assert.equal(state.score,null);assert.deepEqual(state.question_results,[])
    })
    let request=crypto.randomUUID()
    const feedback={message:'Your reason is clear.',strengths:'A clear personal goal.',natural_alternative:'I want to travel to France because I like the culture.',explanation:'Add to after want.',practical_tip:'Use this to talk about your next trip.',encouragement:'Keep building on that idea.'}
    await t.test('draft privacy, release, optimistic edits, replay and immutable released history',async()=>{
      const args=[openAttempt.id,JSON.stringify(feedback),0,request,false,null]
      assert.equal((await rpc(T,'save_exercise_feedback',args)).version,1)
      assert.equal((await rpc(T,'save_exercise_feedback',args)).version,1)
      assert.equal((await rpc(S,'get_exercise_practice_state',[open.assignment])).released_feedback,null)
      assert.equal((await as(S,()=>db.query('select * from exercise_feedback_versions'))).rows.length,0)
      await assert.rejects(rpc(OT,'save_exercise_feedback',[openAttempt.id,JSON.stringify(feedback),1,crypto.randomUUID(),true,null]),/denied/)
      await assert.rejects(rpc(T,'save_exercise_feedback',[openAttempt.id,JSON.stringify(feedback),0,crypto.randomUUID(),true,null]),/changed/)
      await rpc(T,'save_exercise_feedback',[openAttempt.id,JSON.stringify(feedback),1,crypto.randomUUID(),true,null])
      await rpc(T,'save_exercise_feedback',[openAttempt.id,JSON.stringify({message:'Private next revision'}),2,crypto.randomUUID(),false,null])
      const visible=(await rpc(S,'get_exercise_practice_state',[open.assignment])).released_feedback
      assert.equal(visible.version,2);assert.equal(visible.content.message,feedback.message)
      assert.doesNotMatch(JSON.stringify(visible),/Private next/)
      await assert.rejects(as(T,()=>db.query("update exercise_feedback_versions set content='{}' where attempt_id=$1",[openAttempt.id])),/permission denied/)
      const review=await rpc(T,'get_exercise_teacher_review',[openAttempt.id])
      assert.equal(review.version,3);assert.equal(review.history.length,3)
      await assert.rejects(rpc(OT,'get_exercise_teacher_review',[openAttempt.id]),/denied/)
      const outcomes=(await as(S,()=>db.query('select * from exercise_learning_outcomes where attempt_id=$1',[openAttempt.id]))).rows
      assert.equal(outcomes[0].reviewed_strengths,feedback.strengths)
      assert.equal(outcomes[0].objective_score,null)
    })
    await t.test('unbound/other-submission AI draft cannot be used; no anonymous or private helper execution',async()=>{
      await assert.rejects(rpc(T,'save_exercise_feedback',[openAttempt.id,JSON.stringify(feedback),3,crypto.randomUUID(),true,crypto.randomUUID()]),/matching AI/)
      await assert.rejects(rpc(S,'_exercise_correction_policy',['{}']),/permission denied/)
      await db.exec('set role anon')
      try{await assert.rejects(db.query('select get_exercise_practice_state($1)',[open.assignment]),/permission denied/)}finally{await db.exec('reset role')}
    })
    await t.test('consented AI draft reservation stores the precise attempt; approved drafts cannot cross submissions',async()=>{
      await rpc(S,'set_academic_ai_consent',[true])
      const request=await rpc(T,'reserve_exercise_feedback_request',[S,openAttempt.id])
      const saved=await rpc(T,'complete_academic_ai_request',[request,JSON.stringify(aiContent),100,100])
      assert.equal((await db.query('select feedback_attempt_id from ai_academic_drafts where id=$1',[saved.id])).rows[0].feedback_attempt_id,openAttempt.id)
      await rpc(T,'review_academic_ai_draft',[saved.id,JSON.stringify(aiContent),'approved'])
      await assert.rejects(rpc(T,'save_exercise_feedback',[first.id,JSON.stringify(feedback),0,crypto.randomUUID(),true,saved.id]),/matching AI/)
      await rpc(T,'save_exercise_feedback',[openAttempt.id,JSON.stringify(feedback),3,crypto.randomUUID(),false,saved.id])
      const state=await rpc(S,'get_exercise_practice_state',[open.assignment])
      assert.equal(state.released_feedback.version,2)
      await rpc(S,'set_academic_ai_consent',[false])
      await assert.rejects(rpc(T,'reserve_exercise_feedback_request',[S,openAttempt.id]),/consent/)
    })
    await t.test('pre-versioning released feedback survives a new private draft and the legacy 12,000-character bound remains supported',async()=>{
      const legacy=await create({type:'writing',questions:[{prompt:'A legacy open response.'}],settings:{}})
      const attempt=await submit(legacy.assignment,'A saved legacy response.')
      const original='An existing teacher observation. '.repeat(160)
      await db.query("update exercise_attempts set feedback=$1,feedback_status='published',feedback_published_at=now() where id=$2",[original,attempt.id])
      const saved=await rpc(T,'save_exercise_feedback',[attempt.id,JSON.stringify({message:'A new private revision.'}),0,crypto.randomUUID(),false,null])
      assert.equal(saved.version,2)
      assert.equal((await as(S,()=>db.query('select feedback from student_exercises where assignment_id=$1',[legacy.assignment]))).rows[0].feedback,original)
      const state=await rpc(S,'get_exercise_practice_state',[legacy.assignment])
      assert.equal(state.released_feedback.content.message,original)
      const longFeedback='Keep this useful observation. '.repeat(170)
      await rpc(T,'review_exercise_attempt',[attempt.id,longFeedback,true])
      assert.equal((await rpc(S,'get_exercise_practice_state',[legacy.assignment])).released_feedback.content.message,longFeedback)
    })
  }finally{await db.close()}
})
