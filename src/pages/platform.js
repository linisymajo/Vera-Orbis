import { renderRoadmap } from '../components/roadmap.js'
import { renderMaterials } from '../components/materials.js'
import { renderClassMaterials } from '../components/classMaterials.js'
import { renderFeedback } from '../components/feedback.js'
import { renderChallenges } from '../components/challenges.js'
import { renderExercises } from '../components/exercises.js'
import {
  SUPPORTED_INTERFACE_LANGUAGES,
  DEFAULT_INTERFACE_LANGUAGE,
  normalizeInterfaceLanguage,
  getTargetActionLabels,
  t
} from '../lib/i18n.js'

const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'
const VERA_VOICE_AVATAR = '/assets/Vera.png'
const VERA_VOICE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VERA_VOICE_URL) || 'http://localhost:3000/'

function getEffectiveVoiceUrl() {
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

export function renderPlatform(
  student,
  materials = [],
  feedback = [],
  challenges = [],
  submissions = [],
  exercises = []
) {
  const voiceUrl = getEffectiveVoiceUrl()
  const uiLang = normalizeInterfaceLanguage(
    student?.interfaceLanguage ||
    student?.interface_language ||
    (typeof window !== 'undefined' ? window.localStorage?.getItem('vo_interface_language') : null) ||
    (typeof window === 'undefined' ? 'en' : 'es')
  )
  const actionLabels = getTargetActionLabels(student?.language)
  const currentLangObj =
    SUPPORTED_INTERFACE_LANGUAGES.find((l) => l.code === uiLang) ||
    SUPPORTED_INTERFACE_LANGUAGES[0]

  return `
    <div class="platform-page">

      <!-- =====================================================
           NAVBAR
      ====================================================== -->

      <header class="platform-navbar">

        <a href="/" class="platform-logo">
          <img
            src="${VO_LOGO}"
            alt="Vera Orbis"
          >
        </a>

        <nav class="platform-nav">

          <a
            href="#home"
            class="active"
            data-platform-view="home"
          >
            ${t('home', uiLang)}
          </a>

          <a
            href="#journey"
            data-platform-view="journey"
          >
            ${actionLabels.journey}
          </a>

          <a
            href="#materials"
            class="platform-nav-card"
            data-platform-view="materials"
          >
            ${actionLabels.materials}
          </a>

          <a
            href="#feedback"
            data-platform-view="feedback"
          >
            ${t('feedback', uiLang)}
          </a>

          <a
            href="#challenges"
            data-platform-view="challenges"
          >
            ${actionLabels.challenges}
          </a>

          <a
            href="#progress"
            data-platform-view="progress"
          >
            ${t('progress', uiLang)}
          </a>

          <a href="#exercises" data-platform-view="exercises">
            ${t('exercises', uiLang)}
          </a>

        </nav>


        <div class="student-profile-actions">

          <!-- INTERFACE LANGUAGE SWITCHER -->
          <div class="interface-lang-selector" id="interface-lang-dropdown">
            <button
              type="button"
              class="interface-lang-btn"
              id="interface-lang-toggle"
              aria-label="${t('interfaceLangSelect', uiLang)}"
              title="${t('interfaceLangSelect', uiLang)}"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span class="lang-flag">${currentLangObj.flag}</span>
              <span class="lang-code">${uiLang.toUpperCase()}</span>
              <span class="lang-arrow">▾</span>
            </button>
            <div class="interface-lang-menu" id="interface-lang-menu" hidden>
              ${SUPPORTED_INTERFACE_LANGUAGES.map((item) => `
                <button
                  type="button"
                  class="interface-lang-option ${item.code === uiLang ? 'is-active' : ''}"
                  data-set-interface-lang="${item.code}"
                  role="menuitem"
                >
                  <span class="lang-flag">${item.flag}</span>
                  <span>${item.label}</span>
                  ${item.code === uiLang ? '<span class="lang-check">✓</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div
            class="student-profile"
            tabindex="0"
            role="region"
            aria-label="Perfil de estudiante"
          >
            <span class="profile-avatar">
              <img
                src="${VO_LOGO}"
                alt="Vera Orbis"
              >
            </span>

            <span>
              ${student.name}
            </span>
          </div>

          <button
            type="button"
            id="student-logout-button"
            class="platform-logout-btn"
            aria-label="${t('signOut', uiLang)}"
            title="${t('signOut', uiLang)}"
          >
            ${t('signOut', uiLang)}
          </button>
        </div>

      </header>


      <!-- =====================================================
           HOME
      ====================================================== -->

      <main class="platform-content">

        <div
          id="platform-home"
          class="platform-view platform-home-view is-active"
        >

          <!-- WELCOME -->

          <section class="platform-welcome">

            <div>

              <p class="platform-label">
                ${t('journeyEyebrow', uiLang)}
              </p>

              <h1>
                ${t('welcomeBack', uiLang)}
                <span>${student.name}.</span>
              </h1>

              <p class="platform-intro">
                ${t('welcomeIntro', uiLang)}
              </p>

            </div>


            <div class="welcome-orbit">

              <div class="orbit-ring ring-one"></div>

              <div class="orbit-ring ring-two"></div>

              <div class="orbit-center">

                <img
                  src="${VO_LOGO}"
                  alt="Vera Orbis"
                >

              </div>

              <div class="orbit-dot"></div>

            </div>

          </section>


          <!-- LANGUAGE PASSPORT -->

          <section
            class="passport-section"
            id="passport"
          >

            <div class="platform-section-heading passport-heading">

              <p class="platform-label">
                ${t('passportKicker', uiLang)}
              </p>

              <h2>
                ${t('passportTitle', uiLang)}
                <span>${t('passportTitleSpan', uiLang)}</span>
              </h2>

              <p class="passport-section-intro">
                ${t('passportIntro', uiLang)}
              </p>

            </div>


            <div class="language-passport-wrapper">

              <div class="language-passport">

                <div class="passport-glow"></div>

                <div class="passport-orbit orbit-a"></div>

                <div class="passport-orbit orbit-b"></div>


                <div class="passport-top">

                  <div class="passport-brand">

                    <div class="passport-brand-logo">

                      <img
                        src="${VO_LOGO}"
                        alt="Vera Orbis"
                      >

                    </div>

                    <div class="passport-stamps">

                      <span class="passport-stamp stamp-turquoise">
                        ${t('learnIt', uiLang)}
                      </span>

                      <span class="passport-stamp stamp-purple">
                        ${t('liveIt', uiLang)}
                      </span>

                      <span class="passport-stamp stamp-yellow">
                        ${t('speakIt', uiLang)}
                      </span>

                    </div>

                  </div>


                  <div class="passport-information">

                    <div class="passport-field passport-name">

                      <span>
                        ${t('studentLabel', uiLang)}
                      </span>

                      <strong>
                        ${student.name}
                      </strong>

                    </div>


                    <div class="passport-info-grid">

                      <div class="passport-field">

                        <span>
                          ${t('languageLabel', uiLang)}
                        </span>

                        <strong>
                          ${student.language}
                        </strong>

                      </div>


                      <div class="passport-field">

                        <span>
                          ${t('levelLabel', uiLang)}
                        </span>

                        <strong>
                          ${student.level}
                        </strong>

                        <small>
                          ${student.levelName}
                        </small>

                      </div>


                      <div class="passport-field">

                        <span>
                          ${t('destinationLabel', uiLang)}
                        </span>

                        <strong>
                          ${student.goal}
                        </strong>

                      </div>


                      <div class="passport-field">

                        <span>
                          ${t('journeyLabel', uiLang)}
                        </span>

                        <strong>
                          ${student.totalLessons ? `${student.lessonsCompleted} ${t('of', uiLang)} ${student.totalLessons}` : `${student.lessonsCompleted} ${t('completed', uiLang)}`}
                        </strong>

                        <small>
                          ${student.totalLessons ? t('lessonsLabel', uiLang) : t('totalPending', uiLang)}
                        </small>

                      </div>

                    </div>


                    <div class="passport-journey">

                      <div class="passport-journey-top">

                        <div>

                          <span>
                            ${t('journeyProgress', uiLang)}
                          </span>

                          <strong>
                            ${student.progress}%
                          </strong>

                        </div>

                        <span class="journey-status">
                          ${t('inProgress', uiLang)}
                        </span>

                      </div>


                      <div class="passport-progress-track">

                        <div
                          class="passport-progress-fill"
                          style="--passport-progress: ${student.progress}%"
                        ></div>

                      </div>


                      <div class="passport-progress-labels">

                        <span>
                          ${t('beginning', uiLang)}
                        </span>

                        <span>
                          ${t('yourJourney', uiLang)}
                        </span>

                        <span>
                          ${t('destination', uiLang)}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>


                <div class="passport-bottom">

                  <div class="passport-motto">

                    <span>${t('learnIt', uiLang)}</span>
                    <i></i>
                    <span>${t('liveIt', uiLang)}</span>
                    <i></i>
                    <span>${t('speakIt', uiLang)}</span>

                  </div>


                  <div class="passport-status">

                    <span class="status-dot"></span>

                    ${t('activeJourney', uiLang)}

                  </div>

                </div>


                <span class="passport-coordinate coordinate-one">
                  04° 36' N
                </span>

                <span class="passport-coordinate coordinate-two">
                  74° 05' W
                </span>

                <span class="passport-star star-one">
                  ✦
                </span>

                <span class="passport-star star-two">
                  ✦
                </span>

                <span class="passport-star star-three">
                  ✦
                </span>

              </div>

            </div>

          </section>


          <!-- MY JOURNEY ACCESS -->
          <section class="home-preview-section">
            <div class="platform-section-heading">
              <p class="platform-label">${t('journeyKicker', uiLang)}</p>
              <h2>${t('journeyHeading', uiLang)} <span>${t('journeyHeadingSpan', uiLang)}</span></h2>
              <p>
                ${t('journeyCardDesc', uiLang)}
              </p>
            </div>

            <button
              type="button"
              class="home-module-card home-journey-card"
              data-platform-view="journey"
            >
              <span class="home-module-number">
                02
              </span>

              <div class="home-module-content">
                <span class="home-module-label">
                  ${actionLabels.journey}
                </span>

                <h3>
                  ${t('journeyHeading', uiLang)}
                  <span>${t('journeyHeadingSpan', uiLang)}</span>
                </h3>

                <p>
                  ${t('journeyCardInnerDesc', uiLang)}
                </p>
              </div>

              <span class="home-module-arrow">
                ↗
              </span>
            </button>
          </section>


          <!-- MATERIALS PREVIEW -->

          ${renderMaterials(student, materials)}


          <!-- LEARNING ACCESS -->

          <div class="platform-learning-access">

            <div class="platform-section-heading">

              <p class="platform-label">
                ${t('learningAccessKicker', uiLang)}
              </p>

              <h2>
                ${t('learningAccessHeading', uiLang)}
                <span>${t('learningAccessHeadingSpan', uiLang)}</span>
              </h2>

              <p>
                ${t('learningAccessDesc', uiLang)}
              </p>

            </div>


            <div class="learning-access-grid">

              <button
                type="button"
                class="learning-access-card learning-access-feedback"
                data-platform-view="feedback"
              >

                <span class="learning-access-number">
                  01
                </span>

                <div>

                  <span class="learning-access-label">
                    ${t('feedback', uiLang)}
                  </span>

                  <h3>
                    ${t('feedbackCardTitle', uiLang)}
                  </h3>

                  <p>
                    ${t('feedbackCardDesc', uiLang)}
                  </p>

                </div>

                <span class="learning-access-arrow">
                  ↗
                </span>

              </button>


              <button
                type="button"
                class="learning-access-card learning-access-challenges"
                data-platform-view="challenges"
              >

                <span class="learning-access-number">
                  02
                </span>

                <div>

                  <span class="learning-access-label">
                    ${actionLabels.challenges}
                  </span>

                  <h3>
                    ${t('challengesCardTitle', uiLang)}
                  </h3>

                  <p>
                    ${t('challengesCardDesc', uiLang)}
                  </p>

                </div>

                <span class="learning-access-arrow">
                  ↗
                </span>

              </button>

            </div>

          </div>


          <!-- MY PROGRESS ACCESS -->

          <section class="home-progress-preview">

            <div class="platform-section-heading">

              <p class="platform-label">
                ${t('progressKicker', uiLang)}
              </p>

              <h2>
                ${t('progressHeading', uiLang)}
              </h2>

              <p>
                ${t('progressDesc', uiLang)}
              </p>

            </div>


            <button
              type="button"
              class="home-module-card home-progress-card"
              data-platform-view="progress"
            >

              <span class="home-module-number">
                05
              </span>


              <div class="home-module-content">

                <span class="home-module-label">
                  ${t('progressKicker', uiLang)}
                </span>

                <h3>
                  ${t('progressCardTitle', uiLang)}
                </h3>

                <p>
                  ${t('progressCardDesc', uiLang)}
                </p>

              </div>


              <span class="home-module-arrow">
                ↗
              </span>

            </button>

          </section>


          <!-- NEXT STEP / VERA VOICE -->

          <section class="vera-voice-access" aria-labelledby="vera-voice-title">
            <div class="platform-section-heading">
              <p class="platform-label">${t('veraVoiceKicker', uiLang)}</p>
              <h2>${t('veraVoiceTitle', uiLang)}</h2>
              <p>
                ${t('veraVoiceDesc', uiLang)}
              </p>
            </div>

            <div
              class="vera-voice-card"
              tabindex="0"
              role="button"
              aria-pressed="false"
              aria-label="${t('veraVoiceMeetVera', uiLang)}. ${t('veraVoiceFlipHint', uiLang)}."
            >
              <div class="vera-voice-card-face vera-voice-card-front" aria-hidden="false">
                <div class="vera-voice-card-copy">
                  <span class="vera-voice-card-label">VERA VOICE</span>
                  <h3 id="vera-voice-title">${t('veraVoiceMeetVera', uiLang)}</h3>
                  <p>${t('veraVoicePartner', uiLang)}</p>
                  <span class="vera-voice-flip-hint">${t('veraVoiceFlipHint', uiLang)}</span>
                </div>
                <img
                  src="${VERA_VOICE_AVATAR}"
                  alt="Vera, ${t('veraVoicePartner', uiLang)}"
                  class="vera-voice-avatar"
                >
              </div>

              <div class="vera-voice-card-face vera-voice-card-back" aria-hidden="true">
                <div>
                  <span class="vera-voice-card-label">${t('veraVoiceReady', uiLang)}</span>
                  <h3>${t('veraVoiceStartConvo', uiLang)}</h3>
                  <p>${t('veraVoicePracticePace', uiLang)}</p>
                  <a
                    class="vera-voice-launch"
                    href="${voiceUrl}"
                    data-vera-voice-launch
                    tabindex="-1"
                  >${actionLabels.talkToVera}</a>
                  <p class="vera-voice-status" role="status" aria-live="polite"></p>
                </div>
              </div>
            </div>
          </section>

          <section class="next-step">

            <p class="platform-label">
              ${t('nextStepLabel', uiLang)}
            </p>

            <h2>
              ${t('nextStepHeading', uiLang)}
            </h2>

            <button
              type="button"
              class="next-step-button"
              data-platform-view="journey"
            >
              ${t('continueJourney', uiLang)}
            </button>

          </section>

        </div>


        <!-- =====================================================
             INTERNAL VIEW
        ====================================================== -->

        <div
          id="platform-internal-view"
          class="platform-view platform-internal-view"
          aria-hidden="true"
        >

          <div class="platform-internal-header">

            <button
              type="button"
              class="platform-back-button"
              id="platform-back-button"
              data-platform-view="home"
            >
              ${t('backToHome', uiLang)}
            </button>

            <span
              class="platform-internal-kicker"
              id="platform-view-kicker"
            >
              VERA ORBIS
            </span>

          </div>


          <div
            id="platform-view-content"
            class="platform-view-content"
          ></div>

        </div>

      </main>


      <footer class="platform-footer">

        <span>
          VERA ORBIS
        </span>

        <span>
          LEARN IT · LIVE IT · SPEAK IT
        </span>

      </footer>

      <!-- =====================================================
           VERA VOICE IN-PAGE MODAL
      ====================================================== -->
      <div id="vera-voice-modal" class="vera-voice-modal" hidden aria-hidden="true">
        <div class="vera-voice-modal-backdrop" data-vera-voice-close></div>
        <div class="vera-voice-modal-dialog">
          <div class="vera-voice-modal-header">
            <div class="vera-voice-modal-brand">
              <img src="${VERA_VOICE_AVATAR}" alt="Vera" class="vera-modal-avatar">
              <div>
                <h3>Vera Voice</h3>
                <p>${t('veraVoicePartner', uiLang)}</p>
              </div>
            </div>
            <div class="vera-voice-modal-actions">
              <a href="${voiceUrl}" target="_blank" rel="noopener noreferrer" class="vera-voice-external-link" id="vera-voice-external-link" title="Abrir en ventana completa">
                Ventana completa ↗
              </a>
              <button type="button" class="vera-voice-modal-close" data-vera-voice-close aria-label="Cerrar Vera Voice">✕</button>
            </div>
          </div>
          <div class="vera-voice-frame-wrapper">
            <div id="vera-voice-notice" class="vera-voice-notice" hidden>
              <div class="vera-voice-notice-card">
                <div class="vera-voice-notice-icon">🎙️</div>
                <h4 id="vera-voice-notice-title">Conexión con Vera Voice</h4>
                <p id="vera-voice-notice-desc">
                  Para interactuar por voz en <strong>veraorbis.studio</strong>, el servidor backend (<code>vera-tutor-backend</code>) debe estar desplegado en un servicio público con HTTPS.
                </p>
                <div class="vera-voice-notice-setup">
                  <p class="vera-voice-notice-help">
                    Configura el secreto <code>VITE_VERA_VOICE_URL</code> en GitHub Actions con la URL HTTPS de tu backend (por ejemplo, en Render o Railway).
                  </p>
                  <form id="vera-voice-url-form" class="vera-voice-url-form">
                    <label for="vera-voice-custom-url">¿Ya desplegaste tu backend? Pruébalo aquí:</label>
                    <div class="vera-voice-url-input-group">
                      <input
                        type="url"
                        id="vera-voice-custom-url"
                        placeholder="https://tu-backend.onrender.com"
                        autocomplete="off"
                      >
                      <button type="submit" class="material-button">Conectar</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div id="vera-voice-loader" class="vera-voice-loader" hidden>
              <div class="vera-voice-spinner"></div>
              <p>Conectando con Vera...</p>
              <span class="vera-voice-loader-sub">Si el servidor se está iniciando, esto tomará unos segundos.</span>
            </div>
            <iframe
              id="vera-voice-frame"
              src="about:blank"
              allow="microphone; camera"
              title="Vera Voice Tutor"
            ></iframe>
          </div>
        </div>
      </div>

    </div>
  `
}


/* =========================================================
   INTERNAL VIEWS
========================================================= */

export function renderPlatformView(
  view,
  student,
  materials = [],
  feedback = [],
  challenges = [],
  submissions = [],
  exercises = []
) {
  const uiLang = normalizeInterfaceLanguage(
    student?.interfaceLanguage ||
    student?.interface_language ||
    (typeof window !== 'undefined' ? window.localStorage?.getItem('vo_interface_language') : null) ||
    (typeof window === 'undefined' ? 'en' : 'es')
  )
  const actionLabels = getTargetActionLabels(student?.language)

  switch (view) {

    case 'journey':

      return `
        <section class="platform-detail-section">

          <div class="platform-section-heading">

            <p class="platform-label">
              ${t('journeyKicker', uiLang)}
            </p>

            <h2>
              ${t('journeyHeading', uiLang)}
              <span>${t('journeyHeadingSpan', uiLang)}</span>
            </h2>

            <p>
              ${t('journeyCardDesc', uiLang)}
            </p>

          </div>

          ${renderRoadmap(student)}

        </section>
      `

    case 'materials':

      return `
        <section class="platform-detail-section">

          ${renderMaterials(student, materials)}

        </section>
      `

    case 'feedback':

      return `
        <section class="platform-detail-section">

          ${renderFeedback(feedback)}

        </section>
      `

    case 'challenges':

      return `
        <section class="platform-detail-section">

          ${renderChallenges(
            challenges,
            submissions
          )}

        </section>
      `

    case 'progress':

      return `
        <section class="platform-detail-section">

          <div class="platform-section-heading">

            <p class="platform-label">
              ${t('progressKicker', uiLang)}
            </p>

            <h1>
              ${t('progressHeading', uiLang)}
            </h1>

            <p>
              ${t('progressDesc', uiLang)}
            </p>

          </div>


          <div class="passport-dashboard">

            <div class="passport-main">

              <div class="passport-header">

                <span>
                  ${t('lessonsLabel', uiLang)}
                </span>

                <span>
                  ${student.totalLessons ? `${student.lessonsCompleted} ${t('of', uiLang)} ${student.totalLessons}` : `${student.lessonsCompleted} ${t('completed', uiLang)}`}
                </span>

              </div>


              <div class="passport-main-content">

                <div class="passport-emblem">
                  ${student.lessonsCompleted}
                </div>

                <div>

                  <p class="passport-small-label">
                    ${t('completed', uiLang).toUpperCase()} ${t('lessonsLabel', uiLang)}
                  </p>

                  <h3>
                    ${t('nextStepHeading', uiLang)}
                  </h3>

                  <p class="passport-level">
                    ${student.totalLessons ? `${Math.max(0, student.totalLessons - student.lessonsCompleted)} ${t('remaining', uiLang)}` : t('lessonsPendingConfig', uiLang)}
                  </p>

                </div>

              </div>


              <div class="passport-footer">

                <span>${t('learnIt', uiLang)}</span>
                <span>${t('liveIt', uiLang)}</span>
                <span>${t('speakIt', uiLang)}</span>

              </div>

            </div>


            <div class="progress-card">

              <div class="progress-top">

                <span>
                  ${t('currentProgress', uiLang)}
                </span>

                <strong>
                  ${student.progress}%
                </strong>

              </div>


              <div class="progress-bar">

                <div
                  class="progress-fill"
                  style="width: ${student.progress}%"
                ></div>

              </div>


              <p>
                ${t('nextStepIs', uiLang)} ${student.nextStep}.
              </p>

            </div>

          </div>

        </section>
      `

    case 'exercises':
      return renderExercises(exercises)

    default:
      return ''
  }
}