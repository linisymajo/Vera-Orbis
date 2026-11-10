import { setupAcademicAIConsent } from './components/settings.js'
import { readEnrollmentAccess, renderEnrollmentGate, initializeEnrollmentProfile, EnrollmentServiceError, renderEnrollmentServiceError } from './lib/enrollment.js'
import './platform.css'
import './academic.css'

import { getCurrentUser, getStudentProfile } from './lib/auth.js'
import {
  renderPlatform,
  renderPlatformView
} from './pages/platform.js'
import { supabase } from './lib/supabase.js'
import { setupExerciseForms } from './components/exercises.js'
import { mountLearningPlans } from './components/learningPlans.js'
import { mountNotifications } from './components/notifications.js'
import { renderFinals, setupFinals } from './components/finals.js'
import { submitAcademicChallenge } from './lib/academicChallenges.js'
import { getUnreadNotificationCount } from './lib/notifications.js'
import { setupInboxHandlers } from './components/inbox.js'
import { setupPassportBook } from './components/passportBook.js'
import { normalizeInterfaceLanguage, t } from './lib/i18n.js'
import { isStudentView, readStudentRoute, watchAcademicLocation, writeStudentRoute } from './lib/academicRoutes.js'

let currentStudent = null
let platformNavigationId = 0
let activePlatformView = 'home'
let stopPlatformRoutes = () => {}
const IS_STAGING_PREVIEW = import.meta.env.MODE === 'staging'
export const VERA_VOICE_URL =
  import.meta.env.VITE_VERA_VOICE_URL || (IS_STAGING_PREVIEW ? '' : 'http://localhost:3000/')

export function getEffectiveVeraVoiceUrl() {
  if (IS_STAGING_PREVIEW) {
    // Staging never borrows a browser override or the production Voice service.
    try {
      const configured = new URL(VERA_VOICE_URL)
      if (configured.protocol !== 'https:' || ['vera-orbis.onrender.com', 'localhost', '127.0.0.1', '[::1]'].includes(configured.hostname)) return ''
      return configured.href
    } catch { return '' }
  }
  if (typeof window !== 'undefined') {
    try {
      const custom =
        window.__VERA_VOICE_URL__ ||
        window.localStorage?.getItem('VITE_VERA_VOICE_URL')
      if (custom && typeof custom === 'string' && custom.trim()) {
        return custom.trim()
      }
    } catch {}
    if (
      window.location?.protocol === 'https:' &&
      (!VERA_VOICE_URL ||
        VERA_VOICE_URL.includes('localhost') ||
        VERA_VOICE_URL.includes('127.0.0.1') ||
        VERA_VOICE_URL.startsWith('http://'))
    ) {
      return 'https://vera-orbis.onrender.com/'
    }
  }
  return VERA_VOICE_URL
}

export function isVeraVoiceConfiguredForEnv(testUrl) {
  if (IS_STAGING_PREVIEW) return Boolean(getEffectiveVeraVoiceUrl())
  const url = testUrl || getEffectiveVeraVoiceUrl()
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    const isLocalhostOrHttp =
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.startsWith('http://')
    return !isLocalhostOrHttp
  }
  return Boolean(url)
}

let platformData = {
  materials: [],
  feedback: [],
  challenges: [],
  submissions: [],
  exercises: [],
  finals: []
}

async function refreshNotificationBadge() {
  try {
    const count = await getUnreadNotificationCount(supabase)
    document.querySelectorAll('[data-academic-unread]').forEach(badge => { badge.textContent = count ? String(count) : ''; badge.hidden = !count })
  } catch {
    document.querySelectorAll('[data-academic-unread]').forEach(badge => { badge.textContent = ''; badge.hidden = true })
  }
}

async function setupStudentAcademicView(view, host) {
  if (!host) return
  if (platformData.viewErrors?.[view]) {
    host.innerHTML = '<p role="alert">Your current learning information could not be loaded. Your saved work is safe.</p><button type="button" data-academic-retry>Try again</button>'
    host.querySelector('[data-academic-retry]').onclick = () => openPlatformView(view)
    return
  }
  const panel = host.querySelector('[data-student-academic-view]')
  if (!panel) return
  try {
  if (view === 'learning-plans') await mountLearningPlans(panel, supabase, { studentView: true })
  if (view === 'notifications') await mountNotifications(panel, supabase, { onNavigate: target => {
    document.querySelector('.platform-floating-card')?.remove()
    document.querySelector('#platform-home')?.classList.remove('card-is-open')
    document.querySelector('.platform-nav')?.classList.remove('platform-nav-behind')
    openPlatformView(target)
  }, onCountChange: refreshNotificationBadge })
  if (view === 'finals') {
    if (platformData.finalsError) { panel.textContent = 'Final assessments are unavailable. Please try again or contact your teacher.'; return }
    panel.innerHTML = renderFinals(platformData.finals)
    setupFinals(supabase, panel)
  }
  } catch {
    panel.textContent = 'Your learning information is unavailable. Try opening this view again.'
  }
}

async function refreshStudentView(view) {
  const tables = { materials: 'materials', feedback: 'feedback', calendar: 'classes', inbox: 'inbox_messages', challenges: 'weekly_challenges', finals: 'student_finals', exercises: 'student_exercises' }
  if (!tables[view]) return
  platformData.viewErrors ||= {}
  try {
    const main = await withTimeout(supabase.from(tables[view]).select('*'), 12000)
    if (main.error) throw new Error('Learning information unavailable')
    const data = main.data || []
    if (view === 'challenges') {
      const responses = await supabase.from('student_challenge_submissions').select('*')
      if (responses.error) throw new Error('Responses unavailable')
      platformData.challenges = data.filter(item => !item.status || item.status === 'active')
      platformData.submissions = responses.data || []
    } else if (view === 'exercises') {
      const finals = await supabase.from('student_finals').select('exercise_id')
      if (finals.error) throw new Error('Assessments unavailable')
      const finalIds = new Set((finals.data || []).map(item => item.exercise_id))
      platformData.exercises = data.filter(item => !finalIds.has(item.exercise_id))
    } else if (view === 'calendar') {
      const attendance = await supabase.from('class_attendance').select('*').eq('student_id', currentStudent.id)
      if (attendance.error) throw new Error('Calendar unavailable')
      platformData.classes = data
      platformData.attendance = attendance.data || []
    } else {
      platformData[view === 'inbox' ? 'messages' : view] = data
      if (view === 'finals') platformData.finalsError = false
    }
    delete platformData.viewErrors[view]
  } catch {
    platformData.viewErrors[view] = true
  }
}


const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

function withTimeout(promise, ms = 12000, errorMsg = 'Operation timed out') {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

export function renderPlatformLoadingScreen(message = 'Verifying your student session...') {
  const app = document.querySelector('#app')
  if (!app) return
  app.innerHTML = `
    <div class="loading-screen" id="platform-loading-screen">
      <div class="loading-mark">
        <img
          src="${VO_LOGO}"
          alt="Vera Orbis"
        >
      </div>
      <p>${message}</p>
    </div>
  `
}

export function renderProfileNotFoundScreen() {
  const app = document.querySelector('#app')
  if (!app) return
  app.innerHTML = `
    <div class="loading-screen" id="platform-profile-screen" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 500px; text-align: center;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 12px; color: var(--vo-navy);">
          Profile not found
        </h1>
        <p style="color: var(--vo-muted); font-size: 14px; margin-bottom: 8px;">
          The user is logged in, but Vera Orbis could not load the student profile.
        </p>
        <p style="color: var(--vo-muted); font-size: 14px; margin-bottom: 24px;">
          Please sign in again or contact your instructor.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button
            type="button"
            id="unresolved-profile-retry"
            style="
              padding: 10px 24px;
              border-radius: 999px;
              border: none;
              background: #6C3BFF;
              color: #ffffff;
              cursor: pointer;
              font: inherit;
              font-weight: 600;
            "
          >
            Retry ↻
          </button>
          <button
            type="button"
            id="unresolved-profile-logout"
            style="
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
    </div>
  `

  document
    .querySelector('#unresolved-profile-retry')
    ?.addEventListener('click', () => {
      renderPlatformLoadingScreen()
      loadPlatform()
    })

  document
    .querySelector('#unresolved-profile-logout')
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

export function renderPlatformErrorScreen(error) {
  const app = document.querySelector('#app')
  if (!app) return
  const isTimeout = error?.message?.toLowerCase().includes('timed out')
  const title = isTimeout ? 'La conexión tardó demasiado' : 'No pudimos cargar tu plataforma'
  const message = isTimeout
    ? 'El servidor o la red tardaron en responder al verificar tu sesión.'
    : 'Ocurrió un error inesperado al verificar tu sesión o tus datos.'

  app.innerHTML = `
    <div class="loading-screen" id="platform-error-screen" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 500px; text-align: center;">
        <div class="loading-mark" style="margin: 0 auto 24px; animation: none;">
          <img src="${VO_LOGO}" alt="Vera Orbis">
        </div>
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; margin: 0 0 12px; color: var(--vo-navy);">
          ${title}
        </h1>
        <p style="color: var(--vo-muted); font-size: 14px; margin: 0 0 24px; line-height: 1.5;">
          ${message} Puedes intentar nuevamente o iniciar sesión otra vez.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button
            type="button"
            id="platform-retry-button"
            style="
              padding: 10px 24px;
              border-radius: 999px;
              border: none;
              background: #6C3BFF;
              color: #ffffff;
              cursor: pointer;
              font: inherit;
              font-weight: 600;
            "
          >
            Reintentar ↻
          </button>
          <button
            type="button"
            id="platform-error-logout"
            style="
              padding: 10px 24px;
              border-radius: 999px;
              border: 1px solid currentColor;
              background: transparent;
              cursor: pointer;
              font: inherit;
            "
          >
            Cerrar sesión ↗
          </button>
        </div>
      </div>
    </div>
  `

  document
    .querySelector('#platform-retry-button')
    ?.addEventListener('click', () => {
      renderPlatformLoadingScreen()
      loadPlatform()
    })

  document
    .querySelector('#platform-error-logout')
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

let isInitializingPlatform = false
let platformLoaded = false
let enrollmentServiceBlocked = false

/* =========================================================
   LOAD PLATFORM
========================================================= */

export async function loadPlatform({ retryEnrollment = false } = {}) {
  if (isInitializingPlatform || (enrollmentServiceBlocked && !retryEnrollment)) {
    return
  }
  isInitializingPlatform = true
  platformLoaded = false
  platformNavigationId++
  stopPlatformRoutes()

  try {
    const user = await getCurrentUser()

    if (!user) {
      window.location.replace('/login.html')
      isInitializingPlatform = false
      return
    }

    const enrollmentAccess = await readEnrollmentAccess(supabase, { retry: retryEnrollment })
    if (enrollmentAccess.student_id !== user.id) {
      throw new EnrollmentServiceError('Your account changed during enrollment verification.', { reason: 'session', code: 'ENROLLMENT_SESSION_CHANGED' })
    }
    enrollmentServiceBlocked = false
    if (!enrollmentAccess.academic_access) {
      renderEnrollmentGate(enrollmentAccess, { app: document.querySelector('#app'), client: supabase })
      return
    }
    if (enrollmentAccess.role === 'admin') { window.location.replace('/teacher.html'); return }

    const { data: teacherRecord } = await withTimeout(
      supabase
        .from('teachers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle(),
      10000,
      'Teacher check timed out'
    )

    if (teacherRecord) {
      isInitializingPlatform = false
      window.location.replace('/teacher.html')
      return
    }

    let profile = await withTimeout(
      getStudentProfile(user.id),
      10000,
      'Profile load timed out'
    )

    if (!profile) {
      await initializeEnrollmentProfile(supabase)
      profile = await getStudentProfile(user.id)
    }

    if (!profile) {
      isInitializingPlatform = false
      renderProfileNotFoundScreen()
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const bypassOnboarding =
      urlParams.get('from') === 'onboarding' ||
      sessionStorage.getItem('vo_onboarding_skipped') === 'true'

    let hasCompletedOnboarding = false
    const { data: onboarding, error: onboardingError } = await withTimeout(
      supabase
        .from('onboarding_responses')
        .select('student_id')
        .eq('student_id', profile.id)
        .maybeSingle(),
      10000,
      'Onboarding check timed out'
    )

    if (onboarding) {
      hasCompletedOnboarding = true
    }

    if (!bypassOnboarding) {
      if (!onboardingError && !onboarding) {
        isInitializingPlatform = false
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

    const savedUiLang =
      profile.interface_language ||
      (typeof window !== 'undefined'
        ? (window.sessionStorage?.getItem('vo_interface_language') ||
           window.localStorage?.getItem('vo_interface_language'))
        : null) ||
      'es'

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
        Boolean(hasCompletedOnboarding || lessonsCompleted > 0),
      interfaceLanguage: normalizeInterfaceLanguage(savedUiLang)
    }

    currentStudent = student

    const [
      materialsRes,
      feedbackRes,
      challengesRes,
      submissionsRes,
      exercisesRes,
      classesRes,
      attendanceRes,
      packagesRes,
      paymentsRes,
      cultureRes,
      messagesRes,
      finalsRes
    ] = await withTimeout(
      Promise.all([
        supabase
          .from('materials')
          .select('*')
          .or(
            `student_id.eq.${student.id},audience.eq.all,student_id.is.null`
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
            `student_id.eq.${student.id},audience.eq.all,student_id.is.null`
          )
          .order(
            'created_at',
            { ascending: false }
          ),

        supabase
          .from('student_challenge_submissions')
          .select('*')
          .eq(
            'student_id',
            student.id
          ),

        supabase
          .from('student_exercises')
          .select('*')
          .order('due_at', { ascending: true }),

        supabase
          .from('classes')
          .select('id, title, starts_at, duration_minutes, modality, status, language, level, notes')
          .order('starts_at', { ascending: true }),

        supabase
          .from('class_attendance')
          .select('*')
          .eq('student_id', student.id),

        supabase
          .from('student_packages')
          .select('assignment_id, package_id, classes_total, classes_used, status, created_at, packages(name, class_count, duration_minutes, price, currency)')
          .eq('student_id', student.id),

        supabase
          .from('student_payment_summary')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('culture_resources')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),

        supabase
          .from('inbox_messages')
          .select('*')
          .or(`recipient_id.eq.${student.id},sender_id.eq.${student.id}`)
          .order('created_at', { ascending: false }),
        supabase.from('student_finals').select('*').order('due_at', { ascending: true })
      ]),
      12000,
      'Platform data load timed out'
    )

    if (materialsRes.error) {
      console.warn('Materials query warning:', materialsRes.error.message)
    }
    if (feedbackRes.error) {
      console.warn('Feedback query warning:', feedbackRes.error.message)
    }
    if (challengesRes.error) {
      console.warn('Weekly challenges query warning:', challengesRes.error.message)
    }
    if (submissionsRes.error) {
      console.warn('Challenge submissions query warning:', submissionsRes.error.message)
    }

    const rawChallenges = challengesRes.data || []
    const activeChallenges = rawChallenges.filter(
      c => !c.status || String(c.status).toLowerCase() === 'active'
    )

    platformData = {
      materials:
        materialsRes.data || [],
      feedback:
        feedbackRes.data || [],
      challenges:
        activeChallenges,
      submissions:
        submissionsRes.data || [],
      exercises:
        exercisesRes.error ? [] : (exercisesRes.data || []).filter(item => !(finalsRes.data || []).some(final => final.exercise_id === item.exercise_id)),
      finals: finalsRes.data || [],
      finalsError: Boolean(finalsRes.error),
      classes:
        classesRes.error ? [] : (classesRes.data || []),
      attendance:
        attendanceRes.error ? [] : (attendanceRes.data || []),
      packages:
        packagesRes.error ? [] : (packagesRes.data || []),
      payments:
        paymentsRes.error ? [] : (paymentsRes.data || []),
      culture:
        cultureRes.error ? [] : (cultureRes.data || []),
      messages:
        messagesRes.error ? [] : (messagesRes.data || [])
    }

    const app = document.querySelector('#app')
    if (app) {
      app.innerHTML =
        renderPlatform(
          student,
          platformData.materials,
          platformData.feedback,
          platformData.challenges,
          platformData.submissions,
          platformData.exercises,
          platformData.classes,
          platformData.attendance,
          platformData.packages,
          platformData.payments,
          platformData.culture,
          platformData.messages
        )
    }

    initializeDynamicPlatform()
    setupGlobalPlatformFunctions()
    setupExerciseForms(supabase)
    setupAcademicAIConsent(supabase)
    refreshNotificationBadge()
    setupPlatformNavigation()

    platformLoaded = true
    await setupPlatformRoutes()
  } catch (error) {
    if (error instanceof EnrollmentServiceError) {
      enrollmentServiceBlocked = true
      renderEnrollmentServiceError(error, {
        app: document.querySelector('#app'), client: supabase,
        onRetry: () => loadPlatform({ retryEnrollment: true })
      })
      return
    }
    console.error('Error loading student platform:', error)
    renderPlatformErrorScreen(error)
  } finally {
    isInitializingPlatform = false
  }
}


/* =========================================================
   SWITCH INTERFACE LANGUAGE (Requirement 3 & 4)
========================================================= */
export async function switchInterfaceLanguage(newLang) {
  if (!currentStudent) return
  const norm = normalizeInterfaceLanguage(newLang)
  if (currentStudent.interfaceLanguage === norm) return

  // Requirement 4: ONLY change interface language, NEVER change target language, progress, level, materials, etc.
  currentStudent.interfaceLanguage = norm
  try {
    localStorage.setItem('vo_interface_language', norm)
  } catch {}

  try {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ interface_language: norm })
      .eq('id', currentStudent.id)
    if (updateErr) {
      console.warn('Could not persist interface_language to Supabase:', updateErr.message)
    }
  } catch (err) {
    console.warn('Could not persist interface_language to Supabase:', err)
  }

  const app = document.querySelector('#app')
  if (app) {
    app.innerHTML = renderPlatform(
      currentStudent,
      platformData.materials,
      platformData.feedback,
      platformData.challenges,
      platformData.submissions,
      platformData.exercises
    )
    setupExerciseForms(supabase)
    setupAcademicAIConsent(supabase)
    refreshNotificationBadge()
    setupGlobalPlatformFunctions()
    await setupPlatformRoutes()
  }
}

/* =========================================================
   PLATFORM NAVIGATION
========================================================= */
let platformNavigationReady = false

async function setupPlatformRoutes() {
  if (!platformLoaded || enrollmentServiceBlocked || !currentStudent) return
  activePlatformView = 'home'
  stopPlatformRoutes()
  stopPlatformRoutes = watchAcademicLocation(() => {
    if (!platformLoaded || enrollmentServiceBlocked) return
    const view = readStudentRoute()
    if (view !== activePlatformView) openPlatformView(view, null, null, { updateHistory: false })
  })
  const initialView = readStudentRoute()
  if (initialView !== 'home') await openPlatformView(initialView, null, null, { updateHistory: false })
}


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

  let activeVeraVoiceMessageHandler = null
  let activeVeraVoiceTimeoutId = null

  function closeVeraVoiceModal() {
    if (activeVeraVoiceTimeoutId) {
      clearTimeout(activeVeraVoiceTimeoutId)
      activeVeraVoiceTimeoutId = null
    }
    if (activeVeraVoiceMessageHandler) {
      window.removeEventListener('message', activeVeraVoiceMessageHandler)
      activeVeraVoiceMessageHandler = null
    }
    const modal = document.querySelector('#vera-voice-modal')
    const frame = document.querySelector('#vera-voice-frame')
    const notice = document.querySelector('#vera-voice-notice')
    const loader = document.querySelector('#vera-voice-loader')
    if (!modal) return
    modal.hidden = true
    modal.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('modal-open')
    if (frame) {
      frame.src = 'about:blank'
      frame.onload = null
    }
    if (notice) {
      notice.hidden = true
    }
    if (loader) {
      loader.hidden = true
    }
  }

  async function launchVeraVoice(trigger) {
    const card = trigger?.closest('.vera-voice-card')
    const status = card?.querySelector('.vera-voice-status')
    const modal = document.querySelector('#vera-voice-modal')
    const frame = document.querySelector('#vera-voice-frame')
    const notice = document.querySelector('#vera-voice-notice')
    const loader = document.querySelector('#vera-voice-loader')
    const externalLink = document.querySelector('#vera-voice-external-link')
    const rawUrl = getEffectiveVeraVoiceUrl()
    const url = rawUrl.endsWith('/')
      ? rawUrl
      : `${rawUrl}/`

    const isHttpsEnv =
      typeof window !== 'undefined' && window.location?.protocol === 'https:'
    const isUnsafeLocalUrl =
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.startsWith('http://')
    const isUnconfiguredStaging = IS_STAGING_PREVIEW && !rawUrl
    const isUnconfiguredInProduction = isUnconfiguredStaging || (isHttpsEnv && isUnsafeLocalUrl)

    if (modal) {
      modal.hidden = false
      modal.setAttribute('aria-hidden', 'false')
      document.body.classList.add('modal-open')
    }

    if (isUnconfiguredInProduction) {
      if (frame) {
        frame.hidden = true
        frame.src = 'about:blank'
      }
      if (loader) {
        loader.hidden = true
      }
      if (notice) {
        notice.hidden = false
        if (isUnconfiguredStaging) {
          const stagingMsg = 'Vera Voice is disabled in this staging preview. A separate staging service has not been configured.'
          const noticeTitle = document.querySelector('#vera-voice-notice-title')
          const noticeDesc = document.querySelector('#vera-voice-notice-desc')
          const noticeSetup = notice.querySelector?.('.vera-voice-notice-setup')
          if (noticeDesc) {
            if (noticeTitle) noticeTitle.textContent = 'Vera Voice — Staging Preview'
            noticeDesc.textContent = stagingMsg
            if (noticeSetup) noticeSetup.style.display = 'none'
          } else {
            notice.textContent = stagingMsg
          }
        }
      }
      if (externalLink) {
        externalLink.style.display = 'none'
        if (isUnconfiguredStaging) externalLink.removeAttribute('href')
      }
      if (status) {
        status.textContent = isUnconfiguredStaging
          ? 'Vera Voice is disabled in this staging preview. A separate staging service has not been configured.'
          : 'Vera Voice requiere configurar VITE_VERA_VOICE_URL con HTTPS en producción.'
      }
      if (isUnconfiguredStaging) trigger?.setAttribute('aria-disabled', 'true')
      else trigger?.removeAttribute('aria-disabled')
      return
    }

    if (notice) notice.hidden = true
    if (loader) loader.hidden = false
    if (frame) frame.hidden = false
    if (externalLink) {
      externalLink.style.display = ''
      externalLink.href = url
    }

    if (status) status.textContent = 'Conectando con Vera Voice...'
    trigger?.setAttribute('aria-disabled', 'true')

    let veraOrigin
    try {
      veraOrigin = new URL(url).origin
    } catch {
      if (loader) loader.hidden = true
      if (status) status.textContent = 'URL de Vera Voice inválida.'
      trigger?.removeAttribute('aria-disabled')
      return
    }

    let timeoutId
    let messageHandler

    // In-page modal experience
    if (modal && frame) {
      messageHandler = async (event) => {
        if (event.origin !== veraOrigin) return
        if (event.source !== frame.contentWindow) return
        if (event.data?.type !== 'VERA_AUTH_READY') return

        if (activeVeraVoiceTimeoutId) {
          clearTimeout(activeVeraVoiceTimeoutId)
          activeVeraVoiceTimeoutId = null
        }
        if (loader) loader.hidden = true

        try {
          let {
            data: { session },
            error
          } = await supabase.auth.getSession()

          if (
            !session ||
            !session.access_token ||
            (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)
          ) {
            try {
              const { data: refreshData } = await supabase.auth.refreshSession()
              if (refreshData?.session?.access_token) {
                session = refreshData.session
              }
            } catch {}
          }

          if (error || !session?.access_token) {
            throw new Error('No active student session was found.')
          }

          frame.contentWindow.postMessage(
            {
              type: 'VERA_AUTH_CONTEXT',
              accessToken: session.access_token,
              profile: currentStudent
                ? {
                    id: currentStudent.id,
                    name: currentStudent.name,
                    language: currentStudent.language,
                    level: currentStudent.level,
                    levelName: currentStudent.levelName,
                    interfaceLanguage: currentStudent.interfaceLanguage || 'es'
                  }
                : null
            },
            veraOrigin
          )

          if (status) {
            status.textContent = 'Sesión conectada con Vera Voice.'
          }
        } catch (err) {
          console.error('Vera Voice auth error:', err)
          if (status) {
            status.textContent = 'No se pudo conectar la sesión.'
          }
        }
      }

      if (activeVeraVoiceTimeoutId) {
        clearTimeout(activeVeraVoiceTimeoutId)
      }
      if (activeVeraVoiceMessageHandler) {
        window.removeEventListener('message', activeVeraVoiceMessageHandler)
      }

      activeVeraVoiceMessageHandler = messageHandler
      window.addEventListener('message', messageHandler)

      activeVeraVoiceTimeoutId = setTimeout(() => {
        if (loader) loader.hidden = true
        if (status) {
          status.textContent =
            'Vera Voice tardó en responder. Si el servidor backend está despertando, espera unos segundos y reintenta.'
        }
      }, 25000)

      const pingFrame = () => {
        try {
          frame.contentWindow?.postMessage({ type: 'VERA_PING' }, veraOrigin)
        } catch {}
      }

      frame.onload = () => {
        pingFrame()
        setTimeout(pingFrame, 400)
        setTimeout(pingFrame, 1200)
      }

      const platformOrigin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const uiLang = currentStudent?.interfaceLanguage || 'es'
      const queryParts = []
      if (platformOrigin) {
        queryParts.push(`platformOrigin=${encodeURIComponent(platformOrigin)}`)
      }
      if (uiLang) {
        queryParts.push(`uiLang=${encodeURIComponent(uiLang)}`)
      }
      const urlWithOrigin = queryParts.length
        ? `${url}${url.includes('?') ? '&' : '?'}${queryParts.join('&')}`
        : url

      frame.src = urlWithOrigin
      trigger?.removeAttribute('aria-disabled')
      return
    }

    // Fallback: window popup
    let opened = null
    try {
      opened = window.open('about:blank', '_blank')
      if (!opened) {
        throw new Error('The browser blocked the new tab.')
      }

      messageHandler = async (event) => {
        if (event.origin !== veraOrigin) return
        if (event.source !== opened) return
        if (event.data?.type !== 'VERA_AUTH_READY') return

        window.removeEventListener('message', messageHandler)
        clearTimeout(timeoutId)

        try {
          let {
            data: { session },
            error
          } = await supabase.auth.getSession()

          if (
            !session ||
            !session.access_token ||
            (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)
          ) {
            try {
              const { data: refreshData } = await supabase.auth.refreshSession()
              if (refreshData?.session?.access_token) {
                session = refreshData.session
              }
            } catch {}
          }

          if (error || !session?.access_token) {
            throw new Error('No active student session was found.')
          }

          if (opened.closed) return

          opened.postMessage(
            {
              type: 'VERA_AUTH_CONTEXT',
              accessToken: session.access_token,
              profile: currentStudent
                ? {
                    id: currentStudent.id,
                    name: currentStudent.name,
                    language: currentStudent.language,
                    level: currentStudent.level,
                    levelName: currentStudent.levelName,
                    interfaceLanguage: currentStudent.interfaceLanguage || 'es'
                  }
                : null
            },
            veraOrigin
          )

          if (status) {
            status.textContent = 'Sesión enviada a Vera Voice.'
          }
        } catch (error) {
          console.error('Vera Voice authentication failed.')
          if (status) {
            status.textContent = 'No se pudo conectar la sesión.'
          }
        }
      }

      window.addEventListener('message', messageHandler)

      timeoutId = setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        if (status) {
          status.textContent =
            'Vera Voice tardó en responder. Verifica que esté iniciada.'
        }
      }, 15000)

      opened.location.href = url
    } catch (error) {
      console.error('Vera Voice could not be launched.')
      opened?.close()

      if (status) {
        status.textContent =
          'Vera Voice no está disponible. Iníciala localmente e intenta de nuevo.'
      }
    } finally {
      trigger?.removeAttribute('aria-disabled')
    }
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeVeraVoiceModal()
    }
  })

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#vera-voice-url-form')
    if (form) {
      event.preventDefault()
      if (IS_STAGING_PREVIEW) {
        launchVeraVoice(document.querySelector('[data-vera-voice-launch]'))
        return
      }
      const input = form.querySelector('#vera-voice-custom-url')
      const val = input?.value?.trim()
      if (val) {
        try {
          const parsed = new URL(val)
          const isHttpsEnv =
            typeof window !== 'undefined' && window.location?.protocol === 'https:'
          if (parsed.protocol === 'https:' || !isHttpsEnv) {
            try {
              window.localStorage?.setItem('VITE_VERA_VOICE_URL', parsed.origin)
            } catch {}
            launchVeraVoice(document.querySelector('[data-vera-voice-launch]'))
          } else {
            alert('En producción debes ingresar una URL segura con https://')
          }
        } catch {
          alert('Por favor ingresa una URL válida (ejemplo: https://tu-backend.onrender.com)')
        }
      }
    }
  })

  document.addEventListener(
    'click',
    (event) => {
      const langOption = event.target.closest('[data-set-interface-lang]')
      if (langOption) {
        event.preventDefault()
        event.stopPropagation()
        const newLang = langOption.dataset.setInterfaceLang
        const menu = document.querySelector('#interface-lang-menu')
        const toggle = document.querySelector('#interface-lang-toggle')
        if (menu) menu.hidden = true
        toggle?.setAttribute('aria-expanded', 'false')
        if (currentStudent && newLang) {
          switchInterfaceLanguage(newLang)
        }
        return
      }

      const langToggle = event.target.closest('#interface-lang-toggle')
      if (langToggle) {
        event.preventDefault()
        event.stopPropagation()
        const menu = document.querySelector('#interface-lang-menu')
        if (menu) {
          const isExpanded = langToggle.getAttribute('aria-expanded') === 'true'
          langToggle.setAttribute('aria-expanded', String(!isExpanded))
          menu.hidden = isExpanded
        }
        return
      }

      const openLangMenu = document.querySelector('#interface-lang-menu')
      if (openLangMenu && !openLangMenu.hidden && !event.target.closest('#interface-lang-dropdown')) {
        openLangMenu.hidden = true
        document.querySelector('#interface-lang-toggle')?.setAttribute('aria-expanded', 'false')
      }

      const veraClose = event.target.closest('[data-vera-voice-close]')
      if (veraClose) {
        event.preventDefault()
        closeVeraVoiceModal()
        return
      }

      const veraLaunch = event.target.closest('[data-vera-voice-launch]')

      if (veraLaunch) {
        event.preventDefault()
        event.stopPropagation()
        launchVeraVoice(veraLaunch)
        return
      }

      const veraLink = event.target.closest('[data-vera-voice-link]')

      if (veraLink) {
        const rawUrl = getEffectiveVeraVoiceUrl()
        const isHttpsEnv =
          typeof window !== 'undefined' && window.location?.protocol === 'https:'
        const isUnsafeLocalUrl =
          rawUrl.includes('localhost') ||
          rawUrl.includes('127.0.0.1') ||
          rawUrl.startsWith('http://')
        if (IS_STAGING_PREVIEW || (isHttpsEnv && isUnsafeLocalUrl)) {
          event.preventDefault()
          launchVeraVoice(veraLink)
          return
        }
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
  event.stopPropagation()

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
async function openPlatformView(
  view,
  filter = null,
  sourceElement = null,
  { updateHistory = true } = {}
) {
  if (!platformLoaded || enrollmentServiceBlocked || !currentStudent || !isStudentView(view)) return
  const requestedView = view
  const navigationId = ++platformNavigationId
  activePlatformView = view
  if (updateHistory) writeStudentRoute(view)
  document.querySelectorAll('.platform-floating-card, .roadmap-floating-card').forEach(card => card.remove())
  document.querySelector('#platform-home')?.classList.remove('card-is-open')
  document.querySelector('.platform-nav')?.classList.remove('platform-nav-behind')
  document.querySelectorAll('.platform-nav [data-platform-view]').forEach(link => {
    const active = link.dataset.platformView === view
    link.classList.toggle('active', active)
    if (active) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
  if (view === 'home') {
    closePlatformView({ updateHistory: false })
    return
  }
  await refreshStudentView(requestedView)
  if (platformNavigationId !== navigationId) return
  if (document.querySelector('#platform-internal-view')?.classList.contains('is-active')) sourceElement = null
  if (sourceElement?.closest('.platform-nav-more')) sourceElement = null
  document.querySelector('.platform-nav-more')?.removeAttribute('open')
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) sourceElement = null

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
        platformData.exercises,
        platformData.classes,
        platformData.attendance,
        platformData.packages,
        platformData.payments,
        platformData.culture,
        platformData.messages
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
    setupStudentAcademicView(view, floatingContent)
    setupExerciseForms(supabase)
    setupAcademicAIConsent(supabase)
    refreshNotificationBadge()
    if (view === 'inbox') {
      setupInboxHandlers(supabase, currentStudent, async () => {
        try {
          const mRes = await supabase.from('inbox_messages').select('*').or(`recipient_id.eq.${currentStudent.id},sender_id.eq.${currentStudent.id}`).order('created_at', { ascending: false })
          if (mRes.data) {
            platformData.messages = mRes.data
            const unread = mRes.data.filter(m => !m.is_read && m.sender_id !== currentStudent.id).length
            document.querySelectorAll('.nav-unread-badge').forEach(b => {
              b.textContent = unread > 0 ? String(unread) : ''
              b.style.display = unread > 0 ? 'inline-block' : 'none'
            })
          }
        } catch (e) { console.warn('Inbox refresh error:', e) }
      })
    }

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

    floatingContent.style.transform = 'none'

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
     * Subtle perspective lift-and-expand without mirroring.
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
        'perspective(1400px) translateY(0) rotateX(0deg) rotateY(0deg) scale(0.98)',
      opacity: 0.92
    },

    {
      left: `${finalLeft}px`,
      top: `${Math.max(16, finalTop - 8)}px`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      transform:
        'perspective(1400px) translateY(-6px) rotateX(2.5deg) rotateY(0deg) scale(1.008)',
      opacity: 1
    },

    {
      left: `${finalLeft}px`,
      top: `${finalTop}px`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      transform:
        'perspective(1400px) translateY(0) rotateX(0deg) rotateY(0deg) scale(1)',
      opacity: 1
    }
  ],
  {
    duration: 420,
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
    backButton.style.transform = 'none'

    backButton.addEventListener(
      'click',
      (event) => {

        event.preventDefault()
        event.stopPropagation()

        const closingNavigationId = ++platformNavigationId
        activePlatformView = 'home'
        writeStudentRoute('home')

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
                'perspective(1400px) translateY(0) rotateX(0deg) rotateY(0deg) scale(1)',
              opacity: 1
            },

            {
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              transform:
                'perspective(1400px) translateY(0) rotateX(0deg) rotateY(0deg) scale(0.96)',
              opacity: 0
            }
          ],
          {
            duration: 280,
            easing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
            fill: 'forwards'
          }
        ).finished.then(() => {

          floatingCard.remove()
          if (platformNavigationId !== closingNavigationId) return
          closePlatformView({ updateHistory: false })

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

    case 'learning-plans':
      viewTitle = 'LEARNING PLAN'
      break

    case 'finals':
      viewTitle = 'FINAL ASSESSMENTS'
      break

    case 'notifications':
      viewTitle = 'NOTIFICATIONS'
      break

    case 'inbox':
      viewTitle = 'INBOX & MESSAGES'
      break

    case 'calendar':
      viewTitle = 'CALENDAR & SESSIONS'
      break

    case 'packages':
      viewTitle = 'PAGOS'
      break

    case 'culture':
      viewTitle = 'CULTURAL IMMERSION'
      break

    case 'reports':
      viewTitle = 'ACADEMIC REPORT'
      break

    case 'settings':
      viewTitle = 'SETTINGS & PREFERENCES'
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
      platformData.exercises,
      platformData.classes,
      platformData.attendance,
      platformData.packages,
      platformData.payments,
      platformData.culture,
      platformData.messages
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
  setupStudentAcademicView(view, content)
  setupExerciseForms(supabase)
    setupAcademicAIConsent(supabase)
    refreshNotificationBadge()
  if (view === 'inbox') {
    setupInboxHandlers(supabase, currentStudent, async () => {
      try {
        const mRes = await supabase.from('inbox_messages').select('*').or(`recipient_id.eq.${currentStudent.id},sender_id.eq.${currentStudent.id}`).order('created_at', { ascending: false })
        if (mRes.data) {
          platformData.messages = mRes.data
          const unread = mRes.data.filter(m => !m.is_read && m.sender_id !== currentStudent.id).length
          document.querySelectorAll('.nav-unread-badge').forEach(b => {
            b.textContent = unread > 0 ? String(unread) : ''
            b.style.display = unread > 0 ? 'inline-block' : 'none'
          })
        }
      } catch (e) { console.warn('Inbox refresh error:', e) }
    })
  }


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
  if (!sourceElement) return
  const flipped = sourceElement.classList.toggle('is-flipped')
  sourceElement.setAttribute('aria-expanded', String(flipped))
  sourceElement.setAttribute('aria-pressed', String(flipped))
  const front = sourceElement.querySelector('.roadmap-card-front')
  const back = sourceElement.querySelector('.roadmap-card-back')
  if (front) front.setAttribute('aria-hidden', String(flipped))
  if (back) back.setAttribute('aria-hidden', String(!flipped))
}
/* =========================================================
   CLOSE VIEW
========================================================= */

function closePlatformView({ updateHistory = true } = {}) {
  if (!platformLoaded || !currentStudent) return
  platformNavigationId++
  activePlatformView = 'home'
  if (updateHistory) writeStudentRoute('home')
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
      if (link.dataset.platformView === 'home') link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')

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

  setupPassportBook(root)

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
      .vo-student-priority-card,
      .learning-access-card,
      .home-module-card,
      .material-card,
      .passport-book-closed,
      .passport-main,
      .progress-card,
      .vera-voice-card
    `)


  if (
    window.matchMedia('(pointer: fine)').matches === false ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches === true
  ) {
    return
  }


  cards.forEach(
    (card) => {
      if (card.dataset.cardTiltBound === 'true') return
      card.dataset.cardTiltBound = 'true'

      card.addEventListener(
        'mousemove',
        (event) => {

          const rect =
            card.getBoundingClientRect()

          if (!rect.width || !rect.height) return

          const x =
            event.clientX - rect.left

          const y =
            event.clientY - rect.top

          const isSubtleCard =
            card.classList.contains('vera-voice-card') ||
            card.classList.contains('passport-book-closed')

          const maxTilt = isSubtleCard ? 4.5 : 6.5

          const rotateX =
            ((y / rect.height) - 0.5) * -maxTilt

          const rotateY =
            ((x / rect.width) - 0.5) * maxTilt

          const glowX = Math.round((x / rect.width) * 100)
          const glowY = Math.round((y / rect.height) * 100)

          card.style.setProperty('--card-tilt-x', `${rotateX.toFixed(2)}deg`)
          card.style.setProperty('--card-tilt-y', `${rotateY.toFixed(2)}deg`)
          card.style.setProperty('--card-glow-x', `${glowX}%`)
          card.style.setProperty('--card-glow-y', `${glowY}%`)
        }
      )


      const resetTilt = () => {
        card.style.removeProperty('--card-tilt-x')
        card.style.removeProperty('--card-tilt-y')
        card.style.removeProperty('--card-glow-x')
        card.style.removeProperty('--card-glow-y')
      }

      card.addEventListener('mouseleave', resetTilt)
      card.addEventListener('blur', resetTilt)

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
      let targetWindow = null

      try {
        if (!filePath || typeof filePath !== 'string' || filePath.trim() === '' || filePath === 'undefined' || filePath === 'null') {
          alert('This material does not have an attached file.')
          return
        }

        const cleanPath = filePath.trim().replace(/^\/+/, '')

        // Pre-open a blank tab synchronously to satisfy the browser's user-gesture requirement
        // for popup blockers before performing the asynchronous signed-url request.
        try {
          targetWindow = window.open('about:blank', '_blank')
        } catch {
          targetWindow = null
        }

        const { data, error } = await supabase
          .storage
          .from('materials')
          .createSignedUrl(cleanPath, 3600)

        if (error) {
          if (targetWindow && !targetWindow.closed) {
            targetWindow.close()
          }

          console.error('Failed to generate signed URL for material:', error.message || error)

          if (error.statusCode === '404' || error.message?.includes('not found') || error.message?.includes('NoSuchKey')) {
            alert('This material file is not available in storage. Please contact your teacher.')
          } else if (error.statusCode === '403' || error.message?.includes('security') || error.message?.includes('policy')) {
            alert('You do not have permission to view this material.')
          } else {
            alert('Could not open this material. Please try again.')
          }
          return
        }

        if (!data?.signedUrl) {
          if (targetWindow && !targetWindow.closed) {
            targetWindow.close()
          }
          alert('Could not retrieve a valid link for this material. Please try again.')
          return
        }

        if (targetWindow && !targetWindow.closed) {
          targetWindow.location.href = data.signedUrl
        } else {
          // Fallback for browsers that blocked targetWindow pre-opening
          const link = document.createElement('a')
          link.href = data.signedUrl
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }

      } catch (error) {
        if (targetWindow && !targetWindow.closed) {
          targetWindow.close()
        }
        console.error('Unable to open material:', error?.message || 'Unknown error')
        alert('Could not open this material. Please try again.')
      }
    },

    submitChallenge: async (
      challengeId,
      sourceElement = null
    ) => {
      const selector = `#challenge-form-${challengeId}`
      const form = sourceElement?.closest('.challenge-submit-form')
        || document.querySelector('.platform-floating-card')?.querySelector(selector)
        || document.querySelector('#platform-view-content')?.querySelector(selector)
        || document.querySelector(selector)
      const textarea = form?.querySelector('textarea')
      const button = form?.querySelector('button')
      const errorLabel = form?.querySelector('.error-text')

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


        textarea.dataset.requestId ||= crypto.randomUUID()
        await submitAcademicChallenge(supabase, {
          challengeId,
          response: responseText,
          requestId: textarea.dataset.requestId
        })

        document.querySelector('.platform-floating-card')?.remove()
        document.querySelector('#platform-home')?.classList.remove('card-is-open')
        document.querySelector('.platform-nav')?.classList.remove('platform-nav-behind')
        await openPlatformView('challenges')

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


setupGlobalPlatformFunctions()

// Clean auth state change listener to prevent duplicate initialization
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    platformLoaded = false
    platformNavigationId++
    stopPlatformRoutes()
    enrollmentServiceBlocked = false
    window.location.replace('/login.html')
  } else if (event === 'SIGNED_IN' && !platformLoaded && !isInitializingPlatform && !enrollmentServiceBlocked) {
    loadPlatform()
  }
})

loadPlatform()
