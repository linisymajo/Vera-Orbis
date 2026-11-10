import test from 'node:test'
import assert from 'node:assert/strict'
import { validateExercise, studentExercise, publishExercise } from '../src/lib/exerciseWorkflow.js'
import { renderExerciseActivity } from '../src/components/exercises.js'
const exercise={title:'First meeting',language:'English',exercise_type:'multiple_choice',questions:[{prompt:'Greet a colleague',options:['Hello','Goodbye'],answer:'Hello',explanation:'private',answer_key:'also private'}]}

test('validated activity rejects empty questions and inconsistent choices before saving or preview',()=>{
  assert.equal(validateExercise(exercise),exercise)
  for(const questions of [[],[{prompt:' '}],[{prompt:'Question',options:['A','A'],answer:'A'}],[{prompt:'Question',options:['A','B'],answer:'C'}]])assert.throws(()=>validateExercise({...exercise,questions}))
  assert.throws(()=>validateExercise({...exercise,exercise_type:'unknown'}))
  assert.throws(()=>validateExercise({...exercise,questions:[{...exercise.questions[0],audio_url:'javascript:alert(1)'}]}))
})
test('shared preview and student renderer never serialize answers, explanations or unexpected question fields',()=>{
  assert.deepEqual(studentExercise(exercise).questions,[{prompt:'Greet a colleague',options:['Hello','Goodbye']}])
  const html=renderExerciseActivity(exercise,{preview:true})
  assert.match(html,/type="radio"/)
  assert.match(html,/data-preview="true"/)
  assert.doesNotMatch(html,/private|answer_key|explanation/)
  const malicious=renderExerciseActivity({...exercise,title:'<script>alert(1)</script>',questions:[{prompt:'<img src=x onerror=alert(1)>',options:['Hello','Goodbye']}]})
  assert.doesNotMatch(malicious,/<script>|<img src=x/)
})
test('publishing deduplicates selected students, calls one transaction and rejects unconfirmed assignment counts',async()=>{
  const calls=[]
  const client={rpc:async(name,args)=>{calls.push({name,args});return{data:{exercise_id:'exercise',assignment_count:2}}}}
  await publishExercise(client,{exerciseId:'exercise',studentIds:['a','a','b']})
  assert.equal(calls.length,1)
  assert.equal(calls[0].name,'publish_exercise')
  assert.deepEqual(calls[0].args.p_student_ids,['a','b'])
  await assert.rejects(publishExercise(client,{exerciseId:'exercise',studentIds:[]}),/Select/)
  await assert.rejects(publishExercise({rpc:async()=>({data:{exercise_id:'exercise',assignment_count:1}})},{exerciseId:'exercise',studentIds:['a','b']}),/not confirmed/)
})