export function renderMaterials(student) {
  return `
    <section
      class="materials-section"
      id="materials"
    >

      <div class="platform-section-heading">

        <p class="platform-label">
          02 — MY MATERIALS
        </p>

        <h2>
          Everything you need.
          <span>In one place.</span>
        </h2>

        <p class="materials-intro">
          Your personalized learning resources,
          organized around your journey.
        </p>

      </div>


      <div class="materials-grid">


        <!-- CLASS MATERIALS -->

        <article class="material-card material-primary">

          <div class="material-icon">
            PDF
          </div>

          <div class="material-content">

            <span class="material-type">
              CLASS MATERIAL
            </span>

            <h3>
              Your lesson materials
            </h3>

            <p>
              Access the resources created
              specifically for your lessons.
            </p>

          </div>

         <button
  class="material-button"
  onclick="document.querySelector('#class-materials-view').scrollIntoView({ behavior: 'smooth' })"
>
  Explore ↗
</button>

        </article>


        <!-- PRACTICE -->

        <article class="material-card material-violet">

          <div class="material-icon">
            ✦
          </div>

          <div class="material-content">

            <span class="material-type">
              PRACTICE
            </span>

            <h3>
              Practice activities
            </h3>

            <p>
              Keep practicing between lessons
              with activities designed for you.
            </p>

          </div>

          <button class="material-button">
            Explore ↗
          </button>

        </article>


        <!-- VOCABULARY -->

        <article class="material-card material-yellow">

          <div class="material-icon">
            Aa
          </div>

          <div class="material-content">

            <span class="material-type">
              VOCABULARY
            </span>

            <h3>
              Your vocabulary
            </h3>

            <p>
              Words and expressions collected
              throughout your language journey.
            </p>

          </div>

          <button class="material-button">
            Explore ↗
          </button>

        </article>


        <!-- RESOURCES -->

        <article class="material-card material-orange">

          <div class="material-icon">
            ↗
          </div>

          <div class="material-content">

            <span class="material-type">
              RESOURCES
            </span>

            <h3>
              Explore the world
            </h3>

            <p>
              Curated videos, articles and resources
              to connect language with culture.
            </p>

          </div>

          <button class="material-button">
            Explore ↗
          </button>

        </article>


      </div>


      <div class="materials-footer">

        <span>
          ${student.language.toUpperCase()}
        </span>

        <span>
          PERSONALIZED FOR YOUR JOURNEY
        </span>

      </div>

    </section>
  `
}