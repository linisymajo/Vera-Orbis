import { renderRoadmap } from '../components/roadmap.js'
import { renderMaterials } from '../components/materials.js'
import { renderClassMaterials } from '../components/classMaterials.js'

export function renderPlatform(student) {
  return `
    <div class="platform-page">

      <!-- PLATFORM NAVBAR -->

      <header class="platform-navbar">

        <a href="/" class="platform-logo">
          VERA <span>ORBIS</span>
        </a>

        <nav class="platform-nav">

          <a href="/platform.html" class="active">
            Home
          </a>

          <a href="#roadmap">
            My Journey
          </a>

          <a href="#materials">
            Materials
          </a>

          <a href="#progress">
            Progress
          </a>

        </nav>

        <button class="student-profile">

          <span class="profile-avatar">
            VO
          </span>

          <span>
            ${student.name}
          </span>

          <span>
            ⌄
          </span>

        </button>

      </header>


      <!-- PLATFORM CONTENT -->

      <main class="platform-content">


        <!-- WELCOME -->

        <section class="platform-welcome">

          <div>

            <p class="platform-label">
              YOUR VERA ORBIS JOURNEY
            </p>

            <h1>
              Welcome back,
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
              VO
            </div>

            <div class="orbit-dot"></div>

          </div>

        </section>


        <!-- LANGUAGE PASSPORT -->

        <section class="passport-section">

          <div class="platform-section-heading">

            <p class="platform-label">
              01 — LANGUAGE PASSPORT
            </p>

            <h2>
              Your language.
              <span>Your progress.</span>
            </h2>

          </div>


          <div class="passport-dashboard">


            <!-- PASSPORT -->

            <div class="passport-main">

              <div class="passport-header">

                <span>
                  VERA ORBIS
                </span>

                <span>
                  ${student.id.toUpperCase()}
                </span>

              </div>


              <div class="passport-main-content">

                <div class="passport-emblem">
                  VO
                </div>

                <div>

                  <p class="passport-small-label">
                    CURRENT LANGUAGE
                  </p>

                  <h3>
                    ${student.language}
                  </h3>

                  <p class="passport-level">
                    ${student.level} · ${student.levelName.toUpperCase()}
                  </p>

                </div>

              </div>


              <div class="passport-footer">

                <span>
                  LEARN IT
                </span>

                <span>
                  LIVE IT
                </span>

                <span>
                  SPEAK IT
                </span>

              </div>

            </div>


            <!-- PROGRESS -->

            <div class="progress-card">

              <div class="progress-top">

                <span>
                  JOURNEY PROGRESS
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
                You're making progress.
                Keep going.
              </p>

            </div>


          </div>

        </section>


        <!-- MY ROADMAP -->

        <div id="roadmap">

          ${renderRoadmap(student)}

        </div>


        <!-- MY MATERIALS -->

${renderMaterials(student)}
<div id="class-materials-view">
  ${renderClassMaterials(student)}
</div>

        <!-- MY PROGRESS -->

        <section
          class="passport-section"
          id="progress"
        >

          <div class="platform-section-heading">

            <p class="platform-label">
              03 — MY PROGRESS
            </p>

            <h2>
              See how far
              <span>you've come.</span>
            </h2>

          </div>


          <div class="passport-dashboard">


            <div class="passport-main">

              <div class="passport-header">

                <span>
                  LESSONS
                </span>

                <span>
                  ${student.lessonsCompleted}/${student.totalLessons}
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
                    ${student.totalLessons - student.lessonsCompleted}
                    LESSONS REMAINING
                  </p>

                </div>

              </div>


              <div class="passport-footer">

                <span>
                  LEARN IT
                </span>

                <span>
                  LIVE IT
                </span>

                <span>
                  SPEAK IT
                </span>

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
                Your next step:
                ${student.nextStep}.
              </p>

            </div>


          </div>

        </section>


        <!-- NEXT STEP -->

        <section class="next-step">

          <p class="platform-label">
            YOUR NEXT STEP
          </p>

          <h2>
            Keep moving
            <span>forward.</span>
          </h2>

          <button class="next-step-button">
            Continue your journey ↗
          </button>

        </section>


      </main>


      <!-- PLATFORM FOOTER -->

      <footer class="platform-footer">

        <span>
          VERA ORBIS
        </span>

        <span>
          LEARN IT · LIVE IT · SPEAK IT
        </span>

      </footer>

    </div>
  `
}