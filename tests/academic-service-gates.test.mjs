import test from 'node:test'
import assert from 'node:assert/strict'
import { academicContextCapabilities, academicContextProviderStatus, processAcademicMaterial, requestStudentAwareAcademic } from '../src/lib/studentAcademicContext.js'

test('production academic context works independently while disabled Edge operations make zero requests', async () => {
  const environment={MODE:'production',VITE_ACADEMIC_CONTEXT_READY:'true',VITE_ACADEMIC_AI_ENABLED:'false',VITE_ACADEMIC_MATERIALS_READY:'false'}
  let calls=0
  const client={functions:{invoke:async()=>{calls++;throw Error('Unexpected network request')}}}
  assert.deepEqual(academicContextCapabilities(environment),{context:true,materials:false,generation:false})
  const status=await academicContextProviderStatus(client,environment)
  assert.equal(status.enabled,false);assert.match(status.message,/without AI/)
  await assert.rejects(processAcademicMaterial(client,'student','material',environment),/temporarily unavailable/)
  await assert.rejects(requestStudentAwareAcademic(client,{studentId:'student',kind:'learning_plan'},environment),/disabled/)
  assert.equal(calls,0)
})

test('verified material backend can be activated without enabling provider generation', async () => {
  const environment={MODE:'production',VITE_ACADEMIC_CONTEXT_READY:'true',VITE_ACADEMIC_MATERIALS_READY:'true',VITE_ACADEMIC_AI_ENABLED:'false'}
  const bodies=[]
  const client={functions:{invoke:async(name,{body})=>{assert.equal(name,'academic-ai');bodies.push(body);return {data:{extraction:{id:'extraction',status:'ready'}}}}}}
  assert.equal((await processAcademicMaterial(client,'student','material',environment)).status,'ready')
  assert.deepEqual(bodies,[{mode:'index_academic_material',studentId:'student',materialId:'material'}])
  assert.equal((await academicContextProviderStatus(client,environment)).enabled,false)
  assert.equal(bodies.length,1)
  assert.deepEqual(academicContextCapabilities({...environment,VITE_ACADEMIC_CONTEXT_READY:'false'}),{context:false,materials:false,generation:false})
})
