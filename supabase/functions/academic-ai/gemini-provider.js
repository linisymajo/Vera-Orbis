// Server only. Official Google GenAI SDK; no browser imports, tools or retries.
import { AcademicAIError, readLimitedJson } from './core.js'
import { buildArchitectProviderRequest } from './learning-architect.js'

export const GEMINI_ARCHITECT_MODEL = 'gemini-3.1-flash-lite'
const ORIGIN = 'https://generativelanguage.googleapis.com'

export function createGeminiProvider({ apiKey, model = GEMINI_ARCHITECT_MODEL, GoogleGenAI, fetchImpl = fetch, timeoutMs = 90000 }) {
  if (!apiKey || model !== GEMINI_ARCHITECT_MODEL) throw new AcademicAIError('configuration', 'Configure GEMINI_API_KEY and the reviewed Gemini Flash-Lite model.', 503)
  return async (request, context) => {
    if (request.mode !== 'learning_architect') throw new AcademicAIError('unsupported_task', 'This Gemini adapter supports Learning Architect only.', 400)
    const Constructor = GoogleGenAI || (await import('@google/genai')).GoogleGenAI
    const payload = buildArchitectProviderRequest(request, context, model)
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), Math.min(90000, Math.max(1, timeoutMs)))
    try {
      const safeFetch = async (resource, options) => {
        const url = new URL(typeof resource === 'string' || resource instanceof URL ? resource.toString() : resource.url)
        if (url.origin !== ORIGIN || url.pathname !== '/v1beta/models/' + model + ':generateContent' || url.search) throw new AcademicAIError('configuration', 'Unapproved Gemini endpoint.', 503)
        const response = await fetchImpl(resource, options)
        if (!response.ok) {
          await response.body?.cancel().catch(() => {})
          return Response.json({ error: { code: response.status, message: 'Gemini request failed.' } }, { status: response.status })
        }
        return Response.json(await readLimitedJson(response, 240000))
      }
      const client = new Constructor({ apiKey, vertexai: false, httpOptions: { apiVersion: 'v1beta', baseUrl: ORIGIN, timeout: Math.min(90000, Math.max(1, timeoutMs)), retryOptions: { attempts: 1 }, fetch: safeFetch } })
      const result = await client.models.generateContent({ model, contents: payload.input, config: {
        systemInstruction: payload.instructions, responseMimeType: 'application/json', responseJsonSchema: payload.text.format.schema,
        candidateCount: 1, maxOutputTokens: payload.max_output_tokens, abortSignal: controller.signal,
      } })
      if (result.promptFeedback?.blockReason && result.promptFeedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED') throw new AcademicAIError('provider_refusal', 'Gemini declined this generation request.', 422)
      if (!Array.isArray(result.candidates) || result.candidates.length !== 1) throw new AcademicAIError('invalid_output', 'Gemini returned no complete study plan.', 502)
      const candidate = result.candidates[0]
      if (candidate.finishReason !== 'STOP') throw new AcademicAIError('incomplete_output', 'Gemini output was incomplete or blocked; no plan was saved.', 502)
      const parts = candidate.content?.parts
      if (!Array.isArray(parts) || !parts.length || parts.some(p => typeof p.text !== 'string' || p.thought || Object.keys(p).some(k => !['text', 'thoughtSignature'].includes(k)))) throw new AcademicAIError('invalid_output', 'Gemini returned unexpected structured content.', 502)
      let content
      try { content = JSON.parse(parts.map(p => p.text).join('')) } catch { throw new AcademicAIError('invalid_output', 'Gemini returned invalid structured JSON.', 502) }
      const usage = result.usageMetadata, inputTokens = usage?.promptTokenCount, visible = usage?.candidatesTokenCount, thinking = usage?.thoughtsTokenCount ?? 0
      if (![inputTokens, visible, thinking].every(n => Number.isInteger(n) && n >= 0) || inputTokens > 40000 || visible + thinking > payload.max_output_tokens) throw new AcademicAIError('invalid_usage', 'Gemini usage accounting could not be confirmed.', 502)
      return { content, inputTokens, outputTokens: visible + thinking }
    } catch (error) {
      if (error instanceof AcademicAIError) throw error
      if (error?.status === 400) throw new AcademicAIError('provider_request_rejected', 'Gemini rejected the study-plan request format. No plan was saved.', 502)
      if ([401, 403, 404].includes(error?.status)) throw new AcademicAIError('provider_configuration', 'Gemini access or model configuration requires a server-side update. No plan was saved.', 503)
      throw new AcademicAIError(error?.status === 429 ? 'rate_limit' : 'provider_unavailable', error?.status === 429 ? 'Gemini quota reached. No automatic retry was made.' : 'Gemini could not complete the request. No plan was approved or published.', error?.status === 429 ? 429 : 502)
    } finally { clearTimeout(timeout) }
  }
}
