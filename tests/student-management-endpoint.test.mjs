import test from 'node:test'
import assert from 'node:assert/strict'
import {createStudentManagementHandler} from '../supabase/functions/student-management/handler.js'
import {studentManagementEnabled,studentDeletionEnabled} from '../src/lib/studentManagement.js'
const A='10000000-0000-4000-8000-000000000002',S='20000000-0000-4000-8000-000000000001',J=crypto.randomUUID(),L=crypto.randomUUID(),F=crypto.randomUUID(),origin='https://veraorbis.studio'
test('unmigrated environments preserve the existing directory until explicit readiness',()=>{
 for(const MODE of ['production','staging','development']){assert.equal(studentManagementEnabled({MODE}),false);assert.equal(studentDeletionEnabled({MODE}),false)}
 assert.equal(studentManagementEnabled({VITE_STUDENT_MANAGEMENT_READY:'true'}),true);assert.equal(studentDeletionEnabled({VITE_STUDENT_DELETION_READY:'true'}),true)
})
function setup({admin=true,verified=true,enabled=true,files=[{id:F,bucket:'academic-submissions',path:S+'/response.docx',exists:true}],stage='files',errorAt=null}={}){
 const calls=[],env={SUPABASE_URL:'https://iopgzmvaqobigjwibual.supabase.co',SUPABASE_ANON_KEY:'PUBLIC_TEST_KEY',SUPABASE_SERVICE_ROLE_KEY:'PRIVATE_TEST_KEY',STUDENT_MANAGEMENT_ALLOWED_ORIGINS:origin,STUDENT_ACCOUNT_DELETION_ENABLED:String(enabled)}
 const createClient=(_url,key)=>{const worker=key==='PRIVATE_TEST_KEY';calls.push(['client',worker?'worker':'caller']);return{auth:{getUser:async()=>({data:{user:{id:A,email_confirmed_at:verified?'synthetic confirmed':null}}}),admin:{getUserById:async id=>{calls.push(['auth_lookup',id]);return{data:{user:{id}}}},deleteUser:async(id,soft)=>{calls.push(['auth_delete',id,soft]);return{data:{user:{id}}}}}},rpc:async(name,p)=>{calls.push([name,p]);if(name===errorAt)return{error:{code:'42501',message:'PRIVATE_DATABASE_DETAIL'}};if(name==='is_academic_admin')return{data:admin};if(name==='claim_student_deletion')return{data:{job_id:J,student_id:S,lease:L,files,stage}};if(name==='validate_student_deletion_file')return{data:files[p.p_index]};if(name==='preview_student_deletion')return{data:{job_id:J,student_id:S,email:'synthetic@example.test',eligible:true}};if(name==='finish_student_deletion')return{data:{job_id:J,stage:'complete'}};return{data:{stage:name.includes('cleanup')?'auth':'files'}}},storage:{from:bucket=>({remove:async paths=>{calls.push(['storage_delete',bucket,paths]);return{data:[]}}})}}}
 const handler=createStudentManagementHandler({env:k=>env[k],createClient})
 const send=(body,headers={})=>handler(new Request('https://example.test/function',{method:'POST',headers:{Origin:origin,Authorization:'Bearer synthetic.jwt.token','Content-Type':'application/json',...headers},body:JSON.stringify(body)}))
 return{calls,send}
}
test('ordinary teachers, unconfirmed sessions and foreign origins cannot reach privileged deletion',async()=>{
 for(const options of [{admin:false},{verified:false}]){const f=setup(options),r=await f.send({mode:'confirm',jobId:J,confirmation:'DELETE synthetic@example.test',retentionReviewed:true,sharedReviewed:true});assert.ok([401,403].includes(r.status));assert.equal(f.calls.filter(c=>c[0]==='client'&&c[1]==='worker').length,0)}
 const f=setup(),r=await f.send({mode:'preview',studentId:S,requestId:crypto.randomUUID()},{Origin:'https://attacker.example'});assert.equal(r.status,403);assert.equal(f.calls.length,0)
})
test('typed confirmation precedes private file, academic data and Auth cleanup, with no credentials or lease in response',async()=>{
 const f=setup(),r=await f.send({mode:'confirm',jobId:J,confirmation:'DELETE synthetic@example.test',retentionReviewed:true,sharedReviewed:true});assert.equal(r.status,200);const text=await r.text();assert.doesNotMatch(text,new RegExp('PRIVATE_TEST_KEY|'+L+'|'+S+'/response'))
 const names=f.calls.map(c=>c[0]);for(const [before,after]of [['confirm_student_deletion','claim_student_deletion'],['validate_student_deletion_file','storage_delete'],['storage_delete','record_student_deletion_files'],['record_student_deletion_files','cleanup_student_deletion_data'],['cleanup_student_deletion_data','validate_student_deletion_auth'],['validate_student_deletion_auth','auth_delete'],['auth_delete','finish_student_deletion']])assert.ok(names.indexOf(before)<names.indexOf(after))
 assert.deepEqual(f.calls.find(c=>c[0]==='auth_delete'),['auth_delete',S,false]);assert.equal(f.calls.find(c=>c[0]==='claim_student_deletion')[1].p_actor_id,A)
})
test('a disabled capability or invalid request never confirms or deletes an account',async()=>{
 const f=setup({enabled:false}),r=await f.send({mode:'confirm',jobId:J,confirmation:'DELETE synthetic@example.test',retentionReviewed:true,sharedReviewed:true});assert.equal(r.status,503);assert.equal(f.calls.some(c=>c[0]==='confirm_student_deletion'),false)
 const other=setup();assert.equal((await other.send({mode:'confirm',jobId:J,confirmation:'DELETE synthetic@example.test',retentionReviewed:true,sharedReviewed:true,actorId:S})).status,400);assert.equal(other.calls.some(c=>c[0]==='confirm_student_deletion'),false)
})
test('all file paths are checked before any deletion, and failed retention validation halts before Auth deletion',async()=>{
 const f=setup({files:[{id:F,bucket:'academic-submissions',path:S+'/response.docx',exists:true},{id:crypto.randomUUID(),bucket:'materials',path:A+'/../shared.docx',exists:true}]});assert.equal((await f.send({mode:'resume',jobId:J})).status,409);assert.equal(f.calls.some(c=>c[0]==='storage_delete'),false);assert.equal(f.calls.some(c=>c[0]==='auth_delete'),false)
 const blocked=setup({stage:'auth',files:[],errorAt:'validate_student_deletion_auth'});assert.equal((await blocked.send({mode:'resume',jobId:J})).status,409);assert.equal(blocked.calls.some(c=>c[0]==='auth_delete'),false)
})
