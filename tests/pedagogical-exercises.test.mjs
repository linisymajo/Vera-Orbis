import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {unifiedAcademicFixture,T,S} from './fixtures/unified-academic-db.mjs'
import {buildPedagogicalExerciseProviderRequest,generatePedagogicalExercise} from '../supabase/functions/academic-ai/pedagogical-exercises.js'
import {createGeminiProvider} from '../supabase/functions/academic-ai/gemini-provider.js'
import {pedagogicalExerciseToStudio} from '../src/lib/pedagogicalExercises.js'
import {createAcademicAIHandler} from '../supabase/functions/academic-ai/handler.js'
const request={mode:'pedagogical_exercise',studentId:S,language:'English',level:'B1',goal:'Everyday communication',duration:60,exerciseType:'fill_blank',lessonNumber:2}
const content=()=>({title:'A friendly request',objective:'Make a polite request',language:'English',level:'B1',steps:['Listen','Repeat','Personalize','Use'].map(stage=>({stage,activity:stage+' a practical polite request.'})),exercise_type:'fill_blank',questions:[{prompt:'Could you ___ me, please?',answer:'help',accepted_answers:['please help'],explanation:'Use help to ask for assistance.',options:[],left:[],right:[],items:[],passage:null}],feedback:null})
test('HTTP generation rejects student tokens and excess confirmed remaining lessons before provider construction',async()=>{
 const config={SUPABASE_URL:'https://iopgzmvaqobigjwibual.supabase.co',SUPABASE_ANON_KEY:'synthetic',ACADEMIC_AI_ARCHITECT_ENABLED:'true',ACADEMIC_AI_PROVIDER:'gemini',ACADEMIC_AI_FREE_TIER_CONFIRMED:'true',ACADEMIC_AI_DATA_MODE:'anonymous_pedagogy_v1',ACADEMIC_AI_CLIENT_SCOPE:'adult_teacher_only',ACADEMIC_AI_ADULT_CLIENT_CONFIRMED:'true',ACADEMIC_AI_ADULT_TEACHER_IDS:T}
 let calls=0,role='teacher'
 const client={auth:{getUser:async()=>({data:{user:{id:T}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:T}})})})}),rpc:async name=>({data:name==='get_my_enrollment'?{student_id:T,role,email_verified:true,academic_access:true,adult_admitted:true}:name==='verify_adult_teacher_eligibility'?{teacher_id:T,adult_verified:true}:{review:{settings:{confirmed:true,total:12,completed:5}}}})}
 const handler=createAcademicAIHandler({env:k=>config[k],createClient:()=>client,geminiProviderFactory:()=>{calls++;throw Error('Must not construct provider')}})
 const input={mode:'learning_architect',studentId:S,requestId:crypto.randomUUID(),language:'English',level:'B1',goal:'Everyday communication',classes:8,duration:60,regenerate:null}
 const send=()=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify(input)}))
 assert.equal((await send()).status,422);assert.equal(calls,0)
 role='student';assert.equal((await send()).status,403);assert.equal(calls,0)
})
test('official Gemini SDK exercise outbound bytes contain only fixed pedagogical inputs',async()=>{
 let count=0
 const provider=createGeminiProvider({apiKey:'synthetic-invalid',fetchImpl:async(resource,options)=>{count++;const body=JSON.parse(options.body),text=JSON.stringify(body);for(const marker of [S,'PRIVATE_CANARY','secret@example.test','private.docx'])assert.ok(!text.includes(marker));const input=JSON.parse(body.contents[0].parts[0].text);assert.deepEqual(Object.keys(input).sort(),['language','cefr_level','communicative_objective','lesson_count','class_duration_minutes','practice_areas','exercise_type','lesson_number'].sort());return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(content())}]}}],usageMetadata:{promptTokenCount:200,candidatesTokenCount:300}})}})
 const result=await provider(request,{name:'PRIVATE_CANARY',email:'secret@example.test',file:'private.docx'})
 assert.equal(result.content.title,content().title);assert.equal(count,1)
 for(const patch of [{goal:'A PRIVATE_CANARY request'},{exerciseType:'listening'},{studentId:'bad'}])assert.throws(()=>buildPedagogicalExerciseProviderRequest({...request,...patch}))
})
test('real local SQL persists variants privately, rejects student inference, and Studio retains editable keys',async()=>{
 const f=await unifiedAcademicFixture(),{db,rpc,client}=f
 try{
  await db.exec("create role service_role bypassrls;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema public to service_role")
  for(const name of ['0018_student_attachments.sql','0021_final_assessments.sql','0029_personal_learning_journey.sql','0030_student_management.sql','0031_student_account_deletion.sql','0032_adult_only_admission.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
  let calls=0
  const provider=async()=>{calls++;return{content:content(),inputTokens:200,outputTokens:300}}
  await assert.rejects(generatePedagogicalExercise(client(S),request,provider))
  assert.equal(calls,0)
  const row=await generatePedagogicalExercise(client(T),request,provider)
  assert.equal(row.status,'draft');assert.equal(calls,1)
  const saved=(await db.query('select * from ai_academic_drafts where id=$1',[row.id])).rows[0]
  assert.deepEqual(saved.accepted_variants,[['please help']])
  assert.equal(pedagogicalExerciseToStudio(saved).questions[0].accepted_answers[0],'please help')
  assert.equal((await f.as(S,tx=>tx.query('select * from ai_academic_drafts'))).rows.length,0)
  assert.equal((await db.query('select count(*)::int n from exercise_assignments')).rows[0].n,0)
  await rpc(S,'set_academic_ai_consent',{p_allowed:false})
  await assert.rejects(generatePedagogicalExercise(client(T),request,provider))
  assert.equal(calls,1)
 }finally{await db.close()}
})
