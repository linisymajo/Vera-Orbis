import { validateDraftContent, validateDraftRequest } from '../../supabase/functions/academic-ai/core.js'

// Presentation switch only. The server independently enforces provider setup,
// consent, authorization and quotas on every generation request.
export function academicAIGenerationEnabled() {
  return import.meta.env?.VITE_ACADEMIC_AI_ENABLED === 'true'
}

async function rpc(client, name, params) {
  const { data, error } = await client.rpc(name, params)
  if (error) throw new Error(error.message || 'Academic AI database operation failed.')
  if (data == null) throw new Error('The saved academic AI record could not be confirmed.')
  return data
}

export async function requestAcademicDraft(client, request) {
  const input = validateDraftRequest(request)
  const { data, error } = await client.functions.invoke('academic-ai', { body: input })
  if (error) {
    let message = error.message || 'Academic AI is unavailable.'
    if (error.context?.json) {
      try { message = (await error.context.json()).message || message } catch { /* Preserve the transport error. */ }
    }
    throw new Error(message)
  }
  if (!data?.draft?.id || data.draft.status !== 'draft') throw new Error(data?.message || 'The generated draft could not be confirmed.')
  validateDraftContent(data.draft.content, data.draft.kind)
  return data.draft
}

export async function listAcademicDrafts(client) {
  const { data, error } = await client.from('ai_academic_drafts').select('id,student_id,kind,content,status,created_at,reviewed_at').order('created_at', { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  return data || []
}

export async function saveAcademicDraft(client, { id, content, kind }) {
  const saved = await rpc(client, 'review_academic_ai_draft', { p_draft_id: id, p_content: validateDraftContent(content, kind), p_status: 'draft' })
  if (saved.id !== id || saved.status !== 'draft') throw new Error('The edited AI draft could not be confirmed.')
  return saved
}

export async function approveAcademicDraft(client, { id, content, kind }) {
  const saved = await rpc(client, 'review_academic_ai_draft', { p_draft_id: id, p_content: validateDraftContent(content, kind), p_status: 'approved' })
  if (saved.id !== id || saved.status !== 'approved') throw new Error('AI draft approval could not be confirmed.')
  return saved
}

export async function setAcademicAIConsent(client, allowed) {
  if (typeof allowed !== 'boolean') throw new Error('Choose whether to allow external AI processing.')
  const saved = await rpc(client, 'set_academic_ai_consent', { p_allowed: allowed })
  if (saved.allowed !== allowed) throw new Error('The AI consent change could not be confirmed.')
  return saved
}

export async function getAcademicAIConsent(client) {
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user?.id) throw new Error('Sign in to manage AI consent.')
  const { data, error } = await client.from('academic_ai_consents').select('allowed,updated_at').eq('student_id', authData.user.id).maybeSingle()
  if (error) throw new Error(error.message)
  return data || { allowed: false }
}

