import { validatePedagogicalExerciseRequest } from '../../supabase/functions/academic-ai/pedagogical-exercises.js'
import { exerciseStudioDraftFromAI } from './studentAcademicContext.js'
export async function requestPedagogicalExercise(client,settings) {
  const body=validatePedagogicalExerciseRequest({mode:'pedagogical_exercise',...settings})
  const {data,error}=await client.functions.invoke('academic-ai',{body})
  if(error){let message='Exercise generation failed. Nothing was published.';try{message=(await error.context?.json())?.message||message}catch{}throw new Error(message)}
  if(!data?.draft?.id||data.draft.student_id!==body.studentId||data.draft.status!=='draft')throw new Error('The private generated exercise could not be confirmed.')
  return data.draft
}
export function pedagogicalExerciseToStudio(row) {
  const content=structuredClone(row.content)
  if(row.accepted_variants?.length)content.questions.forEach((q,i)=>{q.accepted_answers=row.accepted_variants[i]||[]})
  const draft=exerciseStudioDraftFromAI(content,row.id,[])
  delete draft.settings.academic_ai_run
  draft.settings.pedagogical_ai_draft=row.id
  return draft
}
