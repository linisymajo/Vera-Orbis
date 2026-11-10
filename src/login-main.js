import './login.css'
import { supabase } from './lib/supabase.js'
import { setupPasswordRecoveryRequest } from './components/passwordRecovery.js'
import { captureEnrollmentInvitation, readEnrollmentAccess, renderEnrollmentGate, EnrollmentServiceError, renderEnrollmentServiceError } from './lib/enrollment.js'

document.querySelector('#app').innerHTML = `
  <main class="login-page">

    <section class="login-visual">

      <div class="visual-content">

        <p class="eyebrow">
          VERA ORBIS
        </p>

        <h1>
          Learn it.
          <br>
          <em>Live it.</em>
          <br>
          Speak it.
        </h1>

        <p class="visual-text">
          Your language journey,
          all in one place.
        </p>

      </div>

      <div class="visual-orbit orbit-one"></div>
      <div class="visual-orbit orbit-two"></div>

    </section>


    <section class="login-panel">

      <div class="login-container">

        <div class="login-header">

          <p class="login-label">
            STUDENT PLATFORM
          </p>

          <h2>
            Welcome back.
          </h2>

          <p>
            Sign in to continue your
            language journey.
          </p>

        </div>


        <form
          class="login-form"
          id="login-form"
        >

          <label for="email">
            Email
          </label>

          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          >


          <label for="password">
            Password
          </label>

          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          >


          <p
            id="login-error"
            class="login-error"
          ></p>


          <button
            type="submit"
            class="login-button"
          >
            <span class="button-text">
              Sign in
            </span>

            <span>
              ↗
            </span>
          </button>

        </form>

        <section class="password-recovery-request" aria-label="Password recovery">
          <details>
            <summary>Forgot your password?</summary>
            <form id="password-reset-request-form" class="login-form">
              <label for="recovery-email">Email</label>
              <input id="recovery-email" type="email" autocomplete="email" maxlength="254" required>
              <p role="status" aria-live="polite"></p>
              <p role="alert"></p>
              <button class="login-button" type="submit">Send reset link</button>
            </form>
          </details>
        </section>


        <p class="login-note">
          New to Vera Orbis?
          <a href="/register.html">
            Create your account
          </a>
        </p>

      </div>

    </section>

  </main>
`


const loginForm =
  document.querySelector('#login-form')

const loginError =
  document.querySelector('#login-error')

const loginButton =
  loginForm.querySelector('.login-button')

const buttonText =
  loginButton.querySelector('.button-text')

setupPasswordRecoveryRequest(supabase)

let enrollmentRedirecting = false
async function continueAfterEnrollment({ retry = false } = {}) {
  if (enrollmentRedirecting) return
  const access = await readEnrollmentAccess(supabase, { retry })
  if (enrollmentRedirecting) return
  const invitation = access.role === 'student' ? captureEnrollmentInvitation() : null
  if (!access.email_verified || (!access.academic_access && ['teacher', 'admin'].includes(access.role))) {
    renderEnrollmentGate(access, { app: document.querySelector('#app'), client: supabase })
    return
  }
  enrollmentRedirecting = true
  window.location.replace(['teacher', 'admin'].includes(access.role) ? '/teacher.html' : invitation ? '/onboarding.html' : '/platform.html')
}

function showEnrollmentFailure(error) {
  if (error instanceof EnrollmentServiceError) {
    renderEnrollmentServiceError(error, {
      app: document.querySelector('#app'), client: supabase,
      onRetry: async () => {
        try { await continueAfterEnrollment({ retry: true }) }
        catch (retryError) { showEnrollmentFailure(retryError) }
      }
    })
    return
  }
  loginError.textContent = error.message || 'Your enrollment could not be verified.'
}

loginForm.addEventListener('submit', async (event) => {

  event.preventDefault()

  loginError.textContent = ''

  const email =
    document
      .querySelector('#email')
      .value
      .trim()

  const password =
    document
      .querySelector('#password')
      .value


  loginButton.disabled = true
  buttonText.textContent = 'Signing in...'


  const { data, error } =
    await supabase.auth.signInWithPassword({
    email,
    password
  })


  if (error) {

    loginError.textContent =
      error.message || 'Incorrect email or password.'

    loginButton.disabled = false
    buttonText.textContent = 'Sign in'

    return
  }


  try {
    await continueAfterEnrollment()
  } catch (accessError) {
    showEnrollmentFailure(accessError)
    loginButton.disabled = false
    buttonText.textContent = 'Sign in'
  }
})

// Confirm server-controlled enrollment before redirecting an existing session.
supabase.auth.getUser().then(async ({ data: { user } }) => {
  if (!user) return
  await continueAfterEnrollment()
}).catch(showEnrollmentFailure)
