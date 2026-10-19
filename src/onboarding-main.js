import './onboarding.css'
import { supabase } from './lib/supabase.js'
import {
  SUPPORTED_INTERFACE_LANGUAGES,
  DEFAULT_INTERFACE_LANGUAGE,
  normalizeInterfaceLanguage
} from './lib/i18n.js'

const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

const steps = [
  {
    number: '01',
    label: 'SOBRE TI',
    title: 'Comencemos contigo.',
    subtitle:
      'Un poco de contexto nos ayuda a hacer que tu experiencia en Vera Orbis sea verdaderamente tuya.',
    fields: [
      {
        id: 'about_you',
        type: 'textarea',
        label: 'Cuéntanos un poco sobre ti.',
        placeholder:
          'Cuéntanos sobre tu ocupación, estudios, intereses o cualquier aspecto relevante para tu aprendizaje del idioma...'
      }
    ]
  },

  {
    number: '02',
    label: 'TUS METAS',
    title: '¿Qué quieres lograr?',
    subtitle:
      'No hay respuestas correctas. Elige lo que más te importe en este momento.',
    fields: [
      {
        id: 'learning_goals',
        type: 'textarea',
        label:
          '¿Qué es lo que más te gustaría lograr con el idioma?',
        placeholder:
          'Cuéntanos qué te gustaría ser capaz de hacer...'
      },

      {
        id: 'most_important',
        type: 'multi',
        label:
          '¿Qué sientes que es más importante en este momento?',
        options: [
          'Hablar con confianza',
          'Entender a los demás',
          'Pronunciación',
          'Vocabulario',
          'Gramática',
          'Escritura',
          'Comprensión auditiva',
          'Fluidez',
          'Comunicación profesional',
          'Comunicación académica'
        ]
      }
    ]
  },

  {
    number: '03',
    label: 'QUÉ QUIERES HACER',
    title: '¿A dónde te llevará tu idioma?',
    subtitle:
      'Elige todo lo que resulte relevante para tu vida y tus aspiraciones.',
    fields: [
      {
        id: 'real_life_needs',
        type: 'multicategories',
        label: 'Selecciona tus áreas de enfoque y metas:',
        categories: [
          {
            title: 'Ejecutivo y Profesional',
            options: [
              'Reuniones',
              'Presentaciones',
              'Liderazgo',
              'Networking',
              'Entrevistas de trabajo',
              'Viajes de negocios',
              'Correos profesionales',
              'Comunicación con clientes',
              'Conversaciones en el trabajo',
              'Desarrollo profesional'
            ]
          },
          {
            title: 'Presentaciones y Hablar en Público',
            options: [
              'Presentar ideas',
              'Storytelling',
              'Hablar ante grupos',
              'Responder preguntas',
              'Manejar sesiones de preguntas y respuestas',
              'Hablar con seguridad',
              'Estructurar presentaciones',
              'Persuadir a una audiencia'
            ]
          },
          {
            title: 'Viajes y Vida Cotidiana',
            options: [
              'Aeropuertos',
              'Hoteles',
              'Restaurantes',
              'Compras',
              'Pedir indicaciones',
              'Transporte',
              'Conversaciones cotidianas',
              'Hacer reservas',
              'Resolver imprevistos'
            ]
          },
          {
            title: 'Académico',
            options: [
              'Universidad',
              'Estudios en el extranjero',
              'Presentaciones académicas',
              'Exámenes',
              'Investigación',
              'Escritura académica',
              'Participación en clase',
              'Lectura de textos académicos'
            ]
          },
          {
            title: 'Conversación y Fluidez',
            options: [
              'Hablar con naturalidad',
              'Hablar con espontaneidad',
              'Hablar sin traducir mentalmente',
              'Ganar seguridad al hablar',
              'Conversar con hablantes nativos',
              'Mantener el hilo de una conversación',
              'Expresar opiniones',
              'Contar anécdotas e historias'
            ]
          },
          {
            title: 'Pronunciación y Escucha',
            options: [
              'Pronunciación',
              'Acento',
              'Entonación',
              'Ritmo',
              'Comprensión auditiva',
              'Entender a hablantes nativos',
              'Entender diferentes acentos'
            ]
          },
          {
            title: 'Lectura y Escritura',
            options: [
              'Lectura',
              'Escritura',
              'Redes sociales',
              'Redacción profesional',
              'Escritura creativa',
              'Mensajes y chats',
              'Correos electrónicos'
            ]
          },
          {
            title: 'Cultura y Entretenimiento',
            options: [
              'Películas',
              'Música',
              'Podcasts',
              'YouTube',
              'Libros',
              'Series',
              'Cultura de viajes',
              'Comprensión cultural'
            ]
          },
          {
            title: 'Crecimiento Personal',
            options: [
              'Confianza',
              'Independencia',
              'Conexión intercultural',
              'Desarrollo personal',
              'Conocer nuevas personas',
              'Expresarme libremente'
            ]
          }
        ]
      },

      {
        id: 'preferred_topics',
        type: 'textarea',
        label:
          '¿Hay situaciones específicas, temas o algo más en lo que quieras trabajar?',
        placeholder:
          'Por ejemplo: reuniones, viajes, pasatiempos específicos, entrevistas...'
      }
    ]
  },

  {
    number: '04',
    label: 'TU EXPERIENCIA',
    title: 'Cuéntanos sobre tu camino hasta ahora.',
    subtitle:
      'Conocer tu experiencia previa nos ayuda a saber por dónde empezar.',
    fields: [
      {
        id: 'previous_experience',
        type: 'textarea',
        label:
          '¿Has estudiado este idioma antes?',
        placeholder:
          '¿Qué estudiaste, durante cuánto tiempo y cómo te fue?'
      },

      {
        id: 'experience_positive',
        type: 'textarea',
        label:
          '¿Qué disfrutaste de tus experiencias de aprendizaje anteriores?',
        placeholder:
          'Cuéntanos qué te funcionó bien...'
      },

      {
        id: 'experience_negative',
        type: 'textarea',
        label:
          '¿Qué no te funcionó?',
        placeholder:
          'Cualquier cosa que te haya parecido frustrante, difícil o poco efectiva...'
      }
    ]
  },

  {
    number: '05',
    label: 'TUS RETOS',
    title: '¿Qué se interpone en tu camino?',
    subtitle:
      'Conocer tus desafíos nos permite diseñar tus clases a partir de ellos.',
    fields: [
      {
        id: 'difficulties',
        type: 'textarea',
        label:
          '¿Qué encuentras difícil al aprender o utilizar el idioma?',
        placeholder:
          'Por ejemplo: hablar, traducir mentalmente, comprender al escuchar...'
      },

      {
        id: 'challenge_context',
        type: 'multi',
        label:
          '¿Dónde se presentan normalmente estas dificultades o qué áreas necesitan apoyo?',
        options: [
          'Hablar',
          'Escuchar',
          'Vocabulario',
          'Pronunciación',
          'Gramática',
          'Lectura',
          'Escritura',
          'Comunicación en la vida real',
          'Comunicación profesional',
          'Presentaciones',
          'En clase',
          'En el trabajo',
          'En la universidad',
          'Al viajar',
          'Al hablar con hablantes nativos',
          'Durante exposiciones',
          'En línea'
        ]
      }
    ]
  },

  {
    number: '06',
    label: 'TUS PREFERENCIAS',
    title: '¿Cómo te gusta aprender?',
    subtitle:
      'Tu estilo de aprendizaje importa. No existe una única forma de aprender un idioma.',
    fields: [
      {
        id: 'learning_preferences',
        type: 'multi',
        label:
          '¿Qué te gustaría ver más en tus lecciones?',
        options: [
          'Enfoque conversacional',
          'Práctico y para la vida real',
          'Estructurado',
          'Creativo e interactivo',
          'Visual',
          'Auditivo',
          'Escritura',
          'Expresión oral',
          'Juegos y retos',
          'Aprendizaje cultural'
        ]
      },

      {
        id: 'lesson_preferences',
        type: 'textarea',
        label:
          '¿Hay algo más que haría que tus lecciones sean más motivadoras para ti?',
        placeholder:
          'Cuéntanos qué haría que tu aprendizaje sea más estimulante...'
      }
    ]
  },

  {
    number: '07',
    label: 'TU VISIÓN',
    title: 'Imagínate dentro de seis meses.',
    subtitle:
      'Aquí es donde tu camino comienza a convertirse en un destino.',
    fields: [
      {
        id: 'vision',
        type: 'textarea',
        label:
          '¿Qué te encantaría ser capaz de hacer dentro de seis meses?',
        placeholder:
          'Imagínate comunicándote en el idioma con total seguridad...'
      },

      {
        id: 'motivation',
        type: 'textarea',
        label:
          '¿Por qué es importante para ti aprender este idioma?',
        placeholder:
          'Cuéntanos qué te motiva...'
      }
    ]
  }
]

let currentStep = 0
let student = null
let existingOnboarding = null
let selectedInterfaceLanguage = DEFAULT_INTERFACE_LANGUAGE

const app = document.querySelector('#app')


/* =========================================================
   AUTHENTICATION / STUDENT
========================================================= */

async function getCurrentStudent() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.error('No se pudo leer la sesión de onboarding.')
    return null
  }

  let {
    data: profile,
    error: profileError
  } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const defaultName =
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Estudiante'

    const { data: createdProfile } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: defaultName,
        language: 'English',
        level: 'A1',
        level_name: 'Beginner',
        progress: 0,
        lessons_completed: 0,
        total_lessons: null,
        current_module: 'Getting Started',
        next_step: 'Completa tu onboarding',
        interface_language: 'es'
      }, { onConflict: 'id' })
      .select('*')
      .maybeSingle()

    if (createdProfile) {
      profile = createdProfile
    } else {
      console.error('No se pudo cargar o crear el perfil de onboarding.')
      return null
    }
  }

  // Load existing interface language preference if saved
  if (profile.interface_language) {
    selectedInterfaceLanguage = normalizeInterfaceLanguage(profile.interface_language)
  } else {
    const cached = localStorage.getItem('vo_interface_language')
    if (cached) {
      selectedInterfaceLanguage = normalizeInterfaceLanguage(cached)
    }
  }

  return {
    user,
    profile
  }
}


/* =========================================================
   LOAD EXISTING ONBOARDING
========================================================= */

async function getExistingOnboarding(studentId) {
  const {
    data,
    error
  } = await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    console.error('No se pudieron cargar las respuestas de onboarding.')
    return null
  }

  return data
}


/* =========================================================
   UTILITIES
========================================================= */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


/* =========================================================
   DETERMINE STARTING STEP
========================================================= */

function determineStartingStep() {
  if (!existingOnboarding) {
    currentStep = 0
    return
  }

  const firstIncompleteStep = steps.findIndex((step) => {
    return step.fields.some((field) => {
      const value = existingOnboarding[field.id]

      if (field.type === 'textarea') {
        return !value || String(value).trim() === ''
      }

      if (
        field.type === 'multi' ||
        field.type === 'multicategories'
      ) {
        return !value || String(value).trim() === ''
      }

      return false
    })
  })

  if (firstIncompleteStep === -1) {
    currentStep = 0
  } else {
    currentStep = firstIncompleteStep
  }
}


/* =========================================================
   RENDER SHELL
========================================================= */

function renderShell() {
  app.innerHTML = `
    <main class="onboarding-page">

      <header class="onboarding-header">

        <a href="/" class="onboarding-logo">
          <img src="${VO_LOGO}" alt="Vera Orbis">
        </a>

        <div class="onboarding-progress-info">
          <span id="step-counter">01 / 07</span>
          <span id="step-label">SOBRE TI</span>
          <a
            href="/platform.html?from=onboarding"
            class="onboarding-skip-link"
            title="Ir a mi plataforma"
          >
            Omitir por ahora →
          </a>
        </div>

      </header>

      <div class="onboarding-progress">
        <div
          id="progress-bar"
          class="onboarding-progress-bar"
        ></div>
      </div>

      <section class="onboarding-content">

        <div class="onboarding-intro">

          <p class="onboarding-eyebrow">
            TU VIAJE EN VERA ORBIS
          </p>

          <div id="step-content"></div>

        </div>

        <div class="onboarding-navigation">

          <button
            type="button"
            id="back-button"
            class="secondary-button"
          >
            ← Volver
          </button>

          <button
            type="button"
            id="next-button"
            class="primary-button"
          >
            Continuar <span>↗</span>
          </button>

        </div>

      </section>

      <footer class="onboarding-footer">
        <span>APRENDE · VIVE · HABLA</span>
        <span>VERA ORBIS</span>
      </footer>

    </main>
  `

  const backButton = document.querySelector('#back-button')
  const nextButton = document.querySelector('#next-button')

  backButton.addEventListener('click', previousStep)
  nextButton.addEventListener('click', nextStep)

  renderStep()
}


/* =========================================================
   RENDER CURRENT STEP
========================================================= */

function renderStep() {
  const step = steps[currentStep]
  const stepContent = document.querySelector('#step-content')

  if (!stepContent) return

  document.querySelector('#step-counter').textContent =
    `${step.number} / 07`

  document.querySelector('#step-label').textContent =
    step.label

  document.querySelector('#progress-bar').style.width =
    `${((currentStep + 1) / steps.length) * 100}%`

  stepContent.innerHTML = `
    <h1>${step.title}</h1>

    <p class="step-subtitle">
      ${step.subtitle}
    </p>

    <div class="step-fields">
      ${step.fields.map(renderField).join('')}
    </div>
  `

  loadExistingValues()

  const backButton = document.querySelector('#back-button')

  backButton.style.visibility =
    currentStep === 0 ? 'hidden' : 'visible'

  const nextButton = document.querySelector('#next-button')

  nextButton.disabled = false

  nextButton.innerHTML =
    currentStep === steps.length - 1
      ? `Finalizar mi viaje <span>↗</span>`
      : `Continuar <span>↗</span>`
}


/* =========================================================
   RENDER FIELDS
========================================================= */

function renderField(field) {

  if (field.type === 'textarea') {
    return `
      <div class="field-group">

        <label for="${field.id}">
          ${field.label}
        </label>

        <textarea
          id="${field.id}"
          data-field="${field.id}"
          placeholder="${escapeHtml(field.placeholder)}"
        ></textarea>

      </div>
    `
  }


  if (field.type === 'multi') {
    return `
      <div class="field-group">

        <label>
          ${field.label}
        </label>

        <div class="option-grid">

          ${field.options
            .map(
              (option) => `
                <button
                  type="button"
                  class="option-button"
                  data-field="${field.id}"
                  data-value="${escapeHtml(option)}"
                >
                  <span class="option-check"></span>
                  <span>${escapeHtml(option)}</span>
                </button>
              `
            )
            .join('')}

        </div>

      </div>
    `
  }


  if (field.type === 'multicategories') {
    return `
      <div class="field-group">

        <label>
          ${field.label}
        </label>

        <div class="categories-container">

          ${field.categories
            .map(
              (cat) => `
                <div class="category-block">

                  <h3 class="category-title">
                    ${escapeHtml(cat.title)}
                  </h3>

                  <div class="option-grid">

                    ${cat.options
                      .map(
                        (option) => `
                          <button
                            type="button"
                            class="option-button"
                            data-field="${field.id}"
                            data-value="${escapeHtml(option)}"
                          >
                            <span class="option-check"></span>
                            <span>${escapeHtml(option)}</span>
                          </button>
                        `
                      )
                      .join('')}

                  </div>

                </div>
              `
            )
            .join('')}

        </div>

      </div>
    `
  }

  return ''
}


/* =========================================================
   LOAD SAVED VALUES
========================================================= */

function loadExistingValues() {

  const step = steps[currentStep]

  step.fields.forEach((field) => {

    const value = existingOnboarding?.[field.id]

    if (!value) return

    if (field.type === 'textarea') {

      const element =
        document.querySelector(`#${field.id}`)

      if (element) {
        element.value = value
      }

    }

    if (
      field.type === 'multi' ||
      field.type === 'multicategories'
    ) {

      const values = String(value)
        .split('||')
        .map((item) => item.trim())
        .filter(Boolean)

      document
        .querySelectorAll(
          `[data-field="${field.id}"]`
        )
        .forEach((button) => {

          if (
            values.includes(
              button.dataset.value
            )
          ) {
            button.classList.add('selected')
          }

        })
    }

  })

  setupOptionButtons()
}


/* =========================================================
   OPTION BUTTONS
========================================================= */

function setupOptionButtons() {

  document
    .querySelectorAll('.option-button')
    .forEach((button) => {

      button.addEventListener('click', () => {
        button.classList.toggle('selected')
      })

    })
}


/* =========================================================
   COLLECT CURRENT STEP
========================================================= */

function collectStepValues() {

  const values = {}
  const step = steps[currentStep]

  step.fields.forEach((field) => {

    if (field.type === 'textarea') {

      const element =
        document.querySelector(`#${field.id}`)

      values[field.id] =
        element?.value.trim() || ''

    }

    if (
      field.type === 'multi' ||
      field.type === 'multicategories'
    ) {

      const selected = Array.from(
        document.querySelectorAll(
          `.option-button[data-field="${field.id}"].selected`
        )
      ).map(
        (button) => button.dataset.value
      )

      values[field.id] =
        selected.join(' || ')
    }

  })

  return values
}


/* =========================================================
   SAVE CURRENT STEP
========================================================= */

async function saveCurrentStep() {

  if (!student?.profile?.id) {
    throw new Error(
      'Perfil de estudiante no disponible.'
    )
  }

  const values = collectStepValues()

  const currentData = {
    ...(existingOnboarding || {}),
    ...values
  }

  delete currentData.id
  delete currentData.created_at
  delete currentData.updated_at

  const payload = {
    student_id: student.profile.id,

    learning_goals:
      currentData.learning_goals || null,

    motivation:
      currentData.motivation || null,

    previous_experience:
      currentData.previous_experience || null,

    real_life_needs:
      currentData.real_life_needs || null,

    preferred_topics:
      currentData.preferred_topics || null,

    learning_preferences:
      currentData.learning_preferences || null,

    difficulties:
      currentData.difficulties || null,

    about_you:
      currentData.about_you || null,

    most_important:
      currentData.most_important || null,

    experience_positive:
      currentData.experience_positive || null,

    experience_negative:
      currentData.experience_negative || null,

    challenge_context:
      currentData.challenge_context || null,

    lesson_preferences:
      currentData.lesson_preferences || null,

    vision:
      currentData.vision || null
  }

  const {
    data,
    error
  } = await supabase
    .from('onboarding_responses')
    .upsert(
      payload,
      {
        onConflict: 'student_id'
      }
    )
    .select()
    .single()

  if (error) {
    console.error('No se pudieron guardar las respuestas de onboarding.')
    throw error
  }

  if (data) {
    existingOnboarding = {
      ...existingOnboarding,
      ...data
    }
  } else {
    existingOnboarding = {
      ...existingOnboarding,
      ...currentData
    }
  }
}


/* =========================================================
   NEXT STEP
========================================================= */

async function nextStep() {

  const nextButton =
    document.querySelector('#next-button')

  if (!nextButton || nextButton.disabled) {
    return
  }

  const originalText =
    nextButton.innerHTML

  nextButton.disabled = true
  nextButton.innerHTML = 'Guardando...'

  try {

    await saveCurrentStep()

    if (currentStep < steps.length - 1) {

      currentStep += 1

      renderStep()

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })

    } else {

      renderCompletion()

    }

  } catch (error) {

    console.error('No se pudo guardar el paso de onboarding.', error)

    alert(
      'No pudimos guardar tus respuestas. Por favor, intenta de nuevo.'
    )

    nextButton.innerHTML =
      originalText

    nextButton.disabled = false

  }
}


/* =========================================================
   PREVIOUS STEP
========================================================= */

function previousStep() {

  if (currentStep <= 0) {
    return
  }

  currentStep -= 1

  renderStep()

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}


/* =========================================================
   COMPLETION SCREEN
========================================================= */

async function selectInterfaceLanguage(langCode) {
  selectedInterfaceLanguage = normalizeInterfaceLanguage(langCode)
  localStorage.setItem('vo_interface_language', selectedInterfaceLanguage)

  // Update UI selection
  document.querySelectorAll('.lang-choice-btn').forEach((btn) => {
    if (btn.dataset.lang === selectedInterfaceLanguage) {
      btn.classList.add('selected')
      btn.setAttribute('aria-pressed', 'true')
    } else {
      btn.classList.remove('selected')
      btn.setAttribute('aria-pressed', 'false')
    }
  })

  // Persist preference to Supabase profile
  if (student?.profile?.id) {
    try {
      await supabase
        .from('profiles')
        .update({ interface_language: selectedInterfaceLanguage })
        .eq('id', student.profile.id)
    } catch (e) {
      console.warn('Note: profiles.interface_language update deferred:', e)
    }

    try {
      await supabase.auth.updateUser({
        data: { interface_language: selectedInterfaceLanguage }
      })
    } catch {}
  }
}

function renderCompletion() {

  app.innerHTML = `
    <main class="completion-page">

      <div class="completion-orbit">

        <div class="completion-ring ring-one"></div>
        <div class="completion-ring ring-two"></div>

        <div class="completion-center">
          <img
            src="${VO_LOGO}"
            alt="Vera Orbis"
          >
        </div>

      </div>

      <p class="onboarding-eyebrow">
        VERA ORBIS
      </p>

      <h1>
        Tu viaje<br>
        está <em>siendo preparado.</em>
      </h1>

      <p>
        Gracias por contarnos sobre ti.
        Ya contamos con lo necesario para comenzar a diseñar
        tu experiencia personalizada en Vera Orbis.
      </p>

      <div class="completion-note">

        <span>✓</span>

        <div>

          <strong>
            Tus respuestas han sido guardadas.
          </strong>

          <small>
            Tu profesor revisará tus metas,
            experiencia y preferencias antes de
            preparar tus siguientes pasos.
          </small>

        </div>

      </div>

      <!-- INTERFACE LANGUAGE SELECTOR (Requirement 2 & 3) -->
      <section class="completion-lang-selector" aria-labelledby="lang-choice-title">
        <h3 id="lang-choice-title" class="completion-lang-title">
          Elige el idioma de tu plataforma
        </h3>
        <p class="completion-lang-desc">
          Este será el idioma en el que verás la interfaz. Podrás cambiarlo cuando desees desde tu perfil.
        </p>
        <div class="completion-lang-grid" role="group" aria-label="Selección de idioma de interfaz">
          ${SUPPORTED_INTERFACE_LANGUAGES.map((item) => `
            <button
              type="button"
              class="lang-choice-btn ${item.code === selectedInterfaceLanguage ? 'selected' : ''}"
              data-lang="${item.code}"
              aria-pressed="${item.code === selectedInterfaceLanguage ? 'true' : 'false'}"
            >
              <span class="lang-flag">${item.flag}</span>
              <span>${item.label}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <a
        href="/platform.html?from=onboarding"
        class="primary-button completion-button"
        id="enter-platform-link"
      >
        Ingresar a mi plataforma
        <span>↗</span>
      </a>

    </main>
  `

  document.querySelectorAll('.lang-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectInterfaceLanguage(btn.dataset.lang)
    })
  })

  // Ensure initial preference is saved to DB
  selectInterfaceLanguage(selectedInterfaceLanguage)
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

  if (!app) {
    console.error('No se encontró el elemento raíz de onboarding.')
    return
  }

  app.innerHTML = `
    <div class="loading-screen">

      <div class="loading-mark">
        <img
          src="${VO_LOGO}"
          alt="Vera Orbis"
        >
      </div>

      <p>
        Preparando tu viaje...
      </p>

    </div>
  `

  try {

    /*
     * 1. Get authenticated student
     */
    student = await getCurrentStudent()

    if (!student) {
      window.location.href = '/login.html'
      return
    }

    /*
     * 2. Load existing onboarding
     */
    existingOnboarding =
      await getExistingOnboarding(
        student.profile.id
      )

    /*
     * 3. Determine where the student should start
     */
    determineStartingStep()

    /*
     * 4. Render ONCE.
     */
    renderShell()

  } catch (error) {

    console.error('No se pudo inicializar el onboarding.', error)

    app.innerHTML = `
      <div class="loading-screen">

        <p>
          Ocurrió un problema al cargar tu viaje.
        </p>

        <button
          type="button"
          class="primary-button"
          onclick="window.location.reload()"
        >
          Reintentar
        </button>

      </div>
    `
  }
}


/* =========================================================
   START
========================================================= */

initialize()