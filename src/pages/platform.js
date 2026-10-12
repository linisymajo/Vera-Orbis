import { renderRoadmap } from '../components/roadmap.js'
import { renderMaterials } from '../components/materials.js'
import { renderClassMaterials } from '../components/classMaterials.js'
import { renderFeedback } from '../components/feedback.js'
import { renderChallenges } from '../components/challenges.js'
import { renderExercises } from '../components/exercises.js'

const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'
const VERA_VOICE_AVATAR = '/assets/Vera.png'
const VERA_VOICE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VERA_VOICE_URL) || 'http://localhost:3000/'

export function renderPlatform(
  student,
  materials = [],
  feedback = [],
  challenges = [],
  submissions = [],
  exercises = []
) {
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
            Home
          </a>

          <a
            href="#journey"
            data-platform-view="journey"
          >
            My Journey
          </a>

          <a
  href="#materials"
  class="platform-nav-card"
  data-platform-view="materials"
>
  My Materials
</a>

          <a
            href="#feedback"
            data-platform-view="feedback"
          >
            Feedback
          </a>

          <a
            href="#challenges"
            data-platform-view="challenges"
          >
            Challenges
          </a>

          <a
            href="#progress"
            data-platform-view="progress"
          >
            Progress
          </a>
          <a href="#exercises" data-platform-view="exercises">Exercises</a>

        </nav>


        <div class="student-profile-actions">
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
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            Sign out ↗
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
                YOUR VERA ORBIS JOURNEY
              </p>

              <h1>
                Welcome Back,
                <span>${student.name}.</span>
              </h1>

              <p class="platform-intro">
                Your language journey continues here.
                Explore your progress, materials and next steps.
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
                01 — LANGUAGE PASSPORT
              </p>

              <h2>
                Your language.
                <span>Your identity.</span>
              </h2>

              <p class="passport-section-intro">
                A digital passport that follows your progress
                throughout your Vera Orbis journey.
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

                    <div>

                      <strong>
                        VERA ORBIS
                      </strong>

                      <small>
                        LANGUAGE PASSPORT
                      </small>

                    </div>

                  </div>


                  <div class="passport-number">

                    <span>
                      PASSPORT NO.
                    </span>

                    <strong>
                      VO-${student.id.slice(0, 8).toUpperCase()}
                    </strong>

                  </div>

                </div>


                <div class="passport-body">

                  <div class="passport-identity">

                    <div class="passport-seal">

                      <div class="passport-seal-ring">

                        <img
                          src="${VO_LOGO}"
                          alt="Vera Orbis"
                        >

                        <small>
                          LANGUAGE<br>
                          PASSPORT
                        </small>

                      </div>

                    </div>


                    <div class="passport-stamps">

                      <span class="passport-stamp stamp-turquoise">
                        LEARN
                      </span>

                      <span class="passport-stamp stamp-purple">
                        LIVE
                      </span>

                      <span class="passport-stamp stamp-yellow">
                        SPEAK
                      </span>

                    </div>

                  </div>


                  <div class="passport-information">

                    <div class="passport-field passport-name">

                      <span>
                        STUDENT
                      </span>

                      <strong>
                        ${student.name}
                      </strong>

                    </div>


                    <div class="passport-info-grid">

                      <div class="passport-field">

                        <span>
                          LANGUAGE
                        </span>

                        <strong>
                          ${student.language}
                        </strong>

                      </div>


                      <div class="passport-field">

                        <span>
                          LEVEL
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
                          DESTINATION
                        </span>

                        <strong>
                          ${student.goal}
                        </strong>

                      </div>


                      <div class="passport-field">

                        <span>
                          JOURNEY
                        </span>

                        <strong>
                          ${student.totalLessons ? `${student.lessonsCompleted} of ${student.totalLessons}` : `${student.lessonsCompleted} completed`}
                        </strong>

                        <small>
                          ${student.totalLessons ? 'LESSONS' : 'TOTAL PENDING'}
                        </small>

                      </div>

                    </div>


                    <div class="passport-journey">

                      <div class="passport-journey-top">

                        <div>

                          <span>
                            JOURNEY PROGRESS
                          </span>

                          <strong>
                            ${student.progress}%
                          </strong>

                        </div>

                        <span class="journey-status">
                          IN PROGRESS
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
                          BEGINNING
                        </span>

                        <span>
                          YOUR JOURNEY
                        </span>

                        <span>
                          DESTINATION
                        </span>

                      </div>

                    </div>

                  </div>

                </div>


                <div class="passport-bottom">

                  <div class="passport-motto">

                    <span>LEARN IT</span>
                    <i></i>
                    <span>LIVE IT</span>
                    <i></i>
                    <span>SPEAK IT</span>

                  </div>


                  <div class="passport-status">

                    <span class="status-dot"></span>

                    ACTIVE JOURNEY

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
    <p class="platform-label">02 — MY JOURNEY</p>
    <h2>Your journey. <span>Your next step.</span></h2>
    <p>
      Follow your learning path, explore your roadmap
      and discover what comes next.
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
        MY JOURNEY
      </span>

      <h3>
  Your journey.
  <span>Your world.</span>
</h3>

      <p>
        Explore your roadmap, your lessons
        and everything ahead in your language journey.
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
                04 — KEEP LEARNING
              </p>

              <h2>
                Your learning.
                <span>Your space.</span>
              </h2>

              <p>
                Continue your journey through personalized feedback,
                weekly challenges and your learning resources.
              </p>

            </div>


            <div class="learning-access-grid">

              <button
                type="button"
                class="learning-access-card learning-access-feedback"
                data-platform-view="feedback"
                onclick="console.log('¡¡FEEDBACK FUE CLICKEADO!!')"
              >

                <span class="learning-access-number">
                  01
                </span>

                <div>

                  <span class="learning-access-label">
                    FEEDBACK
                  </span>

                  <h3>
                    Your teacher's
                    <span>feedback.</span>
                  </h3>

                  <p>
                    See personalized observations,
                    recommendations and feedback from your lessons.
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
                    CHALLENGES
                  </span>

                  <h3>
                    Put it into
                    <span>practice.</span>
                  </h3>

                  <p>
                    Complete personalized challenges
                    and apply what you learn beyond class.
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
      05 — MY PROGRESS
    </p>

    <h2>
      See how far
      <span>you've come.</span>
    </h2>

    <p>
      Track your lessons, celebrate what you've completed
      and see what comes next.
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
        MY PROGRESS
      </span>

      <h3>
        Every lesson.
        <span>Every step.</span>
      </h3>

      <p>
        See what you've completed, what remains
        and where your learning journey is taking you next.
      </p>

    </div>


    <span class="home-module-arrow">
      ↗
    </span>

  </button>

</section>


          <!-- NEXT STEP -->

          <section class="vera-voice-access" aria-labelledby="vera-voice-title">
            <div class="platform-section-heading">
              <p class="platform-label">06 — VERA VOICE</p>
              <h2>Meet Vera.<br><span>Your speaking partner.</span></h2>
              <p>
                Practice, build confidence and speak another language at your own pace.
              </p>
            </div>

            <div
              class="vera-voice-card"
              tabindex="0"
              role="button"
              aria-pressed="false"
              aria-label="Meet Vera. Press Enter to see how to start practising."
            >
              <div class="vera-voice-card-face vera-voice-card-front" aria-hidden="false">
                <div class="vera-voice-card-copy">
                  <span class="vera-voice-card-label">VERA VOICE</span>
                  <h3 id="vera-voice-title">Meet Vera</h3>
                  <p>Your Speaking Partner</p>
                  <span class="vera-voice-flip-hint">Tap or press Enter to discover more</span>
                </div>
                <img
                  src="${VERA_VOICE_AVATAR}"
                  alt="Vera, your speaking partner"
                  class="vera-voice-avatar"
                >
              </div>

              <div class="vera-voice-card-face vera-voice-card-back" aria-hidden="true">
                <div>
                  <span class="vera-voice-card-label">READY TO PRACTICE?</span>
                  <h3>Start a conversation with Vera.</h3>
                  <p>Practice your language and learn at your own pace.</p>
                  <a
                    class="vera-voice-launch"
                    href="${VERA_VOICE_URL}"
                    data-vera-voice-launch
                    tabindex="-1"
                  >Talk to Vera</a>
                  <p class="vera-voice-status" role="status" aria-live="polite"></p>
                </div>
              </div>
            </div>
          </section>

          <section class="next-step">

            <p class="platform-label">
              YOUR NEXT STEP
            </p>

            <h2>
              Keep moving
              <span>forward.</span>
            </h2>

            <button
              type="button"
              class="next-step-button"
              data-platform-view="journey"
            >
              Continue your journey ↗
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
  ← Back to Home
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
                <p>Your speaking partner</p>
              </div>
            </div>
            <div class="vera-voice-modal-actions">
              <a href="${VERA_VOICE_URL}" target="_blank" rel="noopener noreferrer" class="vera-voice-external-link" id="vera-voice-external-link" title="Abrir en ventana completa">
                Ventana completa ↗
              </a>
              <button type="button" class="vera-voice-modal-close" data-vera-voice-close aria-label="Cerrar Vera Voice">✕</button>
            </div>
          </div>
          <div class="vera-voice-frame-wrapper">
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
  submissions = []
  ,exercises = []
) {

  switch (view) {

    case 'journey':

      return `
        <section class="platform-detail-section">

          <div class="platform-section-heading">

            <p class="platform-label">
              02 — MY JOURNEY
            </p>

            <h2>
              Your progress.
              <span>Keep moving forward.</span>
            </h2>

            <p>
              Follow your language journey and see where
              you're heading next.
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
              05 — MY PROGRESS
            </p>

            <h1>
              See how far
              <span>you've come.</span>
            </h1>

            <p>
              Your progress, lessons completed
              and your next step.
            </p>

          </div>


          <div class="passport-dashboard">

            <div class="passport-main">

              <div class="passport-header">

                <span>
                  LESSONS
                </span>

                <span>
                  ${student.totalLessons ? `${student.lessonsCompleted} of ${student.totalLessons}` : `${student.lessonsCompleted} completed`}
                </span>

              </div>


              <div class="passport-main-content">

                <div class="passport-emblem">
                  ${student.lessonsCompleted}
                </div>

                <div>

                  <p class="passport-small-label">
                    COMPLETED LESSONS
                  </p>

                  <h3>
                    Keep going.
                  </h3>

                  <p class="passport-level">
                    ${student.totalLessons ? `${Math.max(0, student.totalLessons - student.lessonsCompleted)} LESSONS REMAINING` : 'TOTAL LESSONS PENDING CONFIGURATION'}
                  </p>

                </div>

              </div>


              <div class="passport-footer">

                <span>LEARN IT</span>
                <span>LIVE IT</span>
                <span>SPEAK IT</span>

              </div>

            </div>


            <div class="progress-card">

              <div class="progress-top">

                <span>
                  CURRENT PROGRESS
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
                Your next step: ${student.nextStep}.
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