import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPasswordRecovery, requestPasswordRecovery, getPasswordRecoveryRedirectUrl,
  validateRecoveryPassword } from '../src/lib/passwordRecovery.js'

const location = { href: 'https://staging.example.test/login.html?redirectTo=https://foreign.test', pathname: '/reset-password.html' }
const password = 'Synthetic-test-password-987!'
const user = { id: '20000000-0000-4000-8000-000000000099' }
const rawSecret = 'RAW_SERVER_TOKEN_MUST_NOT_BE_DISPLAYED'
const tick = () => new Promise(resolve => setTimeout(resolve, 5))

function clientFixture({ event = 'PASSWORD_RECOVERY', delayed = false, ...overrides } = {}) {
  let callback
  const calls = [], states = [], histories = []
  const client = { auth: {
    onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { calls.push(['unsubscribe']) } } } } },
    async initialize() { if (delayed) setTimeout(() => callback(event, { user }), 0); else callback(event, { user }); return { error: null } },
    async getUser() { calls.push(['getUser']); return { data: { user }, error: null } },
    async updateUser(payload) { calls.push(['updateUser', payload]); return { data: { user }, error: null } },
    async signOut(options) { calls.push(['signOut', options]); callback('SIGNED_OUT', null); return { error: null } },
    ...overrides
  } }
  const controller = createPasswordRecovery(client, { onState: state => states.push(state), location,
    history: { replaceState(...args) { histories.push(args) } }, timeoutMs: 100 })
  return { client, controller, calls, states, histories, emit: (...args) => callback(...args) }
}

test('reset callback is always same-origin, has a fixed path and refuses insecure or credential-bearing origins', () => {
  assert.equal(getPasswordRecoveryRedirectUrl(location), 'https://staging.example.test/reset-password.html')
  assert.equal(getPasswordRecoveryRedirectUrl({ href: 'http://127.0.0.1:5173/login.html#invitation=private' }), 'http://127.0.0.1:5173/reset-password.html')
  assert.equal(getPasswordRecoveryRedirectUrl({ origin: 'http://localhost:5173' }), 'http://localhost:5173/reset-password.html')
  for (const href of ['http://staging.example.test/login.html', 'javascript:alert(1)', 'https://user:password@staging.example.test/login.html', 'file:///login.html']) {
    assert.throws(() => getPasswordRecoveryRedirectUrl({ href }), error => error.code === 'RECOVERY_CALLBACK_UNSAFE')
  }
})

test('reset request uses the real Auth method once, normalizes email and reports only conditional delivery', async () => {
  const calls = [], client = { auth: { async resetPasswordForEmail(...args) { calls.push(args); return { data: {}, error: null } } } }
  const message = await requestPasswordRecovery(client, '  synthetic@example.test  ', { location })
  assert.deepEqual(calls, [['synthetic@example.test', { redirectTo: 'https://staging.example.test/reset-password.html' }]])
  assert.match(message, /^If an account exists/)
  assert.doesNotMatch(message, /sent successfully|delivered/i)
  await assert.rejects(requestPasswordRecovery(client, 'not an email', { location }), error => error.code === 'RECOVERY_EMAIL_INVALID')
  assert.equal(calls.length, 1)
})

test('request errors, thrown responses, missing confirmations and timeouts never display raw errors or claim delivery', async () => {
  for (const resetPasswordForEmail of [async () => ({ error: { message: rawSecret } }), async () => { throw new Error(rawSecret) }, async () => undefined, () => new Promise(() => {})]) {
    await assert.rejects(requestPasswordRecovery({ auth: { resetPasswordForEmail } }, 'synthetic@example.test', { location, timeoutMs: 5 }), error => error.code === 'RECOVERY_REQUEST_FAILED' && !error.message.includes(rawSecret))
  }
})

test('SDK recovery events, including the SDK next-task event, require a matching server-verified user', async () => {
  for (const delayed of [false, true]) {
    const fixture = clientFixture({ delayed })
    await fixture.controller.start()
    assert.equal(fixture.states.at(-1).phase, 'ready')
    assert.equal(fixture.calls.filter(([name]) => name === 'getUser').length, 1)
    assert.deepEqual(fixture.histories.at(-1), [null, '', '/reset-password.html'])
    fixture.controller.dispose()
  }
})

test('normal cached sessions and recovery URL markers cannot unlock password updates', async () => {
  const fixture = clientFixture({ event: 'INITIAL_SESSION' })
  await fixture.controller.start()
  assert.equal(fixture.states.at(-1).phase, 'invalid')
  await assert.rejects(fixture.controller.submit(password, password), error => error.code === 'RECOVERY_SESSION_INVALID')
  assert.equal(fixture.calls.some(([name]) => name === 'updateUser'), false)
  fixture.controller.dispose()
})

test('callback credentials are scrubbed after SDK initialization and before invalid UI, including late fragment navigation', async () => {
  const navigation = new EventTarget(), mutableLocation = { pathname: '/reset-password.html', search: '?code=synthetic-private-code', hash: '#error=expired' }
  const states = [], writes = []
  const history = { replaceState(_state, _title, path) { assert.equal(path, '/reset-password.html'); mutableLocation.search = ''; mutableLocation.hash = '' } }
  const client = { auth: {
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
    async initialize() {
      assert.equal(mutableLocation.search, '?code=synthetic-private-code', 'the SDK must receive the callback before cleanup')
      return { error: { message: rawSecret } }
    },
    async updateUser() { writes.push('updateUser') }
  } }
  const controller = createPasswordRecovery(client, { location: mutableLocation, history, navigation, onState(state) {
    if (state.phase === 'invalid') { assert.equal(mutableLocation.search, ''); assert.equal(mutableLocation.hash, '') }
    states.push(state)
  } })
  await controller.start()
  mutableLocation.hash = '#access_token=synthetic-late-token&type=signup'
  navigation.dispatchEvent(new Event('hashchange'))
  assert.equal(mutableLocation.hash, '')
  assert.equal(states.at(-1).phase, 'invalid')
  mutableLocation.search = '?code=synthetic-late-code'
  navigation.dispatchEvent(new Event('popstate'))
  assert.equal(mutableLocation.search, '')
  await assert.rejects(controller.submit(password, password), error => error.code === 'RECOVERY_SESSION_INVALID')
  assert.deepEqual(writes, [])
  assert.equal(JSON.stringify(states).includes(rawSecret), false)
  controller.dispose()
})

test('expired, mismatched and unverifiable recovery sessions block before any password update', async () => {
  for (const overrides of [
    { async initialize() { return { error: { message: rawSecret } } } },
    { async getUser() { return { data: { user: { id: 'different-user' } }, error: null } } },
    { async getUser() { throw new Error(rawSecret) } }
  ]) {
    const fixture = clientFixture(overrides)
    await fixture.controller.start()
    assert.equal(fixture.states.at(-1).phase, 'invalid')
    assert.equal(JSON.stringify(fixture.states).includes(rawSecret), false)
    assert.equal(fixture.calls.some(([name]) => name === 'updateUser'), false)
    assert.deepEqual(fixture.histories.at(-1), [null, '', '/reset-password.html'])
    fixture.controller.dispose()
  }
})

test('password validation and identity recheck prevent invalid or cross-account mutations', async () => {
  assert.throws(() => validateRecoveryPassword('short', 'short'), error => error.code === 'RECOVERY_PASSWORD_INVALID')
  assert.throws(() => validateRecoveryPassword(password, 'different'), error => error.code === 'RECOVERY_PASSWORD_MISMATCH')
  const fixture = clientFixture()
  await fixture.controller.start()
  await assert.rejects(fixture.controller.submit(password, 'different'), error => error.code === 'RECOVERY_PASSWORD_MISMATCH')
  fixture.client.auth.getUser = async () => ({ data: { user: { id: 'another-account' } }, error: null })
  await assert.rejects(fixture.controller.submit(password, password), error => error.code === 'RECOVERY_SESSION_INVALID')
  assert.equal(fixture.calls.some(([name]) => name === 'updateUser'), false)
  fixture.controller.dispose()
})

test('confirmed password update signs out locally and does not invoke enrollment or an academic API', async () => {
  const fixture = clientFixture()
  await fixture.controller.start()
  assert.deepEqual(await fixture.controller.submit(password, password), { updated: true, signedOut: true })
  assert.deepEqual(fixture.calls.map(([name]) => name), ['getUser', 'getUser', 'updateUser', 'signOut'])
  assert.deepEqual(fixture.calls[2], ['updateUser', { password }])
  assert.deepEqual(fixture.calls[3], ['signOut', { scope: 'local' }])
  assert.equal(fixture.states.at(-1).phase, 'complete')
  assert.equal(JSON.stringify(fixture.states).includes(password), false)
  fixture.controller.dispose()
})

test('unconfirmed update never shows success and a confirmed update distinguishes signout failure', async () => {
  for (const updateUser of [async () => ({ data: null, error: { message: rawSecret } }), async () => ({ data: { user: { id: 'another-account' } }, error: null }), async () => { throw new Error(rawSecret) }]) {
    const fixture = clientFixture({ updateUser })
    await fixture.controller.start()
    await assert.rejects(fixture.controller.submit(password, password), error => error.code === 'RECOVERY_UPDATE_UNCONFIRMED' && !error.message.includes(rawSecret))
    assert.equal(fixture.states.at(-1).phase, 'invalid')
    assert.equal(fixture.calls.some(([name]) => name === 'signOut'), false)
    fixture.controller.dispose()
  }
  const fixture = clientFixture({ async signOut() { return { error: { message: rawSecret } } } })
  await fixture.controller.start()
  assert.deepEqual(await fixture.controller.submit(password, password), { updated: true, signedOut: false })
  assert.match(fixture.states.at(-1).message, /sign out could not be confirmed/)
  assert.equal(JSON.stringify(fixture.states).includes(rawSecret), false)
  fixture.controller.dispose()
})

test('concurrent submit or a subsequent account switch cannot reuse recovery authorization', async () => {
  let finish, updates = 0
  const fixture = clientFixture({ updateUser: () => { updates++; return new Promise(resolve => { finish = resolve }) } })
  await fixture.controller.start()
  const pending = fixture.controller.submit(password, password)
  await tick()
  await assert.rejects(fixture.controller.submit(password, password), error => error.code === 'RECOVERY_SESSION_INVALID')
  finish({ data: { user }, error: null })
  await pending
  assert.equal(updates, 1)
  fixture.controller.dispose()
  const switched = clientFixture()
  await switched.controller.start()
  switched.emit('SIGNED_IN', { user: { id: 'other' } })
  assert.equal(switched.states.at(-1).phase, 'invalid')
  await assert.rejects(switched.controller.submit(password, password), error => error.code === 'RECOVERY_SESSION_INVALID')
  switched.controller.dispose()
})

test('the recovery page ships without external assets or token referrers and is a built MPA entry', () => {
  const html = readFileSync(new URL('../reset-password.html', import.meta.url), 'utf8')
  assert.match(html, /name="referrer" content="no-referrer"/)
  assert.doesNotMatch(html, /https?:\/\//)
  const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
  assert.match(vite, /resetPassword: resolve\(rootDir, 'reset-password\.html'\)/)
})
