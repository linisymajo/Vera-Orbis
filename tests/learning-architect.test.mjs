import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { STAGES } from '../supabase/functions/academic-ai/core.js'
import { validateArchitectRequest, validateArchitectCourse, architectCourseToPlan, buildArchitectProviderRequest, generateLearningArchitect } from '../supabase/functions/academic-ai/learning-architect.js'
import { validateLearningPlan } from '../src/lib/learningPlans.js'
import { createGeminiProvider } from '../supabase/functions/academic-ai/gemini-provider.js'
const T='10000000-0000-4000-8000-000000000001',T2='10000000-0000-4000-8000-000000000002',S='20000000-0000-4000-8000-000000000001',S2='20000000-0000-4000-8000-000000000002'
const request=()=>({mode:'learning_architect',studentId:S,requestId:crypto.randomUUID(),language:'French',level:'A2',goal:'Travel and cultural exchange',classes:2,duration:60,regenerate:null})
import { syntheticCourse } from './fixtures/architect-course.mjs'


test('architect contracts enforce selected settings, complete session structures, time budgets and bounded plain text',()=>{
 const r=request(),c=syntheticCourse();validateArchitectRequest(r);validateArchitectCourse(c,r)
 const p=architectCourseToPlan(c,r,{});validateLearningPlan(p,{complete:true});assert.equal(p.architect.provisional,true);assert.ok(p.architect.missing.includes('Initial assessment'))
 for(const x of[{...r,classes:13},{...r,duration:0},{...r,language:'Spanish'},{...r,goal:'<script>bad</script>'},{...r,requestId:'bad'}])assert.throws(()=>validateArchitectRequest(x))
 for(const mutate of[c=>c.sessions[0].minutes[0]=25,c=>c.sessions[0].steps.reverse(),c=>c.language='English',c=>c.sessions.pop(),c=>c.sessions[0].power_expressions=[]]){const bad=syntheticCourse();mutate(bad);assert.throws(()=>validateArchitectCourse(bad,r))}
 const body=buildArchitectProviderRequest(r,{profile:{level:'A2'}},'approved-model');assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.ok(!body.input.includes(S));assert.ok(body.instructions.includes('Power Expressions'));assert.ok(body.max_output_tokens<=12000)
})


test('orchestrator refuses unauthorized context before any provider use, handles persistence failures and reuses completed requests',async()=>{
 let calls=0,failed=0;const r=request(),version={id:crypto.randomUUID(),student_id:S,status:'draft',content:architectCourseToPlan(syntheticCourse(),r,{})}
 await assert.rejects(generateLearningArchitect({rpc:async()=>({error:{code:'42501'}})},r,async()=>{calls++}),/Authorized teacher/);assert.equal(calls,0)
 const cached={rpc:async name=>({data:name==='get_learning_architect_profile'?{ai_consent:true}:{version}})}
 assert.equal((await generateLearningArchitect(cached,r,async()=>{calls++})).id,version.id);assert.equal(calls,0)
 const client={rpc:async name=>name==='get_learning_architect_profile'?{data:{ai_consent:true}}:name==='reserve_learning_architect_request'?{data:{request_id:crypto.randomUUID()}}:name==='fail_academic_ai_request'?(failed++,{data:true}):{error:{code:'XX000'}}}
 await assert.rejects(generateLearningArchitect(client,r,async()=>({content:syntheticCourse(),inputTokens:100,outputTokens:1000})),/confirmed/);assert.equal(failed,1)
})

test('session regeneration omits saved text and private course progression and preserves other saved sessions',async()=>{
 const r=request(),plan=architectCourseToPlan(syntheticCourse(),r,{}),id=crypto.randomUUID(),run=crypto.randomUUID();r.regenerate={versionId:id,revision:3,session:1}
 const client={rpc:async(name,args)=>{
   if(name==='get_learning_architect_profile')return{data:{ai_consent:true}}
   if(name==='reserve_learning_architect_request')return{data:{request_id:run}}
   if(name==='get_learning_architect_draft')return{data:{id,student_id:S,status:'draft',revision:3,content:plan}}
   if(name==='complete_learning_architect_request'){assert.deepEqual(args.p_content.objectives[0],plan.objectives[0]);assert.deepEqual(args.p_content.architect.sessions[0],plan.architect.sessions[0]);assert.equal(args.p_content.objectives[1].id,plan.objectives[1].id);return{data:{id,student_id:S,status:'draft',content:args.p_content}}}
   throw Error('Unexpected persistence operation')
 }}
 const saved=await generateLearningArchitect(client,r,async(req,context)=>{assert.equal(context.saved_course,undefined);assert.ok(!JSON.stringify(context).includes('Travel story 2'));assert.ok(!JSON.stringify(context).includes(plan.objectives[0].id));const session=syntheticCourse().sessions[1];session.title='Adapted story';return{content:session,inputTokens:100,outputTokens:500}})
 assert.equal(saved.content.architect.sessions[1].title,'Adapted story')
})

test('actual PostgreSQL architect workflow preserves manual plans, private approval, publication, history, RLS and regeneration revisions',async t=>{
 const db=new PGlite();const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn()}finally{await db.exec('reset role')}}
 const rpc=async(user,name,args=[])=>(await as(user,()=>db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args))).rows[0].result
 const visible=async user=>(await as(user,()=>db.query('select * from public.learning_plan_versions'))).rows
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to authenticated,anon;
 create table public.teachers(id uuid primary key references auth.users(id));create table public.profiles(id uuid primary key references auth.users(id),name text);
 grant select on public.teachers to authenticated;create table storage.objects(id uuid primary key,bucket_id text);
 create table public.inbox_messages(id uuid primary key,recipient_id uuid,is_read boolean,read_at timestamptz,updated_at timestamptz);
 create table public.onboarding_responses(student_id uuid,learning_goals text);
 create table public.classes(id uuid primary key,teacher_id uuid,starts_at timestamptz,status text);
 create table public.class_participants(class_id uuid,student_id uuid,teacher_id uuid);`)
 for(const id of[T,T2,S,S2])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,'synthetic@example.test'])
 await db.query('insert into teachers values($1),($2)',[T,T2]);await db.query("insert into profiles values($1,'Synthetic'),($2,'Other synthetic')",[S,S2])
 for(const file of['0004_exercise_studio.sql','0009_academic_sync_challenges_feedback.sql','0012_exercise_workflow.sql','0013_hybrid_enrollment.sql','0014_ai_drafts.sql','0019_learning_plans.sql','0025_learning_architect.sql','0026_learning_architect_twelve_classes.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
 await db.query("update enrollments set teacher_id=$1,source='self' where student_id=$2",[T,S]);await db.query("update enrollments set teacher_id=$1,source='self' where student_id=$2",[T2,S2]);await db.query("update profiles set language='French',level='A2',goal='Travel stories' where id=$1",[S])
 await t.test('student consent and assigned teacher remain mandatory',async()=>{await assert.rejects(rpc(T,'get_learning_architect_context',[S]),/consent/);await rpc(S,'set_academic_ai_consent',[true]);await assert.rejects(rpc(T2,'get_learning_architect_context',[S]),/teacher|access/i);const ctx=await rpc(T,'get_learning_architect_context',[S]);assert.equal(ctx.profile.level,'A2');assert.ok(!JSON.stringify(ctx).includes('Synthetic'));assert.equal(ctx.assessment,null)})
 const r=request(),content=architectCourseToPlan(syntheticCourse(),r,{});let run,v
 await t.test('request retries do not reserve twice; generated versions are private drafts',async()=>{run=await rpc(T,'reserve_learning_architect_request',[S,r.requestId,JSON.stringify(r)]);await assert.rejects(rpc(T,'reserve_learning_architect_request',[S,r.requestId,JSON.stringify(r)]),/already handled/);v=await rpc(T,'complete_learning_architect_request',[run.request_id,JSON.stringify(content),100,3000]);assert.equal(v.status,'draft');assert.equal((await visible(S)).length,0);assert.equal((await visible(T2)).length,0);assert.equal((await rpc(T,'reserve_learning_architect_request',[S,r.requestId,JSON.stringify(r)])).version.id,v.id)})
 await t.test('regeneration cannot modify another session and stale edits are protected',async()=>{
  const rr={...request(),regenerate:{versionId:v.id,revision:v.revision,session:0}},rrun=await rpc(T,'reserve_learning_architect_request',[S,rr.requestId,JSON.stringify(rr)])
  const bad=structuredClone(v.content);bad.objectives[1].title='Unapproved unrelated change';await assert.rejects(rpc(T,'complete_learning_architect_request',[rrun.request_id,JSON.stringify(bad),100,1000]),/only the selected session/)
  const changed=structuredClone(v.content);changed.objectives[0].title='Tell a new personal travel story';v=await rpc(T,'complete_learning_architect_request',[rrun.request_id,JSON.stringify(changed),100,1000]);assert.equal(v.content.objectives[1].title,content.objectives[1].title)
  await assert.rejects(rpc(T,'get_learning_architect_draft',[v.id,v.revision-1]),/Reload/)
 })
 await t.test('approval is private until explicit idempotent publication; history is immutable',async()=>{v=await rpc(T,'approve_learning_plan_version',[v.id,v.revision]);assert.equal((await visible(S)).length,0);await assert.rejects(rpc(T2,'publish_learning_architect_plan',[v.id]),/unavailable/);const p=await rpc(T,'publish_learning_architect_plan',[v.id]);assert.equal((await rpc(T,'publish_learning_architect_plan',[v.id])).published_at,p.published_at);assert.equal((await visible(S)).length,1);assert.equal((await visible(S2)).length,0);await assert.rejects(rpc(T,'save_learning_plan_version',[v.id,v.revision,JSON.stringify(content)]),/immutable/);const copy=await rpc(T,'create_learning_plan_version',[S,v.id,null,crypto.randomUUID()]);assert.equal(copy.status,'draft');assert.equal((await visible(S)).length,1)})
 await t.test('manual plans retain their existing approval visibility and anonymous calls are denied',async()=>{let m=await rpc(T,'create_learning_plan_version',[S,null,null,crypto.randomUUID()]);const manual=structuredClone(content);delete manual.architect;m=await rpc(T,'save_learning_plan_version',[m.id,m.revision,JSON.stringify(manual)]);await rpc(T,'approve_learning_plan_version',[m.id,m.revision]);assert.equal((await visible(S)).length,2);await db.exec('set role anon');try{await assert.rejects(db.query('select publish_learning_architect_plan($1)',[v.id]),/permission denied/)}finally{await db.exec('reset role')}})
  await t.test('twelve classes validate and persist; extra classes, duplicates and invalid last lessons fail',async()=>{
    const r12={...request(),classes:12},course=syntheticCourse();course.sessions=Array.from({length:12},(_,i)=>({...structuredClone(course.sessions[i%2]),title:'Lesson '+(i+1)}));
    validateArchitectRequest(r12);validateArchitectCourse(course,r12);const plan=architectCourseToPlan(course,r12,{});validateLearningPlan(plan,{complete:true});
    const validate=x=>db.query('select public._validate_learning_plan_content($1,true)',[JSON.stringify(x)]);
    await validate(plan);
    const duplicate=structuredClone(plan);duplicate.objectives[11].id=duplicate.objectives[0].id;await assert.rejects(validate(duplicate),/repeated/);
    const invalid=structuredClone(plan);invalid.architect.sessions[11].minutes=[1,1,1,1];await assert.rejects(validate(invalid),/duration/);
    const manual=structuredClone(plan);delete manual.architect;assert.throws(()=>validateLearningPlan(manual,{complete:true}));await assert.rejects(validate(manual),/ten objectives/);
    const tooMany=structuredClone(plan);tooMany.objectives.push({...plan.objectives[0],id:crypto.randomUUID()});tooMany.architect.sessions.push(plan.architect.sessions[0]);await assert.rejects(validate(tooMany),/twelve/);
    let version=await rpc(T,'create_learning_plan_version',[S,null,null,crypto.randomUUID()]);version=await rpc(T,'save_learning_plan_version',[version.id,version.revision,JSON.stringify(plan)]);
    version.content.architect.sessions[11].title='Edited final lesson';version=await rpc(T,'save_learning_plan_version',[version.id,version.revision,JSON.stringify(version.content)]);
    version=await rpc(T,'approve_learning_plan_version',[version.id,version.revision]);await rpc(T,'publish_learning_architect_plan',[version.id]);assert.equal(version.content.architect.sessions[11].title,'Edited final lesson');assert.equal(version.content.objectives.length,12);
  })
  await t.test('consent revocation after reservation blocks completion without corrupting plans; failed attempts consume quota',async()=>{
    const rr=request(),reserved=await rpc(T,'reserve_learning_architect_request',[S,rr.requestId,JSON.stringify(rr)]),before=(await db.query('select count(*)::int n from learning_plan_versions')).rows[0].n
    await rpc(S,'set_academic_ai_consent',[false]);await assert.rejects(rpc(T,'complete_learning_architect_request',[reserved.request_id,JSON.stringify(content),100,1000]),/consent/)
    assert.equal((await db.query('select count(*)::int n from learning_plan_versions')).rows[0].n,before);await rpc(T,'fail_academic_ai_request',[reserved.request_id]);await rpc(S,'set_academic_ai_consent',[true])
    const next=request();await assert.rejects(rpc(T,'reserve_learning_architect_request',[S,next.requestId,JSON.stringify(next)]),/ai_rate_limit/)
    const context=await rpc(T,'get_learning_architect_context',[S]);assert.ok(!JSON.stringify(context.approved_plan).includes('"id"'));assert.ok(!JSON.stringify(context).includes('expected_answer'))
  })
 }finally{await db.close()}
})

test('HTTP architect activation requires confirmed free-tier synthetic scope and never enables other AI agents',async()=>{
 const{createAcademicAIHandler}=await import('../supabase/functions/academic-ai/handler.js');const config={SUPABASE_URL:'https://duinvkphfnugoyvvlbbq.supabase.co',SUPABASE_ANON_KEY:'public-test',ACADEMIC_AI_PROVIDER:'gemini',ACADEMIC_AI_ARCHITECT_ENABLED:'true',ACADEMIC_AI_DATA_MODE:'synthetic_only',ACADEMIC_AI_SYNTHETIC_STUDENT_IDS:S};let calls=0
 const client={auth:{getUser:async()=>({data:{user:{id:T}}})},rpc:async()=>({error:{code:'42501'}})}
 const handler=createAcademicAIHandler({env:k=>config[k],createClient:()=>client,geminiProviderFactory:()=>{calls++;return()=>{throw Error('No live provider allowed in this test')}}})
 const send=input=>handler(new Request('https://function.invalid',{method:'POST',headers:{Authorization:'Bearer test-session','Content-Type':'application/json'},body:JSON.stringify(input)}))
 assert.equal((await send(request())).status,503);assert.equal(calls,0);config.ACADEMIC_AI_FREE_TIER_CONFIRMED='true';assert.equal((await send(request())).status,403);assert.equal(calls,0)
 assert.equal((await send({kind:'challenge',studentId:S,brief:'Practice a short story.'})).status,503);assert.equal(calls,0)
})
