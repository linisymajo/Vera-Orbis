import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readEnrollmentAccess, EnrollmentServiceError, isEnrollmentServiceUnavailable,
  ENROLLMENT_UNAVAILABLE_COOLDOWN_MS, renderEnrollmentServiceError,
  initializeEnrollmentProfile, createStudentInvitation
} from '../src/lib/enrollment.js'

const approved = (id = 'student-a') => ({ student_id: id, role: 'student', status: 'approved', email_verified: true, academic_access: true })
const missing = { error: { code: 'PGRST202', message: 'Could not find public.get_my_enrollment() in the schema cache. private@example.test SECRET_TOKEN' }, status: 404 }
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
const memoryStorage = () => {
  const records = new Map()
  return { records, getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, String(value)), removeItem: key => records.delete(key) }
}
function fixture(project, response = { data: approved() }, user = { id: 'student-a' }) {
  const calls = { auth: 0, rpc: [], cachedSession: 0 }
  const client = {
    supabaseUrl: `https://${project}.supabase.co`,
    user, response,
    auth: {
      async getUser() { calls.auth++; return { data: { user: client.user } } },
      async getSession() { calls.cachedSession++; throw new Error('Cached session must never authorize enrollment.') }
    },
    async rpc(...args) {
      calls.rpc.push(args)
      return typeof client.response === 'function' ? client.response() : client.response
    },
    schema() { throw new Error('Do not change the public RPC schema.') }
  }
  return { client, calls }
}

test('missing zero-argument public RPC is a typed availability error, with a failure-only cooldown', async () => {
  const storage = memoryStorage()
  const { client, calls } = fixture('missing-rpc', missing)
  await assert.rejects(readEnrollmentAccess(client, { storage }), error => {
    assert.ok(error instanceof EnrollmentServiceError)
    assert.equal(isEnrollmentServiceUnavailable(error), true)
    assert.equal(error.reason, 'backend_unavailable')
    assert.equal(error.code, 'PGRST202')
    assert.equal(error.rpc, 'get_my_enrollment')
    assert.equal(error.projectRef, 'missing-rpc')
    assert.equal(error.cooldown, false)
    assert.ok(error.retryAt > Date.now())
    assert.match(error.message, /administrator update/)
    assert.doesNotMatch(error.message, /private@|SECRET_TOKEN|migration missing/i)
    return true
  })
  await assert.rejects(readEnrollmentAccess(client, { storage }), error => error.cooldown === true)
  assert.deepEqual(calls.rpc, [['get_my_enrollment']])
  assert.equal(calls.auth, 2, 'each access still verifies the session before consulting the failure circuit')
  assert.equal(calls.cachedSession, 0)
  const persisted = JSON.stringify([...storage.records])
  assert.doesNotMatch(persisted, /student-a|private@|SECRET_TOKEN|academic_access|approved/)
  assert.match(persisted, /missing-rpc.*get_my_enrollment/)
})

test('concurrent reads coalesce only the active request and never cache an approved authorization decision', async () => {
  const response = deferred()
  const { client, calls } = fixture('in-flight', () => response.promise)
  const first = readEnrollmentAccess(client)
  const second = readEnrollmentAccess(client)
  await Promise.resolve()
  assert.equal(calls.auth, 2)
  assert.equal(calls.rpc.length, 1)
  response.resolve({ data: approved() })
  const [a, b] = await Promise.all([first, second])
  assert.deepEqual(a, approved())
  assert.deepEqual(b, approved())
  assert.notEqual(a, b)
  client.response = { data: { ...approved(), status: 'suspended', academic_access: false } }
  assert.equal((await readEnrollmentAccess(client)).academic_access, false)
  assert.equal(calls.rpc.length, 2, 'a completed approved result cannot authorize another call')
})

test('different verified users never share an in-flight authorization result', async () => {
  const a = deferred()
  const b = deferred()
  const { client, calls } = fixture('user-isolation')
  client.response = () => calls.rpc.length === 1 ? a.promise : b.promise
  const first = readEnrollmentAccess(client)
  await Promise.resolve()
  client.user = { id: 'student-b', user_metadata: { role: 'admin' } }
  const second = readEnrollmentAccess(client)
  await Promise.resolve()
  assert.equal(calls.rpc.length, 2)
  a.resolve({ data: approved('student-a') })
  b.resolve({ data: approved('student-b') })
  const results = await Promise.all([first, second])
  assert.deepEqual(results.map(result => result.student_id), ['student-a', 'student-b'])
  client.response = { data: approved('student-a') }
  await assert.rejects(readEnrollmentAccess(client), error => error.reason === 'invalid_response')
})

test('a client retargeted to another project cannot reuse the first project active read', async () => {
  const firstProject = deferred()
  const secondProject = deferred()
  const { client, calls } = fixture('active-project-one')
  client.response = () => calls.rpc.length === 1 ? firstProject.promise : secondProject.promise
  const first = readEnrollmentAccess(client)
  await Promise.resolve()
  client.supabaseUrl = 'https://active-project-two.supabase.co'
  const second = readEnrollmentAccess(client)
  await Promise.resolve()
  assert.equal(calls.rpc.length, 2)
  firstProject.resolve({ data: approved() })
  secondProject.resolve({ data: { ...approved(), academic_access: false, status: 'pending' } })
  assert.equal((await first).academic_access, true)
  assert.equal((await second).academic_access, false)
})

test('failure circuit survives a same-origin page module reload, scopes projects, and cannot bypass session verification', async () => {
  const storage = memoryStorage()
  const { client } = fixture('persisted-failure', missing)
  await assert.rejects(readEnrollmentAccess(client, { storage }), isEnrollmentServiceUnavailable)
  // A fresh module has no shared memory: sessionStorage alone must preserve the circuit.
  const nextPage = await import('../src/lib/enrollment.js?availability-page-two')
  const otherUser = fixture('persisted-failure', { data: approved('student-b') }, { id: 'student-b' })
  await assert.rejects(nextPage.readEnrollmentAccess(otherUser.client, { storage }), error => error.cooldown && nextPage.isEnrollmentServiceUnavailable(error))
  assert.equal(otherUser.calls.rpc.length, 0)
  assert.equal(otherUser.calls.auth, 1)
  otherUser.client.user = null
  await assert.rejects(nextPage.readEnrollmentAccess(otherUser.client, { storage }), error => error.reason === 'session')
  assert.equal(otherUser.calls.auth, 2)
  const anotherProject = fixture('separate-project', { data: approved('student-b') }, { id: 'student-b' })
  assert.equal((await nextPage.readEnrollmentAccess(anotherProject.client, { storage })).student_id, 'student-b')
  assert.equal(anotherProject.calls.rpc.length, 1)
})

test('explicit user retry bypasses the failure cooldown once, coalesces concurrent retries, and clears only after verified success', async () => {
  const storage = memoryStorage()
  const { client, calls } = fixture('explicit-retry', missing)
  await assert.rejects(readEnrollmentAccess(client, { storage }), isEnrollmentServiceUnavailable)
  const response = deferred()
  client.response = () => response.promise
  const first = readEnrollmentAccess(client, { storage, retry: true })
  const second = readEnrollmentAccess(client, { storage, retry: true })
  await Promise.resolve()
  assert.equal(calls.rpc.length, 2)
  response.resolve({ data: approved() })
  await Promise.all([first, second])
  assert.equal(storage.records.size, 0)
  client.response = { data: approved() }
  await readEnrollmentAccess(client, { storage })
  assert.equal(calls.rpc.length, 3)
})

test('expired failure cooldown retries the backend; expired or forged storage never grants access', async t => {
  let now = 1_800_000_000_000
  t.mock.method(Date, 'now', () => now)
  const storage = memoryStorage()
  const { client, calls } = fixture('expired-cooldown', missing)
  await assert.rejects(readEnrollmentAccess(client, { storage }), isEnrollmentServiceUnavailable)
  now += ENROLLMENT_UNAVAILABLE_COOLDOWN_MS - 1
  await assert.rejects(readEnrollmentAccess(client, { storage }), error => error.cooldown)
  assert.equal(calls.rpc.length, 1)
  now += 2
  client.response = { data: approved() }
  await readEnrollmentAccess(client, { storage })
  assert.equal(calls.rpc.length, 2)
  const forgedKey = 'vo:enrollment-service:v1:https://forged-storage.supabase.co:get_my_enrollment'
  storage.setItem(forgedKey, JSON.stringify({ ...approved(), version: 1, rpc: 'get_my_enrollment', reason: 'backend_unavailable', code: 'PGRST202', failedAt: now, retryAt: now + 999_999_999 }))
  const forged = fixture('forged-storage', { data: { ...approved(), academic_access: false, status: 'pending' } })
  assert.equal((await readEnrollmentAccess(forged.client, { storage })).academic_access, false)
  assert.equal(forged.calls.rpc.length, 1)
})

test('transport and unknown failures stay distinct from missing backend and do not auto-retry or persist an availability circuit', async () => {
  const storage = memoryStorage()
  for (const [index, response] of [
    { error: { message: 'TypeError: Failed to fetch' }, status: 0 },
    { error: { message: 'Service unavailable' }, status: 503 },
    { error: { message: 'Service unavailable', status: 503 } },
    () => { throw new TypeError('fetch failed') }
  ].entries()) {
    const { client, calls } = fixture(`transport-${index}`, response)
    for (let count = 1; count <= 2; count++) {
      await assert.rejects(readEnrollmentAccess(client, { storage }), error => {
        assert.ok(error instanceof EnrollmentServiceError)
        assert.equal(error.reason, 'transport')
        assert.equal(isEnrollmentServiceUnavailable(error), false)
        return true
      })
      assert.equal(calls.rpc.length, count)
    }
  }
  const unknown = fixture('unknown-error', { error: { code: '42501', message: 'Migration missing' }, status: 403 })
  await assert.rejects(readEnrollmentAccess(unknown.client, { storage }), error => error.reason === 'request' && /Migration missing/.test(error.message))
  assert.equal(storage.records.size, 0)
})

test('unavailable browser storage falls back to failure-only memory without crashing', async () => {
  const storage = { getItem() { throw new Error('Disabled') }, setItem() { throw new Error('Disabled') }, removeItem() { throw new Error('Disabled') } }
  const { client, calls } = fixture('storage-disabled', missing)
  await assert.rejects(readEnrollmentAccess(client, { storage }), isEnrollmentServiceUnavailable)
  await assert.rejects(readEnrollmentAccess(client, { storage }), error => error.cooldown)
  assert.equal(calls.rpc.length, 1)
  // Clients lacking an identifiable project never share a circuit by accident.
  const anonymous = fixture('unused', { data: approved() })
  delete anonymous.client.supabaseUrl
  assert.equal((await readEnrollmentAccess(anonymous.client, { storage })).academic_access, true)
})

test('malformed, mismatched and unverified results fail closed without creating an approved cache', async () => {
  const storage = memoryStorage()
  const { client, calls } = fixture('malformed-result')
  for (const data of [null, [], true, 'approved', {}, { ...approved(), student_id: 'other' }, { ...approved(), academic_access: 'true' }, { ...approved(), email_verified: 1 }, { ...approved(), role: 'owner' }, { ...approved(), status: 'invited' }]) {
    client.response = { data }
    await assert.rejects(readEnrollmentAccess(client, { storage }), error => error.reason === 'invalid_response')
  }
  client.response = { data: { ...approved(), email_verified: false } }
  assert.equal((await readEnrollmentAccess(client, { storage })).academic_access, false)
  client.auth.getUser = async () => ({ error: { status: 401, message: 'Expired session' }, data: { user: client.user } })
  await assert.rejects(readEnrollmentAccess(client, { storage }), error => error.reason === 'session')
  assert.equal(calls.cachedSession, 0)
  assert.equal(storage.records.size, 0)
})

test('enrollment writes are single attempts and never reuse or populate the enrollment-read circuit', async () => {
  const { client, calls } = fixture('writes-no-retry', missing)
  await assert.rejects(initializeEnrollmentProfile(client), error => isEnrollmentServiceUnavailable(error) && error.rpc === 'initialize_student_profile')
  assert.deepEqual(calls.rpc, [['initialize_student_profile']])
  client.response = () => { throw new TypeError('fetch failed') }
  await assert.rejects(createStudentInvitation(client, 'person@example.test'), error => error.reason === 'transport')
  assert.equal(calls.rpc.length, 2)
  client.response = { data: approved() }
  assert.equal((await readEnrollmentAccess(client)).academic_access, true)
  assert.equal(calls.rpc.length, 3)
})

test('service error renderer is idle until an explicit retry and disables its button during the request', async () => {
  const elements = new Map(['retry', 'signout', 'message', 'details', 'status'].map(name => [name, {
    disabled: false, textContent: '', listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler }
  }]))
  const app = { innerHTML: '', querySelector(selector) { return elements.get(selector.replace('#enrollment-service-', '')) } }
  const pending = deferred()
  let retries = 0
  renderEnrollmentServiceError(new EnrollmentServiceError('private SQL', { reason: 'backend_unavailable', code: 'PGRST202', projectRef: 'support-project' }), {
    app, onRetry: () => { retries++; return pending.promise }
  })
  assert.equal(retries, 0)
  assert.match(app.innerHTML, /support-project/)
  assert.doesNotMatch(app.innerHTML, /private SQL/)
  const button = elements.get('retry')
  const attempt = button.listeners.click({ currentTarget: button })
  assert.equal(retries, 1)
  assert.equal(button.disabled, true)
  assert.match(elements.get('status').textContent, /Checking/)
  await button.listeners.click({ currentTarget: button })
  assert.equal(retries, 1, 'a repeated click while pending cannot start another retry')
  pending.resolve()
  await attempt
  assert.equal(button.disabled, false)
})
