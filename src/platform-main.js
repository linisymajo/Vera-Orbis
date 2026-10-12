import './platform.css'

import { getCurrentUser, getStudentProfile } from './lib/auth.js'
import {
  renderPlatform,
  renderPlatformView
} from './pages/platform.js'
import { supabase } from './lib/supabase.js'
import { setupExerciseForms } from './components/exercises.js'

let currentStudent = null
const VERA_VOICE_URL =
  import.meta.env.VITE_VERA_VOICE_URL || 'http://localhost:3000/'

let platformData = {
  materials: [],
  feedback: [],
  challenges: [],
  submissions: [],
  exercises: []
}


/* =========================================================
   LOAD PLATFORM
========================================================= */

async function loadPlatform() {

  const user = await getCurrentUser()

  if (!user) {
    window.location.replace('/login.html')
    return
  }

  const { data: teacherRecord } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (teacherRecord) {
    window.location.replace('/teacher.html')
    return
  }

  let profile = await getStudentProfile()

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
    }
  }

  if (!profile) {

    document.querySelector('#app').innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        font-family: sans-serif;
      ">

        <div style="
          max-width: 500px;
          text-align: center;
        ">

          <h1>
            Profile not found
          </h1>

          <p>
            The user is logged in, but Vera Orbis
            could not load the student profile.
          </p>

          <p>
            Please sign in again or contact your instructor.
          </p>

          <button
            type="button"
            id="unresolved-profile-logout"
            style="
              margin-top: 20px;
              padding: 10px 24px;
              border-radius: 999px;
              border: 1px solid currentColor;
              background: transparent;
              cursor: pointer;
              font: inherit;
            "
          >
            Sign out ↗
          </button>

        </div>

      </div>
    `

    document
      .querySelector('#unresolved-profile-logout')
      ?.addEventListener('click', async () => {
        await supabase.auth.signOut()
        window.location.replace('/login.html')
      })

    return
  }

  const urlParams = new URLSearchParams(window.location.search)
  const bypassOnboarding =
    urlParams.get('from') === 'onboarding' ||
    sessionStorage.getItem('vo_onboarding_skipped') === 'true'

  let hasCompletedOnboarding = false
  const { data: onboarding, error: onboardingError } = await supabase
    .from('onboarding_responses')
    .select('student_id')
    .eq('student_id', profile.id)
    .maybeSingle()

  if (onboarding) {
    hasCompletedOnboarding = true
  }

  if (!bypassOnboarding) {
    if (!onboardingError && !onboarding) {
      window.location.replace('/onboarding.html')
      return
    }
  }

  const lessonsCompleted = Number(profile.lessons_completed || 0)
  const totalLessons =
    profile.total_lessons != null && Number(profile.total_lessons) > 0
      ? Number(profile.total_lessons)
      : null

  const progress =
    totalLessons
      ? Math.min(100, Math.round((lessonsCompleted / totalLessons) * 100))
      : Math.min(100, Math.max(0, Number(profile.progress || 0)))

  const student = {

    id: profile.id,

    name: profile.name,

    language: profile.language,

    level: profile.level,

    levelName: profile.level_name,

    progress: progress,

    goal: profile.goal,

    lessonsCompleted:
      lessonsCompleted,

    totalLessons:
      totalLessons,

    currentModule:
      profile.current_module,

    nextStep:
      profile.next_step,

    onboardingCompleted:
      Boolean(hasCompletedOnboarding || lessonsCompleted > 0)

  }


  currentStudent = student


  const [
    materialsRes,
    feedbackRes,
    challengesRes,
    submissionsRes,
    exercisesRes
  ] = await Promise.all([

    supabase
      .from('materials')
      .select('*')
      .or(
        `student_id.eq.${student.id},audience.eq.all`
      )
      .order(
        'created_at',
        { ascending: false }
      ),

    supabase
      .from('feedback')
      .select('*')
      .eq(
        'student_id',
        student.id
      )
      .order(
        'created_at',
        { ascending: false }
      ),

    supabase
      .from('weekly_challenges')
      .select('*')
      .or(
        `student_id.eq.${student.id},audience.eq.all`
      )
      .eq(
        'status',
        'active'
      )
      .order(
        'created_at',
        { ascending: false }
      ),

    supabase
      .from('challenge_submissions')
      .select('*')
      .eq(
        'student_id',
        student.id
      ),

    supabase
      .from('student_exercises')
      .select('*')
      .order('due_at', { ascending: true })

  ])



  platformData = {

    materials:
      materialsRes.data || [],

    feedback:
      feedbackRes.data || [],

    challenges:
      challengesRes.data || [],

    submissions:
      submissionsRes.data || [],

    exercises:
      exercisesRes.error ? [] : (exercisesRes.data || [])

  }


  document.querySelector('#app').innerHTML =
    renderPlatform(
      student,
      platformData.materials,
      platformData.feedback,
      platformData.challenges,
      platformData.submissions,
      platformData.exercises
    )


  initializeDynamicPlatform()

  setupGlobalPlatformFunctions()
  setupExerciseForms(supabase)

  setupPlatformNavigation()
}


/* =========================================================
   PLATFORM NAVIGATION
========================================================= */
let platformNavigationReady = false


function setupPlatformNavigation() {

  if (platformNavigationReady) {
    return
  }

  platformNavigationReady = true

  function toggleVeraVoiceCard(card) {
    const isFlipped = card.classList.toggle('is-flipped')
    card.setAttribute('aria-pressed', String(isFlipped))
    card.setAttribute(
      'aria-label',
      isFlipped
        ? 'Vera Voice is ready. Press Enter to return to the introduction.'
        : 'Meet Vera. Press Enter to see how to start practising.'
    )
    card.querySelector('.vera-voice-card-back')
      ?.setAttribute('aria-hidden', String(!isFlipped))
    card.querySelector('.vera-voice-card-front')
      ?.setAttribute('aria-hidden', String(isFlipped))
    card.querySelector('[data-vera-voice-launch]')
      ?.setAttribute('tabindex', isFlipped ? '0' : '-1')
  }

  async function launchVeraVoice(trigger) {
  const card = trigger.closest('.vera-voice-card')
  const status = card?.querySelector('.vera-voice-status')
  const url = VERA_VOICE_URL.endsWith('/')
    ? VERA_VOICE_URL
    : `${VERA_VOICE_URL}/`

  const opened = window.open('about:blank', '_blank')

  if (status) status.textContent = 'Connecting to Vera Voice...'
  trigger.setAttribute('aria-disabled', 'true')

  let timeoutId
  let messageHandler

  try {
    if (!opened) {
      throw new Error('The browser blocked the new tab.')
    }

    const veraOrigin = new URL(url).origin

    messageHandler = async (event) => {
      if (event.origin !== veraOrigin) return
      if (event.source !== opened) return
      if (event.data?.type !== 'VERA_AUTH_READY') return

      window.removeEventListener('message', messageHandler)
      clearTimeout(timeoutId)

      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (error || !session?.access_token) {
          throw new Error('No active student session was found.')
        }

        if (opened.closed) return

        opened.postMessage(
          {
            type: 'VERA_AUTH_CONTEXT',
            accessToken: session.access_token
          },
          veraOrigin
        )

        if (status) {
          status.textContent = 'Student session sent to Vera Voice.'
        }
      } catch (error) {
        console.error('Vera Voice authentication failed.')
        if (status) {
          status.textContent = 'Could not connect the student session.'
        }
      }
    }

    window.addEventListener('message', messageHandler)

    timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler)

      if (status) {
        status.textContent =
          'Vera Voice did not respond. Check that it is running.'
      }
    }, 15000)

    opened.location.href = url
  } catch (error) {
    console.error('Vera Voice could not be launched.')
    opened?.close()

    if (status) {
      status.textContent =
        'Vera Voice is not available. Start it locally and try again.'
    }
  } finally {
    trigger.removeAttribute('aria-disabled')
  }
}


  document.addEventListener(
    'click',
    (event) => {
      const veraLaunch = event.target.closest('[data-vera-voice-launch]')

      if (veraLaunch) {
        event.preventDefault()
        event.stopPropagation()
        launchVeraVoice(veraLaunch)
        return
      }

      const veraCard = event.target.closest('.vera-voice-card')

      if (veraCard) {
        toggleVeraVoiceCard(veraCard)
        return
      }

      const roadmapStep =
  event.target.closest('.roadmap-step')

if (roadmapStep) {

  event.preventDefault()

  openRoadmapStepCard(
    roadmapStep
  )

  return
}

      const element =
        event.target.closest('[data-platform-view]')

      if (!element) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const view =
        element.dataset.platformView

      if (!view) {
        return
      }

      const filter =
        element.dataset.materialFilter || null

      openPlatformView(
        view,
        filter,
        element
      )

    },
    true
  )

  document.addEventListener(
    'keydown',
    (event) => {
      const card = event.target.closest('.vera-voice-card')

      if (!card || event.target.closest('[data-vera-voice-launch]')) {
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleVeraVoiceCard(card)
      }
    },
    true
  )

}
function openPlatformView(
  view,
  filter = null,
  sourceElement = null
) {

  /*
   * =======================================================
   * FLASHCARD NAVIGATION
   * =======================================================
   */

  if (sourceElement) {

    const existingCard =
      document.querySelector(
        '.platform-floating-card'
      )

    if (existingCard) {
      return
    }

    /*
     * Position of the clicked element.
     */

    const sourceCard =
  sourceElement.closest('.material-card') ||
  sourceElement.closest('.platform-nav a') ||
  sourceElement

const rect =
  sourceCard.getBoundingClientRect()
    /*
     * Final panel dimensions.
     */

    const finalWidth =
      Math.min(
        1180,
        window.innerWidth - 100
      )

    const finalHeight =
      Math.min(
        760,
        window.innerHeight - 140
      )

    const finalLeft =
      (window.innerWidth - finalWidth) / 2

    const finalTop =
      (window.innerHeight - finalHeight) / 2


    /*
     * Create card.
     */

    const floatingCard =
      document.createElement('div')

    floatingCard.className =
  'platform-floating-card'

if (sourceElement) {
  const sourceCard =
    sourceElement.closest('.material-card')

  if (sourceCard) {
    const sourceBackground =
      getComputedStyle(sourceCard).backgroundColor

    floatingCard.style.background =
      sourceBackground

    if (
      sourceCard.classList.contains('material-primary')
    ) {
      floatingCard.classList.add('floating-dark')
    }
  }
}

    floatingCard.innerHTML = `
      <button
        type="button"
        class="platform-back-button floating-back-button"
      >
        ← Back to Home
      </button>

      <div class="platform-floating-card-content"></div>
    `


    document.body.appendChild(
      floatingCard
    )


    /*
     * =====================================================
     * PUT CARD EXACTLY OVER THE CLICKED ELEMENT
     * =====================================================
     */

    Object.assign(
      floatingCard.style,
      {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        opacity: '1',
        transform:
          'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)',
        zIndex: '1000'
      }
    )


    /*
     * =====================================================
     * CONTENT
     * =====================================================
     */

    const floatingContent =
      floatingCard.querySelector(
        '.platform-floating-card-content'
      )


    let floatingView =
      renderPlatformView(
        view,
        currentStudent,
        platformData.materials,
        platformData.feedback,
        platformData.challenges,
        platformData.submissions,
        platformData.exercises
      )


    if (
      view === 'materials' &&
      filter
    ) {

      const filteredMaterials =
        platformData.materials.filter(
          material =>
            material.type === filter
        )


      floatingView = `
        <section class="platform-detail-section">

          <div class="platform-section-heading">

            <p class="platform-label">
              MY MATERIALS
            </p>

            <h1>
              ${filterLabel(filter)}.
              <span>Your resources.</span>
            </h1>

            <p>
              Resources selected specifically
              for this part of your learning journey.
            </p>

          </div>

          ${renderFilteredMaterials(
            currentStudent,
            filteredMaterials,
            filter
          )}

        </section>
      `
    }


    floatingContent.innerHTML =
      floatingView
    setupExerciseForms(supabase)

    floatingContent
      .querySelectorAll('.roadmap-step')
      .forEach((step) => {

        step.addEventListener(
          'click',
          (event) => {

            event.preventDefault()
            event.stopPropagation()

            openRoadmapStepCard(step)
          }
        )
      })

    setupScrollReveal(floatingContent)
    setupProgressAnimations(floatingContent)
    setupRoadmapAnimations(floatingContent)
    setupCardMovement(floatingContent)
    setupMaterialButtons(floatingContent)

floatingContent.style.transform =
  'rotateY(180deg)'

    /*
     * =====================================================
     * HOME REACTION
     * =====================================================
     */

    document
      .querySelector(
        '#platform-home'
      )
      ?.classList.add(
        'card-is-open'
      )


    document
      .querySelector(
        '.platform-nav'
      )
      ?.classList.add(
        'platform-nav-behind'
      )


    /*
     * =====================================================
     * OPEN ANIMATION
     *
     * The browser animates the REAL card from
     * the clicked element to the final panel.
     * =====================================================
     */

    requestAnimationFrame(() => {

      floatingCard.animate(
  [
    {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform:
        'perspective(1400px) translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)',
      opacity: 1
    },

    {
      left: `${rect.left}px`,
      top: `${rect.top - 18}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform:
        'perspective(1400px) translateY(-18px) rotateX(8deg) rotateY(-5deg) rotateZ(-1deg) scale(1.04)',
      opacity: 1
    },

    {
      left: `${rect.left}px`,
      top: `${rect.top - 25}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform:
        'perspective(1400px) translateY(-25px) rotateX(5deg) rotateY(35deg) rotateZ(1deg) scale(1.02)',
      opacity: 1
    },

    {
      left: `${rect.left}px`,
      top: `${rect.top - 18}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform:
        'perspective(1400px) translateY(-18px) rotateX(2deg) rotateY(90deg) rotateZ(0deg) scale(1)',
      opacity: 1
    },

    {
      left: `${finalLeft}px`,
      top: `${finalTop}px`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      transform:
        'perspective(1400px) translateY(-5px) rotateX(0deg) rotateY(150deg) rotateZ(0deg) scale(1.01)',
      opacity: 1
    },

    {
      left: `${finalLeft}px`,
      top: `${finalTop}px`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      transform:
        'perspective(1400px) translateY(0) rotateX(0deg) rotateY(180deg) rotateZ(0deg) scale(1)',
      opacity: 1
    }
  ],
  {
    duration: 1350,
    easing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
    fill: 'forwards'
  }
)
    })
    /*
     * =====================================================
     * BACK BUTTON
     * =====================================================
     */

    const backButton =
      floatingCard.querySelector(
        '.floating-back-button'
      )
backButton.style.transform =
  'rotateY(180deg)'

backButton.style.left =
  'auto'

backButton.style.right =
  '32px'

    backButton.addEventListener(
      'click',
      (event) => {

        event.preventDefault()
        event.stopPropagation()

        /*
         * Reverse animation.
         */

        floatingCard.animate(
          [
            {
              left: `${finalLeft}px`,
              top: `${finalTop}px`,
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
              transform:
                'perspective(1400px) translateY(0) rotateX(0deg) rotateY(360deg) scale(1)',
              opacity: 1
            },

            {
              left: `${finalLeft + finalWidth * 0.25}px`,
              top: `${finalTop + finalHeight * 0.12}px`,
              width: `${finalWidth * 0.6}px`,
              height: `${finalHeight * 0.6}px`,
              transform:
                'perspective(1400px) translateY(-20px) rotateX(8deg) rotateY(450deg) scale(1)',
              opacity: 1
            },

            {
              left: `${rect.left}px`,
              top: `${rect.top - 30}px`,
              width: `${rect.width * 1.08}px`,
              height: `${rect.height * 1.08}px`,
              transform:
                'perspective(1400px) translateY(-20px) rotateX(10deg) rotateY(620deg) scale(1.05)',
              opacity: 1
            },

            {
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              transform:
                'perspective(1400px) translateY(0) rotateX(0deg) rotateY(720deg) scale(1)',
              opacity: 0
            }
          ],
          {
            duration: 850,
            easing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
            fill: 'forwards'
          }
        ).finished.then(() => {

          floatingCard.remove()

          document
            .querySelector(
              '#platform-home'
            )
            ?.classList.remove(
              'card-is-open'
            )

          document
            .querySelector(
              '.platform-nav'
            )
            ?.classList.remove(
              'platform-nav-behind'
            )

        })

      }
    )


    return
  }


  /*
   * =======================================================
   * OLD INTERNAL VIEWS
   * =======================================================
   */

  const home =
    document.querySelector(
      '#platform-home'
    )

  const internalView =
    document.querySelector(
      '#platform-internal-view'
    )

  const content =
    document.querySelector(
      '#platform-view-content'
    )

  const kicker =
    document.querySelector(
      '#platform-view-kicker'
    )


  if (
    !home ||
    !internalView ||
    !content
  ) {
    return
  }


  if (view === 'home') {

    closePlatformView()

    return
  }


  let viewTitle =
    'VERA ORBIS'


  switch (view) {

    case 'journey':
      viewTitle = 'MY JOURNEY'
      break

    case 'materials':
      viewTitle = 'MY MATERIALS'
      break

    case 'feedback':
      viewTitle = 'FEEDBACK'
      break

    case 'challenges':
      viewTitle = 'CHALLENGES'
      break

    case 'progress':
      viewTitle = 'MY PROGRESS'
      break

    case 'exercises':
      viewTitle = 'EXERCISES'
      break

  }


  if (kicker) {
    kicker.textContent =
      viewTitle
  }


  let viewContent =
    renderPlatformView(
      view,
      currentStudent,
      platformData.materials,
      platformData.feedback,
      platformData.challenges,
      platformData.submissions,
      platformData.exercises
    )


  if (
    view === 'materials' &&
    filter
  ) {

    const filteredMaterials =
      platformData.materials.filter(
        material =>
          material.type === filter
      )


    viewContent = `
      <section class="platform-detail-section">

        <div class="platform-section-heading">

          <p class="platform-label">
            MY MATERIALS
          </p>

          <h1>
            ${filterLabel(filter)}.
            <span>Your resources.</span>
          </h1>

          <p>
            Resources selected specifically
            for this part of your learning journey.
          </p>

        </div>

        ${renderFilteredMaterials(
          currentStudent,
          filteredMaterials,
          filter
        )}

      </section>
    `
  }


  content.innerHTML =
    viewContent
  setupExerciseForms(supabase)


  internalView.classList.add(
    'is-active'
  )

  internalView.setAttribute(
    'aria-hidden',
    'false'
  )

  home.classList.remove(
    'is-active'
  )

  home.setAttribute(
    'aria-hidden',
    'true'
  )


  document
    .querySelectorAll(
      '.platform-nav [data-platform-view]'
    )
    .forEach((link) => {

      link.classList.toggle(
        'active',
        link.dataset.platformView === view
      )

    })


  window.scrollTo({
    top: 0,
    behavior: 'instant'
  })


  initializeDynamicPlatform()

}/* =========================================================
   ROADMAP FLASHCARD
========================================================= */

function openRoadmapStepCard(
  sourceElement
) {

  const existingCard =
    document.querySelector(
      '.roadmap-floating-card'
    )

  if (existingCard) {
    return
  }


  const rect =
    sourceElement.getBoundingClientRect()


  const finalWidth =
    Math.min(
      1180,
      window.innerWidth - 100
    )


  const finalHeight =
    Math.min(
      760,
      window.innerHeight - 140
    )


  const finalLeft =
    (window.innerWidth - finalWidth) / 2


  const finalTop =
    (window.innerHeight - finalHeight) / 2


  const step =
    sourceElement.dataset.roadmapStep

  const isGettingStartedDone = Boolean(
    currentStudent?.onboardingCompleted ||
    (currentStudent?.lessonsCompleted && currentStudent.lessonsCompleted > 0)
  )

  const roadmapStages = {
    'getting-started': {
      label: isGettingStartedDone ? '01 — COMPLETED' : '01 — CURRENT',
      title: 'Getting Started',
      subtitle: isGettingStartedDone ? 'Your assessment is complete.' : 'Your journey begins here.',
      description: isGettingStartedDone
        ? 'We discovered your current level, learning style and personal goals. This is the foundation of your personalized Vera Orbis journey.'
        : 'Discover your current level, learning style and personal goals. Complete your onboarding assessment to build your path.'
    },

    'current': {
      label: isGettingStartedDone ? '02 — CURRENT' : '02 — UPCOMING',
      title: currentStudent?.currentModule || 'Speaking Foundations',
      subtitle: isGettingStartedDone ? 'Where you are now.' : 'Unlocks after Getting Started.',
      description:
        'Strengthen your skills, build confidence and develop the communication abilities you need to use English more naturally.'
    },

    'next': {
      label: '03 — NEXT',
      title: 'Real-world conversations',
      subtitle: 'Take the next step.',
      description:
        'Apply what you learn to everyday situations and develop the confidence to communicate in real conversations.'
    },

    'destination': {
      label: '04 — DESTINATION',
      title: currentStudent?.goal || 'Fluency Destination',
      subtitle: 'Your destination.',
      description:
        'Your learning goal guides your journey. Each stage helps you move closer to using English the way you want to.'
    }
  }

const content =
  roadmapStages[step] || roadmapStages['getting-started']

  const floatingCard =
    document.createElement('div')


  floatingCard.className =
    'platform-floating-card roadmap-floating-card'


  floatingCard.innerHTML = `

  <button
    type="button"
    class="platform-back-button floating-back-button"
  >
    ← Back to Journey
  </button>

  <div
    class="platform-floating-card-content"
  >

    <section class="platform-detail-section">

      <div class="platform-section-heading">

  <p class="platform-label">
    ${content.label}
  </p>

  <h1>
    ${content.title}
    <span>${content.subtitle}</span>
  </h1>

  <p>
    ${content.description}
  </p>

</div>

    </section>

  </div>

`


  document.body.appendChild(
    floatingCard
  )


  Object.assign(
    floatingCard.style,
    {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      opacity: '1',
      transform:
        'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)',
      zIndex: '1000'
    }
  )


  const floatingContent =
    floatingCard.querySelector(
      '.platform-floating-card-content'
    )


  floatingContent.style.transform =
    'rotateY(180deg)'


  document
    .querySelector(
      '#platform-home'
    )
    ?.classList.add(
      'card-is-open'
    )


  document
    .querySelector(
      '.platform-nav'
    )
    ?.classList.add(
      'platform-nav-behind'
    )


  requestAnimationFrame(() => {

    floatingCard.animate(
      [

        {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform:
            'perspective(1400px) translateY(0) rotateX(0deg) rotateY(0deg) scale(1)',
          opacity: 1
        },

        {
          left: `${rect.left}px`,
          top: `${rect.top - 18}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform:
            'perspective(1400px) translateY(-18px) rotateX(8deg) rotateY(-5deg) rotateZ(-1deg) scale(1.04)',
          opacity: 1
        },

        {
          left: `${rect.left}px`,
          top: `${rect.top - 25}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform:
            'perspective(1400px) translateY(-25px) rotateX(5deg) rotateY(35deg) rotateZ(1deg) scale(1.02)',
          opacity: 1
        },

        {
          left: `${rect.left}px`,
          top: `${rect.top - 18}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform:
            'perspective(1400px) translateY(-18px) rotateX(2deg) rotateY(90deg) rotateZ(0deg) scale(1)',
          opacity: 1
        },

        {
          left: `${finalLeft}px`,
          top: `${finalTop}px`,
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
          transform:
            'perspective(1400px) translateY(-5px) rotateX(0deg) rotateY(150deg) rotateZ(0deg) scale(1.01)',
          opacity: 1
        },

        {
          left: `${finalLeft}px`,
          top: `${finalTop}px`,
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
          transform:
            'perspective(1400px) translateY(0) rotateX(0deg) rotateY(180deg) scale(1)',
          opacity: 1
        }

      ],
      {
        duration: 1350,
        easing:
          'cubic-bezier(0.22, 0.8, 0.22, 1)',
        fill: 'forwards'
      }
    )

  })


  const backButton =
    floatingCard.querySelector(
      '.floating-back-button'
    )


  backButton.style.transform =
    'rotateY(180deg)'


  backButton.style.left =
    'auto'


  backButton.style.right =
    '32px'


  backButton.addEventListener(
    'click',
    (event) => {

      event.preventDefault()
      event.stopPropagation()


      floatingCard.animate(
        [

          {
            left: `${finalLeft}px`,
            top: `${finalTop}px`,
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
            transform:
              'perspective(1400px) rotateY(360deg) scale(1)',
            opacity: 1
          },

          {
            left: `${finalLeft + finalWidth * 0.25}px`,
            top: `${finalTop + finalHeight * 0.12}px`,
            width: `${finalWidth * 0.6}px`,
            height: `${finalHeight * 0.6}px`,
            transform:
              'perspective(1400px) translateY(-20px) rotateX(8deg) rotateY(450deg) scale(1)',
            opacity: 1
          },

          {
            left: `${rect.left}px`,
            top: `${rect.top - 30}px`,
            width: `${rect.width * 1.08}px`,
            height: `${rect.height * 1.08}px`,
            transform:
              'perspective(1400px) translateY(-20px) rotateX(10deg) rotateY(620deg) scale(1.05)',
            opacity: 1
          },

          {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transform:
              'perspective(1400px) rotateY(720deg) scale(1)',
            opacity: 0
          }

        ],
        {
          duration: 850,
          easing:
            'cubic-bezier(0.22, 0.8, 0.22, 1)',
          fill: 'forwards'
        }

      ).finished.then(() => {

        floatingCard.remove()

        document
          .querySelector(
            '#platform-home'
          )
          ?.classList.remove(
            'card-is-open'
          )

        document
          .querySelector(
            '.platform-nav'
          )
          ?.classList.remove(
            'platform-nav-behind'
          )

      })

    }
  )

}
/* =========================================================
   CLOSE VIEW
========================================================= */

function closePlatformView() {
const floatingCard =
    document.querySelector(
      '.platform-floating-card'
    )

  if (floatingCard) {

    floatingCard.classList.remove(
      'is-opening'
    )

    floatingCard.classList.add(
      'is-closing'
    )

    document
      .querySelector(
        '#platform-home'
      )
      ?.classList.remove(
        'card-is-open'
      )

    document
      .querySelector(
        '.platform-nav'
      )
      ?.classList.remove(
        'platform-nav-behind'
      )

    setTimeout(() => {
      floatingCard.remove()
    }, 500)

    return
  }
  const home =
    document.querySelector(
      '#platform-home'
    )

  const internalView =
    document.querySelector(
      '#platform-internal-view'
    )


  if (!home || !internalView) {
    return
  }


  internalView.classList.remove(
    'is-active'
  )

  internalView.setAttribute(
    'aria-hidden',
    'true'
  )


  home.classList.add(
    'is-active'
  )

  home.setAttribute(
    'aria-hidden',
    'false'
  )


  document
    .querySelectorAll(
      '.platform-nav [data-platform-view]'
    )
    .forEach((link) => {

      link.classList.toggle(
        'active',
        link.dataset.platformView === 'home'
      )

    })


  window.scrollTo({
    top: 0,
    behavior: 'instant'
  })


  initializeDynamicPlatform()
}


/* =========================================================
   MATERIAL FILTER
========================================================= */

function filterLabel(type) {

  const labels = {

    practice:
      'Practice',

    vocabulary:
      'Vocabulary',

    resource:
      'Resources',

    class:
      'Class Materials'

  }


  return labels[type] || 'Materials'
}


/* =========================================================
   FILTERED MATERIALS
========================================================= */

function renderFilteredMaterials(
  student,
  materials,
  filter
) {

  if (!materials.length) {

    return `
      <div class="empty-platform-state">

        <p>
          No ${filterLabel(filter).toLowerCase()}
          yet.
        </p>

        <small>
          Your teacher will add resources
          for your learning journey.
        </small>

      </div>
    `
  }


  return `
    <div class="class-materials-list">

      ${materials.map(
        (material, index) => `

          <article
            class="class-material-item reveal"
          >

            <div class="class-material-number">
              ${String(index + 1).padStart(2, '0')}
            </div>


            <div class="class-material-info">

              <span>
                ${material.type.toUpperCase()}
                ·
                ${material.language || student.language}
                ${material.level
                  ? ` · ${material.level}`
                  : ''
                }
              </span>

              <h3>
                ${material.title}
              </h3>

              <p>
                ${material.description || 'Learning material'}
              </p>

            </div>


            <button
              class="class-material-button"
              type="button"
              data-material-path="${material.file_path || ''}"
            >
              Open ↗
            </button>

          </article>

        `
      ).join('')}

    </div>
  `
}


/* =========================================================
   DYNAMIC PLATFORM
========================================================= */

function initializeDynamicPlatform(root = document) {

  setupScrollReveal(root)

  setupProgressAnimations(root)

  setupRoadmapAnimations(root)

  setupCardMovement(root)

  setupMaterialButtons(root)

}


/* =========================================================
   MATERIAL BUTTONS
========================================================= */

function setupMaterialButtons(root = document) {

  const buttons =
    root.querySelectorAll(
      '[data-material-path]'
    )


  buttons.forEach((button) => {

    button.addEventListener(
      'click',
      () => {

        const filePath =
          button.dataset.materialPath

        if (!filePath) {
          return
        }

        window.voPlatform.openMaterial(
          filePath
        )

      }
    )

  })

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function setupScrollReveal(root = document) {

  const elements =
    root.querySelectorAll(`
      .platform-section-heading,
      .materials-footer,
      .class-materials-header,
      .class-material-item,
      .next-step
    `)


  if (!elements.length) {
    return
  }


  elements.forEach((element) => {

    element.classList.add(
      'reveal'
    )

  })


  const observer =
    new IntersectionObserver(
      (
        entries,
        observerInstance
      ) => {

        entries.forEach(
          (entry) => {

            if (!entry.isIntersecting) {
              return
            }

            entry.target.classList.add(
              'is-visible'
            )

            observerInstance.unobserve(
              entry.target
            )

          }
        )

      },
      {
        threshold: 0.12
      }
    )


  elements.forEach(
    (element) => {

      observer.observe(
        element
      )

    }
  )
}


/* =========================================================
   PROGRESS ANIMATION
========================================================= */

function setupProgressAnimations(root = document) {

  const progressBars =
    root.querySelectorAll(
      '.progress-fill'
    )


  progressBars.forEach(
    (bar) => {

      const target =
        parseInt(
          bar
            .getAttribute('style')
            ?.match(/\d+/)?.[0] || '0',
          10
        )


      bar.style.width = '0%'


      const observer =
        new IntersectionObserver(
          (
            entries,
            observerInstance
          ) => {

            entries.forEach(
              (entry) => {

                if (!entry.isIntersecting) {
                  return
                }


                requestAnimationFrame(
                  () => {

                    bar.style.width =
                      `${target}%`

                  }
                )


                observerInstance.unobserve(
                  entry.target
                )

              }
            )

          },
          {
            threshold: 0.5
          }
        )


      observer.observe(bar)

    }
  )
}


/* =========================================================
   ROADMAP
========================================================= */

function setupRoadmapAnimations(root = document) {

  const steps =
    root.querySelectorAll(
      '.roadmap-step'
    )


  if (!steps.length) {
    return
  }


  steps.forEach(
    (step, index) => {

      step.style.transitionDelay =
        `${index * 120}ms`

    }
  )


  const observer =
    new IntersectionObserver(
      (
        entries,
        observerInstance
      ) => {

        entries.forEach(
          (entry) => {

            if (!entry.isIntersecting) {
              return
            }


            entry.target.classList.add(
              'is-visible'
            )


            const fill =
              entry.target.querySelector(
                '.roadmap-progress-fill'
              )


            if (fill) {

              const percentage =
                entry.target
                  .querySelector('strong')
                  ?.textContent
                  ?.trim()


              if (percentage) {

                fill.style.width =
                  '0%'

                setTimeout(
                  () => {

                    fill.style.width =
                      percentage

                  },
                  250
                )

              }

            }


            observerInstance.unobserve(
              entry.target
            )

          }
        )

      },
      {
        threshold: 0.15
      }
    )


  steps.forEach(
    (step) => {

      observer.observe(
        step
      )

    }
  )
}


/* =========================================================
   CARD MOVEMENT
========================================================= */

function setupCardMovement(root = document) {

  const cards =
    root.querySelectorAll(`
      .material-card,
      .passport-main,
      .progress-card,
      .vera-voice-card
    `)


  if (
    window.matchMedia(
      '(pointer: fine)'
    ).matches === false
  ) {
    return
  }


  cards.forEach(
    (card) => {

      card.addEventListener(
        'mousemove',
        (event) => {

          const rect =
            card.getBoundingClientRect()


          const x =
            event.clientX - rect.left


          const y =
            event.clientY - rect.top


          const rotateX =
            ((y / rect.height) - 0.5) * -4


          const rotateY =
            ((x / rect.width) - 0.5) * 4


          if (card.classList.contains('vera-voice-card')) {
            card.style.setProperty(
              '--card-tilt-x',
              `${rotateX}deg`
            )

            card.style.setProperty(
              '--card-tilt-y',
              `${rotateY}deg`
            )
          } else {
            card.style.transform =
              `translateY(-8px)
               perspective(900px)
               rotateX(${rotateX}deg)
               rotateY(${rotateY}deg)`
          }

        }
      )


      card.addEventListener(
        'mouseleave',
        () => {

          if (card.classList.contains('vera-voice-card')) {
            card.style.removeProperty('--card-tilt-x')
            card.style.removeProperty('--card-tilt-y')
          } else {
            card.style.transform = ''
          }

        }
      )

    }
  )
}


/* =========================================================
   GLOBAL PLATFORM FUNCTIONS
========================================================= */

function setupGlobalPlatformFunctions() {

  window.voPlatform = {

    openMaterial: async (
      filePath
    ) => {

      try {

        if (!filePath) {
          throw new Error(
            'Material file path is missing.'
          )
        }


        const {
          data,
          error
        } =
          await supabase
            .storage
            .from('materials')
            .createSignedUrl(
              filePath,
              3600
            )


        if (error) {
          throw error
        }


        window.open(
          data.signedUrl,
          '_blank'
        )

      } catch (error) {

        console.error('Unable to open the material.')

        alert(
          'Could not open this material. Please try again.'
        )

      }

    },


    submitChallenge: async (
      challengeId
    ) => {

      const textarea =
        document.querySelector(
          `#response-${challengeId}`
        )


      const button =
        document.querySelector(
          `#challenge-form-${challengeId} button`
        )


      const errorLabel =
        document.querySelector(
          `#challenge-error-${challengeId}`
        )


      if (!textarea) {
        return
      }


      const responseText =
        textarea.value.trim()


      if (!responseText) {

        if (errorLabel) {

          errorLabel.textContent =
            'Please write a response.'

        }

        return
      }


      try {

        if (button) {

          button.disabled = true

          button.textContent =
            'Submitting...'

        }


        if (errorLabel) {
          errorLabel.textContent = ''
        }


        const { error } =
          await supabase
            .from(
              'challenge_submissions'
            )
            .insert({

              challenge_id:
                challengeId,

              student_id:
                currentStudent.id,

              response:
                responseText,

              status:
                'submitted'

            })


        if (error) {
          throw error
        }


        await loadPlatform()

      } catch (error) {

        console.error('Unable to submit the challenge response.')


        if (errorLabel) {

          errorLabel.textContent =
            'Error saving your submission.'

        }


        if (button) {

          button.disabled = false

          button.textContent =
            'Submit Challenge ↗'

        }

      }

    }

  }

  document
    .querySelector('#student-logout-button')
    ?.addEventListener('click', async () => {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Error signing out:', err)
      } finally {
        window.location.replace('/login.html')
      }
    })

}


loadPlatform()