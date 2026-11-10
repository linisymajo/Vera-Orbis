import test from 'node:test'
import assert from 'node:assert/strict'
import { sendAcademicMessage } from '../src/lib/messaging.js'
const message={sender_id:'student',sender_role:'student',recipient_id:'student',subject:'Question',body:'How can I personalize this?',is_read:true}
function client(result={data:{id:'saved'}},user='student'){
 const calls=[];return{calls,auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},from:table=>({insert:payload=>{calls.push({table,payload});return{select:()=>({single:async()=>result})}}})}
}
test('inbox saves verified identities and keeps student own-thread messages unread for teacher',async()=>{
 const api=client();assert.equal((await sendAcademicMessage(api,message)).data.id,'saved');assert.equal(api.calls[0].payload.is_read,false)
})
test('inbox never reports unconfirmed or rejected persistence as sent',async()=>{
 for(const result of [{data:null},{data:{}},{error:{message:'Denied'}}])assert.ok((await sendAcademicMessage(client(result),message)).error)
})
test('inbox rejects anonymous, impersonated and incomplete messages before writes',async()=>{
 for(const [api,payload] of [[client({},null),message],[client(),'teacher'],[client(),{...message,body:' '}],[client(),{...message,sender_role:'system'}]]){
  const result=await sendAcademicMessage(api,payload);assert.ok(result.error);assert.equal(api.calls.length,0)
 }
})
test('student outgoing own-thread messages do not expose a mark-read action',async()=>{
 const {renderInbox}=await import('../src/components/inbox.js')
 const html=renderInbox([{id:'own-message',sender_id:'student',recipient_id:'student',sender_role:'student',subject:'Question',body:'Please help',is_read:false}],{id:'student',name:'Student'})
 assert.doesNotMatch(html,/data-mark-read-id="own-message"/)
})
