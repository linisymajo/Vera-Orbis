export function renderRoadmap(student = {}) {
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

  return `
    <section class="roadmap-section">

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


      <div class="roadmap-container">


        <!-- STEP 01: GETTING STARTED -->

        <button
          type="button"
          class="${step1Class}"
          data-roadmap-step="getting-started"
        >
          <div class="roadmap-marker">
            ${step1Marker}
          </div>

          <div class="roadmap-content">

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

          </div>

        </button>


        <!-- STEP 02: CURRENT MODULE -->

        <button
          type="button"
          class="${step2Class}"
          data-roadmap-step="current"
        >

          <div class="roadmap-marker">
            ${step2Marker}
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>02</span>
              <span>${step2Meta}</span>
            </div>

            <h3>
              ${student.currentModule || 'Speaking Foundations'}
            </h3>

            <p>
              Build the confidence and communication
              skills you need to use English more naturally.
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

          </div>

        </button>


        <!-- STEP 03: UPCOMING -->

        <button
          type="button"
          class="${step3Class}"
          data-roadmap-step="next"
        >

          <div class="roadmap-marker">
            ${step3Marker}
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>03</span>
              <span>${step3Meta}</span>
            </div>

            <h3>
              Real-world conversations
            </h3>

            <p>
              Move from practicing English to using it
              naturally in conversations and everyday situations.
            </p>

          </div>

        </button>


        <!-- STEP 04: DESTINATION -->

        <button
          type="button"
          class="${step4Class}"
          data-roadmap-step="destination"
        >

          <div class="roadmap-marker">
            ${step4Marker}
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>04</span>
              <span>${step4Meta}</span>
            </div>

            <h3>
              ${student.goal || 'Fluency Destination'}
            </h3>

            <p>
              The destination that guides your
              Vera Orbis journey.
            </p>

          </div>

        </button>


      </div>

    </section>
  `
}