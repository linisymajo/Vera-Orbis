import './login.css'
import { supabase } from './lib/supabase.js'

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
            Start your journey.
          </h2>

          <p>
            Create your Vera Orbis account
            to begin your language journey.
          </p>

        </div>


        <form
          class="login-form"
          id="register-form"
        >

          <label for="name">
            Name
          </label>

          <input
            type="text"
            id="name"
            placeholder="Your name"
            autocomplete="name"
            required
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
            placeholder="Create a password"
            autocomplete="new-password"
            minlength="6"
            required
          >


          <label for="confirm-password">
            Confirm password
          </label>

          <input
            type="password"
            id="confirm-password"
            placeholder="Repeat your password"
            autocomplete="new-password"
            minlength="6"
            required
          >


          <p
            id="register-error"
            class="login-error"
          ></p>


          <p
            id="register-success"
            class="login-error"
          ></p>


          <button
            type="submit"
            class="login-button"
          >
            <span class="button-text">
              Create account
            </span>

            <span>
              ↗
            </span>
          </button>

        </form>


        <p class="login-note">
          Already have an account?
          <a href="/login.html">
            Sign in
          </a>
        </p>

      </div>

    </section>

  </main>
`


const registerForm =
  document.querySelector('#register-form')

const registerError =
  document.querySelector('#register-error')

const registerSuccess =
  document.querySelector('#register-success')

const registerButton =
  registerForm.querySelector('.login-button')

const buttonText =
  registerButton.querySelector('.button-text')


registerForm.addEventListener('submit', async (event) => {

  event.preventDefault()

  registerError.textContent = ''
  registerSuccess.textContent = ''

  const name =
    document.querySelector('#name').value.trim()

  const email =
    document.querySelector('#email').value.trim()

  const password =
    document.querySelector('#password').value

  const confirmPassword =
    document.querySelector('#confirm-password').value


  if (password !== confirmPassword) {

    registerError.textContent =
      'Passwords do not match.'

    return
  }


  registerButton.disabled = true
  buttonText.textContent = 'Creating account...'


  const { data, error } =
    await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      }
    }
  })


  if (error) {

    registerError.textContent =
      error.message || 'Unable to create your account.'

    registerButton.disabled = false
    buttonText.textContent = 'Create account'

    return
  }


  if (data?.session?.user) {
    try {
      await supabase.from('profiles').upsert({
        id: data.session.user.id,
        name: name || data.session.user.email?.split('@')[0] || 'Student',
        language: 'English',
        level: 'A1',
        level_name: 'Beginner',
        progress: 0,
        lessons_completed: 0,
        total_lessons: null,
        current_module: 'Getting Started',
        next_step: 'Complete your onboarding'
      }, { onConflict: 'id' })
    } catch (e) {
      console.warn('Could not seed initial profile on register:', e)
    }

    registerSuccess.textContent =
      'Account created! Directing you to your onboarding...'

    setTimeout(() => {
      window.location.href = '/onboarding.html'
    }, 1000)

    return
  }


  registerSuccess.innerHTML =
    'Your account has been created. Please check your email to confirm your account.<br><br><a href="/login.html" style="color: inherit; text-decoration: underline; font-weight: 600;">Go to Sign in ↗</a>'

  registerForm.reset()

  registerButton.disabled = false
  buttonText.textContent = 'Create account'

})