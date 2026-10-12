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


  if (data?.user) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (teacher) {
      window.location.href = '/teacher.html'
      return
    }
  }


  window.location.href =
    '/platform.html'

})

// If user already has an active session, send them to their dashboard
supabase.auth.getUser().then(async ({ data: { user } }) => {
  if (user) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (teacher) {
      window.location.replace('/teacher.html')
    } else {
      window.location.replace('/platform.html')
    }
  }
})