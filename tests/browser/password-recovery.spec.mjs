import { test, expect } from '@playwright/test'

const localOrigin = 'http://127.0.0.1:5197'
const authOrigin = 'https://password-recovery-fixture.invalid'
const user = { id: '20000000-0000-4000-8000-000000000098', email: 'recovery-fixture@example.test', aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00.000Z', app_metadata: {}, user_metadata: {} }
const newPassword = 'Synthetic-local-password-987!'
// The installed SDK processes a clearly synthetic, unsigned fixture token and
// calls intercepted Auth endpoints. This never authenticates a real account.
const fixtureToken = () => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', iss: authOrigin + '/auth/v1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
  Buffer.from('synthetic-unsigned-fixture-only').toString('base64url')
].join('.')
const connection = `
  import {createClient} from '/node_modules/@supabase/supabase-js/dist/index.mjs';
  export const supabase = createClient('${authOrigin}', 'synthetic-public-fixture-key', {
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:true},db:{schema:'public'}
  });
`

async function isolateAuth(page) {
  const state = { requests: [], updates: [], logouts: [], unexpected: [], errors: [], resetError: false, updateError: false }
  page.on('pageerror', error => state.errors.push(error.message))
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin === localOrigin) {
      if (url.pathname === '/src/lib/supabase.js') return route.fulfill({ contentType: 'text/javascript', body: connection })
      return route.continue()
    }
    if (url.origin !== authOrigin) return route.abort()
    const headers = { 'Access-Control-Allow-Origin': localOrigin, 'Access-Control-Allow-Headers': 'apikey,authorization,x-client-info,content-type,x-supabase-api-version', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }
    const json = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) })
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (url.pathname === '/auth/v1/recover' && request.method() === 'POST') {
      state.requests.push({ redirectTo: url.searchParams.get('redirect_to'), body: request.postDataJSON() })
      return state.resetError ? json({ code: 'over_email_send_rate_limit', message: 'RAW_SYNTHETIC_RESET_ERROR' }, 429) : json({})
    }
    if (url.pathname === '/auth/v1/user' && request.method() === 'GET') return json(user)
    if (url.pathname === '/auth/v1/user' && request.method() === 'PUT') {
      state.updates.push(request.postDataJSON())
      return state.updateError ? json({ code: 'unexpected_failure', message: 'RAW_SYNTHETIC_UPDATE_ERROR' }, 500) : json(user)
    }
    if (url.pathname === '/auth/v1/logout' && request.method() === 'POST') {
      state.logouts.push(url.searchParams.get('scope'))
      return route.fulfill({ status: 204, headers })
    }
    state.unexpected.push(request.method() + ' ' + url.pathname)
    return route.abort()
  })
  return state
}
const callbackPath = type => '/reset-password.html#' + new URLSearchParams({ access_token: fixtureToken(), refresh_token: 'synthetic-refresh-fixture-only', expires_in: '3600', token_type: 'bearer', type }).toString()
function isolated(state) { expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([]) }

test('actual login requests a same-origin reset link and never claims failed email delivery', async ({ page }) => {
  const state = await isolateAuth(page)
  state.resetError = true
  await page.goto('/login.html')
  await page.getByText('Forgot your password?', { exact: true }).click()
  await page.locator('#recovery-email').fill(user.email)
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click()
  await expect(page.locator('#password-reset-request-form [role="alert"]')).toContainText('could not confirm')
  await expect(page.locator('#app')).not.toContainText('RAW_SYNTHETIC_RESET_ERROR')
  state.resetError = false
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click()
  await expect(page.locator('#password-reset-request-form [role="status"]')).toContainText('If an account exists')
  expect(state.requests).toHaveLength(2)
  for (const request of state.requests) {
    expect(request.redirectTo).toBe(localOrigin + '/reset-password.html')
    expect(request.body.email).toBe(user.email)
  }
  expect(state.updates).toEqual([])
  isolated(state)
})

test('actual recovery page verifies the SDK callback, validates passwords, updates once and signs out locally', async ({ page }) => {
  const state = await isolateAuth(page)
  await page.goto(callbackPath('recovery'))
  await expect(page.locator('#app')).toHaveAttribute('data-recovery-state', 'ready')
  await expect(page).toHaveURL(localOrigin + '/reset-password.html')
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-new-password').fill(newPassword + '-different')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.locator('#recovery-error')).toContainText('do not match')
  expect(state.updates).toEqual([])
  await page.locator('#confirm-new-password').fill(newPassword)
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.locator('#recovery-status')).toContainText('Your password was updated. Sign in')
  await expect(page.locator('#password-update-form')).toBeHidden()
  expect(state.updates).toHaveLength(1)
  expect(state.updates[0]).toEqual({ password: newPassword, code_challenge: null, code_challenge_method: null })
  expect(Object.keys(state.updates[0]).sort()).toEqual(['code_challenge', 'code_challenge_method', 'password'])
  expect(state.logouts).toEqual(['local'])
  await expect(page.locator('#app')).not.toContainText(newPassword)
  await expect(page.locator('#recovery-login')).toBeVisible()
  isolated(state)
})

test('a rejected password update stays blocked with a sanitized unconfirmed status', async ({ page }) => {
  const state = await isolateAuth(page)
  state.updateError = true
  await page.goto(callbackPath('recovery'))
  await expect(page.locator('#app')).toHaveAttribute('data-recovery-state', 'ready')
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-new-password').fill(newPassword)
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.locator('#app')).toHaveAttribute('data-recovery-state', 'invalid')
  await expect(page.locator('#recovery-error')).toContainText('could not confirm the password change')
  await expect(page.locator('#app')).not.toContainText('RAW_SYNTHETIC_UPDATE_ERROR')
  await expect(page.locator('#recovery-status')).not.toContainText('was updated')
  expect(state.updates).toHaveLength(1)
  expect(state.logouts).toEqual([])
  isolated(state)
})

test('expired links and ordinary sign-in callbacks cannot unlock the recovery form', async ({ page }) => {
  const state = await isolateAuth(page)
  for (const path of ['/reset-password.html#error=access_denied&error_code=otp_expired&error_description=RAW_SYNTHETIC_TOKEN', callbackPath('signup')]) {
    // A different pathname forces actual SDK/page initialization for each case.
    await page.goto('/login.html')
    await page.goto(path)
    await expect(page.locator('#app')).toHaveAttribute('data-recovery-state', 'invalid')
    await expect(page.locator('#password-update-form')).toBeHidden()
    await expect(page.locator('#recovery-error')).toContainText('invalid or expired')
    await expect(page).toHaveURL(localOrigin + '/reset-password.html')
    await expect(page.locator('#app')).not.toContainText('RAW_SYNTHETIC_TOKEN')
  }
  // A callback arriving after startup can be a same-document hash navigation;
  // it must be scrubbed and remain blocked even though the SDK will not re-init.
  await page.evaluate(fragment => { location.hash = fragment }, callbackPath('signup').split('#')[1])
  await expect(page).toHaveURL(localOrigin + '/reset-password.html')
  await expect(page.locator('#app')).toHaveAttribute('data-recovery-state', 'invalid')
  await expect(page.locator('#password-update-form')).toBeHidden()
  expect(state.updates).toEqual([])
  isolated(state)
})
