export const RECOVERY_MIN_PASSWORD_LENGTH = 8
const REQUEST_TIMEOUT_MS = 15000

export class PasswordRecoveryError extends Error {
  constructor(code, message) { super(message); this.name = 'PasswordRecoveryError'; this.code = code }
}
const failure = (code, message) => new PasswordRecoveryError(code, message)
const invalidSession = () => failure('RECOVERY_SESSION_INVALID', 'This recovery link is invalid or expired. Request a new password reset link.')

export function getPasswordRecoveryRedirectUrl(location = globalThis.location) {
  try {
    const url = new URL(location?.href || location?.origin)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password) throw new Error()
    return new URL('/reset-password.html', url.origin).href
  } catch {
    throw failure('RECOVERY_CALLBACK_UNSAFE', 'Password recovery requires this site to use HTTPS or a local development address.')
  }
}

async function bounded(operation, timeoutMs, error) {
  let timer
  try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(error), timeoutMs) })]) }
  finally { clearTimeout(timer) }
}

export async function requestPasswordRecovery(client, email, { location, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const normalized = typeof email === 'string' ? email.trim() : ''
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw failure('RECOVERY_EMAIL_INVALID', 'Enter a valid email address.')
  }
  const redirectTo = getPasswordRecoveryRedirectUrl(location)
  const requestError = failure('RECOVERY_REQUEST_FAILED', 'We could not confirm the reset request. Please wait and try again.')
  try {
    const response = await bounded(client.auth.resetPasswordForEmail(normalized, { redirectTo }), timeoutMs, requestError)
    if (!response || response.error !== null || response.data == null) throw requestError
  } catch { throw requestError }
  // Auth intentionally does not disclose whether an address has an account.
  return 'If an account exists, check your email for a password reset link.'
}

export function validateRecoveryPassword(password, confirmation) {
  if (typeof password !== 'string' || password.length < RECOVERY_MIN_PASSWORD_LENGTH || password.length > 1024) {
    throw failure('RECOVERY_PASSWORD_INVALID', 'Use a password with at least 8 characters, up to 1024 characters.')
  }
  if (password !== confirmation) throw failure('RECOVERY_PASSWORD_MISMATCH', 'The passwords do not match.')
}

function removeCallbackCredentials(location, history) {
  try {
    if (location?.pathname && history?.replaceState) history.replaceState(null, '', location.pathname)
  } catch { /* The credentials never enter application logs or rendered errors. */ }
}

/** Recovery intent comes only from the SDK event, never a URL marker or storage. */
export function createPasswordRecovery(client, { onState = () => {}, location = globalThis.location,
  history = globalThis.history, navigation = globalThis.window, timeoutMs = REQUEST_TIMEOUT_MS,
  schedule = callback => setTimeout(callback, 0) } = {}) {
  let phase = 'checking', recoveryUserId = null, initialized = false, initializationSettled = false, disposed = false
  let startPromise, verification
  const publish = (next, message = '') => {
    if (initializationSettled && ['ready', 'invalid', 'complete'].includes(next)) removeCallbackCredentials(location, history)
    phase = next
    if (!disposed) onState({ phase, message })
  }
  // A second email link can navigate only the fragment of this same document.
  // The already-initialized SDK will not consume it. Remove it and require a
  // fresh recovery flow instead of leaving credentials in the address/history.
  const removeLateCallback = () => {
    if (disposed || !initializationSettled || (!location?.hash && !location?.search)) return
    recoveryUserId = null
    removeCallbackCredentials(location, history)
    if (phase !== 'updating') publish('invalid', invalidSession().message)
  }
  navigation?.addEventListener('hashchange', removeLateCallback)
  navigation?.addEventListener('popstate', removeLateCallback)
  const verify = async candidate => {
    if (disposed || !candidate || candidate !== recoveryUserId) return
    if (verification) return verification
    verification = (async () => {
      publish('checking')
      try {
        const response = await bounded(client.auth.getUser(), timeoutMs, invalidSession())
        if (response?.error !== null || response?.data?.user?.id !== candidate || candidate !== recoveryUserId) throw invalidSession()
        publish('ready')
      } catch { recoveryUserId = null; publish('invalid', invalidSession().message) }
    })().finally(() => { verification = null })
    return verification
  }
  // Keep this callback synchronous: awaiting other Auth methods inside it can
  // deadlock the SDK's initialization/auth lock. Verify outside the callback.
  const subscription = client.auth.onAuthStateChange((event, session) => {
    if (disposed) return
    if (event === 'PASSWORD_RECOVERY' && typeof session?.user?.id === 'string' && session.user.id) {
      recoveryUserId = session.user.id
      if (initialized) schedule(() => { void verify(recoveryUserId) })
    } else if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && recoveryUserId && session?.user?.id !== recoveryUserId)) {
      recoveryUserId = null
      if (initializationSettled && phase !== 'updating' && phase !== 'complete') publish('invalid', invalidSession().message)
    }
  })?.data?.subscription

  return {
    start() {
      if (startPromise) return startPromise
      startPromise = (async () => {
        publish('checking')
        try {
          const result = await bounded(client.auth.initialize(), timeoutMs, invalidSession())
          // The SDK has now read the callback. Scrub both successful and failed
          // callbacks before verification or any final UI state is exposed.
          initializationSettled = true
          removeCallbackCredentials(location, history)
          if (result?.error !== null) throw invalidSession()
          initialized = true
          // auth-js emits the callback recovery event on the next task after
          // initialize resolves. Give that documented SDK event time to arrive.
          await new Promise(resolve => schedule(resolve))
          if (!recoveryUserId) throw invalidSession()
          await verify(recoveryUserId)
        } catch { initializationSettled = true; recoveryUserId = null; publish('invalid', invalidSession().message) }
        finally { removeCallbackCredentials(location, history) }
      })()
      return startPromise
    },
    async submit(password, confirmation) {
      validateRecoveryPassword(password, confirmation)
      if (phase !== 'ready' || !recoveryUserId || disposed) throw invalidSession()
      const expectedId = recoveryUserId
      publish('updating')
      let updated = false
      try {
        const verified = await bounded(client.auth.getUser(), timeoutMs, invalidSession())
        if (verified?.error !== null || verified?.data?.user?.id !== expectedId || recoveryUserId !== expectedId) throw invalidSession()
        const result = await bounded(client.auth.updateUser({ password }), timeoutMs,
          failure('RECOVERY_UPDATE_UNCONFIRMED', 'We could not confirm the password change. Try signing in or request a new reset link.'))
        if (result?.error !== null || result?.data?.user?.id !== expectedId) {
          if (['weak_password', 'same_password'].includes(result?.error?.code)) {
            throw failure('RECOVERY_PASSWORD_REJECTED', 'Choose a different password that meets the account password requirements.')
          }
          throw failure('RECOVERY_UPDATE_UNCONFIRMED', 'We could not confirm the password change. Try signing in or request a new reset link.')
        }
        updated = true
        recoveryUserId = null
        let signedOut = false
        try {
          const result = await bounded(client.auth.signOut({ scope: 'local' }), timeoutMs, invalidSession())
          signedOut = !!result && result.error === null
        } catch {}
        publish('complete', signedOut ? 'Your password was updated. Sign in with your new password.' : 'Your password was updated, but sign out could not be confirmed. Sign out before continuing.')
        return { updated: true, signedOut }
      } catch (error) {
        const safe = error instanceof PasswordRecoveryError ? error
          : failure('RECOVERY_UPDATE_UNCONFIRMED', 'We could not confirm the password change. Try signing in or request a new reset link.')
        if (safe.code === 'RECOVERY_PASSWORD_REJECTED' && recoveryUserId === expectedId) publish('ready', safe.message)
        else { recoveryUserId = null; publish('invalid', safe.message) }
        throw safe
      } finally { if (updated) removeCallbackCredentials(location, history) }
    },
    async signOut() {
      try {
        const result = await bounded(client.auth.signOut({ scope: 'local' }), timeoutMs, invalidSession())
        if (!result || result.error !== null) throw invalidSession()
        return true
      } catch { throw failure('RECOVERY_SIGNOUT_UNCONFIRMED', 'Sign out could not be confirmed. Please try again.') }
    },
    dispose() {
      disposed = true; recoveryUserId = null; subscription?.unsubscribe()
      navigation?.removeEventListener('hashchange', removeLateCallback)
      navigation?.removeEventListener('popstate', removeLateCallback)
    }
  }
}
