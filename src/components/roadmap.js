export function renderRoadmap(student) {
  return `
    <section class="roadmap-section">

      <div class="platform-section-heading">

        <p class="platform-label">
          01 — MY ROADMAP
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


        <!-- COMPLETED -->

        <article class="roadmap-step completed">

          <div class="roadmap-marker">
            ✓
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>01</span>
              <span>COMPLETED</span>
            </div>

            <h3>
              Getting Started
            </h3>

            <p>
              We discovered your current level,
              learning style and personal goals.
            </p>

          </div>

        </article>


        <!-- CURRENT -->

        <article class="roadmap-step current">

          <div class="roadmap-marker">
            02
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>02</span>
              <span>CURRENT</span>
            </div>

            <h3>
              ${student.currentModule}
            </h3>

            <p>
              Build the confidence and communication
              skills you need to use English more naturally.
            </p>

            <div class="roadmap-progress">

              <div class="roadmap-progress-top">
                <span>MODULE PROGRESS</span>
                <strong>${student.progress}%</strong>
              </div>

              <div class="roadmap-progress-bar">
                <div
                  class="roadmap-progress-fill"
                  style="width: ${student.progress}%"
                ></div>
              </div>

            </div>

          </div>

        </article>


        <!-- NEXT -->

        <article class="roadmap-step upcoming">

          <div class="roadmap-marker">
            03
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>03</span>
              <span>NEXT</span>
            </div>

            <h3>
              Real-world conversations
            </h3>

            <p>
              Move from practicing English to using it
              naturally in conversations and everyday situations.
            </p>

          </div>

        </article>


        <!-- DESTINATION -->

        <article class="roadmap-step destination">

          <div class="roadmap-marker">
            →
          </div>

          <div class="roadmap-content">

            <div class="roadmap-meta">
              <span>04</span>
              <span>DESTINATION</span>
            </div>

            <h3>
              ${student.goal}
            </h3>

            <p>
              The destination that guides your
              Vera Orbis journey.
            </p>

          </div>

        </article>


      </div>

    </section>
  `
}