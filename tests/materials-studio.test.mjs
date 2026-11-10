import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createMaterialUploadEntry,saveMaterialUploadEntry,materialUploadRecovery,restoreMaterialUploads,attachMaterialRetryFile,
} from '../src/components/materialsStudio.js'

const T='10000000-0000-4000-8000-000000000001',T2='10000000-0000-4000-8000-000000000002'
const S='20000000-0000-4000-8000-000000000001',S2='20000000-0000-4000-8000-000000000002'
const file=()=>new File(['%PDF-1.4\nA practical lesson\n%%EOF'],'lesson.pdf',{type:'application/pdf'})
const metadata={studentId:S,type:'resource',description:'Listen, repeat, personalize and use.',language:'English',level:'A2'}

function client(){
  const objects=new Map(),records=new Map(),calls={upload:[],download:[],insert:[],read:[],remove:0}
  const mode={user:T,uploadError:false,uploadCommitsWithError:false,insertError:false,insertCommitsWithError:false,insertMissingConfirmation:false,readError:false,readErrorAfterInsert:false}
  return {
    objects,records,calls,mode,
    auth:{getUser:async()=>({data:{user:mode.user?{id:mode.user}:null}})},
    storage:{from(bucket){
      assert.equal(bucket,'materials')
      return {
        async upload(path,body,options){
          calls.upload.push({path,options})
          assert.equal(options.upsert,false)
          if(mode.uploadError)return {error:{message:'Upload interrupted'}}
          objects.set(path,new Blob([await body.arrayBuffer()],{type:options.contentType}))
          if(mode.uploadCommitsWithError)return {error:{message:'Upload response lost'}}
          return {data:{path}}
        },
        async download(path){
          calls.download.push(path)
          return objects.has(path)?{data:objects.get(path)}:{error:{message:'Not found',status:404}}
        },
        remove(){calls.remove++;throw new Error('Uploads must never be deleted to compensate for an ambiguous material save')},
      }
    }},
    from(table){
      assert.equal(table,'materials')
      return {
        select(){
          const filters={}
          const query={
            eq(key,value){filters[key]=value;return query},
            async maybeSingle(){
              calls.read.push({...filters})
              if(mode.readError||mode.readErrorAfterInsert&&calls.insert.length)return {error:{message:'Read interrupted'}}
              const row=records.get(filters.id)
              return {data:row&&row.teacher_id===filters.teacher_id?{...row}:null}
            },
          }
          return query
        },
        insert(payload){
          calls.insert.push(structuredClone(payload))
          return {select(){return {async single(){
            if(mode.insertError)return {error:{message:'Save interrupted'}}
            if(records.has(payload.id))return {error:{message:'Duplicate ID',code:'23505'}}
            records.set(payload.id,structuredClone(payload))
            if(mode.insertCommitsWithError)return {error:{message:'Save response lost'}}
            return {data:mode.insertMissingConfirmation?{}:{...payload}}
          }}}}
        },
      }
    },
  }
}

test('Materials Studio validates all supported file types and rejects unsafe or invalid files before queueing',()=>{
  for(const ext of ['pdf','doc','docx','ppt','pptx','xls','xlsx','jpg','jpeg','png','webp','mp3','wav','ogg','mp4']){
    const entry=createMaterialUploadEntry(new File(['valid sample bytes'],'sample.'+ext))
    assert.match(entry.id,/^[a-f0-9-]{36}$/)
    assert.equal(entry.state,'queued')
  }
  for(const invalid of [new File([],'empty.pdf'),new File(['bad'],'page.html'),new File(['bad'],'lesson.docx',{type:'text/html'}),{name:'huge.pdf',type:'',size:10485761},{name:'invalid.pdf',type:'',size:NaN}]){
    assert.throws(()=>createMaterialUploadEntry(invalid),/supported/)
  }
})

test('one queued file becomes a confirmed owned material with exact bytes, stable ID and explicit recipient',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  const result=await saveMaterialUploadEntry(api,entry,metadata,{teacherId:T})
  assert.equal(result.id,entry.id)
  assert.equal(result.teacher_id,T)
  assert.equal(result.student_id,S)
  assert.equal(result.audience,'student')
  assert.equal(result.file_path,entry.path)
  assert.equal(entry.state,'saved')
  assert.deepEqual(Buffer.from(await api.objects.get(entry.path).arrayBuffer()),Buffer.from(await entry.file.arrayBuffer()))
  assert.equal(api.calls.upload[0].options.contentType,'application/pdf')
  assert.equal(api.calls.insert.length,1)
  await saveMaterialUploadEntry(api,entry,metadata,{teacherId:T})
  assert.equal(api.calls.upload.length,1)
  assert.equal(api.calls.insert.length,1)
  assert.equal(api.calls.remove,0)
})

test('simultaneous save/retry calls share one in-flight write for an item',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  const result=await Promise.all([
    saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),
    saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),
  ])
  assert.equal(result[0].id,result[1].id)
  assert.equal(api.calls.upload.length,1)
  assert.equal(api.calls.insert.length,1)
})

test('lost or incomplete insert responses are reconciled by stable ID before reporting success',async()=>{
  for(const mode of ['insertCommitsWithError','insertMissingConfirmation']){
    const api=client(),entry=createMaterialUploadEntry(file())
    api.mode[mode]=true
    const saved=await saveMaterialUploadEntry(api,entry,metadata,{teacherId:T})
    assert.equal(saved.id,entry.id)
    assert.equal(entry.state,'saved')
    assert.equal(api.records.size,1)
    assert.equal(api.calls.upload.length,1)
    assert.equal(api.calls.insert.length,1)
    assert.equal(api.calls.read.length,2)
  }
})

test('failed metadata saves retain private bytes and retry the same row without uploading a duplicate',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  api.mode.insertError=true
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),/Save interrupted/)
  const originalPath=entry.path,originalPayload=structuredClone(entry.payload)
  assert.equal(entry.state,'save_failed')
  assert.equal(api.objects.size,1)
  assert.equal(api.calls.remove,0)
  api.mode.insertError=false
  entry.title='Changed after failure'
  const saved=await saveMaterialUploadEntry(api,entry,{...metadata,studentId:S2},{teacherId:T})
  assert.equal(saved.id,entry.id)
  assert.equal(saved.file_path,originalPath)
  assert.equal(saved.title,originalPayload.title)
  assert.equal(saved.student_id,S)
  assert.equal(api.calls.upload.length,1)
  assert.equal(api.records.size,1)
  assert.deepEqual(api.calls.insert[0],api.calls.insert[1])
})

test('unverifiable metadata status never reports success and survives page recovery without the File object',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  api.mode.insertCommitsWithError=true;api.mode.readErrorAfterInsert=true
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),/saved status/)
  assert.equal(entry.state,'save_failed')
  const manifest=JSON.parse(JSON.stringify(materialUploadRecovery([entry])))
  assert.equal(manifest.length,1)
  assert.equal(manifest[0].file,undefined)
  const recovered=restoreMaterialUploads(manifest,T)[0]
  assert.equal(recovered.id,entry.id)
  assert.equal(recovered.file,null)
  api.mode.readErrorAfterInsert=false
  const saved=await saveMaterialUploadEntry(api,recovered,{}, {teacherId:T})
  assert.equal(saved.id,entry.id)
  assert.equal(recovered.state,'saved')
  assert.equal(api.calls.insert.length,1)
  assert.equal(api.calls.upload.length,1)
  assert.equal(api.objects.size,1)
  assert.equal(api.calls.remove,0)
  assert.deepEqual(restoreMaterialUploads(manifest,T2),[])
})

test('upload response loss checks the original object and retains its exact bytes before saving metadata',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  api.mode.uploadCommitsWithError=true
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),/response lost/)
  const path=entry.uploadAttemptPath
  assert.equal(entry.state,'upload_uncertain')
  assert.equal(api.calls.insert.length,0)
  const saved=await saveMaterialUploadEntry(api,entry,metadata,{teacherId:T})
  assert.equal(saved.file_path,path)
  assert.equal(api.calls.upload.length,1)
  assert.deepEqual(api.calls.download,[path])
  assert.equal(api.objects.size,1)
  assert.equal(api.records.size,1)
})

test('a definitively absent upload retries the original path with upsert disabled',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  api.mode.uploadError=true
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),/interrupted/)
  const path=entry.uploadAttemptPath
  api.mode.uploadError=false
  await saveMaterialUploadEntry(api,entry,metadata,{teacherId:T})
  assert.equal(api.calls.upload.length,2)
  assert.equal(api.calls.upload[1].path,path)
  assert.equal(entry.path,path)
  assert.equal(api.objects.size,1)
})

test('recovered incomplete uploads require the original file and reject mismatched bytes',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  api.mode.uploadError=true
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}))
  const recovered=restoreMaterialUploads(JSON.parse(JSON.stringify(materialUploadRecovery([entry]))),T)[0]
  api.mode.uploadError=false
  await assert.rejects(saveMaterialUploadEntry(api,recovered,{}, {teacherId:T}),/Re-select/)
  await assert.rejects(attachMaterialRetryFile(recovered,new File(['different bytes'],'lesson.pdf',{type:'application/pdf'})),/same original/)
  await attachMaterialRetryFile(recovered,file())
  await saveMaterialUploadEntry(api,recovered,{}, {teacherId:T})
  assert.equal(api.calls.upload.at(-1).path,entry.uploadAttemptPath)
  assert.equal(api.records.size,1)
})

test('foreign identities, changed saved records and mismatched stored bytes cannot be treated as a successful retry',async()=>{
  const api=client(),entry=createMaterialUploadEntry(file())
  api.mode.user=T2
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),/session changed/)
  assert.equal(api.calls.upload.length,0)
  api.mode.user=T;api.mode.insertError=true
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}))
  api.records.set(entry.id,{...entry.payload,title:'Edited elsewhere'})
  await assert.rejects(saveMaterialUploadEntry(api,entry,metadata,{teacherId:T}),/changed/)
  assert.equal(api.calls.insert.length,1)
  const second=createMaterialUploadEntry(file())
  api.mode.insertError=false;api.mode.uploadCommitsWithError=true
  await assert.rejects(saveMaterialUploadEntry(api,second,metadata,{teacherId:T}))
  api.objects.set(second.uploadAttemptPath,new Blob(['different private object']))
  await assert.rejects(saveMaterialUploadEntry(api,second,metadata,{teacherId:T}),/matched/)
  assert.equal(second.state,'upload_uncertain')
  assert.equal(api.calls.remove,0)
})
