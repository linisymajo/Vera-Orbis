export function renderClassMaterials(student, materials = []) {

  if (!materials || materials.length === 0) {
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

        <div class="empty-platform-state">
          <p>No materials yet.</p>

          <small>
            Your teacher will add resources for your learning journey.
          </small>
        </div>

      </section>
    `
  }

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

        ${materials.map((material, index) => `

          <article class="class-material-item reveal">

            <div class="class-material-number">
              ${String(index + 1).padStart(2, '0')}
            </div>

            <div class="class-material-info">

              <span>
                ${material.type.toUpperCase()} · ${material.language || student.language}${material.level ? ` · ${material.level}` : ''}
              </span>

              <h3>
                ${material.title}
              </h3>

              <p>
                ${material.description || 'Learning material'}
              </p>

            </div>

            <button
              class="class-material-button"
              type="button"
              data-material-path="${material.file_path || ''}"
              onclick="event.stopPropagation(); window.voPlatform?.openMaterial?.(this.dataset.materialPath || '')"
              id="btn-open-${material.id}"
            >
              Open ↗
            </button>

          </article>

        `).join('')}

      </div>

    </section>
  `
}