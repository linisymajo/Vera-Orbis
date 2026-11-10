export function renderMaterials(student, materials = []) {

  const counts = {
    class: materials.filter(m => m.type === 'class').length,
    practice: materials.filter(m => m.type === 'practice').length,
    vocabulary: materials.filter(m => m.type === 'vocabulary').length,
    resource: materials.filter(m => m.type === 'resource').length
  }

  const flipCard = `
    const card = this.closest('.material-card');
    if (!card) return;
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
    card.setAttribute('aria-expanded', String(flipped));
    const front = card.querySelector('.material-card-front');
    const back = card.querySelector('.material-card-back');
    if (front) front.setAttribute('aria-hidden', String(flipped));
    if (back) back.setAttribute('aria-hidden', String(!flipped));
    card.querySelectorAll('.material-flip-trigger').forEach(trigger => trigger.setAttribute('aria-pressed', String(flipped)));
  `
  const keydownFlip = `if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button, a')) { event.preventDefault(); ${flipCard} }`

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
          tabindex="0"
          role="region"
          aria-label="Class Materials"
          aria-pressed="false"
          aria-expanded="false"
          onclick="if (!event.target.closest('button, a')) { ${flipCard} }"
          onkeydown="${keydownFlip}"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front" aria-hidden="false">
              <div class="material-icon">PDF</div>
              <div class="material-content">
                <span class="material-type">CLASS MATERIAL (${counts.class})</span>
                <h3>Your lesson materials</h3>
                <p>Access the resources created specifically for your lessons.</p>
              </div>
              <div class="material-card-actions">
                <button
                  type="button"
                  class="material-button"
                  data-platform-view="materials"
                  data-material-filter="class"
                >Explore ↗</button>
                <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show class material details" onclick="event.stopPropagation(); ${flipCard}">Details ↻</button>
              </div>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">CLASS MATERIAL</span>
              <h3>Your lesson materials</h3>
              <p>Structured slides, worksheets, and session notes tailored to your current module.</p>
              <strong class="material-card-detail">
                ${counts.class ? `${counts.class} material${counts.class === 1 ? '' : 's'} available` : 'No class materials available yet'}
              </strong>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="class">Open library ↗</button>
                <button type="button" class="material-flip-trigger" aria-label="Return to class materials" onclick="event.stopPropagation(); ${flipCard}">Back ↺</button>
              </div>
            </div>
          </div>
        </article>


        <!-- PRACTICE -->

        <article
          class="material-card material-violet"
          tabindex="0"
          role="region"
          aria-label="Practice Activities"
          aria-pressed="false"
          aria-expanded="false"
          onclick="if (!event.target.closest('button, a')) { ${flipCard} }"
          onkeydown="${keydownFlip}"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front" aria-hidden="false">
              <div class="material-icon">✦</div>
              <div class="material-content">
                <span class="material-type">PRACTICE (${counts.practice})</span>
                <h3>Practice activities</h3>
                <p>Keep practicing between lessons with activities designed for you.</p>
              </div>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="practice">Explore ↗</button>
                <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show practice activity details" onclick="event.stopPropagation(); ${flipCard}">Details ↻</button>
              </div>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">PRACTICE</span>
              <h3>Practice activities</h3>
              <p>Targeted drills and guided exercises to reinforce grammar and fluency between live sessions.</p>
              <strong class="material-card-detail">
                ${counts.practice ? `${counts.practice} practice activit${counts.practice === 1 ? 'y' : 'ies'} available` : 'No practice activities available yet'}
              </strong>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="practice">Open library ↗</button>
                <button type="button" class="material-flip-trigger" aria-label="Return to practice activities" onclick="event.stopPropagation(); ${flipCard}">Back ↺</button>
              </div>
            </div>
          </div>
        </article>


        <!-- VOCABULARY -->

        <article
          class="material-card material-yellow"
          tabindex="0"
          role="region"
          aria-label="Vocabulary"
          aria-pressed="false"
          aria-expanded="false"
          onclick="if (!event.target.closest('button, a')) { ${flipCard} }"
          onkeydown="${keydownFlip}"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front" aria-hidden="false">
              <div class="material-icon">Aa</div>
              <div class="material-content">
                <span class="material-type">VOCABULARY (${counts.vocabulary})</span>
                <h3>Your vocabulary</h3>
                <p>Words and expressions collected throughout your language journey.</p>
              </div>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="vocabulary">Explore ↗</button>
                <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show vocabulary details" onclick="event.stopPropagation(); ${flipCard}">Details ↻</button>
              </div>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">VOCABULARY</span>
              <h3>Your vocabulary</h3>
              <p>Essential lexis, collocations, and key idioms curated from your active speaking modules.</p>
              <strong class="material-card-detail">
                ${counts.vocabulary ? `${counts.vocabulary} vocabulary item${counts.vocabulary === 1 ? '' : 's'} available` : 'No vocabulary items available yet'}
              </strong>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="vocabulary">Open library ↗</button>
                <button type="button" class="material-flip-trigger" aria-label="Return to your vocabulary" onclick="event.stopPropagation(); ${flipCard}">Back ↺</button>
              </div>
            </div>
          </div>
        </article>


        <!-- RESOURCES -->

        <article
          class="material-card material-orange"
          tabindex="0"
          role="region"
          aria-label="Cultural Resources"
          aria-pressed="false"
          aria-expanded="false"
          onclick="if (!event.target.closest('button, a')) { ${flipCard} }"
          onkeydown="${keydownFlip}"
        >
          <div class="material-card-inner">
            <div class="material-card-face material-card-front" aria-hidden="false">
              <div class="material-icon">↗</div>
              <div class="material-content">
                <span class="material-type">RESOURCES (${counts.resource})</span>
                <h3>Explore the world</h3>
                <p>Curated videos, articles and resources to connect language with culture.</p>
              </div>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="resource">Explore ↗</button>
                <button type="button" class="material-flip-trigger material-flip-front-trigger" aria-pressed="false" aria-label="Show resource details" onclick="event.stopPropagation(); ${flipCard}">Details ↻</button>
              </div>
            </div>
            <div class="material-card-face material-card-back" aria-hidden="true">
              <span class="material-card-back-label">RESOURCES</span>
              <h3>Explore the world</h3>
              <p>Authentic audio, articles, and cultural immersion references for real-world context.</p>
              <strong class="material-card-detail">
                ${counts.resource ? `${counts.resource} resource${counts.resource === 1 ? '' : 's'} available` : 'No resources available yet'}
              </strong>
              <div class="material-card-actions">
                <button type="button" class="material-button" data-platform-view="materials" data-material-filter="resource">Open library ↗</button>
                <button type="button" class="material-flip-trigger" aria-label="Return to resources" onclick="event.stopPropagation(); ${flipCard}">Back ↺</button>
              </div>
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