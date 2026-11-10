const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

export function renderChallenges(challenges = [], submissions = []) {

  if (!challenges || challenges.length === 0) {
    return `
      <section class="challenges-section" id="challenges">

        <div class="platform-section-heading">

          <p class="platform-label">
            CHALLENGES
          </p>

          <h2>
            Keep learning.
            <span>Keep challenging yourself.</span>
          </h2>

          <p>
            Small challenges designed to help you
            use your language beyond the lesson.
          </p>

        </div>

        <div class="empty-platform-state">
          <p>No active challenges this week.</p>

          <small>
            Keep up the great work with your regular materials.
          </small>
        </div>

      </section>
    `
  }

  return `
    <section class="challenges-section" id="challenges">

      <div class="platform-section-heading">

        <p class="platform-label">
          CHALLENGES
        </p>

        <h2>
          Put it into practice.
          <span>One challenge at a time.</span>
        </h2>

        <p>
          Apply what you are learning through
          personalized weekly challenges.
        </p>

      </div>


      <div class="challenges-list">

        ${challenges.map(challenge => {

          const submission =
            submissions.find(
              submission =>
                submission.challenge_id === challenge.id
            )

          const isSubmitted = !!submission

          const title = challenge.title || challenge.name || 'Weekly Challenge'
          const rawInstructions = challenge.instructions || challenge.description || challenge.task || ''
          const instructions = typeof rawInstructions === 'string' ? rawInstructions.trim() : String(rawInstructions).trim()
          const description = (challenge.description && challenge.description.trim() !== instructions && challenge.description.trim() !== title)
            ? challenge.description.trim()
            : ''

          const rawDate = challenge.end_date || challenge.due_date || challenge.due_at || null
          const formattedDate = rawDate && !isNaN(new Date(rawDate).getTime())
            ? new Date(rawDate).toLocaleDateString()
            : null

          const points = challenge.points ?? challenge.reward_points ?? null

          return `
            <article class="challenge-card">

              <div class="challenge-info">

                <div class="challenge-meta">

                  <span class="challenge-points">
                    ${
                      points
                        ? `${esc(points)} POINTS`
                        : 'CHALLENGE'
                    }
                  </span>

                  ${
                    formattedDate
                      ? `
                        <span class="challenge-date">
                          Due:
                          ${formattedDate}
                        </span>
                      `
                      : ''
                  }

                </div>


                <h3>
                  ${esc(title)}
                </h3>


                ${
                  description
                    ? `
                      <p class="challenge-desc">
                        ${esc(description)}
                      </p>
                    `
                    : ''
                }


                ${
                  instructions
                    ? `
                      <div class="challenge-instructions">
                        <strong>Instructions:</strong>
                        <br>
                        ${esc(instructions).replace(
                          /\n/g,
                          '<br>'
                        )}
                      </div>
                    `
                    : ''
                }

              </div>


              <div class="challenge-action-area">

                ${
                  isSubmitted
                    ? `
                      <div class="challenge-success-state">

                        <strong>
                          ✓ Challenge Submitted
                        </strong>

                        <p>
                          Status:
                          ${esc(submission.status || 'Submitted')}
                        </p>

                        ${
                          submission.teacher_feedback
                            ? `
                              <div class="teacher-feedback-note">

                                <strong>
                                  Teacher says:
                                </strong>

                                <br>

                                ${esc(submission.teacher_feedback).replace(
                                  /\n/g,
                                  '<br>'
                                )}

                              </div>
                            `
                            : ''
                        }

                      </div>
                    `
                    : `
                      <div
                        class="challenge-submit-form"
                        id="challenge-form-${esc(challenge.id)}"
                      >

                        <textarea
                          id="response-${esc(challenge.id)}"
                          aria-label="Your response to ${esc(title)}"
                          maxlength="12000"
                          placeholder="Type your response or completion notes here..."
                          rows="3"
                        ></textarea>

                        <button
                          type="button"
                          class="next-step-button"
                          data-challenge-id="${esc(challenge.id)}"
                          onclick="window.voPlatform.submitChallenge(this.dataset.challengeId, this)"
                        >
                          Submit Challenge ↗
                        </button>

                        <p
                          id="challenge-error-${esc(challenge.id)}"
                          class="error-text"
                          role="status"
                        ></p>

                      </div>
                    `
                }

              </div>

            </article>
          `

        }).join('')}

      </div>

    </section>
  `
}
