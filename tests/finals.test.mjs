import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { parseFinalCriteria, validateFinalCriteria, saveFinalDraft, publishFinalAssessment, saveFinalResult, publishFinalResult } from '../src/lib/finals.js'
import { renderFinals } from '../src/components/finals.js'

const T='10000000-0000-4000-8000-000000000001', T2='10000000-0000-4000-8000-000000000002'
const S='20000000-0000-4000-8000-000000000001', OTHER='20000000-0000-4000-8000-000000000002', PENDING='20000000-0000-4000-8000-000000000003'
const M='30000000-0000-4000-8000-000000000001', PRIVATE_M='30000000-0000-4000-8000-000000000002'
const criteria=[{label:'Communication',max_points:60},{label:'Personalization',max_points:40}]
const draft={title:'Welcome your new colleague',language:'French',instructions:'Listen, repeat, personalize, and use a greeting in context.',exercise_type:'multiple_choice',questions:[{prompt:'Choose a greeting',options:['Bonjour','Au revoir'],answer:'Bonjour',explanation:'Private answer explanation',private_note:'Hidden'}],attachment_mode:'none'}

test('final rubric validation requires positive criteria totaling 100 points',()=>{
  assert.deepEqual(parseFinalCriteria('Communication | 60\nPersonalization | 40'),criteria)
  for(const rubric of [[],[{label:'',max_points:100}],[{label:'Meaning',max_points:80}],[{label:'Meaning',max_points:-10}],[{label:'Meaning',max_points:NaN}]]) assert.throws(()=>validateFinalCriteria(rubric))
})

test('final adapters fail closed on missing persistence confirmations and never imply publication',async()=>{
  const client={rpc:async()=>({data:{}})}
  await assert.rejects(saveFinalDraft(client,{draft,criteria}),/not confirmed/)
  await assert.rejects(publishFinalAssessment(client,{finalId:'final',studentIds:['student']}),/not confirmed/)
  await assert.rejects(saveFinalResult(client,{attemptId:'attempt',scores:[60,40],feedback:'Well done.'}),/not confirmed/)
  await assert.rejects(publishFinalResult(client,'result'),/not confirmed/)
  await assert.rejects(publishFinalResult(client,''),/Save/)
})

test('student finals render escaped content and show no result before an explicitly published result ID',()=>{
  const item={assignment_id:'assignment',final_id:'final',title:'<script>bad</script>',exercise_type:'multiple_choice',questions:draft.questions,criteria,attempt_count:0}
  const before=renderFinals([{...item,result_grade:90,result_feedback:'PRIVATE DRAFT'}])
  assert.ok(!before.includes('PRIVATE DRAFT'));assert.ok(!before.includes('<script>'))
  assert.ok(before.includes('after your teacher publishes'))
  const after=renderFinals([{...item,result_id:'result',result_grade:90,result_feedback:'Use <em>your</em> experience.',result_scores:[55,35],result_revision:1}])
  assert.ok(after.includes('Published result: 90 / 100'));assert.ok(after.includes('&lt;em&gt;your&lt;/em&gt;'))
  assert.ok(!after.includes('Private answer explanation'));assert.ok(!after.includes('private_note'))
})

test('actual PostgreSQL finals: atomic creation, assignment, submissions, private versioned grades and explicit release',async t=>{
  const db=new PGlite()
  async function as(user,work){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await work()}finally{await db.exec('reset role')}}
  async function rpc(user,name,args=[]){return (await as(user,()=>db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args))).rows[0].result}
  const sql=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
  const uuid=()=>crypto.randomUUID()
  let final,assignment,attempt,result1
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to authenticated,anon;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text,language text,level text,level_name text,progress int,lessons_completed int,current_module text,next_step text,interface_language text);
      create table public.materials(id uuid primary key,teacher_id uuid,student_id uuid,title text,audience text,file_path text);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
      alter table storage.objects enable row level security;
      grant select,insert on storage.objects to authenticated;
      grant select on public.teachers,public.profiles,public.materials to authenticated;`)
    for(const id of [T,T2,S,OTHER])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@example.test'])
    await db.query('insert into teachers values($1),($2)',[T,T2])
    await db.query("insert into profiles(id,name) values($1,'Student'),($2,'Other student')",[S,OTHER])
    for(const migration of ['0004_exercise_studio.sql','0012_exercise_workflow.sql','0013_hybrid_enrollment.sql','0018_student_attachments.sql','0021_final_assessments.sql'])await db.exec(sql(migration))
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[PENDING,'pending@example.test'])
    await db.query("insert into materials values($1,$2,null,'Shared reference','all',$3),($4,$2,$5,'Individual reference','student',$6)",[M,T,T+'/reference.pdf',PRIVATE_M,S,T+'/private.pdf'])

    await t.test('creation saves one independent exercise and rubric, retries are idempotent and invalid changes roll back',async()=>{
      const request=uuid(),args=[null,JSON.stringify(draft),JSON.stringify(criteria),[M],request]
      final=await rpc(T,'save_final_draft',args)
      const retry=await rpc(T,'save_final_draft',args)
      assert.equal(retry.id,final.id);assert.equal(retry.exercise_id,final.exercise_id)
      assert.equal((await db.query('select count(*)::int n from exercises')).rows[0].n,1)
      await assert.rejects(rpc(T2,'save_final_draft',[final.id,JSON.stringify(draft),JSON.stringify(criteria),[],uuid()]),/unavailable/)
      await assert.rejects(rpc(T,'save_final_draft',[final.id,JSON.stringify(draft),JSON.stringify([{label:'Incomplete',max_points:50}]),[],uuid()]),/total 100/)
      assert.deepEqual((await db.query('select criteria from final_assessments where id=$1',[final.id])).rows[0].criteria,criteria)
      assert.equal((await as(S,()=>db.query('select * from final_assessments'))).rows.length,0)
      await assert.rejects(as(T,()=>db.query('update final_assessments set criteria=$1 where id=$2',[JSON.stringify(criteria),final.id])),/permission denied/)
    })
    await t.test('publication is atomic, requires approved authorized students and preserves supporting material access',async()=>{
      await assert.rejects(rpc(T2,'publish_final_assessment',[final.id,[S],null]),/unavailable/)
      await assert.rejects(rpc(T,'publish_final_assessment',[final.id,[S,PENDING],null]),/access denied/)
      assert.equal((await db.query('select count(*)::int n from exercise_assignments')).rows[0].n,0)
      const privateFinal=await rpc(T,'save_final_draft',[null,JSON.stringify(draft),JSON.stringify(criteria),[PRIVATE_M],uuid()])
      await assert.rejects(rpc(T,'publish_final_assessment',[privateFinal.id,[S,OTHER],null]),/shared with every/)
      assert.equal((await db.query('select published_at from final_assessments where id=$1',[privateFinal.id])).rows[0].published_at,null)
      const due=new Date(Date.now()+86400000).toISOString()
      const published=await rpc(T,'publish_final_assessment',[final.id,[S,S],due])
      assert.equal(published.assignment_count,1)
      assignment=(await db.query('select id from exercise_assignments where exercise_id=$1',[final.exercise_id])).rows[0].id
      const student=(await as(S,()=>db.query('select * from student_finals'))).rows[0]
      assert.equal(student.final_id,final.id);assert.deepEqual(student.questions,[{prompt:draft.questions[0].prompt,options:draft.questions[0].options}])
      assert.equal(student.supporting_materials[0].id,M);assert.equal(student.result_grade,null)
      assert.equal((await as(OTHER,()=>db.query('select * from student_finals'))).rows.length,0)
      assert.equal((await as(PENDING,()=>db.query('select * from student_finals'))).rows.length,0)
      await assert.rejects(as(T,()=>db.query("update exercises set title='Changed after assignment' where id=$1",[final.exercise_id])),/immutable/)
    })
    await t.test('student submits through the shared validated exercise workflow with deterministic retries',async()=>{
      const answers=[{index:0,answer:'Bonjour'}],request=uuid()
      await assert.rejects(rpc(OTHER,'submit_exercise',[assignment,JSON.stringify(answers),request]),/unavailable/)
      await assert.rejects(rpc(S,'submit_exercise',[assignment,'[]',request]),/every question/)
      attempt=(await rpc(S,'submit_exercise',[assignment,JSON.stringify(answers),request])).id
      assert.equal((await rpc(S,'submit_exercise',[assignment,JSON.stringify(answers),request])).id,attempt)
      assert.equal((await as(T,()=>db.query('select answers from exercise_attempts where id=$1',[attempt]))).rows[0].answers[0].answer,'Bonjour')
      assert.equal((await as(S,()=>db.query('select * from student_finals'))).rows[0].attempt_count,1)
    })
    await t.test('private grades and feedback remain inaccessible to students and other teachers until explicit publication',async()=>{
      await assert.rejects(rpc(T2,'save_final_result',[attempt,'[50,30]','Spoofed grade',uuid()]),/access denied/)
      await assert.rejects(rpc(T,'save_final_result',[attempt,'[61,40]','Out of range',uuid()]),/outside its range/)
      await assert.rejects(rpc(T,'save_final_result',[attempt,'[50]','Incomplete',uuid()]),/every criterion/)
      const request=uuid()
      result1=await rpc(T,'save_final_result',[attempt,'[50,30]','Personalize your greeting with a real detail.',request])
      assert.equal(Number(result1.grade),80);assert.equal(result1.revision,1);assert.equal(result1.status,'draft')
      assert.equal((await rpc(T,'save_final_result',[attempt,'[50,30]','Personalize your greeting with a real detail.',request])).id,result1.id)
      await assert.rejects(rpc(T,'save_final_result',[attempt,'[60,40]','Different payload',request]),/already used/)
      assert.equal((await as(S,()=>db.query('select * from final_results'))).rows.length,0)
      assert.equal((await as(T2,()=>db.query('select * from final_results'))).rows.length,0)
      const privateView=(await as(S,()=>db.query('select * from student_finals'))).rows[0]
      assert.equal(privateView.result_id,null);assert.equal(privateView.result_grade,null);assert.equal(privateView.result_feedback,null)
      await assert.rejects(rpc(S,'publish_final_result',[result1.id]),/unavailable/)
      await assert.rejects(rpc(T2,'publish_final_result',[result1.id]),/unavailable/)
      await assert.rejects(as(T,()=>db.query('update final_results set published_at=now() where id=$1',[result1.id])),/permission denied/)
      assert.equal((await rpc(T,'publish_final_result',[result1.id])).status,'published')
      const released=(await as(S,()=>db.query('select * from student_finals'))).rows[0]
      assert.equal(Number(released.result_grade),80);assert.equal(released.result_feedback,'Personalize your greeting with a real detail.')
      assert.equal((await rpc(T,'publish_final_result',[result1.id])).id,result1.id)
    })
    await t.test('required final files use the actual shared reservation, confirmation and attachment submission RPCs',async()=>{
      const requiredFinal=await rpc(T,'save_final_draft',[null,JSON.stringify({...draft,attachment_mode:'required'}),JSON.stringify(criteria),[],uuid()])
      await rpc(T,'publish_final_assessment',[requiredFinal.id,[OTHER],null])
      const requiredAssignment=(await db.query('select id from exercise_assignments where exercise_id=$1',[requiredFinal.exercise_id])).rows[0].id
      const answers=JSON.stringify([{index:0,answer:'Bonjour'}])
      await assert.rejects(rpc(OTHER,'submit_exercise',[requiredAssignment,answers,uuid()]),/requires an attachment/)
      const file=await rpc(OTHER,'reserve_exercise_attachment',[requiredAssignment,'final-response.pdf','application/pdf',256,uuid()])
      // Storage service metadata is represented by a real SQL row, not a live file API.
      await as(OTHER,()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('academic-submissions',$1,$2)",[file.file_path,JSON.stringify({size:256,mimetype:'application/pdf'})]))
      await rpc(OTHER,'confirm_exercise_attachment',[file.id])
      const saved=await rpc(OTHER,'submit_exercise_with_attachments',[requiredAssignment,answers,uuid(),[file.id]])
      const files=(await as(T,()=>db.query('select * from list_exercise_attachments($1)',[requiredAssignment]))).rows
      assert.equal(files[0].id,file.id);assert.equal(files[0].attempt_id,saved.id)
      assert.equal((await as(T2,()=>db.query('select * from list_exercise_attachments($1)',[requiredAssignment]))).rows.length,0)
      const finalView=(await as(OTHER,()=>db.query('select * from student_finals where final_id=$1',[requiredFinal.id]))).rows[0]
      assert.equal(finalView.attachment_mode,'required');assert.equal(finalView.allow_revisions,false)
      await assert.rejects(rpc(OTHER,'revise_exercise_attachments',[saved.id,[file.id],uuid()]),/revisions are disabled/)
    })
    await t.test('new private revisions preserve prior published result and only the newest revision can be released',async()=>{
      const revision2=await rpc(T,'save_final_result',[attempt,'[55,35]','A stronger personal example.',uuid()])
      assert.equal(revision2.revision,2)
      assert.equal(Number((await as(S,()=>db.query('select * from student_finals'))).rows[0].result_grade),80)
      await assert.rejects(rpc(T,'publish_final_result',[result1.id]),/newer assessment revision/)
      await rpc(T,'publish_final_result',[revision2.id])
      assert.equal(Number((await as(S,()=>db.query('select * from student_finals'))).rows[0].result_grade),90)
      assert.equal((await db.query('select count(*)::int n from final_results where attempt_id=$1',[attempt])).rows[0].n,2)
      await db.query("update enrollments set status='suspended' where student_id=$1",[S])
      assert.equal((await as(S,()=>db.query('select * from student_finals'))).rows.length,0)
      await db.exec('set role anon')
      try{await assert.rejects(db.query('select * from student_finals'),/permission denied/)}finally{await db.exec('reset role')}
    })
  }finally{await db.close()}
})
