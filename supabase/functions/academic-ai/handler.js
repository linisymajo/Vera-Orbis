import { AcademicAIError, generateAcademicDraft, readLimitedJson } from './core.js'
import { createOpenAIProvider } from './provider.js'
import { generateLearningArchitect } from './learning-architect.js'
import { createGeminiProvider, GEMINI_ARCHITECT_MODEL } from './gemini-provider.js'
import { authorizeAdultArchitectTeacher } from './teacher-access.js'

// Deployment must keep Supabase's verify_jwt enabled. Additionally validate the
// session against Auth, and use only the caller's JWT for every database RPC.
export function createAcademicAIHandler({ env, createClient, providerFactory = createOpenAIProvider, geminiProviderFactory = createGeminiProvider, GoogleGenAI }) {
  return async (request) => {
  const allowed = (env('ACADEMIC_AI_ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
  const origin = request.headers.get('Origin')
  const headers = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (origin && !allowed.includes(origin)) return Response.json({ error: 'origin_denied', message: 'Origin is not allowed.' }, { status: 403, headers })
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed', message: 'Use POST.' }, { status: 405, headers })
  try {
    const authorization = request.headers.get('Authorization') ?? ''
    if (!/^Bearer [^\s]+$/i.test(authorization)) throw new AcademicAIError('unauthenticated', 'Sign in to generate a draft.', 401)
    const url = env('SUPABASE_URL')
    const key = env('SUPABASE_ANON_KEY')
    if (!url || !key) throw new AcademicAIError('configuration', 'Academic AI is not configured.', 503)
    const client = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
    if (error || !data.user?.id) throw new AcademicAIError('unauthenticated', 'Your session could not be verified.', 401)
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new AcademicAIError('invalid_content_type', 'Use a JSON request body.', 415)
    const input = await readLimitedJson(request, 8192)
    if (input?.mode === 'learning_architect') {
      if (env('ACADEMIC_AI_ARCHITECT_ENABLED') !== 'true' || env('ACADEMIC_AI_PROVIDER') !== 'gemini' || env('ACADEMIC_AI_FREE_TIER_CONFIRMED') !== 'true') throw new AcademicAIError('not_configured', 'Gemini Learning Architect is disabled until free-tier staging testing is configured.', 503)
      await authorizeAdultArchitectTeacher(env, client, data.user)
      // The shared staging project is a synthetic test client only.
      if (url === 'https://duinvkphfnugoyvvlbbq.supabase.co'
        && !(env('ACADEMIC_AI_SYNTHETIC_STUDENT_IDS') || '').split(',').map(x => x.trim()).filter(Boolean).includes(input.studentId)) {
        throw new AcademicAIError('privacy_gate', 'Staging generation is restricted to authorized synthetic fixtures.', 403)
      }
      const provider = geminiProviderFactory({ apiKey: env('GEMINI_API_KEY'), model: env('ACADEMIC_AI_MODEL') || GEMINI_ARCHITECT_MODEL, GoogleGenAI })
      const version = await generateLearningArchitect(client, input, provider)
      return Response.json({ version }, { status: 201, headers })
    }
    if (env('ACADEMIC_AI_ENABLED') !== 'true' || env('ACADEMIC_AI_PROVIDER') !== 'openai') throw new AcademicAIError('not_configured', 'Academic AI is disabled until the provider and consent settings are configured.', 503)
    const provider = providerFactory({ apiKey: env('OPENAI_API_KEY'), model: env('ACADEMIC_AI_MODEL') })
    const draft = await generateAcademicDraft(client, input, provider)
    return Response.json({ draft }, { status: 201, headers })
  } catch (error) {
    const safe = error instanceof AcademicAIError ? error : new AcademicAIError('unavailable', 'Academic AI is temporarily unavailable.', 503)
    return Response.json({ error: safe.code, message: safe.message }, { status: safe.status, headers })
  }
  }
}
