export function renderExercises(exercises = []) {
  if (!exercises.length) {
    return '<section class="platform-detail-section"><div class="empty-platform-state"><h2>No exercises yet</h2><p>Your teacher will publish activities here.</p></div></section>'
  }
  return `<section class="platform-detail-section"><div class="platform-section-heading"><p class="platform-label">EXERCISE STUDIO</p><h2>Practice with purpose.</h2><p>Complete an activity and send your attempt to your teacher.</p></div><div class="learning-access-grid">${exercises.map((item) => {
    const questions = Array.isArray(item.questions) ? item.questions : []
    return `<article class="learning-access-card"><p class="platform-label">${escapeHtml(item.exercise_type)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.instructions || item.objective || 'Practice activity')}</p><form class="student-exercise-form" data-exercise-assignment="${escapeHtml(item.assignment_id)}"><div>${questions.map((question, index) => `<label>${index + 1}. ${escapeHtml(question.prompt || 'Answer')}<textarea name="answer-${index}" rows="2" required></textarea></label>`).join('')}</div><button class="material-button" type="submit">Submit attempt</button><p class="exercise-status" data-exercise-status></p></form></article>`
  }).join('')}</div></section>`
}

export function setupExerciseForms(supabase) {
  document.querySelectorAll('.student-exercise-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const status = form.querySelector('[data-exercise-status]')
      const answers = [...new FormData(form).entries()].map(([key, value]) => ({ index: Number(key.replace('answer-', '')), answer: String(value).trim() }))
      status.textContent = 'Submitting...'
      const { error } = await supabase.from('exercise_attempts').insert({
        assignment_id: form.dataset.exerciseAssignment,
        student_id: (await supabase.auth.getUser()).data.user?.id,
        answers
      })
      status.textContent = error ? 'Could not submit this attempt. Please try again.' : 'Attempt submitted for review.'
    })
  })
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
