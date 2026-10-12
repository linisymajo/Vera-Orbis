import './onboarding.css'
import { supabase } from './lib/supabase.js'

const VO_LOGO =
  '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

const steps = [
  {
    number: '01',
    label: 'ABOUT YOU',
    title: 'Let’s start with you.',
    subtitle:
      'A little context helps us make your Vera Orbis journey truly yours.',
    fields: [
      {
        id: 'about_you',
        type: 'textarea',
        label: 'Tell us a little about yourself.',
        placeholder:
          'Tell us about your occupation, studies, interests, or anything relevant to your language journey...'
      }
    ]
  },

  {
    number: '02',
    label: 'YOUR GOALS',
    title: 'What do you want to achieve?',
    subtitle:
      'There is no right answer. Choose what matters most to you right now.',
    fields: [
      {
        id: 'learning_goals',
        type: 'textarea',
        label:
          'What would you most like to achieve with your language?',
        placeholder:
          'Tell us what you would like to be able to do...'
      },

      {
        id: 'most_important',
        type: 'multi',
        label:
          'What feels most important right now?',
        options: [
          'Speaking confidently',
          'Understanding others',
          'Pronunciation',
          'Vocabulary',
          'Grammar',
          'Writing',
          'Listening',
          'Fluency',
          'Professional communication',
          'Academic communication'
        ]
      }
    ]
  },

  {
    number: '03',
    label: 'WHAT YOU WANT TO DO',
    title: 'Where will your language take you?',
    subtitle:
      'Choose everything that sounds relevant to your life and aspirations.',
    fields: [
      {
        id: 'real_life_needs',
        type: 'multicategories',
        label: 'Select your focus areas & goals:',
        categories: [
          {
            title: 'Executive & Professional',
            options: [
              'Meetings',
              'Presentations',
              'Leadership',
              'Networking',
              'Job interviews',
              'Business trips',
              'Professional emails',
              'Client communication',
              'Workplace conversations',
              'Career development'
            ]
          },
          {
            title: 'Presentations & Public Speaking',
            options: [
              'Presenting ideas',
              'Storytelling',
              'Speaking to groups',
              'Answering questions',
              'Handling Q&A',
              'Speaking with confidence',
              'Organizing presentations',
              'Persuading an audience'
            ]
          },
          {
            title: 'Travel & Real Life',
            options: [
              'Airports',
              'Hotels',
              'Restaurants',
              'Shopping',
              'Asking for directions',
              'Transportation',
              'Everyday conversations',
              'Making reservations',
              'Dealing with unexpected situations'
            ]
          },
          {
            title: 'Academic',
            options: [
              'University',
              'Study abroad',
              'Academic presentations',
              'Exams',
              'Research',
              'Academic writing',
              'Class participation',
              'Reading academic texts'
            ]
          },
          {
            title: 'Conversation & Fluency',
            options: [
              'Speaking naturally',
              'Speaking spontaneously',
              'Speaking without translating',
              'Building confidence',
              'Talking with native speakers',
              'Keeping conversations going',
              'Expressing opinions',
              'Telling stories'
            ]
          },
          {
            title: 'Pronunciation & Listening',
            options: [
              'Pronunciation',
              'Accent',
              'Intonation',
              'Rhythm',
              'Listening comprehension',
              'Understanding native speakers',
              'Understanding different accents'
            ]
          },
          {
            title: 'Reading & Writing',
            options: [
              'Reading',
              'Writing',
              'Social media',
              'Professional writing',
              'Creative writing',
              'Messages & chats',
              'Emails'
            ]
          },
          {
            title: 'Culture & Entertainment',
            options: [
              'Movies',
              'Music',
              'Podcasts',
              'YouTube',
              'Books',
              'Series',
              'Travel culture',
              'Cultural understanding'
            ]
          },
          {
            title: 'Personal Growth',
            options: [
              'Confidence',
              'Independence',
              'Cross-cultural connection',
              'Personal development',
              'Meeting new people',
              'Expressing myself'
            ]
          }
        ]
      },

      {
        id: 'preferred_topics',
        type: 'textarea',
        label:
          'Are there specific situations, topics, or something else you want to work on?',
        placeholder:
          'For example: meetings, travel, specific hobbies, interviews...'
      }
    ]
  },

  {
    number: '04',
    label: 'YOUR EXPERIENCE',
    title: 'Tell us about your journey so far.',
    subtitle:
      'Understanding your experience helps us know where to begin.',
    fields: [
      {
        id: 'previous_experience',
        type: 'textarea',
        label:
          'Have you studied this language before?',
        placeholder:
          'What did you study, for how long, and how did it go?'
      },

      {
        id: 'experience_positive',
        type: 'textarea',
        label:
          'What did you enjoy about previous learning experiences?',
        placeholder:
          'Tell us what worked for you...'
      },

      {
        id: 'experience_negative',
        type: 'textarea',
        label:
          'What did not work for you?',
        placeholder:
          'Anything you found frustrating, difficult, or ineffective...'
      }
    ]
  },

  {
    number: '05',
    label: 'YOUR CHALLENGES',
    title: 'What gets in your way?',
    subtitle:
      'Knowing your challenges helps us design around them.',
    fields: [
      {
        id: 'difficulties',
        type: 'textarea',
        label:
          'What do you find difficult when learning or using the language?',
        placeholder:
          'For example: speaking, translating in your head, listening...'
      },

      {
        id: 'challenge_context',
        type: 'multi',
        label:
          'Where do these difficulties usually appear or which areas need support?',
        options: [
          'Speaking',
          'Listening',
          'Vocabulary',
          'Pronunciation',
          'Grammar',
          'Reading',
          'Writing',
          'Real-life communication',
          'Professional communication',
          'Presentations',
          'In class',
          'At work',
          'At university',
          'While travelling',
          'When talking to native speakers',
          'During presentations',
          'Online'
        ]
      }
    ]
  },

  {
    number: '06',
    label: 'YOUR PREFERENCES',
    title: 'How do you like to learn?',
    subtitle:
      'Your learning style matters. There is no single way to learn a language.',
    fields: [
      {
        id: 'learning_preferences',
        type: 'multi',
        label:
          'What would you like more of in your lessons?',
        options: [
          'Conversation-focused',
          'Practical & real-life',
          'Structured',
          'Creative & interactive',
          'Visual',
          'Audio',
          'Writing',
          'Speaking',
          'Games & challenges',
          'Cultural learning'
        ]
      },

      {
        id: 'lesson_preferences',
        type: 'textarea',
        label:
          'Is there anything else that would make learning feel engaging for you?',
        placeholder:
          'Tell us what would make learning feel engaging for you...'
      }
    ]
  },

  {
    number: '07',
    label: 'YOUR VISION',
    title: 'Imagine yourself six months from now.',
    subtitle:
      'This is where your journey starts becoming a destination.',
    fields: [
      {
        id: 'vision',
        type: 'textarea',
        label:
          'What would you love to be able to do six months from now?',
        placeholder:
          'Imagine yourself using the language confidently...'
      },

      {
        id: 'motivation',
        type: 'textarea',
        label:
          'Why does learning this language matter to you?',
        placeholder:
          'Tell us what motivates you...'
      }
    ]
  }
]

let currentStep = 0
let student = null
let existingOnboarding = null

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
    console.error('Unable to read the onboarding session.')
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
      'Student'

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
        next_step: 'Complete your onboarding'
      }, { onConflict: 'id' })
      .select('*')
      .maybeSingle()

    if (createdProfile) {
      profile = createdProfile
    } else {
      console.error('Unable to load or create the onboarding profile.')
      return null
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
    console.error('Unable to load onboarding responses.')
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
    // Everything is complete.
    // Start from the beginning so the student can review/edit.
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
          <span id="step-label">ABOUT YOU</span>
          <a
            href="/platform.html?from=onboarding"
            class="onboarding-skip-link"
            title="Ir a mi plataforma"
          >
            Skip for now →
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
            YOUR VERA ORBIS JOURNEY
          </p>

          <div id="step-content"></div>

        </div>

        <div class="onboarding-navigation">

          <button
            type="button"
            id="back-button"
            class="secondary-button"
          >
            ← Back
          </button>

          <button
            type="button"
            id="next-button"
            class="primary-button"
          >
            Continue <span>↗</span>
          </button>

        </div>

      </section>

      <footer class="onboarding-footer">
        <span>LEARN IT · LIVE IT · SPEAK IT</span>
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
      ? `Complete my journey <span>↗</span>`
      : `Continue <span>↗</span>`
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
      'Student profile not available.'
    )
  }

  const values = collectStepValues()

  const currentData = {
    ...(existingOnboarding || {}),
    ...values
  }

  /*
   * Remove Supabase-generated fields
   * before constructing the payload.
   */
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

    console.error('Unable to save onboarding responses.')

    throw error
  }


  /*
   * IMPORTANT:
   * Use the response returned by Supabase
   * as our local source of truth.
   */
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

  /*
   * Prevent double-clicks while saving.
   */
  nextButton.disabled = true
  nextButton.innerHTML = 'Saving...'


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

    console.error('Unable to save the onboarding step.')

    alert(
      'We could not save your responses. Please try again.'
    )

    /*
     * Re-enable the button if saving failed.
     */
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
        Your journey<br>
        is <em>being prepared.</em>
      </h1>

      <p>
        Thank you for telling us about yourself.
        We now have what we need to begin designing
        your personalized Vera Orbis journey.
      </p>

      <div class="completion-note">

        <span>✓</span>

        <div>

          <strong>
            Your responses have been saved.
          </strong>

          <small>
            Your teacher will review your goals,
            experience and preferences before
            preparing your next steps.
          </small>

        </div>

      </div>

      <a
        href="/platform.html?from=onboarding"
        class="primary-button completion-button"
      >
        Enter my platform
        <span>↗</span>
      </a>

    </main>
  `
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

  if (!app) {
    console.error('Onboarding root element was not found.')
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
        Preparing your journey...
      </p>

    </div>
  `


  try {

    /*
     * 1. Get authenticated student
     */
    student = await getCurrentStudent()


    if (!student) {

      window.location.href =
        '/login.html'

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
     *
     * This is extremely important.
     * Previously renderShell() was being called
     * twice, which replaced the buttons and removed
     * their event listeners.
     */
    renderShell()

  } catch (error) {

    console.error('Unable to initialize onboarding.')

    app.innerHTML = `
      <div class="loading-screen">

        <p>
          Something went wrong while loading
          your journey.
        </p>

        <button
          type="button"
          class="primary-button"
          onclick="window.location.reload()"
        >
          Try again
        </button>

      </div>
    `
  }
}


/* =========================================================
   START
========================================================= */

initialize()