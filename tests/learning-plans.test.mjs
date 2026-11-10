import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import {
  newLearningObjective,validateLearningPlan,createLearningPlanVersion,saveLearningPlanVersion,
  approveLearningPlanVersion,setLearningObjectiveCompletion,generateLearningPlanDraft,
} from '../src/lib/learningPlans.js'
import { STAGES } from '../supabase/functions/academic-ai/core.js'

const T='10000000-0000-4000-8000-000000000001',T2='10000000-0000-4000-8000-000000000002'
const S='20000000-0000-4000-8000-000000000001',S2='20000000-0000-4000-8000-000000000002',PENDING='20000000-0000-4000-8000-000000000003'
const ID='30000000-0000-4000-8000-000000000001'
function complete(content){
  return {...content,title:'Practical conversations',language:'English',level:'A2',summary:'Use friendly expressions in familiar situations.',
    objectives:content.objectives.map(o=>({...o,title:'Tell a short personal story',success_criteria:'Tell a one-minute story using three useful expressions.',
      steps:STAGES.map(stage=>({stage,activity:stage+' a short personal story with useful expressions.'}))}))}
}
function aiContent(){return {
  title:'AI conversational plan',objective:'Tell a personal story using useful expressions',language:'English',level:'A2',
  steps:STAGES.map(stage=>({stage,activity:stage+' a practical story.'})),exercise_type:null,questions:[],feedback:null,
}}

test('learning plans permit incomplete private drafts but require meaningful complete objectives before approval',()=>{
  const draft={title:'Learning plan',language:'English',level:'A2',summary:'',objectives:[newLearningObjective()]}
  assert.doesNotThrow(()=>validateLearningPlan(draft))
  assert.throws(()=>validateLearningPlan(draft,{complete:true}),/complete/)
  assert.doesNotThrow(()=>validateLearningPlan(complete(draft),{complete:true}))
  for(const content of [
    {...draft,extra:'published'},
    {...draft,title:'<script>unsafe()</script>'},
    {...draft,objectives:[draft.objectives[0],draft.objectives[0]]},
    {...draft,objectives:[{...draft.objectives[0],steps:[...draft.objectives[0].steps].reverse()}]},
  ])assert.throws(()=>validateLearningPlan(content))
})

test('learning plan client confirms persisted revisions, approvals and objective records',async()=>{
  const calls=[]
  const client={rpc:async(name,args)=>{
    calls.push({name,args})
    if(name==='create_learning_plan_version')return {data:{id:ID,student_id:S,status:'draft',version_number:1}}
    if(name==='save_learning_plan_version')return {data:{id:ID,status:'draft',revision:2}}
    if(name==='approve_learning_plan_version')return {data:{id:ID,status:'approved',revision:3,approved_at:'2026-11-08T10:00:00Z'}}
    return {data:{version_id:ID,objective_id:ID,completed:true,revision:1}}
  }}
  await createLearningPlanVersion(client,{studentId:S,requestId:ID})
  const content=complete({objectives:[newLearningObjective()]})
  await saveLearningPlanVersion(client,{id:ID,revision:1,content})
  await approveLearningPlanVersion(client,{id:ID,revision:2})
  await setLearningObjectiveCompletion(client,{versionId:ID,objectiveId:ID,revision:0,completed:true,requestId:ID})
  assert.equal(calls[1].args.p_expected_revision,1)
  assert.equal(calls[2].args.p_expected_revision,2)
  assert.equal(calls[3].args.p_expected_revision,0)
  const missing={rpc:async()=>({data:{}})}
  await assert.rejects(createLearningPlanVersion(missing,{studentId:S,requestId:ID}),/confirmed/)
  await assert.rejects(saveLearningPlanVersion(missing,{id:ID,revision:1,content}),/confirmed/)
  await assert.rejects(approveLearningPlanVersion(missing,{id:ID,revision:2}),/confirmed/)
  await assert.rejects(setLearningObjectiveCompletion(missing,{versionId:ID,objectiveId:ID,revision:0,completed:true}),/confirmed/)
})

test('AI generation remains the configured server integration and never implicitly imports or approves a plan version',async()=>{
  let request,calls=0
  const draft={id:ID,student_id:S,kind:'learning_plan',status:'draft',content:aiContent()}
  const client={functions:{invoke:async(name,args)=>{request={name,...args};return {data:{draft}}}},rpc:async()=>{calls++;throw new Error('Unexpected plan write')}}
  assert.equal((await generateLearningPlanDraft(client,{studentId:S,brief:'Practice storytelling.'})).id,ID)
  assert.equal(request.name,'academic-ai')
  assert.equal(request.body.kind,'learning_plan')
  assert.equal(calls,0)
  await assert.rejects(generateLearningPlanDraft({functions:{invoke:async()=>({error:{message:'Provider disabled'}})}},{studentId:S,brief:'Practice'}),/disabled/)
})

test('actual PostgreSQL learning plan versions: approval, immutable history, concurrency, consent-aware AI context and audited progress',async t=>{
  const db=new PGlite()
  async function as(user,work,role='authenticated'){
    await db.exec('set role '+role)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??''])
    try{return await work()}finally{await db.exec('reset role')}
  }
  async function rpc(user,name,args=[]){return (await as(user,()=>db.query('select '+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args))).rows[0].result}
  async function create(user,student,base=null,source=null,request=crypto.randomUUID()){return rpc(user,'create_learning_plan_version',[student,base,source,request])}
  async function save(user,version,content){return rpc(user,'save_learning_plan_version',[version.id,version.revision,JSON.stringify(content)])}
  const rows=async(user,table)=>(await as(user,()=>db.query('select * from '+table))).rows
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to authenticated,anon;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text);
      grant select on public.teachers to authenticated;
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);
      create table public.inbox_messages(id uuid primary key,recipient_id uuid,is_read boolean,read_at timestamptz,updated_at timestamptz);`)
    for(const id of [T,T2,S,S2,PENDING])await db.query("insert into auth.users values($1,$2,now(),'{}')",[id,id+'@example.invalid'])
    await db.query('insert into teachers values($1),($2)',[T,T2])
    for(const id of [S,S2,PENDING])await db.query("insert into profiles values($1,'Authorized student')",[id])
    for(const file of ['0004_exercise_studio.sql','0009_academic_sync_challenges_feedback.sql','0012_exercise_workflow.sql','0013_hybrid_enrollment.sql','0014_ai_drafts.sql','0019_learning_plans.sql']){
      await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
    }
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2",[T,S])
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2",[T2,S2])
    await db.query("update enrollments set source='self',status='pending',teacher_id=null where student_id=$1",[PENDING])
    await db.query("update profiles set language='English',level='A2',goal='Travel conversations' where id=$1",[S])
    const sourceRequest=(await db.query("insert into academic_ai_requests(teacher_id,student_id,kind,status) values($1,$2,'learning_plan','succeeded') returning id",[T,S])).rows[0].id
    const ai=(await db.query("insert into ai_academic_drafts(request_id,teacher_id,student_id,kind,content) values($1,$2,$3,'learning_plan',$4) returning id",[sourceRequest,T,S,JSON.stringify(aiContent())])).rows[0].id
    const ownRequest=crypto.randomUUID()
    let draft,approved,v2,otherDraft
    await t.test('only the authorized author creates private drafts, and retries reuse the saved version',async()=>{
      await assert.rejects(create(T2,S),/Authorized teacher/)
      await assert.rejects(create(S,S),/Authorized teacher/)
      await assert.rejects(create(T,PENDING),/Authorized teacher/)
      draft=await create(T,S,null,null,ownRequest)
      assert.equal(draft.status,'draft')
      assert.equal(draft.version_number,1)
      assert.equal((await create(T,S,null,null,ownRequest)).id,draft.id)
      await assert.rejects(create(T,S,null,ai,ownRequest),/another plan source/)
      assert.equal((await rows(T,'learning_plan_versions')).length,1)
      assert.equal((await rows(T2,'learning_plan_versions')).length,0)
      assert.equal((await rows(S,'learning_plan_versions')).length,0)
      assert.equal((await rows(PENDING,'learning_plan_versions')).length,0)
      await assert.rejects(as(S,()=>db.query('insert into learning_plan_versions(teacher_id,student_id,version_number,content,request_id) values($1,$2,9,$3,gen_random_uuid())',[T,S,JSON.stringify(draft.content)])),/permission denied/)
    })
    await t.test('saving rejects stale edits and approval requires a complete saved methodology',async()=>{
      await assert.rejects(rpc(T,'approve_learning_plan_version',[draft.id,draft.revision]),/Complete each objective/)
      const initial=draft
      draft=await save(T,draft,complete(draft.content))
      assert.equal(draft.revision,2)
      await assert.rejects(save(T,initial,{...complete(initial.content),title:'STALE EDIT'}),/changed/)
      assert.equal((await db.query('select content from learning_plan_versions where id=$1',[draft.id])).rows[0].content.title,'Practical conversations')
      await assert.rejects(rpc(T2,'approve_learning_plan_version',[draft.id,draft.revision]),/unavailable/)
      approved=await rpc(T,'approve_learning_plan_version',[draft.id,draft.revision])
      assert.equal(approved.status,'approved')
      assert.ok(approved.approved_at)
      assert.equal((await rows(S,'learning_plan_versions')).length,1)
      await assert.rejects(save(T,approved,complete(approved.content)),/immutable/)
      await assert.rejects(db.query("update learning_plan_versions set content=jsonb_set(content,'{title}','\"Unauthorized historical change\"') where id=$1",[approved.id]),/immutable/)
      await assert.rejects(db.query('delete from learning_plan_versions where id=$1',[approved.id]),/immutable/)
    })
    await t.test('new versions preserve approved history and concurrent drafts cannot silently replace a newly approved version',async()=>{
      v2=await create(T,S,approved.id)
      otherDraft=await create(T,S,approved.id)
      assert.equal(v2.version_number,2)
      assert.equal(otherDraft.version_number,3)
      assert.equal(v2.base_version_id,approved.id)
      assert.deepEqual(v2.content,approved.content)
      v2=await save(T,v2,{...v2.content,title:'Updated second version'})
      v2=await rpc(T,'approve_learning_plan_version',[v2.id,v2.revision])
      await assert.rejects(rpc(T,'approve_learning_plan_version',[otherDraft.id,otherDraft.revision]),/approved plan changed/)
      const original=(await db.query('select * from learning_plan_versions where id=$1',[approved.id])).rows[0]
      assert.deepEqual(original.content,approved.content)
      assert.equal(original.revision,approved.revision)
      assert.equal((await rows(S,'learning_plan_versions')).length,2)
      assert.equal((await db.query('select status from learning_plan_versions where id=$1',[otherDraft.id])).rows[0].status,'draft')
      await assert.rejects(create(T2,S2,approved.id),/source version unavailable/)
    })
    await t.test('AI drafts are imported only by explicit authorized action and still need teacher completion and approval',async()=>{
      const before=(await db.query('select count(*)::int n from learning_plan_versions')).rows[0].n
      assert.equal(before,3)
      const imported=await create(T,S,null,ai)
      assert.equal(imported.source_ai_draft_id,ai)
      assert.equal(imported.status,'draft')
      assert.equal(imported.content.title,aiContent().title)
      assert.equal(imported.content.objectives[0].success_criteria,'')
      await assert.rejects(rpc(T,'approve_learning_plan_version',[imported.id,imported.revision]),/criteria/)
      await assert.rejects(create(T2,S2,null,ai),/AI learning draft unavailable/)
      assert.equal((await rows(S,'learning_plan_versions')).length,2)
    })
    await t.test('objective completion is version-specific, authorized, optimistic and idempotently audited',async()=>{
      const objective=approved.content.objectives[0].id
      const request=crypto.randomUUID()
      await assert.rejects(rpc(S,'set_learning_objective_completion',[otherDraft.id,objective,0,true,request]),/Approved learning plan unavailable/)
      await assert.rejects(rpc(T2,'set_learning_objective_completion',[approved.id,objective,0,true,request]),/unavailable/)
      await assert.rejects(rpc(S2,'set_learning_objective_completion',[approved.id,objective,0,true,request]),/unavailable/)
      const progress=await rpc(S,'set_learning_objective_completion',[approved.id,objective,0,true,request])
      assert.equal(progress.revision,1)
      assert.equal(progress.updated_by,S)
      const retry=await rpc(S,'set_learning_objective_completion',[approved.id,objective,0,true,request])
      assert.equal(retry.revision,1)
      assert.equal((await rows(S,'learning_plan_objective_events')).length,1)
      await assert.rejects(rpc(S,'set_learning_objective_completion',[approved.id,objective,0,false,request]),/another completion/)
      await assert.rejects(rpc(T,'set_learning_objective_completion',[approved.id,objective,0,false,crypto.randomUUID()]),/progress changed/)
      const reopened=await rpc(T,'set_learning_objective_completion',[approved.id,objective,1,false,crypto.randomUUID()])
      assert.equal(reopened.revision,2)
      assert.equal(reopened.updated_by,T)
      assert.equal((await rows(S,'learning_plan_objective_events')).length,2)
      assert.equal((await rows(S2,'learning_plan_objective_events')).length,0)
      assert.equal((await rows(T2,'learning_plan_objective_progress')).length,0)
      assert.equal((await db.query('select * from learning_plan_objective_progress where version_id=$1',[v2.id])).rows.length,0)
      await assert.rejects(as(S,()=>db.query("update learning_plan_objective_progress set completed=true")),/permission denied/)
      assert.deepEqual((await db.query('select content from learning_plan_versions where id=$1',[approved.id])).rows[0].content,approved.content)
    })
    await t.test('AI retrieval uses the latest approved plan version and remains consent-gated',async()=>{
      await assert.rejects(rpc(T,'get_academic_ai_context',[S,null]),/consent/)
      await rpc(S,'set_academic_ai_consent',[true])
      await db.query("update ai_academic_drafts set status='approved',reviewed_at=now() where id=$1",[ai])
      const context=await rpc(T,'get_academic_ai_context',[S,null])
      assert.equal(context.approved_plan.version,v2.version_number)
      assert.match(context.approved_plan.content,/Updated second version/)
      assert.equal(context.approved_plan.content.includes('AI conversational plan'),false)
      assert.equal(context.approved_plan.content.includes('STALE EDIT'),false)
      await rpc(S,'set_academic_ai_consent',[false])
      await assert.rejects(rpc(T,'get_academic_ai_context',[S,null]),/consent/)
    })
    await t.test('migration replay preserves approved content, drafts and audit events; suspended/anonymous access fails',async()=>{
      const plansBefore=(await db.query('select * from learning_plan_versions order by id')).rows
      const eventsBefore=(await db.query('select * from learning_plan_objective_events order by id')).rows
      await db.exec(readFileSync(new URL('../supabase/migrations/0019_learning_plans.sql',import.meta.url),'utf8'))
      assert.deepEqual((await db.query('select * from learning_plan_versions order by id')).rows,plansBefore)
      assert.deepEqual((await db.query('select * from learning_plan_objective_events order by id')).rows,eventsBefore)
      await db.query("update enrollments set status='suspended' where student_id=$1",[S])
      assert.equal((await rows(S,'learning_plan_versions')).length,0)
      assert.equal((await rows(T,'learning_plan_versions')).length,0)
      await assert.rejects(rpc(S,'set_learning_objective_completion',[approved.id,approved.content.objectives[0].id,2,true,crypto.randomUUID()]),/unavailable/)
      await assert.rejects(as(null,()=>db.query('select * from learning_plan_versions'),'anon'),/permission denied/)
      await assert.rejects(as(null,()=>db.query('select create_learning_plan_version($1)',[S]),'anon'),/permission denied/)
    })
  }finally{await db.close()}
})
