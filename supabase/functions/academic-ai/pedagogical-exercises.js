import { AcademicAIError, DRAFT_SCHEMA, validateDraftContent } from './core.js'
import { generalizedPedagogy } from './pedagogy.js'
import { validateExercise } from '../../../src/lib/exerciseWorkflow.js'

export const PEDAGOGICAL_EXERCISE_TYPES = ['multiple_choice','true_false','fill_blank','matching','ordering','reading','open_question','writing','conversation','pronunciation']
export function validatePedagogicalExerciseRequest(input) {
  const keys=['mode','studentId','language','level','goal','duration','exerciseType','lessonNumber']
  if (!input || Object.keys(input).sort().join('|')!==keys.sort().join('|') || input.mode!=='pedagogical_exercise'
    || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(input.studentId || '')
    || !PEDAGOGICAL_EXERCISE_TYPES.includes(input.exerciseType)
    || !Number.isInteger(input.lessonNumber) || input.lessonNumber<1 || input.lessonNumber>120) throw new AcademicAIError('invalid_pedagogy','Select an enrolled adult learner and a supported activity.',422)
  generalizedPedagogy({...input,classes:1,regenerate:null})
  return input
}
export function buildPedagogicalExerciseProviderRequest(input) {
  validatePedagogicalExerciseRequest(input)
  const pedagogy=generalizedPedagogy({...input,classes:1,regenerate:null})
  const schema=structuredClone(DRAFT_SCHEMA)
  schema.properties.questions.items.properties.accepted_answers={type:'array',items:{type:'string'}}
  schema.properties.questions.items.required.push('accepted_answers')
  schema.properties.exercise_type={type:'string',enum:[input.exerciseType]}
  schema.properties.language={type:'string',enum:[input.language]};schema.properties.level={type:'string',enum:[input.level]}
  return {input:JSON.stringify({...pedagogy,exercise_type:input.exerciseType,lesson_number:input.lessonNumber}),max_output_tokens:2500,
    instructions:'Create a complete editable exercise for adult language education at Vera Orbis. Use Power Expressions, then exactly Listen, Repeat, Personalize, Use in that order. Prioritize speaking, authentic communication, cultural context and practical tasks. Return 3-5 questions of the requested type and only complete plain-text JSON. Never invent student history, names, identities, private sources, files, links, recordings or audio. No tools. Do not request personal disclosures. Use realistic fictional adult situations. Language and CEFR must match. feedback must be null. For objective activities provide exact answer keys, accepted variants and brief helpful explanations; multiple choice/true_false answers must match an option exactly. Matching uses equal-length left/right arrays in correct pair order. Ordering uses items in correct order and answer as the complete ordered sentence. Open speaking, writing, storytelling, reading and pronunciation have answer:null, accepted_answers:[] and require teacher feedback. Do not publish or assign anything.',
    text:{format:{schema}}}
}
export async function generatePedagogicalExercise(client,input,provider) {
  validatePedagogicalExerciseRequest(input)
  const rpc=async(name,args)=>{const r=await client.rpc(name,args);if(r.error||!r.data)throw new AcademicAIError(r.error?.message==='ai_rate_limit'?'rate_limit':'forbidden',r.error?.message==='ai_rate_limit'?'Generation quota reached. No automatic retry occurred.':'Assigned teacher access, adult admission and AI consent are required.',r.error?.message==='ai_rate_limit'?429:403);return r.data}
  const profile=await rpc('get_learning_architect_profile',{p_student_id:input.studentId})
  if(profile.ai_consent!==true)throw new AcademicAIError('forbidden','Student AI consent is required.',403)
  const run=await rpc('reserve_academic_ai_request',{p_student_id:input.studentId,p_kind:'exercise'})
  try {
    const generated=await provider(input,{})
    const content=structuredClone(generated.content),variants=(content.questions||[]).map(q=>{const v=q.accepted_answers;delete q.accepted_answers;return v})
    validateDraftContent(content,'exercise')
    if(content.exercise_type!==input.exerciseType||content.language!==input.language||content.level!==input.level)throw new AcademicAIError('invalid_output','Exercise output did not match the selected settings.',422)
    content.questions.forEach((q,i)=>{const v=variants[i];if(!Array.isArray(v)||v.length>20||v.some(s=>typeof s!=='string'||!s.trim()||s.length>300))throw new AcademicAIError('invalid_output','Accepted answer variants were invalid.',422);q.accepted_answers=v})
    if(['reading','open_question','writing','conversation','pronunciation'].includes(content.exercise_type)&&content.questions.some(q=>q.answer!==null))throw new AcademicAIError('invalid_output','Open responses require teacher review.',422)
    validateExercise({...content,questions:content.questions.map(q=>({...q,...(content.exercise_type==='matching'?{answer:[...q.right]}:{})})),settings:{}})
    const draft=await rpc('complete_pedagogical_exercise_request',{p_request_id:run,p_content:content,p_input_tokens:generated.inputTokens,p_output_tokens:generated.outputTokens})
    if(draft.status!=='draft'||draft.student_id!==input.studentId)throw new AcademicAIError('persistence_unavailable','The private exercise draft could not be confirmed.',503)
    return {...draft,content}
  } catch(error) {
    await client.rpc('fail_academic_ai_request',{p_request_id:run}).catch(()=>{})
    if(error instanceof AcademicAIError)throw error
    throw new AcademicAIError('provider_unavailable','Exercise generation failed. Nothing was published.',502)
  }
}
