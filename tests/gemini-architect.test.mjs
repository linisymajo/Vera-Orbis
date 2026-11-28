import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createGeminiProvider,GEMINI_ARCHITECT_MODEL} from '../supabase/functions/academic-ai/gemini-provider.js'
import {syntheticCourse} from './fixtures/architect-course.mjs'
import {validateArchitectCourse, buildArchitectProviderRequest} from '../supabase/functions/academic-ai/learning-architect.js'
const require=createRequire(new URL('../supabase/functions/academic-ai/package.json',import.meta.url))
const {GoogleGenAI}=require('@google/genai')
const S='20000000-0000-4000-8000-000000000001'
const request={mode:'learning_architect',studentId:S,requestId:crypto.randomUUID(),language:'French',level:'A2',goal:'Travel and cultural exchange',classes:2,duration:60,regenerate:null}
const result=(overrides={})=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(syntheticCourse())}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:1500,thoughtsTokenCount:100},...overrides})

test('official Google GenAI SDK constructs fixed-endpoint structured requests with no tools or automatic retries',async()=>{
 let calls=0
 const provider=createGeminiProvider({apiKey:'synthetic-key-never-valid',GoogleGenAI,fetchImpl:async(resource,options)=>{
   calls++;const url=new URL(typeof resource==='string'?resource:resource.url||resource.toString());assert.equal(url.origin,'https://generativelanguage.googleapis.com');assert.equal(url.search,'');assert.ok(!url.toString().includes('synthetic-key'))
   const b=JSON.parse(options.body);assert.equal(b.generationConfig.responseMimeType,'application/json');assert.equal(b.generationConfig.candidateCount,1);assert.equal(b.generationConfig.responseJsonSchema.additionalProperties,false);assert.equal(b.tools,undefined);assert.ok(b.generationConfig.maxOutputTokens<=12000);assert.ok(!JSON.stringify(b).includes(S));return Response.json(result())
 }})
 const output=await provider(request,{profile:{level:'A2'}});assert.equal(calls,1);assert.equal(output.outputTokens,1600);assert.deepEqual(output.content,syntheticCourse())
})

test('Gemini quota, malformed JSON, refusals, truncation, oversized output and missing usage produce safe failures',async()=>{
 const cases=[
  ()=>new Response('private provider details',{status:429}),
  ()=>Response.json(result({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]})),
  ()=>Response.json(result({promptFeedback:{blockReason:'SAFETY'}})),
  ()=>Response.json(result({candidates:[{finishReason:'STOP',content:{parts:[{text:'not JSON'}]}}]})),
  ()=>Response.json(result({usageMetadata:{}})),
  ()=>Response.json(result({candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'unsafe'}}]}}]})),
  ()=>Response.json({text:'x'.repeat(250000)}),
 ]
 for(let i=0;i<cases.length;i++){
  let calls=0;const provider=createGeminiProvider({apiKey:'synthetic-key',GoogleGenAI,fetchImpl:async()=>{calls++;return cases[i]()}})
  await assert.rejects(provider(request,{}),error=>{assert.ok(!error.message.includes('private provider'));if(i===0)assert.equal(error.status,429);return true});assert.equal(calls,1)
 }
 assert.throws(()=>createGeminiProvider({apiKey:'synthetic',model:'gemini-unreviewed-expensive'}),/reviewed/)
 assert.throws(()=>createGeminiProvider({}),/GEMINI_API_KEY/)
})


test('official SDK deadline aborts its transport without retries or leaking its error',async()=>{
 let calls=0
 const provider=createGeminiProvider({apiKey:'synthetic-key',GoogleGenAI,timeoutMs:10,fetchImpl:async(_url,options)=>{
   calls++;assert.ok(options.signal)
   return new Promise((_resolve,reject)=>{const stop=()=>reject(Error('private transport abort detail'));if(options.signal.aborted)stop();else options.signal.addEventListener('abort',stop,{once:true})})
 }})
 await assert.rejects(provider(request,{}),error=>error.status===502&&!error.message.includes('private transport'))
 assert.equal(calls,1)
})

test('SDK sends a compact twelve-class schema while application validation enforces counts, stages and minutes',async()=>{
 for(const duration of [20,61,120]){
  const selected={...request,classes:12,duration},course=syntheticCourse()
  const allocation=[0,1,2,3].map(i=>Math.floor(duration/4)+(i<duration%4?1:0))
  course.sessions=Array.from({length:12},(_,i)=>({...structuredClone(course.sessions[i%2]),minutes:allocation}))
  let calls=0
  const provider=createGeminiProvider({apiKey:'synthetic-key',GoogleGenAI,fetchImpl:async(_url,options)=>{
   calls++;const b=JSON.parse(options.body),s=b.generationConfig.responseJsonSchema
   assert.deepEqual(s.properties.language.enum,['French']);assert.deepEqual(s.properties.level.enum,['A2'])
   assert.equal(s.properties.sessions.minItems,undefined);assert.equal(s.properties.sessions.maxItems,undefined)
   assert.ok(s.properties.sessions.description.includes('Exactly 12'))
   assert.ok(b.systemInstruction.parts[0].text.includes('Generate exactly 12 COMPLETE sessions'))
   const lesson=s.properties.sessions.items
   assert.deepEqual(lesson.properties.steps.prefixItems.map(x=>x.properties.stage.enum[0]),['Listen','Repeat','Personalize','Use'])
   assert.deepEqual(lesson.properties.minutes.prefixItems.map(x=>x.enum[0]),allocation)
   assert.equal(lesson.properties.steps.minItems,undefined);assert.equal(lesson.properties.steps.maxItems,undefined)
   assert.equal(lesson.properties.activities.minItems,undefined);assert.equal(lesson.properties.activities.maxItems,undefined)
   return Response.json(result({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(course)}]}}]}))
  }})
  const output=await provider(selected,{profile:{level:'A2'}});validateArchitectCourse(output.content,selected);assert.equal(calls,1)
  const partial=structuredClone(output.content);partial.sessions.pop();assert.throws(()=>validateArchitectCourse(partial,selected),/class count/)
  const invalid=structuredClone(output.content);invalid.sessions[11].steps.reverse();assert.throws(()=>validateArchitectCourse(invalid,selected),/in order/)
  invalid.sessions=output.content.sessions;invalid.sessions[11].title='x'.repeat(161);assert.throws(()=>validateArchitectCourse(invalid,selected),error=>error.message.includes('Class 12:')&&error.message.includes('title')&&error.message.includes('160')&&!error.message.includes('x'.repeat(161)))
  const regen=buildArchitectProviderRequest({...selected,regenerate:{versionId:crypto.randomUUID(),revision:1,session:11}},{},GEMINI_ARCHITECT_MODEL).text.format.schema
  assert.equal(regen.properties.sessions,undefined);assert.equal(regen.properties.steps.prefixItems.length,4)
 }
})

test('upstream format and access failures have actionable sanitized codes and never retry',async()=>{
 for(const [status,code]of[[400,'provider_request_rejected'],[401,'provider_configuration'],[403,'provider_configuration'],[404,'provider_configuration']]){
  let calls=0
  const provider=createGeminiProvider({apiKey:'synthetic-key',GoogleGenAI,fetchImpl:async()=>{calls++;return Response.json({error:{message:'private provider diagnostics'}},{status})}})
  await assert.rejects(provider(request,{}),error=>error.code===code&&!error.message.includes('private provider diagnostics'))
  assert.equal(calls,1)
 }
})
