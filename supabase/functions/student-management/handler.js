const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
const refs = new Set(['iopgzmvaqobigjwibual', 'duinvkphfnugoyvvlbbq'])
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { safeCode: code, status }) }
async function readBody(request) {
  const reader = request.body?.getReader(); if (!reader) fail('REQUEST_REQUIRED')
  const chunks = []; let size = 0
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); fail('REQUEST_TOO_LARGE', 413) }; chunks.push(value) } }
  finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) } catch { fail('INVALID_REQUEST') }
}
function validFile(file, studentId) {
  if (!file || !uuid(file.id) || !['materials', 'academic-submissions'].includes(file.bucket) || typeof file.path !== 'string' || file.path.length > 1024 || /[\x00-\x1f\\]/.test(file.path) || file.path.split('/').some(x => !x || x === '.' || x === '..')) fail('UNSAFE_FILE_MANIFEST', 409)
  if (!uuid(file.path.split('/')[0]) || (file.bucket === 'academic-submissions' && file.path.split('/')[0] !== studentId)) fail('UNSAFE_FILE_MANIFEST', 409)
}
async function rpc(client, name, params) {
  const result = await client.rpc(name, params)
  if (result.error) fail(result.error.code === '42501' ? 'AUTHORIZATION_OR_RETENTION_BLOCK' : result.error.code === '40001' ? 'REVIEW_CHANGED_RECORDS' : result.error.code === '55P03' ? 'ALREADY_PROCESSING' : 'OPERATION_NOT_CONFIRMED', 409)
  return result.data
}
export function createStudentManagementHandler({ env, createClient }) {
  return async request => {
    const origin = request.headers.get('Origin'), allowed = (env('STUDENT_MANAGEMENT_ALLOWED_ORIGINS') || '').split(',').map(x => x.trim()).filter(Boolean)
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', ...(origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'POST,OPTIONS' } : {}) }
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers })
    let worker, job
    try {
      if (!origin || !allowed.includes(origin)) fail('ORIGIN_NOT_ALLOWED', 403)
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
      if (request.method !== 'POST') fail('METHOD_NOT_ALLOWED', 405)
      const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1]; if (!token || token.length > 8192) fail('SIGN_IN_REQUIRED', 401)
      const url = env('SUPABASE_URL'), key = env('SUPABASE_ANON_KEY'); let ref
      try { const parsed = new URL(url); ref = parsed.hostname.replace(/\.supabase\.co$/, ''); if (parsed.protocol !== 'https:' || parsed.hostname !== ref + '.supabase.co' || !refs.has(ref)) fail('SERVER_CONFIGURATION_REQUIRED', 503) } catch { fail('SERVER_CONFIGURATION_REQUIRED', 503) }
      if (!key) fail('SERVER_CONFIGURATION_REQUIRED', 503)
      const client = createClient(url, key, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } })
      const auth = await client.auth.getUser(token); if (auth.error || !uuid(auth.data?.user?.id) || !auth.data.user.email_confirmed_at) fail('VERIFIED_SIGN_IN_REQUIRED', 401)
      const admin = await client.rpc('is_academic_admin'); if (admin.error || admin.data !== true) fail('ACADEMY_ADMINISTRATOR_REQUIRED', 403)
      const input = await readBody(request)
      if (!input || typeof input !== 'object' || Array.isArray(input)) fail('INVALID_REQUEST')
      const allowedFields = { preview: ['mode', 'studentId', 'requestId'], confirm: ['mode', 'jobId', 'confirmation', 'retentionReviewed', 'sharedReviewed'], status: ['mode', 'jobId'], resume: ['mode', 'jobId'] }[input.mode]
      if (!allowedFields || Object.keys(input).some(k => !allowedFields.includes(k))) fail('INVALID_REQUEST')
      if (input.mode === 'preview') {
        if (!uuid(input.studentId) || input.studentId === auth.data.user.id || !uuid(input.requestId)) fail('STUDENT_AND_REQUEST_REQUIRED')
        const preview = await rpc(client, 'preview_student_deletion', { p_student_id: input.studentId, p_request_id: input.requestId }); return reply({ preview })
      }
      if (!uuid(input.jobId)) fail('JOB_REQUIRED')
      if (input.mode === 'status') return reply({ result: await rpc(client, 'student_deletion_status', { p_job_id: input.jobId }) })
      if (env('STUDENT_ACCOUNT_DELETION_ENABLED') !== 'true') fail('PERMANENT_DELETION_DISABLED', 503)
      if (!env('SUPABASE_SERVICE_ROLE_KEY')) fail('SERVER_CONFIGURATION_REQUIRED', 503)
      if (input.mode === 'confirm') {
        if (typeof input.confirmation !== 'string' || input.confirmation.length > 280 || input.retentionReviewed !== true || input.sharedReviewed !== true) fail('EXPLICIT_ACCOUNT_AND_RETENTION_CONFIRMATION_REQUIRED')
        await rpc(client, 'confirm_student_deletion', { p_job_id: input.jobId, p_confirmation: input.confirmation, p_retention_reviewed: true, p_shared_reviewed: true })
      }
      worker = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
      job = await rpc(worker, 'claim_student_deletion', { p_job_id: input.jobId, p_actor_id: auth.data.user.id })
      if (job.stage === 'complete') return reply({ result: { job_id: input.jobId, stage: 'complete' } })
      if (!uuid(job.lease) || !uuid(job.student_id) || job.student_id === auth.data.user.id || !Array.isArray(job.files) || job.files.length > 200) fail('SERVER_MANIFEST_REQUIRES_OPERATOR_REVIEW', 409)
      const lease = { p_job_id: input.jobId, p_lease: job.lease }
      if (job.stage === 'files') {
        // Validate the entire server manifest before the first irreversible request.
        for (const file of job.files) validFile(file, job.student_id)
        for (let index = 0; index < job.files.length; index++) {
          const file = await rpc(worker, 'validate_student_deletion_file', { ...lease, p_index: index }); validFile(file, job.student_id)
          if (file.exists) { const result = await worker.storage.from(file.bucket).remove([file.path]); if (result.error) fail('PRIVATE_FILE_CLEANUP_INCOMPLETE', 409) }
        }
        await rpc(worker, 'record_student_deletion_files', lease); job.stage = 'database'
      }
      if (job.stage === 'database') { await rpc(worker, 'cleanup_student_deletion_data', lease); job.stage = 'auth' }
      if (job.stage !== 'auth') fail('UNEXPECTED_DELETION_STAGE', 409)
      // Revalidate live administrator/lease/retention before deleting Auth. This
      // calls the existing bounded status guard without bypassing the worker.
      const adminAgain = await client.rpc('is_academic_admin'); if (adminAgain.error || adminAgain.data !== true) fail('ACADEMY_ADMINISTRATOR_REQUIRED', 403)
      await rpc(worker, 'validate_student_deletion_auth', lease)
      const existing = await worker.auth.admin.getUserById(job.student_id)
      if (existing.error && ![404, '404'].includes(existing.error.status) && existing.error.code !== 'user_not_found') fail('AUTH_CLEANUP_NOT_CONFIRMED', 409)
      if (existing.data?.user) { const removed = await worker.auth.admin.deleteUser(job.student_id, false); if (removed.error) fail('AUTH_CLEANUP_NOT_CONFIRMED', 409) }
      const result = await rpc(worker, 'finish_student_deletion', lease)
      if (result?.stage !== 'complete') fail('DELETION_NOT_CONFIRMED', 409)
      return reply({ result })
    } catch (error) {
      const code = error.safeCode || 'STUDENT_MANAGEMENT_UNAVAILABLE'
      if (worker && job?.lease) await worker.rpc('finish_student_deletion', { p_job_id: job.job_id, p_lease: job.lease, p_failure: code }).catch(() => {})
      return reply({ error: code, message: code === 'REVIEW_CHANGED_RECORDS' ? 'Records changed. Review a fresh account preview.' : code === 'AUTHORIZATION_OR_RETENTION_BLOCK' ? 'Authorization or retention protection stopped this operation.' : 'The operation was not confirmed. Check its status before an explicit retry.' }, error.status || 503)
    }
  }
}
