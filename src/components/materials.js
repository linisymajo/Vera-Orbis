export function renderMaterials(student, materials = []) {

  const counts = {
    class: materials.filter(m => m.type === 'class').length,
    practice: materials.filter(m => m.type === 'practice').length,
    vocabulary: materials.filter(m => m.type === 'vocabulary').length,
    resource: materials.filter(m => m.type === 'resource').length
  }

  const flipCard = `
    const card = this.closest('.material-card');
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
    card.querySelector('.material-card-front').setAttribute('aria-hidden', String(flipped));
    card.querySelector('.material-card-back').setAttribute('aria-hidden', String(!flipped));
    card.querySelectorAll('.material-flip-trigger').forEach(trigger => trigger.setAttribute('aria-pressed', String(flipped)));
  `

  return `
    <section
      class="materials-section"
      id="materials"
    >

      <div class="platform-section-heading">

        <p class="platform-label">
          03 — MY MATERIALS
        </p>

        <h2>
          Your Learning Library.
          <span>Made for your journey.</span>
        </h2>

        <p class="materials-intro">
          Personalized materials to support your learning,
          organized around your journey.
        </p>

      </div>


      <div class="materials-grid">


        <!-- CLASS MATERIALS -->

        <article
          class="material-card material-primary"
          aria-pressed="false"
          onclick="if (!event.target.closest('button')) { ${flipCard} }"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front" aria-hidden="false">
              <div class="material-icon">PDF</div>
              <div class="material-content">
                <span class="material-type">CLASS MATERIAL (${counts.class})</span>
                <h3>Your lesson materials</h3>
                <p>Access the resources created specifically for your lessons.</p>
              </div>
              <button
                type="button"
                class="material-button"
                data-platform-view="materials"
                data-material-filter="class"
              >Explore ↗</button>
              <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show class material details" onclick="event.stopPropagation(); ${flipCard}">Details ↗</button>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">CLASS MATERIAL</span>
              <h3>Your lesson materials</h3>
              <p>Resources created specifically for your lessons.</p>
              <strong class="material-card-detail">
                ${counts.class ? `${counts.class} material${counts.class === 1 ? '' : 's'} available` : 'No class materials available yet'}
              </strong>
              <button type="button" class="material-flip-trigger" aria-label="Return to class materials" onclick="event.stopPropagation(); ${flipCard}">Back ↗</button>
            </div>
          </div>
        </article>


        <!-- PRACTICE -->

        <article
          class="material-card material-violet"
          aria-pressed="false"
          onclick="if (!event.target.closest('button')) { ${flipCard} }"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front" aria-hidden="false">
              <div class="material-icon">✦</div>
              <div class="material-content">
                <span class="material-type">PRACTICE (${counts.practice})</span>
                <h3>Practice activities</h3>
                <p>Keep practicing between lessons with activities designed for you.</p>
              </div>
              <button type="button" class="material-button" data-platform-view="materials" data-material-filter="practice">Explore ↗</button>
              <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show practice activity details" onclick="event.stopPropagation(); ${flipCard}">Details ↗</button>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">PRACTICE</span>
              <h3>Practice activities</h3>
              <p>Activities designed to help you keep practicing between lessons.</p>
              <strong class="material-card-detail">
                ${counts.practice ? `${counts.practice} practice activit${counts.practice === 1 ? 'y' : 'ies'} available` : 'No practice activities available yet'}
              </strong>
              <button type="button" class="material-flip-trigger" aria-label="Return to practice activities" onclick="event.stopPropagation(); ${flipCard}">Back ↗</button>
            </div>
          </div>
        </article>


        <!-- VOCABULARY -->

        <article
          class="material-card material-yellow"
          aria-pressed="false"
          onclick="if (!event.target.closest('button')) { ${flipCard} }"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front">
              <div class="material-icon">Aa</div>
              <div class="material-content">
                <span class="material-type">VOCABULARY (${counts.vocabulary})</span>
                <h3>Your vocabulary</h3>
                <p>Words and expressions collected throughout your language journey.</p>
              </div>
              <button type="button" class="material-button" data-platform-view="materials" data-material-filter="vocabulary">Explore ↗</button>
              <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show vocabulary details" onclick="event.stopPropagation(); ${flipCard}">Details ↗</button>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">VOCABULARY</span>
              <h3>Your vocabulary</h3>
              <p>Words and expressions collected throughout your language journey.</p>
              <strong class="material-card-detail">
                ${counts.vocabulary ? `${counts.vocabulary} vocabulary item${counts.vocabulary === 1 ? '' : 's'} available` : 'No vocabulary items available yet'}
              </strong>
              <button type="button" class="material-flip-trigger" aria-label="Return to your vocabulary" onclick="event.stopPropagation(); ${flipCard}">Back ↗</button>
            </div>
          </div>
        </article>


        <!-- RESOURCES -->

        <article
          class="material-card material-orange"
          aria-pressed="false"
          onclick="if (!event.target.closest('button')) { ${flipCard} }"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front">
              <div class="material-icon">↗</div>
              <div class="material-content">
                <span class="material-type">RESOURCES (${counts.resource})</span>
                <h3>Explore the world</h3>
                <p>Curated videos, articles and resources to connect language with culture.</p>
              </div>
              <button type="button" class="material-button" data-platform-view="materials" data-material-filter="resource">Explore ↗</button>
              <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show resource details" onclick="event.stopPropagation(); ${flipCard}">Details ↗</button>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">RESOURCES</span>
              <h3>Explore the world</h3>
              <p>Curated videos, articles and resources to connect language with culture.</p>
              <strong class="material-card-detail">
                ${counts.resource ? `${counts.resource} resource${counts.resource === 1 ? '' : 's'} available` : 'No resources available yet'}
              </strong>
              <button type="button" class="material-flip-trigger" aria-label="Return to resources" onclick="event.stopPropagation(); ${flipCard}">Back ↗</button>
            </div>
          </div>
        </article>


      </div>


      <div class="materials-footer">

        <span>
          ${(student.language || '').toUpperCase()}
        </span>

        <span>
          PERSONALIZED FOR YOUR JOURNEY
        </span>

      </div>

    </section>
  `
}