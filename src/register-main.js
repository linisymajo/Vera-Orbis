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
            PLATAFORMA DE ESTUDIANTES
          </p>

          <h2>
            Comienza tu viaje.
          </h2>

          <p>
            Crea tu cuenta en Vera Orbis
            para iniciar tu aprendizaje de idiomas.
          </p>

        </div>


        <form
          class="login-form"
          id="register-form"
        >

          <label for="name">
            Nombre
          </label>

          <input
            type="text"
            id="name"
            placeholder="Tu nombre"
            autocomplete="name"
            required
          >


          <label for="email">
            Correo electrónico
          </label>

          <input
            type="email"
            id="email"
            placeholder="tu@ejemplo.com"
            autocomplete="email"
            required
          >


          <label for="password">
            Contraseña
          </label>

          <input
            type="password"
            id="password"
            placeholder="Crea una contraseña"
            autocomplete="new-password"
            minlength="6"
            required
          >


          <label for="confirm-password">
            Confirmar contraseña
          </label>

          <input
            type="password"
            id="confirm-password"
            placeholder="Repite tu contraseña"
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
              Crear cuenta
            </span>

            <span>
              ↗
            </span>
          </button>

        </form>


        <p class="login-note">
          ¿Ya tienes una cuenta?
          <a href="/login.html">
            Iniciar sesión
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
      'Las contraseñas no coinciden.'
    return
  }

  if (password.length < 6) {
    registerError.textContent =
      'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  registerButton.disabled = true
  buttonText.textContent = 'Creando cuenta...'

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
    let msg = error.message || 'No se pudo crear tu cuenta.'
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already in use')) {
      msg = 'Ya existe una cuenta con este correo electrónico.'
    } else if (msg.toLowerCase().includes('at least 6 characters') || msg.toLowerCase().includes('password should be')) {
      msg = 'La contraseña debe tener al menos 6 caracteres.'
    } else if (msg.toLowerCase().includes('valid email') || msg.toLowerCase().includes('invalid format')) {
      msg = 'Ingresa un correo electrónico válido.'
    }
    registerError.textContent = msg

    registerButton.disabled = false
    buttonText.textContent = 'Crear cuenta'

    return
  }

  if (data?.session?.user) {
    try {
      await supabase.from('profiles').upsert({
        id: data.session.user.id,
        name: name || data.session.user.email?.split('@')[0] || 'Estudiante',
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
      '¡Cuenta creada! Redirigiéndote a tu bienvenida...'

    setTimeout(() => {
      window.location.href = '/onboarding.html'
    }, 1000)

    return
  }

  registerSuccess.innerHTML =
    'Tu cuenta ha sido creada. Por favor, revisa tu correo electrónico para confirmarla.<br><br><a href="/login.html" style="color: inherit; text-decoration: underline; font-weight: 600;">Ir a iniciar sesión ↗</a>'

  registerForm.reset()

  registerButton.disabled = false
  buttonText.textContent = 'Crear cuenta'

})