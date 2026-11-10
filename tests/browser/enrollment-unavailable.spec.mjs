import { test, expect } from '@playwright/test'

const localOrigin = 'http://127.0.0.1:5197'
const fixtureOrigins = new Set(['https://enrollment-fixture-a.invalid', 'https://enrollment-fixture-b.invalid'])
const studentId = '20000000-0000-4000-8000-000000000091'
const fixtureUser = {
  id: studentId, email: 'enrollment-browser-fixture@example.test',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  // Deliberately untrusted client metadata must never grant academic access.
  user_metadata: { role: 'admin', approved: true }, app_metadata: { role: 'admin' }
}

// This replaces only the connection module in the browser. The actual HTML,
// entry handlers, enrollment library and gate UI execute unchanged. There are
// no real Auth sessions, credentials, signing keys, accounts or remote services.
const fixtureConnectionModule = `
  const project = new URLSearchParams(location.search).get('enrollmentFixtureProject') === 'b' ? 'b' : 'a';
  const origin = 'https://enrollment-fixture-' + project + '.invalid';
  const listeners = new Set();
  async function response(path, options) {
    const result = await fetch(origin + path, options);
    const body = result.status === 204 ? null : await result.json();
    return {data: result.ok ? body : null, error: result.ok ? null : body, status: result.status, count: 0};
  }
  export const supabase = {
    supabaseUrl: origin,
    auth: {
      async getUser() { const result = await response('/auth/v1/user'); return {...result, data: {user: result.data}}; },
      async getSession() { const result = await this.getUser(); return {...result, data: {session: result.data.user ? {user: result.data.user} : null}}; },
      async signOut() {
        const result = await response('/auth/v1/logout', {method:'POST'});
        if (!result.error) for (const callback of listeners) callback('SIGNED_OUT', null);
        return result;
      },
      async signInWithPassword() { const result = await this.getUser(); return {...result, data:{user:result.data.user}}; },
      async resend(parameters) { return response('/auth/v1/resend', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(parameters)}); },
      onAuthStateChange(callback) { listeners.add(callback); return {data:{subscription:{unsubscribe(){listeners.delete(callback)}}}}; }
    },
    rpc(name, parameters) { return response('/rest/v1/rpc/' + encodeURIComponent(name), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(parameters || {})}); },
    from(table) {
      let single = false;
      const query = {then(resolve,reject){ return response('/rest/v1/' + encodeURIComponent(table) + (single ? '?single=true' : '')).then(resolve,reject); }};
      for (const method of ['select','eq','or','order','is','in','limit']) query[method] = () => query;
      for (const method of ['single','maybeSingle']) query[method] = () => { single = true; return query; };
      return query;
    }
  };
  window.__enrollmentFixture = {
    emit(event) { for (const callback of listeners) callback(event, {user:{id:'${studentId}'}}); },
    listenerCount() { return listeners.size; }
  };
`

async function isolateEnrollment(page) {
  const state = {
    access: null, signedOut: false, rpcCalls: [], tableCalls: [], authCalls: [],
    user: { ...fixtureUser }, authIdentityQueue: [], accessQueue: [], invitationAccess: null,
    resendCalls: [], entryNavigations: [], abortedExternal: [], pageErrors: [], unexpectedFixture: []
  }
  page.on('pageerror', error => state.pageErrors.push(error.message))
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) state.entryNavigations.push(frame.url()) })
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin === localOrigin) {
      if (url.pathname === '/src/lib/supabase.js') return route.fulfill({ contentType: 'text/javascript', body: fixtureConnectionModule })
      return route.continue()
    }
    if (!fixtureOrigins.has(url.origin)) {
      state.abortedExternal.push({ origin: url.origin, action: 'aborted' })
      return route.abort()
    }
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': localOrigin } })
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': localOrigin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
    if (url.pathname === '/auth/v1/user' && request.method() === 'GET') {
      state.authCalls.push('getUser')
      if (state.authIdentityQueue.length) state.user = state.authIdentityQueue.shift()
      return state.signedOut ? json({ message: 'Synthetic fixture signed out', status: 401 }, 401) : json(state.user)
    }
    if (url.pathname === '/auth/v1/logout' && request.method() === 'POST') {
      state.authCalls.push('signOut'); state.signedOut = true
      return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': localOrigin } })
    }
    if (url.pathname === '/auth/v1/resend' && request.method() === 'POST') {
      state.authCalls.push('resend'); state.resendCalls.push(request.postDataJSON())
      return json({})
    }
    if (url.pathname === '/rest/v1/rpc/get_my_enrollment' && request.method() === 'POST') {
      state.rpcCalls.push({ origin: url.origin, body: request.postDataJSON() })
      if (state.accessQueue.length) state.access = state.accessQueue.shift()
      return state.access ? json(state.access) : json({ code: 'PGRST202', message: 'Synthetic fixture: public.get_my_enrollment is absent from the schema cache.' }, 404)
    }
    if (url.pathname === '/rest/v1/rpc/accept_student_invitation' && request.method() === 'POST') {
      state.rpcCalls.push({ origin: url.origin, name: 'accept_student_invitation', body: request.postDataJSON() })
      if (!state.invitationAccess) return json({ message: 'Synthetic invitation was not accepted.' }, 403)
      state.access = state.invitationAccess
      return json(state.access)
    }
    if (url.pathname === '/rest/v1/rpc/initialize_student_profile' && request.method() === 'POST') {
      state.rpcCalls.push({ origin: url.origin, name: 'initialize_student_profile', body: request.postDataJSON() })
      return json(state.user.id)
    }
    if (url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/rest/v1/rpc/') && request.method() === 'GET') {
      const table = url.pathname.split('/').at(-1)
      state.tableCalls.push(table)
      if (table === 'teachers') return json(null)
      if (table === 'profiles') return json({ id: studentId, name: 'Synthetic Enrollment Student', language: 'French', level: 'A2', level_name: 'Elementary', progress: 0, lessons_completed: 0, interface_language: 'en', current_module: 'Fixture module', next_step: 'Fixture next step' })
      if (table === 'onboarding_responses') return json({ student_id: studentId })
      return json(url.searchParams.has('single') ? null : [])
    }
    state.unexpectedFixture.push(request.method() + ' ' + url.pathname)
    return route.abort()
  })
  return state
}

const enrollmentCalls = state => state.rpcCalls.filter(call => !call.name)
const serverAccess = overrides => ({ student_id: studentId, role: 'student', status: 'pending', email_verified: true, academic_access: false, ...overrides })
async function unavailable(page) {
  await expect(page.getByRole('heading', { name: 'Enrollment verification unavailable', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('administrator update')
  await expect(page.locator('#enrollment-service-details')).toContainText('PGRST202')
  await expect(page.getByRole('button', { name: 'Check availability', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled()
}
function assertIsolation(state) {
  expect(state.unexpectedFixture).toEqual([])
  expect(state.pageErrors).toEqual([])
  expect(state.abortedExternal.every(request => request.action === 'aborted')).toBe(true)
  expect(state.abortedExternal.some(request => /\.supabase\.co$/.test(new URL(request.origin).hostname))).toBe(false)
  for (const call of enrollmentCalls(state)) expect(call.body).toEqual({})
}

test('actual entry pages block missing enrollment RPC and retain cooldown across auth events and navigation', async ({ page }) => {
  const state = await isolateEnrollment(page)
  await page.goto('/platform.html')
  await unavailable(page)
  expect(enrollmentCalls(state)).toHaveLength(1)
  expect(await page.evaluate(() => window.__enrollmentFixture.listenerCount())).toBe(1)
  await page.evaluate(async () => {
    for (let index = 0; index < 20; index++) window.__enrollmentFixture.emit('SIGNED_IN')
    await new Promise(resolve => setTimeout(resolve, 200))
  })
  expect(enrollmentCalls(state)).toHaveLength(1)
  await page.reload()
  await unavailable(page)
  for (const path of ['/login.html', '/teacher.html', '/onboarding.html']) {
    await page.goto(path)
    await unavailable(page)
    expect(enrollmentCalls(state)).toHaveLength(1)
  }
  expect(state.tableCalls).toEqual([])
  expect(state.authCalls.length).toBeGreaterThan(1)
  const persisted = await page.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.startsWith('vo:enrollment-service:')))
  expect(persisted).toHaveLength(1)
  expect(JSON.stringify(persisted)).not.toContain(studentId)
  expect(JSON.stringify(persisted)).not.toContain('academic_access')
  assertIsolation(state)
})

test('explicit availability retry rechecks server state and pending or unverified students remain gated', async ({ page }) => {
  const state = await isolateEnrollment(page)
  await page.goto('/platform.html')
  await unavailable(page)
  // Even a contradictory true flag cannot override pending server status.
  state.access = serverAccess({ academic_access: true })
  await page.getByRole('button', { name: 'Check availability', exact: true }).click()
  await expect(page.locator('#enrollment-retry')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Completar mis metas' })).toBeVisible()
  await expect(page.locator('#platform-home')).toHaveCount(0)
  expect(enrollmentCalls(state)).toHaveLength(2)
  expect(state.tableCalls).toEqual([])
  // Approval without verified email must still fail the academic-access gate.
  state.access = serverAccess({ status: 'approved', email_verified: false, academic_access: true })
  await page.locator('#enrollment-retry').click()
  await expect(page.locator('#enrollment-resend')).toBeVisible()
  await expect(page.locator('#app')).toContainText('Confirma tu correo')
  await expect(page.locator('#platform-home')).toHaveCount(0)
  expect(enrollmentCalls(state)).toHaveLength(3)
  expect(state.tableCalls).toEqual([])
  // This is a changed synthetic server response, never a client-side approval.
  state.access = serverAccess({ status: 'approved', email_verified: true, academic_access: true })
  await page.locator('#enrollment-retry').click()
  await expect(page.locator('#platform-home')).toBeVisible()
  await expect(page.locator('#app')).toContainText('Synthetic Enrollment Student')
  expect(enrollmentCalls(state)).toHaveLength(4)
  expect(state.tableCalls).toContain('profiles')
  expect(state.tableCalls).toContain('student_exercises')
  assertIsolation(state)
})

test('cooldown is project-specific, a failed explicit retry stays blocked, and sign out remains available', async ({ page }) => {
  const state = await isolateEnrollment(page)
  await page.goto('/platform.html')
  await unavailable(page)
  await page.goto('/login.html?enrollmentFixtureProject=b')
  await unavailable(page)
  expect(enrollmentCalls(state).map(call => call.origin)).toEqual([...fixtureOrigins])
  await page.goto('/onboarding.html')
  await unavailable(page)
  expect(enrollmentCalls(state)).toHaveLength(2)
  await page.getByRole('button', { name: 'Check availability', exact: true }).click()
  await unavailable(page)
  await expect.poll(() => enrollmentCalls(state).length).toBe(3)
  expect(state.tableCalls).toEqual([])
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login\.html$/)
  await expect(page.locator('#login-form')).toBeVisible()
  expect(state.authCalls.filter(call => call === 'signOut')).toHaveLength(1)
  expect(enrollmentCalls(state)).toHaveLength(3)
  assertIsolation(state)
})

const invitationToken = 'a'.repeat(64)
const changedUser = { ...fixtureUser, id: '20000000-0000-4000-8000-000000000092', email: 'changed-identity-fixture@example.test' }
const writes = state => state.rpcCalls.filter(call => call.name)
async function changedAccount(page) {
  await expect(page.getByRole('heading', { name: 'Enrollment verification unavailable', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Your account changed')
  await expect(page.locator('#enrollment-service-details')).toContainText('ENROLLMENT_SESSION_CHANGED')
  await expect(page.getByRole('button', { name: 'Check availability', exact: true })).toBeEnabled()
}

for (const path of ['/platform.html', '/teacher.html', '/onboarding.html']) {
  test(`actual ${path} blocks an identity change between the caller and enrollment verification`, async ({ page }) => {
    const state = await isolateEnrollment(page)
    state.authIdentityQueue = [{ ...fixtureUser }, { ...changedUser }]
    state.access = serverAccess({ student_id: changedUser.id, status: 'approved', academic_access: true })
    // An invitation present during the race must not be captured or accepted for
    // a different identity, even when that identity's server access is approved.
    await page.goto(path + '#invitation=' + invitationToken)
    await changedAccount(page)
    expect(enrollmentCalls(state)).toHaveLength(1)
    expect(state.tableCalls).toEqual([])
    expect(writes(state)).toEqual([])
    expect(await page.evaluate(() => sessionStorage.getItem('vo_pending_invitation'))).toBeNull()
    expect(new URL(page.url()).hash).toBe('#invitation=' + invitationToken)
    assertIsolation(state)
  })
}

for (const role of ['teacher', 'admin']) {
  for (const path of ['/login.html', '/platform.html', '/teacher.html']) {
    test(`unverified ${role} remains at the actual ${path} confirmation gate without private reads`, async ({ page }) => {
      const state = await isolateEnrollment(page)
      state.user = { ...fixtureUser, email_confirmed_at: null }
      state.access = serverAccess({ role, status: 'approved', email_verified: false, academic_access: true })
      await page.goto(path)
      await expect(page.locator('#enrollment-resend')).toBeVisible()
      await expect(page.locator('#app')).toContainText('Confirma tu correo')
      await expect(page.locator('#enrollment-retry')).toBeVisible()
      await page.locator('#enrollment-resend').click()
      await expect(page.locator('#enrollment-message')).toContainText('Solicitud enviada')
      await expect(page.locator('#enrollment-resend')).toBeEnabled()
      expect(page.url()).toBe(localOrigin + path)
      expect(state.entryNavigations).toEqual([localOrigin + path])
      expect(enrollmentCalls(state)).toHaveLength(1)
      expect(state.resendCalls).toEqual([{ type: 'signup', email: fixtureUser.email }])
      expect(state.tableCalls).toEqual([])
      expect(writes(state)).toEqual([])
      assertIsolation(state)
    })
  }
}

test('a verified pending student still carries the invitation from actual login into onboarding', async ({ page }) => {
  const state = await isolateEnrollment(page)
  state.access = serverAccess({ status: 'pending', academic_access: false })
  state.invitationAccess = serverAccess({ status: 'approved', academic_access: true })
  await page.goto('/login.html#invitation=' + invitationToken)
  await expect(page).toHaveURL(localOrigin + '/onboarding.html')
  await expect(page.locator('#about_you')).toBeVisible()
  const enteredPages = state.entryNavigations.map(url => new URL(url).pathname).filter((path, index, all) => !index || path !== all[index - 1])
  expect(enteredPages).toEqual(['/login.html', '/onboarding.html'])
  expect(writes(state).map(call => call.name)).toEqual(['accept_student_invitation', 'initialize_student_profile'])
  expect(writes(state)[0].body).toEqual({ p_token: invitationToken })
  expect(state.tableCalls).toEqual(['profiles', 'onboarding_responses'])
  expect(await page.evaluate(() => sessionStorage.getItem('vo_pending_invitation'))).toBeNull()
  assertIsolation(state)
})

test('onboarding stops before profile writes if the identity changes after accepting an invitation', async ({ page }) => {
  const state = await isolateEnrollment(page)
  state.authIdentityQueue = [{ ...fixtureUser }, { ...fixtureUser }, { ...changedUser }]
  state.accessQueue = [serverAccess({ status: 'pending' }), serverAccess({ student_id: changedUser.id, status: 'approved', academic_access: true })]
  state.invitationAccess = serverAccess({ status: 'approved', academic_access: true })
  await page.goto('/onboarding.html#invitation=' + invitationToken)
  await changedAccount(page)
  expect(enrollmentCalls(state)).toHaveLength(2)
  expect(writes(state).map(call => call.name)).toEqual(['accept_student_invitation'])
  expect(state.tableCalls).toEqual([])
  assertIsolation(state)
})

test('unverified student retains the login invitation while staying at the confirmation gate', async ({ page }) => {
  const state = await isolateEnrollment(page)
  state.user = { ...fixtureUser, email_confirmed_at: null }
  state.access = serverAccess({ email_verified: false })
  await page.goto('/login.html#invitation=' + invitationToken)
  await expect(page.locator('#enrollment-resend')).toBeVisible()
  await expect(page.locator('#app')).toContainText('Confirma tu correo')
  await expect(page).toHaveURL(localOrigin + '/login.html')
  expect(await page.evaluate(() => sessionStorage.getItem('vo_pending_invitation'))).toBe(invitationToken)
  await page.locator('#enrollment-resend').click()
  await expect(page.locator('#enrollment-message')).toContainText('Solicitud enviada')
  expect(await page.evaluate(() => sessionStorage.getItem('vo_pending_invitation'))).toBe(invitationToken)
  expect([...new Set(state.entryNavigations.map(url => new URL(url).pathname))]).toEqual(['/login.html'])
  expect(enrollmentCalls(state)).toHaveLength(1)
  expect(state.resendCalls).toEqual([{ type: 'signup', email: fixtureUser.email }])
  expect(state.tableCalls).toEqual([])
  expect(writes(state)).toEqual([])
  assertIsolation(state)
})
