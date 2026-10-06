export function renderClassMaterials(student) {
  return `
    <section class="class-materials-section">

      <div class="class-materials-header">

        <p class="platform-label">
          CLASS MATERIALS
        </p>

        <h2>
          Your lessons.
          <span>Your resources.</span>
        </h2>

        <p>
          Everything created for your learning journey,
          organized in one place.
        </p>

      </div>


      <div class="class-materials-list">


        <article class="class-material-item">

          <div class="class-material-number">
            01
          </div>

          <div class="class-material-info">

            <span>
              LESSON ${student.lessonsCompleted}
            </span>

            <h3>
              ${student.currentModule}
            </h3>

            <p>
              Personalized material from your latest lesson.
            </p>

          </div>

          <button class="class-material-button">
            Open ↗
          </button>

        </article>


        <article class="class-material-item">

          <div class="class-material-number">
            02
          </div>

          <div class="class-material-info">

            <span>
              LANGUAGE GUIDE
            </span>

            <h3>
              ${student.language} resources
            </h3>

            <p>
              Useful resources selected for your current level.
            </p>

          </div>

          <button class="class-material-button">
            Open ↗
          </button>

        </article>


        <article class="class-material-item">

          <div class="class-material-number">
            03
          </div>

          <div class="class-material-info">

            <span>
              PERSONALIZED
            </span>

            <h3>
              Your learning notes
            </h3>

            <p>
              Notes, feedback and recommendations from your lessons.
            </p>

          </div>

          <button class="class-material-button">
            Open ↗
          </button>

        </article>


      </div>

    </section>
  `
}