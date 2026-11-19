import { AcademicAIError, readLimitedJson } from './core.js'
const stopped = message => { throw new AcademicAIError('provider_disabled', message, 503) }
export function unifiedProviderStatus(env) {
  if (env('ACADEMIC_AI_UNIFIED_ENABLED') !== 'true') return { enabled: false, message: 'Student-aware generation is disabled. Review academic context and use manual planning while a provider is approved.' }
  if (env('ACADEMIC_AI_UNIFIED_PROVIDER') !== 'anthropic') return { enabled: false, message: 'Gemini remains available only in its reviewed generic mode; it cannot receive private student context. Select an approved contextual provider.' }
  for (const key of ['ACADEMIC_AI_PROVIDER_ELIGIBILITY_APPROVED', 'ACADEMIC_AI_PROCESSING_TERMS_APPROVED', 'ACADEMIC_AI_MINOR_SAFEGUARDS_APPROVED', 'ACADEMIC_AI_CONTEXT_EGRESS_APPROVED', 'ACADEMIC_AI_BILLING_APPROVED']) {
    if (env(key) !== 'true') return { enabled: false, message: 'Provider eligibility, processing terms, minor safeguards, context disclosure and spending require explicit approval.' }
  }
  if (!env('ANTHROPIC_API_KEY') || env('ACADEMIC_AI_CONTEXT_MODEL') !== 'claude-haiku-5-5') return { enabled: false, message: 'The reviewed contextual model and secure provider credential are not configured.' }
  return { enabled: true, message: 'Approved teacher-only contextual generation is configured.' }
}
export async function authorizeUnifiedTeacher(env, client, user, { adult = true } = {}) {
  const access = await client.rpc('get_my_enrollment')
  const member = await client.from('teachers').select('id').eq('id', user.id).maybeSingle()
  if (access.error || member.error || member.data?.id !== user.id || access.data?.student_id !== user.id || !['teacher', 'admin'].includes(access.data?.role) || access.data.email_verified !== true || access.data.academic_access !== true) throw new AcademicAIError('forbidden', 'Verified teacher authorization is required.', 403)
  if (adult && !(env('ACADEMIC_AI_ADULT_TEACHER_IDS') || '').split(',').map(s => s.trim()).filter(Boolean).includes(user.id)) throw new AcademicAIError('adult_teacher_required', 'Administrator-approved adult teacher eligibility is required.', 403)
}
function supportedSchema(schema) {
  const copy = structuredClone(schema)
  const walk = s => {
    if (!s || typeof s !== 'object') return
    if (s.prefixItems) {
      if (!s.items) s.items = { type: 'integer' }
      delete s.prefixItems
    }
    for (const v of Object.values(s)) if (v && typeof v === 'object') if (Array.isArray(v)) v.forEach(walk); else walk(v)
  }
  walk(copy); return copy
}
export function createAnthropicAcademicProvider({ apiKey, model = 'claude-haiku-5-5', fetchImpl = fetch, timeoutMs = 90000 } = {}) {
  if (!apiKey || model !== 'claude-haiku-5-5') stopped('Configure the explicitly reviewed contextual model and server credential.')
  return async body => {
    const payload = { model, max_tokens: Math.min(12000, body.max_output_tokens), system: body.instructions, messages: [{ role: 'user', content: body.input }], output_config: { format: { type: 'json_schema', schema: supportedSchema(body.schema) } } }
    if (new TextEncoder().encode(JSON.stringify(payload)).length > 80000) throw new AcademicAIError('context_too_large', 'Exclude less relevant context before generating.', 422)
    let response
    try {
      response = await fetchImpl('https://api.anthropic.com/v1/messages', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': apiKey }, body: JSON.stringify(payload), signal: AbortSignal.timeout(Math.min(90000, timeoutMs)) })
      if (!response.ok) {
        await response.body?.cancel()
        throw new AcademicAIError(response.status === 429 ? 'rate_limit' : 'provider_unavailable', response.status === 429 ? 'Provider request limit reached. Try later; no retry was made.' : 'The provider could not complete the request. No draft was published.', response.status === 429 ? 429 : 502)
      }
      const result = await readLimitedJson(response, 240000)
      if (result.stop_reason !== 'end_turn' || !Array.isArray(result.content) || result.content.length !== 1 || result.content[0].type !== 'text') throw Error('Incomplete result')
      const inputTokens = result.usage?.input_tokens, outputTokens = result.usage?.output_tokens
      if (!Number.isInteger(inputTokens) || inputTokens < 0 || inputTokens > 40000 || !Number.isInteger(outputTokens) || outputTokens < 0 || outputTokens > body.max_output_tokens) throw Error('Invalid usage')
      return { content: JSON.parse(result.content[0].text), inputTokens, outputTokens }
    } catch (error) {
      if (error instanceof AcademicAIError) throw error
      throw new AcademicAIError('provider_unavailable', 'The provider response was unavailable or incomplete. No automatic retry occurred.', 502)
    }
  }
}
export function selectUnifiedProvider(env, dependencies = {}) {
  const status = unifiedProviderStatus(env)
  if (!status.enabled) stopped(status.message)
  return createAnthropicAcademicProvider({ apiKey: env('ANTHROPIC_API_KEY'), model: env('ACADEMIC_AI_CONTEXT_MODEL'), ...dependencies })
}
