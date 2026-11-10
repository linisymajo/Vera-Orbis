import { AcademicAIError, buildProviderRequest, readLimitedJson } from './core.js'

// Server-only adapter. Fixed HTTPS endpoint prevents caller-controlled outbound
// URLs and credential forwarding. No automatic retries or tool execution.
export function createOpenAIProvider({ apiKey, model, fetchImpl = fetch, timeoutMs = 30000 }) {
  if (!apiKey || !model) throw new AcademicAIError('configuration', 'AI provider credentials and model are not configured.', 503)
  return async (request, context) => {
    const body = buildProviderRequest(request, context, model)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Math.min(30000, Math.max(1, timeoutMs)))
    try {
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal, redirect: 'error',
      })
      if (!response.ok) throw new AcademicAIError('provider_unavailable', 'AI provider rejected the request.', response.status === 429 ? 429 : 502)
      const result = await readLimitedJson(response)
      if (result.status !== 'completed' || !Array.isArray(result.output)) throw new AcademicAIError('incomplete_output', 'AI output was incomplete; nothing was saved.', 502)
      const parts = result.output.flatMap((item) => item.type === 'message' && item.role === 'assistant' && Array.isArray(item.content) ? item.content : [])
      if (parts.some((part) => part.type === 'refusal')) throw new AcademicAIError('provider_refusal', 'AI provider declined this generation request.', 422)
      const outputs = parts.filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      if (outputs.length !== 1) throw new AcademicAIError('invalid_output', 'AI provider returned an unexpected response.', 502)
      let content
      try { content = JSON.parse(outputs[0].text) }
      catch { throw new AcademicAIError('invalid_output', 'AI provider returned invalid structured content.', 502) }
      const inputTokens = result.usage?.input_tokens
      const outputTokens = result.usage?.output_tokens
      if (!Number.isInteger(inputTokens) || inputTokens < 0 || inputTokens > 40000 ||
          !Number.isInteger(outputTokens) || outputTokens < 0 || outputTokens > 2500) {
        throw new AcademicAIError('invalid_usage', 'AI provider returned invalid usage accounting.', 502)
      }
      return { content, inputTokens, outputTokens }
    } catch (error) {
      if (error instanceof AcademicAIError) throw error
      throw new AcademicAIError('provider_unavailable', 'AI provider timed out or could not be reached.', 502)
    } finally { clearTimeout(timeout) }
  }
}
