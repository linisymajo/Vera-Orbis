import { requestPasswordRecovery, createPasswordRecovery, PasswordRecoveryError } from '../lib/passwordRecovery.js'
import './passwordRecovery.css'

export function setupPasswordRecoveryRequest(client, root = document) {
  const form = root.querySelector('#password-reset-request-form')
  if (!form) return
  const button = form.querySelector('button'), message = form.querySelector('[role="status"]'), error = form.querySelector('[role="alert"]')
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (button.disabled) return
    button.disabled = true
    message.textContent = 'Requesting a reset link...'
    error.textContent = ''
    try { message.textContent = await requestPasswordRecovery(client, form.querySelector('input').value) }
    catch (failure) {
      message.textContent = ''
      error.textContent = failure instanceof PasswordRecoveryError ? failure.message : 'We could not confirm the reset request. Please try again.'
    } finally { button.disabled = false }
  })
}

export function mountPasswordRecovery(app, client) {
  app.innerHTML = `<main class="password-recovery-page"><section class="password-recovery-card" aria-labelledby="recovery-heading">
    <p class="login-label">VERA ORBIS</p><h1 id="recovery-heading">Set a new password</h1>
    <p id="recovery-status" role="status" aria-live="polite">Checking your recovery link...</p>
    <p id="recovery-error" role="alert"></p>
    <form id="password-update-form" class="login-form" hidden>
      <label for="new-password">New password</label><input id="new-password" type="password" autocomplete="new-password" minlength="8" maxlength="1024" required>
      <label for="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" autocomplete="new-password" minlength="8" maxlength="1024" required>
      <p>Use at least 8 characters and follow your account password requirements.</p>
      <button class="login-button" type="submit">Update password</button>
    </form>
    <button id="recovery-signout" class="login-button" type="button" hidden>Sign out</button>
    <p class="login-note"><a id="recovery-login" href="/login.html">Return to sign in or request a new link</a></p>
  </section></main>`
  const form = app.querySelector('#password-update-form'), status = app.querySelector('#recovery-status'), error = app.querySelector('#recovery-error')
  const signout = app.querySelector('#recovery-signout'), login = app.querySelector('#recovery-login')
  const controller = createPasswordRecovery(client, { onState(state) {
    app.dataset.recoveryState = state.phase
    form.hidden = !['ready', 'updating'].includes(state.phase)
    for (const input of form.querySelectorAll('input,button')) input.disabled = state.phase !== 'ready'
    status.textContent = state.phase === 'checking' ? 'Checking your recovery link...'
      : state.phase === 'ready' ? 'Your recovery link is verified. Enter your new password.'
        : state.phase === 'updating' ? 'Updating your password...' : state.phase === 'complete' ? state.message : ''
    error.textContent = state.phase === 'invalid' || state.phase === 'ready' ? state.message : ''
    if (state.phase === 'invalid' || state.phase === 'complete') form.reset()
  } })
  form.addEventListener('submit', async event => {
    event.preventDefault()
    error.textContent = ''
    if (form.querySelector('button').disabled) return
    try {
      const result = await controller.submit(form.querySelector('#new-password').value, form.querySelector('#confirm-new-password').value)
      signout.hidden = result.signedOut
      login.hidden = !result.signedOut
    } catch (failure) {
      error.textContent = failure instanceof PasswordRecoveryError ? failure.message : 'We could not confirm the password change. Please request a new reset link.'
    }
  })
  signout.addEventListener('click', async () => {
    signout.disabled = true
    try {
      await controller.signOut()
      signout.hidden = true; login.hidden = false
      status.textContent = 'Your password was updated. Sign in with your new password.'
      error.textContent = ''
    } catch (failure) { error.textContent = failure.message }
    finally { signout.disabled = false }
  })
  window.addEventListener('pagehide', () => controller.dispose(), { once: true })
  void controller.start()
  return controller
}
