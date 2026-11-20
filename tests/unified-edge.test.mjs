import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { createAcademicAIHandler } from '../supabase/functions/academic-ai/handler.js'

const T='10000000-0000-4000-8000-000000000001',S='20000000-0000-4000-8000-000000000001',M='30000000-0000-4000-8000-000000000001'
const require=createRequire(new URL('../supabase/functions/academic-ai/package.json',import.meta.url))
const {zipSync,strToU8}=require('fflate')
const origin='https://school.example.test'
function fixture({role='teacher',verified=true,member=true,user=true}={}) {
  const calls=[],settings={SUPABASE_URL:'https://fixture.example.test',SUPABASE_ANON_KEY:'synthetic-public-key',ACADEMIC_AI_ALLOWED_ORIGINS:origin,ACADEMIC_AI_UNIFIED_ENABLED:'false',ACADEMIC_AI_ENABLED:'false',ACADEMIC_AI_ARCHITECT_ENABLED:'false',ACADEMIC_AI_ADULT_TEACHER_IDS:T}
  const bytes=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="w"><w:p><w:r><w:t>Ask for directions politely.</w:t></w:r></w:p></w:document>')})
  const client={auth:{getUser:async()=>({data:{user:user?{id:T}:null},error:null})},from:name=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:member?{id:T}:null,error:null})})})}),rpc:async(name,args)=>{calls.push({name,args});if(name==='get_my_enrollment')return{data:{student_id:T,role,email_verified:verified,academic_access:true}};if(name==='get_academic_material_source')return{data:{file_path:T+'/synthetic.docx',fingerprint:'synthetic-source-v1'}};if(name==='save_academic_material_text')return{data:{id:M,status:args.p_status}};throw Error('Unexpected academic read or reservation')},storage:{from:bucket=>({download:async path=>{calls.push({name:'storage_download',bucket,path});return{data:new Blob([bytes])}}})}}
  const handler=createAcademicAIHandler({env:name=>settings[name],createClient:()=>client,providerFactory:()=>{throw Error('Unexpected provider')},geminiProviderFactory:()=>{throw Error('Unexpected Gemini')}})
  const send=body=>handler(new Request('https://edge.example.test/academic-ai',{method:'POST',headers:{Origin:origin,Authorization:'Bearer synthetic-session','Content-Type':'application/json'},body:JSON.stringify(body)}))
  return{send,calls,bytes}
}

test('unified HTTP endpoints deny missing Auth, student roles, unverified teachers and missing teacher membership before file access',async()=>{
  for(const options of [{user:false},{role:'student'},{verified:false},{member:false}]){
    const f=fixture(options),r=await f.send({mode:'index_academic_material',studentId:S,materialId:M})
    assert.equal(r.status,options.user===false?401:403)
    assert.equal(f.calls.filter(c=>c.name==='storage_download'||c.name==='get_academic_material_source').length,0)
  }
})

test('authorized HTTP document processing runs the actual parser, hashes exact bytes and returns no private path or extracted text',async()=>{
  const f=fixture(),r=await f.send({mode:'index_academic_material',studentId:S,materialId:M})
  assert.equal(r.status,200)
  assert.deepEqual(await r.json(),{extraction:{id:M,status:'ready'}})
  const saved=f.calls.find(c=>c.name==='save_academic_material_text').args
  assert.equal(saved.p_content_hash,createHash('sha256').update(f.bytes).digest('hex'))
  assert.equal(saved.p_sections[0].text,'Ask for directions politely.')
  assert.equal(saved.p_student_id,S);assert.equal(saved.p_material_id,M)
  assert.deepEqual(f.calls.map(c=>c.name),['get_my_enrollment','get_academic_material_source','storage_download','save_academic_material_text'])
  const malformed=await f.send({mode:'index_academic_material',studentId:S,materialId:M,privateText:'unexpected'})
  assert.equal(malformed.status,422)
  assert.equal(f.calls.filter(c=>c.name==='storage_download').length,1)
})

test('reviewed disabled flags block every generation route before academic context reads or provider inference',async()=>{
  const f=fixture(),status=await f.send({mode:'unified_status'})
  assert.equal(status.status,200);assert.equal((await status.json()).enabled,false)
  for(const mode of ['unified_academic','learning_architect','legacy']){
    const r=await f.send({mode,studentId:S})
    assert.equal(r.status,503)
  }
  assert.equal(f.calls.filter(c=>c.name!=='get_my_enrollment').length,0)
})
