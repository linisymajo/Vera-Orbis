import { renderAttachmentInput, renderAttachmentReview, renderAttachmentRevision, uploadFilesForForm, setupAttachmentDownloads } from './exerciseAttachments.js'
import { submitExerciseAttempt } from '../lib/academicOperations.js'
import { studentExercise } from '../lib/exerciseWorkflow.js'
import { renderPracticeActivity, setupPracticeForms } from './exercisePractice.js'

const escapeHtml = (value = '') => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

export function renderExerciseActivity(item, { preview = false } = {}) {
  if (item.correction_settings?.version === 1 || item.settings?.correction?.version === 1) return renderPracticeActivity(item, { preview })
  const activity = studentExercise(item)
  const questions = activity.questions || []
  const attachmentMode = item.attachment_mode || item.settings?.attachment_mode || 'none'
  const completed = Number(item.attempt_count || 0) >= Number(item.attempt_limit || 1)
  return `
    <article class="learning-access-card exercise-activity vo-student-exercise-card ${completed ? 'is-completed' : ''}">
      <div class="vo-exercise-card-top">
        <p class="platform-label">${escapeHtml(item.exercise_type?.replaceAll('_', ' '))}</p>
        <div class="vo-exercise-meta-badges">
          ${item.language ? `<span class="vo-badge vo-badge--indigo">${escapeHtml(item.language)}</span>` : ''}
          ${item.level ? `<span class="vo-badge vo-badge--teal">${escapeHtml(item.level)}</span>` : ''}
          <span class="vo-badge ${completed ? 'vo-badge--teal' : 'vo-badge--violet'}">${completed ? 'Completed' : `${questions.length} prompt${questions.length === 1 ? '' : 's'}`}</span>
        </div>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="vo-exercise-instructions">${escapeHtml(item.instructions || item.objective || 'Practice activity')}</p>
      ${item.due_at ? `<p class="vo-exercise-deadline">Due: ${escapeHtml(new Date(item.due_at).toLocaleString())}</p>` : ''}
      <form class="student-exercise-form" data-exercise-assignment="${escapeHtml(item.assignment_id || '')}" ${preview ? 'data-preview="true"' : ''}>
        ${questions.map((q, i) => renderQuestion(q, i, item.exercise_type)).join('')}
        ${!completed ? renderAttachmentInput(attachmentMode, { preview }) : ''}
        <div class="vo-exercise-submit-bar">
          <div class="vo-exercise-progress-wrap">
            <progress max="${questions.length || 1}" value="0" aria-label="Answers completed"></progress>
          </div>
          <button class="material-button" type="submit" ${!questions.length || completed ? 'disabled' : ''}>${preview ? 'Check preview' : completed ? 'Submitted for review' : 'Submit attempt'}</button>
        </div>
        <p class="exercise-status" data-exercise-status role="status" aria-live="polite"></p>
      </form>
      ${!preview && item.assignment_id ? renderAttachmentReview(item.assignment_id) + (completed ? renderAttachmentRevision(item) : '') : ''}
      ${item.feedback ? `<aside class="exercise-feedback vo-student-feedback-callout"><h4>Teacher feedback</h4><p>${escapeHtml(item.feedback)}</p></aside>` : ''}
    </article>`
}

function renderQuestion(q, index, type) {
  const name = `answer-${index}`
  let input
  if (type === 'multiple_choice' || type === 'true_false') {
    const options = type === 'true_false' ? ['True', 'False'] : q.options || []
    input = `<div class="vo-exercise-choices-grid">${options.map(option => `<label class="exercise-choice vo-tactile-choice"><input type="radio" name="${name}" value="${escapeHtml(option)}" required>${escapeHtml(option)}</label>`).join('')}</div>`
  } else if (type === 'matching') {
    input = `<div class="vo-exercise-matching-grid">${(q.left || []).map((left, n) => `<label class="vo-matching-row">${escapeHtml(left)}<select name="${name}-${n}" data-answer-group="${index}" required><option value="">Choose a match</option>${(q.right || []).map(right => `<option>${escapeHtml(right)}</option>`).join('')}</select></label>`).join('')}</div>`
  } else if (type === 'ordering') {
    input = `<p class="vo-ordering-hint">Choose the blocks in order.</p><div class="exercise-blocks vo-sentence-blocks">${(q.items || []).map((item, n) => `<button type="button" class="vo-sentence-block-btn" data-order-block="${n}" data-order-target="${name}">${escapeHtml(item)}</button>`).join('')}</div><textarea name="${name}" rows="2" required aria-label="Your sentence" placeholder="Build or type your sentence"></textarea><button type="button" class="btn-studio-secondary" data-order-reset="${name}">Reset blocks</button>`
  } else {
    input = `<textarea name="${name}" rows="3" required maxlength="12000" aria-label="Your answer to question ${index + 1}" placeholder="Write your response clearly in the target language..."></textarea>`
  }
  const hintMarkup = q.hint ? `
    <details class="vo-question-hint-flip">
      <summary>Reveal expression hint</summary>
      <p>${escapeHtml(q.hint)}</p>
    </details>` : ''
  return `
    <fieldset class="vo-student-question-fieldset" data-question="${index}">
      <legend>${index + 1}. ${escapeHtml(q.prompt || 'Answer')}</legend>
      ${q.passage ? `<p class="vo-question-passage">${escapeHtml(q.passage)}</p>` : ''}
      ${q.image_url && /^https:\/\//i.test(q.image_url) ? `<img class="vo-question-media-img" src="${escapeHtml(q.image_url)}" alt="Activity reference" loading="lazy" referrerpolicy="no-referrer">` : ''}
      ${q.audio_url && /^https:\/\//i.test(q.audio_url) ? `<audio class="vo-question-media-audio" controls preload="none" src="${escapeHtml(q.audio_url)}"></audio>` : ''}
      ${input}
      ${hintMarkup}
    </fieldset>`
}

export function renderExercises(exercises = []) {
  if (!exercises.length) {
    return `
      <section class="platform-detail-section">
        <div class="empty-platform-state">
          <h2>No exercises yet</h2>
          <p>Your teacher will publish activities here.</p>
        </div>
      </section>`
  }
  return `
    <section class="platform-detail-section vo-student-exercises-section">
      <div class="platform-section-heading">
        <p class="platform-label">EXERCISE STUDIO</p>
        <h2>Practice with purpose.</h2>
        <p>Listen, repeat, personalize, then use what you learn.</p>
      </div>
      <div class="learning-access-grid vo-student-exercises-grid">
        ${exercises.map(item => renderExerciseActivity(item)).join('')}
      </div>
    </section>`
}

export function exerciseAnswers(form) {
  return [...form.querySelectorAll('[data-question]')].map(fieldset => {
    const values = [...new FormData(form).entries()].filter(([key]) => key === `answer-${fieldset.dataset.question}` || key.startsWith(`answer-${fieldset.dataset.question}-`)).map(([, value]) => String(value).trim())
    return { index: Number(fieldset.dataset.question), answer: fieldset.querySelector('[data-answer-group]') ? JSON.stringify(values) : values.join(' | ') }
  })
}

export function setupExerciseForms(supabase, root = document, options = {}) {
  setupAttachmentDownloads(supabase, root)
  setupPracticeForms(supabase, root, options)
  root.querySelectorAll('.student-exercise-form').forEach(form => {
    if (form.dataset.bound) return
    form.dataset.bound = 'true'
    const updateProgress = () => {
      const answers = exerciseAnswers(form)
      form.querySelector('progress').value = answers.filter(answer => answer.answer).length
    }
    form.addEventListener('input', updateProgress)
    form.addEventListener('click', event => {
      const block = event.target.closest('[data-order-block]')
      if (block) {
        const output = form.elements.namedItem(block.dataset.orderTarget)
        output.value = `${output.value} ${block.textContent}`.trim()
        block.disabled = true
        updateProgress()
      }
      const reset = event.target.closest('[data-order-reset]')
      if (reset) {
        form.elements.namedItem(reset.dataset.orderReset).value = ''
        reset.closest('[data-question]').querySelectorAll('[data-order-block]').forEach(button => { button.disabled = false })
        updateProgress()
      }
    })
    form.addEventListener('submit', async event => {
      event.preventDefault()
      const status = form.querySelector('[data-exercise-status]')
      const button = form.querySelector('[type="submit"]')
      if (button.disabled) return
      if (form.dataset.preview) {
        status.textContent = 'Preview complete. No response has been saved.'
        return
      }
      button.disabled = true
      status.textContent = 'Submitting...'
      try {
        form.dataset.requestId ||= crypto.randomUUID()
        const attachmentIds = await uploadFilesForForm(supabase, form, form.dataset.exerciseAssignment)
        await submitExerciseAttempt(supabase, form.dataset.exerciseAssignment, exerciseAnswers(form), form.dataset.requestId, attachmentIds)
        setupAttachmentDownloads(supabase, root)
        status.textContent = 'Attempt submitted for teacher review.'
        button.textContent = 'Submitted'
        form.querySelectorAll('textarea, select, input').forEach(input => { input.disabled = true })
      } catch (error) {
        status.textContent = error.message || 'Could not submit. Your answers are still here.'
        button.disabled = false
      }
    })
  })
}
