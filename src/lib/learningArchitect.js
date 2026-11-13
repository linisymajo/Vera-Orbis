import { generalizedPedagogy } from '../../supabase/functions/academic-ai/pedagogy.js'
import { validateArchitectRequest } from '../../supabase/functions/academic-ai/learning-architect.js'
import { validateLearningPlan } from './learningPlans.js'

export const learningArchitectEnabled = () => import.meta.env?.VITE_LEARNING_ARCHITECT_ENABLED === 'true'
export async function loadLearningArchitectProfile(client, studentId) {
  const { data, error } = await client.rpc('get_learning_architect_profile', { p_student_id: studentId })
  if (error || !data) throw new Error('The authorized academic profile could not be loaded. Check enrollment and AI consent.')
  return data
}
export async function requestLearningArchitect(client, settings) {
  const input = validateArchitectRequest({ mode: 'learning_architect', regenerate: null, requestId: crypto.randomUUID(), ...settings })
  generalizedPedagogy(input)
  const { data, error } = await client.functions.invoke('academic-ai', { body: input })
  if (error) {
    let message = 'AI request failed. No plan was approved or published.'
    try { message = (await error.context?.json())?.message || message } catch { /* Do not expose provider/transport details. */ }
    throw new Error(message)
  }
  const version = data?.version
  if (!version?.id || version.student_id !== input.studentId || version.status !== 'draft') throw new Error('The saved AI plan draft could not be confirmed.')
  validateLearningPlan(version.content, { complete: true })
  return version
}
export async function publishLearningArchitect(client, versionId) {
  const { data, error } = await client.rpc('publish_learning_architect_plan', { p_version_id: versionId })
  if (error || data?.version_id !== versionId || !data.published_at) throw new Error('Plan publication could not be confirmed. Reload before retrying.')
  return data
}
