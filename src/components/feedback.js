export function renderFeedback(feedbackList = []) {

  const hasFeedback = Array.isArray(feedbackList) && feedbackList.length > 0

  const sectionHeading = `
    <div class="platform-section-heading">

      <p class="platform-label">
        FEEDBACK
      </p>

      <h2>
        Your Growth.
        <span>Worth celebrating.</span>
      </h2>

      <p>
        Personalized guidance to help you grow with every session.
      </p>

    </div>
  `

  if (!hasFeedback) {
    return `
      <section class="feedback-section" id="feedback">

        ${sectionHeading}

        <div class="empty-platform-state">

          <p>No feedback yet.</p>

          <small>
            Your teacher will leave personalized feedback here after your sessions.
          </small>

        </div>

      </section>
    `
  }

  return `
    <section class="feedback-section" id="feedback">

      ${sectionHeading}

      <div class="feedback-grid">

        ${feedbackList.map(item => {

          const date = item.created_at
            ? new Date(item.created_at).toLocaleDateString()
            : ''

          const message = (item.message || item.notes || '')
            ? (item.message || item.notes).replace(/\n/g, '<br>')
            : ''

          return `
            <article class="feedback-card reveal">

              <div class="feedback-header">

                <span class="feedback-category">
                  ${item.category || 'General'}
                </span>

                <span class="feedback-date">
                  ${date}
                </span>

              </div>

              <h3>
                ${item.title || item.type || 'Feedback'}
              </h3>

              <p>
                ${message}
              </p>

            </article>
          `
        }).join('')}

      </div>

    </section>
  `
}