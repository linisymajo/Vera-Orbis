import { escapeHtml } from './auth.js'

const INVITATION_KEY = 'vo_pending_invitation'
const TOKEN_PATTERN = /^[a-f0-9]{64}$/
const ACCESS_RPC = 'get_my_enrollment'
export const ENROLLMENT_UNAVAILABLE_COOLDOWN_MS = 60_000
const SERVICE_CACHE_VERSION = 1
const clientReadState = new WeakMap()
const projectFailures = new Map()

/** An enrollment check failed; this never represents an authorization decision. */
export class EnrollmentServiceError extends Error {
  constructor(message, { reason = 'request', code = 'ENROLLMENT_REQUEST_FAILED', rpc = ACCESS_RPC, projectRef = null, retryAt = null, cooldown = false } = {}) {
    super(message)
    this.name = 'EnrollmentServiceError'
    this.reason = reason
    this.code = code
    this.rpc = rpc
    this.projectRef = projectRef
    this.retryAt = retryAt
    this.cooldown = cooldown
  }
}

export function isEnrollmentServiceUnavailable(error) {
  return error instanceof EnrollmentServiceError && error.reason === 'backend_unavailable'
}

function enrollmentProject(client) {
  try {
    const url = new URL(client.supabaseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    // Origins exclude keys, URL credentials, paths and query strings.
    const match = url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)
    return { key: url.origin, ref: match ? match[1].toLowerCase() : null }
  } catch { return null }
}

function readState(client) {
  let state = clientReadState.get(client)
  if (!state) {
    state = { inFlight: new Map(), failure: null }
    clientReadState.set(client, state)
  }
  return state
}

function sessionStorageSafely(storage) {
  if (storage !== undefined) return storage
  try { return globalThis.sessionStorage } catch { return null }
}

function failureKey(project) {
  return `vo:enrollment-service:v${SERVICE_CACHE_VERSION}:${project.key}:${ACCESS_RPC}`
}

function validFailure(value, now) {
  return value?.version === SERVICE_CACHE_VERSION && value.rpc === ACCESS_RPC
    && value.reason === 'backend_unavailable' && value.code === 'PGRST202'
    && Number.isSafeInteger(value.failedAt) && Number.isSafeInteger(value.retryAt)
    && value.failedAt <= now && value.retryAt - value.failedAt === ENROLLMENT_UNAVAILABLE_COOLDOWN_MS
    && value.retryAt > now
}

function storedFailure(project, state, storage, now) {
  const memory = project ? projectFailures.get(project.key) : state.failure
  if (validFailure(memory, now)) return memory
  if (project) projectFailures.delete(project.key)
  else state.failure = null
  if (!project) return null
  try {
    const value = JSON.parse(storage?.getItem(failureKey(project)) || 'null')
    if (validFailure(value, now)) {
      projectFailures.set(project.key, value)
      return value
    }
    storage?.removeItem(failureKey(project))
  } catch { /* Storage can be disabled; the in-memory failure circuit still works. */ }
  return null
}

function saveFailure(project, state, storage, now) {
  // Persist service availability only. Never persist a user, session or access result.
  const failure = { version: SERVICE_CACHE_VERSION, rpc: ACCESS_RPC, reason: 'backend_unavailable', code: 'PGRST202', failedAt: now, retryAt: now + ENROLLMENT_UNAVAILABLE_COOLDOWN_MS }
  if (project) {
    projectFailures.set(project.key, failure)
    try { storage?.setItem(failureKey(project), JSON.stringify(failure)) } catch {}
  } else state.failure = failure
  return failure
}

function clearFailure(project, state, storage) {
  state.failure = null
  if (project) {
    projectFailures.delete(project.key)
    try { storage?.removeItem(failureKey(project)) } catch {}
  }
}

function serviceError(error, name, project, status = error?.status) {
  if (error instanceof EnrollmentServiceError) return error
  if (error?.code === 'PGRST202') {
    return new EnrollmentServiceError('We couldn’t verify your enrollment. This service needs an administrator update. Your access stays protected.', {
      reason: 'backend_unavailable', code: 'PGRST202', rpc: name, projectRef: project?.ref || null
    })
  }
  const transport = status === 0 || status === 408 || status === 429 || status >= 500
    || /^PGRST00[0-3]$/.test(error?.code || '') || error?.name === 'AbortError'
    || /failed to fetch|fetch failed|network(?: request)? (?:failed|error)|networkerror|timed? ?out|load failed|ECONNRESET|ECONNREFUSED|ENOTFOUND/i.test(error?.message || '')
  if (transport) {
    return new EnrollmentServiceError('We couldn’t connect to the enrollment service. Check your connection and try again. Your access stays protected.', {
      reason: 'transport', code: 'ENROLLMENT_TRANSPORT_ERROR', rpc: name, projectRef: project?.ref || null
    })
  }
  // Preserve existing callers' useful unknown-error diagnostics, but do not render raw SQL.
  return new EnrollmentServiceError(error?.message || 'Enrollment request failed.', {
    reason: 'request', code: 'ENROLLMENT_REQUEST_FAILED', rpc: name, projectRef: project?.ref || null
  })
}

function verifiedAccess(result, userId) {
  if (!result || Array.isArray(result) || result.student_id !== userId || typeof result.academic_access !== 'boolean'
      || typeof result.email_verified !== 'boolean'
      || !['student', 'teacher', 'admin'].includes(result.role)
      || !['pending', 'approved', 'rejected', 'suspended'].includes(result.status)) {
    throw new EnrollmentServiceError('Enrollment access could not be verified.', { reason: 'invalid_response', code: 'ENROLLMENT_INVALID_RESPONSE' })
  }
  return { ...result, academic_access: result.academic_access && result.email_verified && (result.status === 'approved' || ['teacher', 'admin'].includes(result.role)) }
}

export function captureEnrollmentInvitation(location = globalThis.window?.location, storage = globalThis.sessionStorage, history = globalThis.history) {
  if (!location?.href) return null
  const url = new URL(location.href)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))
  const token = url.searchParams.get('invitation') || fragment.get('invitation')
  if (token) {
    if (!TOKEN_PATTERN.test(token)) throw new Error('Invalid enrollment invitation.')
    storage?.setItem(INVITATION_KEY, token)
    url.searchParams.delete('invitation')
    fragment.delete('invitation')
    url.hash = fragment.toString()
    history?.replaceState(null, '', url.toString())
  }
  const saved = token || storage?.getItem(INVITATION_KEY)
  return TOKEN_PATTERN.test(saved || '') ? saved : null
}

export function invitationRegistrationUrl(origin, token) {
  if (!TOKEN_PATTERN.test(token || '')) throw new Error('Invalid invitation token.')
  const url = new URL('/register.html', origin)
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Invitation links require HTTPS.')
  }
  // The fragment is not sent in HTTP requests or Referer headers.
  url.hash = new URLSearchParams({ invitation: token }).toString()
  return url.toString()
}

async function rpc(client, name, args) {
  // Writes are attempted exactly once; ambiguous persistence requires explicit reconciliation.
  const project = enrollmentProject(client)
  let response
  try { response = args === undefined ? await client.rpc(name) : await client.rpc(name, args) }
  catch (error) { throw serviceError(error, name, project) }
  if (response?.error) throw serviceError(response.error, name, project, response.status)
  if (response?.data == null) throw new Error('Enrollment persistence could not be confirmed.')
  return response.data
}

export async function readEnrollmentAccess(client, { retry = false, storage } = {}) {
  const project = enrollmentProject(client)
  let session
  try { session = await client.auth.getUser() }
  catch (error) { throw serviceError(error, 'auth.getUser', project) }
  if (session?.error || typeof session?.data?.user?.id !== 'string' || !session.data.user.id) {
    if (session?.error) {
      const error = serviceError(session.error, 'auth.getUser', project, session.error.status)
      if (error.reason === 'transport') throw error
    }
    throw new EnrollmentServiceError('A verified session is required.', { reason: 'session', code: 'ENROLLMENT_SESSION_REQUIRED' })
  }
  const userId = session.data.user.id
  const state = readState(client)
  const requestKey = JSON.stringify([project?.key || null, userId])
  const pending = state.inFlight.get(requestKey)
  if (pending) return verifiedAccess(await pending, userId)
  const store = sessionStorageSafely(storage)
  const failure = storedFailure(project, state, store, Date.now())
  if (!retry && failure) {
    const error = serviceError({ code: failure.code }, ACCESS_RPC, project)
    error.retryAt = failure.retryAt
    error.cooldown = true
    throw error
  }
  const request = (async () => {
    let response
    try {
      // Do not change schema or invent parameters: this public RPC takes zero arguments.
      response = await client.rpc(ACCESS_RPC)
    } catch (error) { throw serviceError(error, ACCESS_RPC, project) }
    if (response?.error) throw serviceError(response.error, ACCESS_RPC, project, response.status)
    verifiedAccess(response?.data, userId)
    clearFailure(project, state, store)
    return response.data
  })().catch(error => {
    if (isEnrollmentServiceUnavailable(error)) {
      error.retryAt = saveFailure(project, state, store, Date.now()).retryAt
    }
    throw error
  }).finally(() => { if (state.inFlight.get(requestKey) === request) state.inFlight.delete(requestKey) })
  state.inFlight.set(requestKey, request)
  // Every caller verifies its session; only an active request is shared for that identity.
  // Completed successful access decisions are never cached.
  return verifiedAccess(await request, userId)
}

export async function acceptPendingInvitation(client, token, storage = globalThis.sessionStorage) {
  if (!token) return null
  if (!TOKEN_PATTERN.test(token)) throw new Error('Invalid enrollment invitation.')
  const result = await rpc(client, 'accept_student_invitation', { p_token: token })
  if (result?.academic_access !== true || result?.email_verified !== true) {
    throw new Error('Invitation approval could not be confirmed.')
  }
  storage?.removeItem(INVITATION_KEY)
  return result
}

export async function initializeEnrollmentProfile(client) {
  const profileId = await rpc(client, 'initialize_student_profile')
  if (typeof profileId !== 'string') throw new Error('Profile initialization could not be confirmed.')
  return profileId
}

export async function createStudentInvitation(client, email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email.')
  const result = await rpc(client, 'create_student_invitation', { p_email: normalized })
  if (!result.id || !TOKEN_PATTERN.test(result.token || '') || !result.expires_at) {
    throw new Error('Invitation persistence could not be confirmed.')
  }
  return result
}

export async function reviewEnrollment(client, studentId, approve, teacherId = null) {
  if (!studentId || (approve && !teacherId)) throw new Error('Assign a teacher before approval.')
  const result = await rpc(client, 'review_student_enrollment', {
    p_student_id: studentId, p_approve: Boolean(approve), p_teacher_id: approve ? teacherId : null
  })
  if (result.student_id !== studentId || result.status !== (approve ? 'approved' : 'rejected')) {
    throw new Error('Enrollment review could not be confirmed.')
  }
  return result
}

export function renderEnrollmentServiceError(error, { app = globalThis.document?.querySelector('#app'), client, onRetry } = {}) {
  if (!app) return
  const messageFor = failure => isEnrollmentServiceUnavailable(failure)
    ? 'We couldn’t verify your enrollment. This service needs an administrator update. Your access stays protected.'
    : failure?.reason === 'transport'
      ? 'We couldn’t connect to the enrollment service. Check your connection and try again. Your access stays protected.'
      : failure?.code === 'ENROLLMENT_SESSION_CHANGED'
        ? 'Your account changed while we were checking enrollment. Check availability to continue with your current account.'
        : 'We couldn’t verify your enrollment. Please try again or contact the Vera Orbis team. Your access stays protected.'
  const supportDetails = failure => {
    const code = failure instanceof EnrollmentServiceError ? failure.code : 'ENROLLMENT_REQUEST_FAILED'
    const project = failure instanceof EnrollmentServiceError && /^[a-z0-9-]+$/.test(failure.projectRef || '') ? ` · Project: ${failure.projectRef}` : ''
    return `Support: ${code}${project}`
  }
  app.innerHTML = `<main class="loading-screen" style="min-height:100vh;display:grid;place-content:center;padding:32px;text-align:center;gap:16px">
    <h1>Enrollment verification unavailable</h1>
    <p id="enrollment-service-message" role="alert">${escapeHtml(messageFor(error))}</p>
    <p id="enrollment-service-details">${escapeHtml(supportDetails(error))}</p>
    <p id="enrollment-service-status" role="status" aria-live="polite"></p>
    ${typeof onRetry === 'function' ? '<button type="button" id="enrollment-service-retry">Check availability</button>' : ''}
    ${client?.auth?.signOut ? '<button type="button" id="enrollment-service-signout">Sign out</button>' : ''}
  </main>`
  app.querySelector('#enrollment-service-retry')?.addEventListener('click', async event => {
    const button = event.currentTarget
    if (button.disabled) return
    button.disabled = true
    const status = app.querySelector('#enrollment-service-status')
    if (status) status.textContent = 'Checking enrollment availability…'
    try {
      // The caller owns navigation and invokes readEnrollmentAccess(client, { retry: true }).
      await onRetry()
      if (status) status.textContent = 'Availability check completed.'
    } catch (failure) {
      const message = app.querySelector('#enrollment-service-message')
      const details = app.querySelector('#enrollment-service-details')
      if (message) message.textContent = messageFor(failure)
      if (details) details.textContent = supportDetails(failure)
      if (status) status.textContent = 'Enrollment could not be verified.'
    } finally { button.disabled = false }
  })
  app.querySelector('#enrollment-service-signout')?.addEventListener('click', async event => {
    const button = event.currentTarget
    button.disabled = true
    try {
      const { error: signOutError } = await client.auth.signOut()
      if (signOutError) throw signOutError
      globalThis.location?.replace('/login.html')
    } catch {
      const status = app.querySelector('#enrollment-service-status')
      if (status) status.textContent = 'Sign out could not be confirmed. Please try again.'
    } finally { button.disabled = false }
  })
}

export function renderEnrollmentGate(access, { app = globalThis.document?.querySelector('#app'), client } = {}) {
  if (!app) return
  const message = !access.email_verified
    ? 'Confirma tu correo electrónico antes de continuar.'
    : access.status === 'pending'
      ? 'Tu cuenta está pendiente de aprobación. Puedes completar tus metas mientras el equipo revisa tu inscripción.'
      : 'Tu inscripción requiere revisión del equipo de Vera Orbis.'
  app.innerHTML = `<main class="loading-screen" style="min-height:100vh;display:grid;place-content:center;padding:32px;text-align:center;gap:16px">
    <h1>Tu viaje está siendo preparado</h1>
    <p>${escapeHtml(message)}</p>
    <p id="enrollment-message" role="status" aria-live="polite"></p>
    ${access.email_verified && access.status === 'pending' ? '<a href="/onboarding.html">Completar mis metas</a>' : ''}
    ${!access.email_verified ? '<button type="button" id="enrollment-resend">Reenviar confirmación</button>' : ''}
    <button type="button" id="enrollment-retry">Revisar mi acceso</button>
    <button type="button" id="enrollment-signout">Cerrar sesión</button>
  </main>`
  app.querySelector('#enrollment-retry')?.addEventListener('click', () => globalThis.location.reload())
  app.querySelector('#enrollment-signout')?.addEventListener('click', async () => {
    const { error } = await client.auth.signOut()
    if (error) { app.querySelector('#enrollment-message').textContent = error.message; return }
    globalThis.location.replace('/login.html')
  })
  app.querySelector('#enrollment-resend')?.addEventListener('click', async (event) => {
    const button = event.currentTarget
    button.disabled = true
    try {
      const { data, error: userError } = await client.auth.getUser()
      if (userError || !data?.user?.email) throw new Error('Inicia sesión de nuevo.')
      const { error } = await client.auth.resend({ type: 'signup', email: data.user.email })
      if (error) throw error
      app.querySelector('#enrollment-message').textContent = 'Solicitud enviada. Revisa tu correo.'
    } catch (error) {
      app.querySelector('#enrollment-message').textContent = error.message
    } finally { button.disabled = false }
  })
}
