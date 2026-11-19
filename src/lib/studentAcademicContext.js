import { validateContextReview } from '../../supabase/functions/academic-ai/academic-context.js'
const errorText = 'Academic context integration is not available yet. Existing manual plans and exercises remain available.'
export async function loadStudentAcademicContext(client, studentId) {
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_ACADEMIC_CONTEXT_READY !== 'true') throw new Error(errorText)
  const { data, error } = await client.rpc('get_student_academic_context', { p_student_id: studentId })
  if (error || data?.student_id !== studentId || !Array.isArray(data.sources)) throw new Error(errorText)
  return data
}
export async function saveStudentContextReview(client, studentId, revision, settings, sources) {
  validateContextReview(settings, sources)
  const { data, error } = await client.rpc('save_academic_context_review', { p_student_id: studentId, p_expected_revision: revision, p_settings: settings })
  if (error || data?.revision !== revision + 1) throw new Error('Context save was not confirmed. Reload before retrying; another edit may have changed this review.')
  return data
}
async function invoke(client, body) {
  const { data, error } = await client.functions.invoke('academic-ai', { body })
  if (error) {
    let message = 'Academic AI is unavailable. Your existing records are preserved.'
    try { const result = await error.context?.json(); if (typeof result?.message === 'string') message = result.message } catch { /* Never expose transport/provider details. */ }
    throw new Error(message)
  }
  return data
}
export async function academicContextProviderStatus(client) {
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_ACADEMIC_CONTEXT_READY !== 'true') return { enabled: false, message: errorText }
  try { const s = await invoke(client, { mode: 'unified_status' }); return { enabled: s?.enabled === true, message: s?.message || 'Contextual provider unavailable.' } }
  catch { return { enabled: false, message: 'Student-aware AI generation is disabled until a compatible provider and privacy permissions are approved. Context review and manual work remain available.' } }
}
export async function processAcademicMaterial(client, studentId, materialId) {
  const data = await invoke(client, { mode: 'index_academic_material', studentId, materialId })
  if (!data?.extraction?.id) throw new Error('Material processing could not be confirmed.')
  return data.extraction
}
export async function requestStudentAwareAcademic(client, { studentId, reviewRevision, kind, exerciseType = null, lesson = null, regenerate = null, requestId = crypto.randomUUID() }) {
  const data = await invoke(client, { mode: 'unified_academic', studentId, requestId, reviewRevision, kind, exerciseType, lesson, regenerate })
  if (!data?.result?.id || data.result.student_id !== studentId || data.result.status !== 'draft') throw new Error('The private student draft could not be confirmed.')
  return data
}
export async function loadAcademicProvenance(client, resultId) {
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_ACADEMIC_CONTEXT_READY !== 'true') return null
  const r = await client.rpc('get_unified_academic_provenance', { p_result_id: resultId })
  if (r.error) throw new Error('Source history could not be loaded.')
  return r.data
}
export async function loadAcademicProvenanceByRequest(client, requestId) {
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_ACADEMIC_CONTEXT_READY !== 'true') return null
  const r = await client.from('unified_academic_runs').select('sources,citations').eq('request_id', requestId).maybeSingle()
  if (r.error) throw new Error('Source history could not be loaded.')
  return r.data
}
export function exerciseStudioDraftFromAI(content, requestId, sources = []) {
  return { title: content.title, language: content.language, level: content.level, objective: content.objective,
    instructions: content.steps.map(s => `${s.stage}: ${s.activity}`).join('\n'), exercise_type: content.exercise_type,
    questions: content.questions.map(q => ({ ...q, ...(content.exercise_type === 'matching' ? { answer: [...q.right] } : {}) })),
    settings: { max_attempts: 1, academic_ai_run: requestId, correction: { mode: 'teacher_only', timing: 'after_submission' } },
    academicSources: sources.map(s => ({ title: s.title, locator: s.locator, reason: s.reason })) }
}
