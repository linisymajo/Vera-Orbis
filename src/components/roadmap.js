export function renderRoadmap(student = {}, options = {}) {
  const showHeading = options.showHeading !== false
  const targetLanguage = student.language || 'English'
  const currentLevel = student.level || 'A1'
  const currentModuleName = student.currentModule || 'Speaking Foundations'
  const nextStepText = student.nextStep || 'Continue building fluency in your live sessions'
  const goalText = student.goal || 'Fluency Destination'
  const lessonsSummary = student.totalLessons
    ? `${student.lessonsCompleted || 0} of ${student.totalLessons} sessions completed`
    : `${student.lessonsCompleted || 0} sessions completed`

  const isGettingStartedDone = Boolean(
    student.onboardingCompleted ||
    student.hasCompletedOnboarding ||
    student.assessmentCompleted ||
    (student.lessonsCompleted && Number(student.lessonsCompleted) > 0)
  )

  const progressPercent = typeof student.progress === 'number'
    ? Math.max(0, Math.min(100, Math.round(student.progress)))
    : 0

  const isModuleCompleted = isGettingStartedDone && (
    progressPercent >= 100 ||
    (student.totalLessons && Number(student.totalLessons) > 0 && Number(student.lessonsCompleted) >= Number(student.totalLessons))
  )

  // Step 1: Getting Started
  const step1Class = isGettingStartedDone ? 'roadmap-step completed' : 'roadmap-step current'
  const step1Marker = isGettingStartedDone ? '✓' : '01'
  const step1Meta = isGettingStartedDone ? 'COMPLETED' : 'CURRENT'
  const step1Desc = isGettingStartedDone
    ? 'We discovered your current level, learning style and personal goals.'
    : 'Discover your current level, learning style and personal goals to build your personalized path.'

  // Step 2: Current Module
  let step2Class = 'roadmap-step upcoming'
  let step2Marker = '02'
  let step2Meta = 'UPCOMING'
  let step2Progress = 0

  if (!isGettingStartedDone) {
    step2Class = 'roadmap-step upcoming'
    step2Marker = '02'
    step2Meta = 'UPCOMING'
    step2Progress = 0
  } else if (isModuleCompleted) {
    step2Class = 'roadmap-step completed'
    step2Marker = '✓'
    step2Meta = 'COMPLETED'
    step2Progress = 100
  } else {
    step2Class = 'roadmap-step current'
    step2Marker = '02'
    step2Meta = 'CURRENT'
    step2Progress = progressPercent
  }

  // Step 3: Next Stage
  let step3Class = 'roadmap-step upcoming'
  let step3Marker = '03'
  let step3Meta = 'NEXT'

  if (isModuleCompleted) {
    step3Class = 'roadmap-step current'
    step3Marker = '03'
    step3Meta = 'CURRENT'
  }

  // Step 4: Destination
  const isDestinationReached = isModuleCompleted && progressPercent >= 100
  const step4Class = isDestinationReached ? 'roadmap-step destination completed' : 'roadmap-step destination'
  const step4Marker = isDestinationReached ? '★' : '→'
  const step4Meta = isDestinationReached ? 'ACHIEVED' : 'DESTINATION'

  const headingMarkup = showHeading ? `
      <div class="platform-section-heading">

        <p class="platform-label">
          02 — MY ROADMAP
        </p>

        <h2>
          Your path.
          <span>Your next destination.</span>
        </h2>

        <p class="roadmap-intro">
          A learning path designed around your goals,
          your current level and the person you want to
          become in this language.
        </p>

      </div>
  ` : ''

  return `
    <section class="roadmap-section${showHeading ? '' : ' roadmap-section-compact'}">
      ${headingMarkup}

      <div class="roadmap-container">


        <!-- STEP 01: GETTING STARTED -->

        <button
          type="button"
          class="${step1Class}"
          data-roadmap-step="getting-started"
          aria-expanded="false"
        >
          <div class="roadmap-marker">
            ${step1Marker}
          </div>

          <div class="roadmap-content">
            <div class="roadmap-card-inner">
              <div class="roadmap-card-face roadmap-card-front">
                <div class="roadmap-meta">
                  <span>01</span>
                  <span>${step1Meta}</span>
                </div>

                <h3>
                  Getting Started
                </h3>

                <p>
                  ${step1Desc}
                </p>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip card ↻</span>
              </div>

              <div class="roadmap-card-face roadmap-card-back">
                <div class="roadmap-meta">
                  <span>STAGE 01 — DIAGNOSTIC</span>
                  <span>${step1Meta}</span>
                </div>

                <h4>Personalized Foundation</h4>

                <ul class="roadmap-back-points">
                  <li><strong>Target Language:</strong> ${targetLanguage} (${currentLevel})</li>
                  <li><strong>Focus:</strong> Pronunciation, core structures &amp; active listening</li>
                  <li><strong>Goal Alignment:</strong> ${goalText}</li>
                </ul>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip back ↺</span>
              </div>
            </div>
          </div>

        </button>


        <!-- STEP 02: CURRENT MODULE -->

        <button
          type="button"
          class="${step2Class}"
          data-roadmap-step="current"
          aria-expanded="false"
        >

          <div class="roadmap-marker">
            ${step2Marker}
          </div>

          <div class="roadmap-content">
            <div class="roadmap-card-inner">
              <div class="roadmap-card-face roadmap-card-front">
                <div class="roadmap-meta">
                  <span>02</span>
                  <span>${step2Meta}</span>
                </div>

                <h3>
                  ${currentModuleName}
                </h3>

                <p>
                  Build the confidence and communication
                  skills you need to use ${targetLanguage} more naturally.
                </p>

                <div class="roadmap-progress">

                  <div class="roadmap-progress-top">
                    <span>MODULE PROGRESS</span>
                    <strong>${step2Progress}%</strong>
                  </div>

                  <div class="roadmap-progress-bar">
                    <div
                      class="roadmap-progress-fill"
                      style="width: ${step2Progress}%"
                    ></div>
                  </div>

                </div>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip card ↻</span>
              </div>

              <div class="roadmap-card-face roadmap-card-back">
                <div class="roadmap-meta">
                  <span>STAGE 02 — ACTIVE MODULE</span>
                  <span>${step2Progress}%</span>
                </div>

                <h4>${currentModuleName}</h4>

                <ul class="roadmap-back-points">
                  <li><strong>Next Step:</strong> ${nextStepText}</li>
                  <li><strong>Pace &amp; Rhythm:</strong> ${lessonsSummary}</li>
                  <li><strong>Practice:</strong> Live sessions, exercises &amp; weekly challenges</li>
                </ul>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip back ↺</span>
              </div>
            </div>
          </div>

        </button>


        <!-- STEP 03: UPCOMING -->

        <button
          type="button"
          class="${step3Class}"
          data-roadmap-step="next"
          aria-expanded="false"
        >

          <div class="roadmap-marker">
            ${step3Marker}
          </div>

          <div class="roadmap-content">
            <div class="roadmap-card-inner">
              <div class="roadmap-card-face roadmap-card-front">
                <div class="roadmap-meta">
                  <span>03</span>
                  <span>${step3Meta}</span>
                </div>

                <h3>
                  Real-world conversations
                </h3>

                <p>
                  Move from practicing ${targetLanguage} to using it
                  naturally in conversations and everyday situations.
                </p>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip card ↻</span>
              </div>

              <div class="roadmap-card-face roadmap-card-back">
                <div class="roadmap-meta">
                  <span>STAGE 03 — IMMERSION</span>
                  <span>${step3Meta}</span>
                </div>

                <h4>Spontaneous Expression</h4>

                <ul class="roadmap-back-points">
                  <li><strong>Register &amp; Nuance:</strong> Cultural context and authentic idioms</li>
                  <li><strong>Fluency Drills:</strong> Unscripted dialogue &amp; rapid recall</li>
                  <li><strong>Application:</strong> Professional and social scenarios</li>
                </ul>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip back ↺</span>
              </div>
            </div>
          </div>

        </button>


        <!-- STEP 04: DESTINATION -->

        <button
          type="button"
          class="${step4Class}"
          data-roadmap-step="destination"
          aria-expanded="false"
        >

          <div class="roadmap-marker">
            ${step4Marker}
          </div>

          <div class="roadmap-content">
            <div class="roadmap-card-inner">
              <div class="roadmap-card-face roadmap-card-front">
                <div class="roadmap-meta">
                  <span>04</span>
                  <span>${step4Meta}</span>
                </div>

                <h3>
                  ${goalText}
                </h3>

                <p>
                  The destination that guides your
                  Vera Orbis journey.
                </p>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip card ↻</span>
              </div>

              <div class="roadmap-card-face roadmap-card-back">
                <div class="roadmap-meta">
                  <span>STAGE 04 — MILESTONE</span>
                  <span>${step4Meta}</span>
                </div>

                <h4>${goalText}</h4>

                <ul class="roadmap-back-points">
                  <li><strong>Target Level:</strong> Confident command at ${currentLevel}+</li>
                  <li><strong>Outcome:</strong> Autonomous, persuasive communication</li>
                  <li><strong>Verification:</strong> Final assessment &amp; Language Passport visa</li>
                </ul>

                <span class="roadmap-flip-hint" aria-hidden="true">Flip back ↺</span>
              </div>
            </div>
          </div>

        </button>


      </div>

    </section>
  `
}