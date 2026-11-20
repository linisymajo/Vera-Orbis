import test from 'node:test'
import assert from 'node:assert/strict'
import {privateFileDownload} from '../src/lib/privateFileDownload.js'
test('academic downloads fetch the actual bytes with the current session and never issue a signed URL',async()=>{
 const bytes=Buffer.from('Synthetic academic response'),calls=[]
 const api={storage:{from:bucket=>({download:async path=>{calls.push({bucket,path});return{data:new Blob([bytes],{type:'application/pdf'})}},createSignedUrl(){throw Error('REUSABLE_SIGNED_URL_NOT_ALLOWED')}})}}
 const url=await privateFileDownload(api,'academic-submissions','student/response.pdf');assert.match(url,/^blob:/);assert.deepEqual(Buffer.from(await(await fetch(url)).arrayBuffer()),bytes);assert.deepEqual(calls,[{bucket:'academic-submissions',path:'student/response.pdf'}]);URL.revokeObjectURL(url)
})
test('revoked sessions, unsafe paths and active web content cannot produce a download URL',async()=>{
 let created=0;const options={urlFactory:{createObjectURL(){created++;return'blob:synthetic'},revokeObjectURL(){}}}
 const denied={storage:{from:()=>({download:async()=>({error:{message:'RLS denies inactive enrollment'}})})}}
 await assert.rejects(privateFileDownload(denied,'materials','teacher/lesson.docx',options),/authorized/)
 await assert.rejects(privateFileDownload(denied,'materials','teacher/../private.docx',options),/Invalid/)
 const html={storage:{from:()=>({download:async()=>({data:new Blob(['<script>private</script>'],{type:'text/html'})})})}}
 await assert.rejects(privateFileDownload(html,'materials','teacher/untrusted.html',options),/academic/);assert.equal(created,0)
})
