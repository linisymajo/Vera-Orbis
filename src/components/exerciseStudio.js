import { renderAttachmentReview, setupAttachmentDownloads } from './exerciseAttachments.js'
import { mountAcademicAI } from './academicAI.js'
import { validateExercise, saveExerciseDraft, publishExercise } from '../lib/exerciseWorkflow.js'
import { renderExerciseActivity, setupExerciseForms } from './exercises.js'
import { renderCorrectionControls, readCorrectionControls, setCorrectionControls, renderQuestionExtras } from './exerciseAuthoring.js'
import { saveExerciseFeedback } from '../lib/exerciseExperience.js'
import { setupExerciseAIReview } from './exerciseAIReview.js'

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const types = {
  multiple_choice: 'Multiple choice',
  true_false: 'True or false',
  fill_blank: 'Fill in the blank',
  matching: 'Match expressions',
  ordering: 'Build a sentence',
  reading: 'Storytelling and reading',
  listening: 'Listening comprehension',
  image_vocabulary: 'Power Expressions and vocabulary',
  open_question: 'Open question',
  writing: 'Writing and document response',
  conversation: 'Speaking and role-play',
  pronunciation: 'Listen and repeat'
}

function activityIcon(type) {
  const paths = {
    listening: 'M4 14v-3a8 8 0 0 1 16 0v3 M4 12H2v7h4v-7z M20 12h2v7h-4v-7z',
    pronunciation: 'M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0z M5 11v1a7 7 0 0 0 14 0v-1 M12 19v3 M8 22h8',
    conversation: 'M3 4h18v12H9l-6 5z M7 8h10 M7 12h6',
    open_question: 'M3 4h18v12H9l-6 5z M7 8h10 M7 12h6',
    matching: 'M2 4h6v6H2z M16 14h6v6h-6z M8 7h5v10h3',
    ordering: 'M7 5h14 M7 12h14 M7 19h14 M2 3v18 M1 19l1 2 2-2',
    reading: 'M12 5C9 2 5 2 2 4v16c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1z M12 5v16',
    image_vocabulary: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M6 7h3',
    fill_blank: 'M3 18h9 M14 15l5-10 3 2-5 10-4 2z M3 7h8 M3 12h6',
    true_false: 'M2 6l3 3 6-7 M15 3l7 7 M22 3l-7 7 M3 17h18 M3 22h12'
  }
  return `<svg class="experience-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="${paths[type] || 'M5 3h14v18H5z M8 8h8 M8 12h5 M8 16h7'}"/></svg>`
}

const typeCards = [
  { id: 'multiple_choice', badge: 'CHOICES', title: 'Multiple Choice', desc: 'Choose a useful expression from clear alternatives.', theme: 'violet' },
  { id: 'image_vocabulary', badge: 'VOCABULARY', title: 'Vocabulary Practice', desc: 'Recall useful words and accepted natural alternatives.', theme: 'teal' },
  { id: 'ordering', badge: 'SEQUENCE', title: 'Sequencing', desc: 'Put the steps of a conversation or story in order.', theme: 'gold' },
  { id: 'multiple_choice', badge: 'SCENARIOS', title: 'Cultural Scenarios', desc: 'Multiple choice decisions in real-world communicative situations.', theme: 'indigo' },
  { id: 'image_vocabulary', badge: 'EXPRESSIONS', title: 'Power Expressions', desc: 'High-impact idioms and vocabulary anchored in visual context.', theme: 'violet' },
  { id: 'reading', badge: 'NARRATIVE', title: 'Storytelling', desc: 'Authentic stories and cultural passages with reflective prompts.', theme: 'coral' },
  { id: 'matching', badge: 'CONNECTIONS', title: 'Matching', desc: 'Pair expressions with cultural meanings, nuances or responses.', theme: 'teal' },
  { id: 'ordering', badge: 'STRUCTURE', title: 'Sentence Building', desc: 'Assemble natural phrases from interactive communicative blocks.', theme: 'gold' },
  { id: 'fill_blank', badge: 'CONTEXT', title: 'Fill in the Blanks', desc: 'Complete living dialogues with the right expression in motion.', theme: 'terracotta' },
  { id: 'listening', badge: 'AUDIO', title: 'Listening Practice', desc: 'Comprehend rhythm, tone and meaning from spoken audio.', theme: 'violet' },
  { id: 'conversation', badge: 'ORAL PRODUCTION', title: 'Speaking Challenge', desc: 'Role-play scenarios that build spontaneous speaking confidence.', theme: 'coral' },
  { id: 'pronunciation', badge: 'VOICE & RHYTHM', title: 'Listen & Repeat', desc: 'Shadowing and pronunciation practice for natural delivery.', theme: 'teal' },
  { id: 'open_question', badge: 'PERSONALIZE', title: 'Open Response', desc: 'Free personal expression connecting language to the student’s life.', theme: 'gold' },
  { id: 'writing', badge: 'DOCUMENT STUDIO', title: 'Document Assignment', desc: 'Extended written production with optional PDF/Office file uploads.', theme: 'indigo' },
  { id: 'true_false', badge: 'CHECKPOINT', title: 'True or False', desc: 'Quick comprehension check on dialogues and cultural insights.', theme: 'teal' }
]

export async function mountExerciseStudio(panel, client, initialDraft = null) {
  const [activities, students, attempts] = await Promise.all([
    client.from('exercises').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('profiles').select('id,name,language').order('name').limit(1000),
    client.from('exercise_attempts').select('id,assignment_id,answers,exercise_snapshot,feedback,feedback_status,submitted_at,exercise_assignments!inner(teacher_id,student_id,exercise_id)').order('submitted_at', { ascending: false }).limit(100)
  ])
  if (activities.error || students.error) {
    panel.innerHTML = '<p role="alert">Exercise Studio could not load. Check your connection and reviewed database migrations.</p>'
    return
  }
  let current = null
  let baseSettings = {}
  let previewSignature = null
  let selectionGeneration = 0
  let assignmentsLoaded = true
  const finalExerciseIds = new Set((activities.data || []).filter(item => item.settings?.final_assessment).map(item => item.id))
  const activityList = (activities.data || []).filter(item => !finalExerciseIds.has(item.id))
  attempts.data = (attempts.data || []).filter(attempt => !finalExerciseIds.has(attempt.exercise_assignments?.exercise_id))

  panel.innerHTML = `<div class="teacher-action-grid vo-exercise-studio-layout">
    <article class="teacher-list-card vo-studio-sidebar-card">
      <div class="vo-studio-sidebar-head">
        <div>
          <span class="teacher-label">ACTIVITY LIBRARY</span>
          <h3>Your activities (${activityList.length})</h3>
        </div>
        <button type="button" class="teacher-primary-button" data-new-exercise>+ New activity</button>
      </div>
      <ul class="vo-studio-activity-list">${activityList.map(item => `<li class="vo-studio-activity-row">
        <button type="button" class="vo-studio-open-btn" data-open-exercise="${esc(item.id)}">${esc(item.title)} · ${esc(item.status)}</button>
        <div class="vo-studio-row-actions">
          <button type="button" class="teacher-secondary-button" data-copy-exercise="${esc(item.id)}">Duplicate</button>
          ${item.status !== 'archived' ? `<button type="button" class="teacher-secondary-button" data-archive-exercise="${esc(item.id)}">Archive</button>` : ''}
          ${item.status === 'published' ? `<button type="button" class="teacher-danger-button" data-unpublish-exercise="${esc(item.id)}">Unpublish</button>` : ''}
        </div>
      </li>`).join('') || '<li class="vo-studio-empty-item">No saved activities yet. Choose a card on the right to start.</li>'}</ul>
    </article>

    <form class="teacher-form-card exercise-studio-editor" id="teacher-exercise-form">
      <div class="vo-studio-header-bar">
        <div>
          <span class="teacher-label">5-STEP GUIDED CREATION STUDIO</span>
          <h3>Exercise Studio</h3>
        </div>
        <span class="vo-pedagogy-pill">Listen → Repeat → Personalize → Use</span>
      </div>

      <nav class="teacher-inline-actions vo-studio-stepper" aria-label="Activity creation steps">
        ${['Choose activity', 'Create', 'Preview', 'Assign', 'Publish'].map((label, i) => `<button type="button" class="vo-step-pill${i === 0 ? ' is-active-step' : ''}" data-studio-step="${i + 1}"><span class="vo-step-num">${i + 1}</span><span>${i + 1}. ${label}</span></button>`).join('')}
      </nav>

      <section data-step="1" class="vo-studio-step-pane">
        <div class="vo-step-intro">
          <div>
            <h4>Step 1 — Choose an interactive activity format</h4>
            <p>Listen → Repeat → Personalize → Use. Choose real communication and meaningful context.</p>
          </div>
          <label class="vo-type-select-label">Activity type<select name="exercise_type">${Object.entries(types).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
        </div>

        <div class="vo-studio-type-grid" role="group" aria-label="Interactive activity type cards">
          ${typeCards.map((card, idx) => `
            <div class="vo-activity-type-card vo-card-${card.theme}${idx === 0 ? ' is-selected' : ''}" data-pick-exercise-type="${card.id}" data-activity-variant="${esc(card.title)}" tabindex="0" role="button" aria-pressed="${idx === 0}" aria-label="${esc(card.title)}">
              ${activityIcon(card.id)}
              <span class="vo-activity-card-badge">${esc(card.badge)}</span>
              <h5>${esc(card.title)}</h5>
              <p>${esc(card.desc)}</p>
            </div>
          `).join('')}
        </div>

        <div class="vo-studio-step-footer">
          <button type="button" class="teacher-primary-button" data-studio-next="2">Create activity</button>
        </div>
      </section>

      <section data-step="2" class="vo-studio-step-pane" hidden>
        <div class="vo-step-intro">
          <h4>Step 2 — Craft your activity & prompts</h4>
          <p>Only controls relevant to your selected format are shown. Add as many questions or prompts as needed.</p>
        </div>
        <div class="vo-form-grid-3">
          <label>Title<input name="title" required maxlength="160" placeholder="e.g. Bonjour in a first meeting"></label>
          <label>Language<select name="language"><option>English</option><option>French</option><option>Mandarin</option></select></label>
          <label>Level<input name="level" maxlength="40" placeholder="e.g. A2 or HSK 2"></label>
        </div>
        <div class="vo-form-grid-2">
          <label>Learning objective<input name="objective" maxlength="240" placeholder="Communicative goal for the learner..."></label>
          <label>Student files<select name="attachment_mode"><option value="none">No attachments</option><option value="optional">Optional attachments</option><option value="required">Required attachment</option></select></label>
        </div>
        <label>Instructions<textarea name="instructions" rows="2" placeholder="Clear instructions following Listen -> Repeat -> Personalize -> Use..."></textarea></label>
        <label class="vo-checkbox-row"><input type="checkbox" name="allow_attachment_revisions"> Allow file revisions before the deadline</label>

        ${renderCorrectionControls()}

        <div data-question-editor class="vo-question-editor-stack"></div>

        <div class="vo-studio-step-footer">
          <button type="button" class="teacher-secondary-button" data-studio-back="1">← Back</button>
          <button type="button" class="teacher-secondary-button" data-add-question>+ Add question</button>
          <button type="button" class="teacher-secondary-button" data-save-draft>Save draft</button>
          <button type="button" class="teacher-primary-button" data-studio-next="3">Preview activity</button>
        </div>
      </section>

      <section data-step="3" class="vo-studio-step-pane" hidden>
        <div class="vo-step-intro">
          <h4>Step 3 — Live Student Preview</h4>
          <p>Test the exact interactive card your students will experience before assigning it.</p>
        </div>
        <div data-student-preview></div>
        <div class="vo-studio-step-footer">
          <button type="button" class="teacher-secondary-button" data-studio-back="2">← Edit questions</button>
          <button type="button" class="teacher-primary-button" data-studio-next="4">Select students</button>
        </div>
      </section>

      <section data-step="4" id="teacher-exercise-assignment-form" class="vo-studio-step-pane" hidden>
        <div class="vo-step-intro">
          <h4>Step 4 — Assign to Students & Set Deadline</h4>
          <p>Filter by name or language and set an optional due date.</p>
        </div>
        <div class="vo-form-grid-2">
          <label>Find students<input type="search" data-student-search placeholder="Search by name or language"></label>
          <label>Deadline (your local time)<input name="due_at" type="datetime-local"></label>
        </div>
        <div class="studio-student-picker vo-student-picker-grid" role="group" aria-label="Assign students">
          ${(students.data || []).map(student => `<label class="vo-student-pick-card" data-student-option data-search="${esc(`${student.name} ${student.language || ''}`.toLowerCase())}"><input type="checkbox" name="student_ids" value="${esc(student.id)}"><span><strong>${esc(student.name || 'Student')}</strong> <small>${esc(student.language || '')}</small></span></label>`).join('')}
        </div>
        <label data-mixed-deadlines class="vo-checkbox-row" hidden><input type="checkbox" name="overwrite_deadlines"> This activity has different deadlines. Apply the chosen deadline (or no deadline) to all selected students.</label>
        <div class="vo-studio-step-footer">
          <button type="button" class="teacher-secondary-button" data-studio-back="3">← Back to preview</button>
          <button type="button" class="teacher-primary-button" data-studio-next="5">Review publication</button>
        </div>
      </section>

      <section data-step="5" class="vo-studio-step-pane" hidden>
        <div class="vo-publish-confirmation-card">
          <span class="teacher-label">READY TO PUBLISH</span>
          <h4>Step 5 — Confirm Atomic Publication</h4>
          <p>Publishing saves this activity and its selected assignments together. Changes to selected students replace the assignment list while preserving responses.</p>
          <p data-publish-summary class="vo-publish-count-badge"></p>
          <div class="vo-studio-step-footer">
            <button type="button" class="teacher-secondary-button" data-studio-back="4">← Adjust students</button>
            <button type="button" class="teacher-primary-button" data-publish-exercise>Publish and assign</button>
          </div>
        </div>
      </section>

      <p data-form-status class="vo-studio-status-banner" role="status" aria-live="polite"></p>
    </form>
  </div>

  <section class="teacher-list-card vo-submissions-review-deck">
    <div class="vo-studio-sidebar-head">
      <div>
        <span class="teacher-label">STUDENT RESPONSES & FEEDBACK</span>
        <h3>Student submissions (${(attempts.data || []).length})</h3>
      </div>
    </div>
    ${attempts.error ? '<p>Submission review unavailable. Apply the reviewed workflow migration.</p>' : !(attempts.data || []).length ? '<p class="teacher-muted">No saved submissions yet. Once students submit an assigned activity, their responses appear here for review.</p>' : `<div class="vo-submissions-grid">${(attempts.data || []).map(attempt => `<form class="vo-submission-review-card" data-review-attempt="${esc(attempt.id)}"><div class="vo-submission-card-head"><h4>${esc((students.data || []).find(s => s.id === attempt.exercise_assignments?.student_id)?.name || 'Student')} · ${esc(attempt.exercise_snapshot?.title || activityList.find(e => e.id === attempt.exercise_assignments?.exercise_id)?.title || 'Activity')}</h4><span class="teacher-badge ${attempt.feedback_status === 'published' ? 'badge-published' : 'badge-draft'}" data-review-status role="status">${esc(attempt.feedback_status || 'draft')}</span></div><ol class="vo-submission-answers-list">${(attempt.answers || []).map(answer => `<li><strong>${esc(attempt.exercise_snapshot?.questions?.[answer.index]?.prompt || `Question ${Number(answer.index) + 1}`)}</strong><p>${esc(answer.answer)}</p></li>`).join('')}</ol>${renderAttachmentReview(attempt.assignment_id, attempt.id)}<label>Teacher feedback<textarea name="feedback" required rows="3" placeholder="Encourage communicative confidence and personalize next steps...">${esc(attempt.feedback || '')}</textarea></label><div class="teacher-inline-actions"><button type="submit" class="teacher-secondary-button" name="action" value="draft">Save feedback draft</button><button type="submit" class="teacher-primary-button" name="action" value="release">Approve and send feedback</button></div></form>`).join('')}</div>`}
  </section>`

  const aiHost = document.createElement('details')
  aiHost.className = 'vo-ai-drawer-card'
  aiHost.innerHTML = '<summary>Create an exercise with AI</summary><div data-studio-ai></div>'
  panel.prepend(aiHost)
  aiHost.addEventListener('toggle', () => {
    if (aiHost.open && !aiHost.dataset.loaded) {
      aiHost.dataset.loaded = 'true'
      mountAcademicAI(aiHost.querySelector('[data-studio-ai]'), client, {
        exerciseOnly: true,
        onUseExercise: draft => mountExerciseStudio(panel, client, draft)
      })
    }
  })

  const form = panel.querySelector('#teacher-exercise-form')
  const status = form.querySelector('[data-form-status]')
  const editor = form.querySelector('[data-question-editor]')
  setCorrectionControls(form)
  form.elements.correction_mode.addEventListener('change', () => {
    if (form.elements.correction_mode.value !== 'objective') form.elements.correction_timing.value = 'after_submission'
  })

  function syncTypeCards() {
    const val = form.elements.exercise_type.value
    let selected = false
    form.querySelectorAll('[data-pick-exercise-type]').forEach(card => {
      const active = !selected && card.dataset.pickExerciseType === val && (!baseSettings.activity_variant || card.dataset.activityVariant === baseSettings.activity_variant)
      card.classList.toggle('is-selected', active)
      card.setAttribute('aria-pressed', String(active))
      if (active) selected = true
    })
  }

  form.querySelectorAll('[data-pick-exercise-type]').forEach(card => {
    const selectCard = () => {
      if (form.elements.exercise_type.disabled) return
      baseSettings.activity_variant = card.dataset.activityVariant
      form.elements.exercise_type.value = card.dataset.pickExerciseType
      form.elements.exercise_type.onchange?.()
      syncTypeCards()
    }
    card.addEventListener('click', selectCard)
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        selectCard()
      }
    })
  })

  function addQuestion(q = {}) {
    const fieldset = document.createElement('fieldset')
    fieldset.className = 'vo-question-card'
    fieldset.innerHTML = `<legend>Question ${editor.children.length + 1}</legend><label>Prompt<textarea data-field="prompt" rows="2">${esc(q.prompt || '')}</textarea></label><label>Reading or scenario (optional)<textarea data-field="passage" rows="2">${esc(q.passage || '')}</textarea></label><div data-type-fields></div><button type="button" class="teacher-danger-button" data-remove-question>Remove question</button>`
    const extra = fieldset.querySelector('[data-type-fields]')
    const type = q.response_type || form.elements.exercise_type.value
    fieldset.querySelector('legend').insertAdjacentHTML('afterend', `<label>Response format<select data-field="response_type">${Object.entries(types).map(([id, label]) => `<option value="${id}" ${id === type ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`)
    if (type === 'multiple_choice') extra.innerHTML = `<label>Options (one per line)<textarea data-field="options" rows="3">${esc((q.options || []).join('\n'))}</textarea></label><label>Correct option (private)<input data-field="answer" value="${esc(q.answer || '')}"></label>`
    if (type === 'matching') extra.innerHTML = `<label>Left expressions (one per line)<textarea data-field="left">${esc((q.left || []).join('\n'))}</textarea></label><label>Right choices, in the order students will see (one per line)<textarea data-field="right">${esc((q.right || []).join('\n'))}</textarea></label>`
    if (type === 'ordering') extra.innerHTML = `<label>Sentence blocks, in mixed order (one per line)<textarea data-field="items">${esc((q.items || []).join('\n'))}</textarea></label>`
    if (type === 'listening' || type === 'pronunciation') extra.innerHTML = `<label>Audio HTTPS link (optional)<input data-field="audio_url" type="url" value="${esc(q.audio_url || '')}"></label>`
    if (['fill_blank', 'ordering', 'image_vocabulary'].includes(type)) extra.insertAdjacentHTML('beforeend', `<label>Expected answer (private)<input data-field="answer" maxlength="4000" value="${esc(q.answer || '')}"></label>`)
    if (type === 'true_false') extra.insertAdjacentHTML('beforeend', `<label>Correct answer (private)<select data-field="answer"><option value="True" ${q.answer === 'True' ? 'selected' : ''}>True</option><option value="False" ${q.answer === 'False' ? 'selected' : ''}>False</option></select></label>`)
    if (type === 'matching') extra.insertAdjacentHTML('beforeend', `<label>Correct matches in left-expression order (one per line)<textarea data-field="answer_array">${esc(Array.isArray(q.answer) ? q.answer.join('\n') : '')}</textarea></label>`)
    fieldset.insertAdjacentHTML('beforeend', renderQuestionExtras(q))
    const renumber = () => [...editor.children].forEach((card, index) => { card.querySelector('legend').textContent = `Question ${index + 1}` })
    fieldset.querySelector('[data-field="response_type"]').onchange = () => {
      const replacement = addQuestion(readQuestion(fieldset))
      fieldset.before(replacement); fieldset.remove(); renumber()
      replacement.querySelector('select').focus()
    }
    fieldset.querySelector('[data-remove-question]').onclick = () => { fieldset.remove(); renumber() }
    fieldset.querySelector('[data-duplicate-question]').onclick = () => {
      const copy = addQuestion(readQuestion(fieldset))
      fieldset.after(copy); renumber(); copy.querySelector('textarea').focus()
    }
    fieldset.querySelector('[data-question-up]').onclick = () => { if (fieldset.previousElementSibling) { fieldset.previousElementSibling.before(fieldset); renumber() } }
    fieldset.querySelector('[data-question-down]').onclick = () => { if (fieldset.nextElementSibling) { fieldset.nextElementSibling.after(fieldset); renumber() } }
    editor.append(fieldset)
    return fieldset
  }

  function readQuestion(fieldset) {
    return Object.fromEntries([...fieldset.querySelectorAll('[data-field]')].map(input => {
      const key = input.dataset.field
      const value = ['options', 'left', 'right', 'items', 'accepted_answers', 'answer_array'].includes(key) ? input.value.split('\n').map(s => s.trim()).filter(Boolean) : input.value.trim()
      return [key === 'answer_array' ? 'answer' : key, value]
    }))
  }

  function collect() {
    const questions = [...editor.children].map(readQuestion)
    return validateExercise({
      title: form.elements.title.value.trim(),
      language: form.elements.language.value,
      level: form.elements.level.value.trim() || null,
      objective: form.elements.objective.value.trim() || null,
      instructions: form.elements.instructions.value.trim() || null,
      exercise_type: form.elements.exercise_type.value,
      questions,
      settings: {
        ...baseSettings,
        ...(current && current.status !== 'draft' && !baseSettings.correction ? {} : readCorrectionControls(form)),
        attachment_mode: form.elements.attachment_mode.value,
        allow_attachment_revisions: form.elements.allow_attachment_revisions.checked
      }
    })
  }

  function showStep(step) {
    try {
      if (Number(step) >= 3) {
        if (!assignmentsLoaded) throw new Error('Load the current assignments before publishing.')
        const draft = collect()
        if (Number(step) === 3) {
          const preview = panel.querySelector('[data-preview-host]') || document.createElement('div')
          preview.dataset.previewHost = 'true'
          preview.className = 'vo-live-preview-stage'
          form.after(preview)
          preview.innerHTML = renderExerciseActivity(draft, { preview: true })
          setupExerciseForms(client, preview, { previewDefinition: draft })
          previewSignature = JSON.stringify(draft)
        } else if (previewSignature !== JSON.stringify(draft)) throw new Error('Preview this version before assigning or publishing.')
      }
      form.querySelectorAll('[data-step]').forEach(section => { section.hidden = section.dataset.step !== String(step) })
      form.querySelectorAll('.vo-studio-stepper [data-studio-step]').forEach(btn => {
        btn.classList.toggle('is-active-step', btn.dataset.studioStep === String(step))
      })
      const preview = panel.querySelector('[data-preview-host]')
      if (preview) preview.hidden = String(step) !== '3'
      if (String(step) === '5') form.querySelector('[data-publish-summary]').textContent = `${form.querySelectorAll('[name="student_ids"]:checked').length} student(s) selected.`
      status.textContent = ''
    } catch (error) {
      status.textContent = error.message
    }
  }

  async function openExercise(id, copy = false) {
    const generation = ++selectionGeneration
    assignmentsLoaded = copy
    form.querySelector('[data-publish-exercise]').disabled = !copy
    const item = activityList.find(e => e.id === id)
    current = copy ? null : item
    baseSettings = structuredClone(item.settings || {})
    form.reset()
    editor.innerHTML = ''
    for (const key of ['title', 'language', 'level', 'objective', 'instructions', 'exercise_type']) form.elements[key].value = item[key] || ''
    editor.dataset.defaultType = item.exercise_type
    form.elements.attachment_mode.value = item.settings?.attachment_mode || 'none'
    form.elements.allow_attachment_revisions.checked = item.settings?.allow_attachment_revisions === true
    setCorrectionControls(form, item.settings)
    if (copy) form.elements.title.value += ' (copy)'
    syncTypeCards()
    ;(item.questions || []).forEach(addQuestion)
    form.querySelector('[data-save-draft]').disabled = !copy && item.status !== 'draft'
    form.querySelectorAll('[data-step="1"] select,[data-step="2"] input,[data-step="2"] textarea,[data-step="2"] select,[data-add-question],[data-remove-question]').forEach(input => { input.disabled = !copy && item.status !== 'draft' })
    editor.querySelectorAll('[data-duplicate-question],[data-question-up],[data-question-down]').forEach(input => { input.disabled = !copy && item.status !== 'draft' })
    if (!copy) {
      const assignments = await client.from('exercise_assignments').select('student_id,due_at,status').eq('exercise_id', id)
      if (generation !== selectionGeneration) return
      if (assignments.error) {
        status.textContent = 'Could not load current assignments. Refresh before publishing.'
        form.querySelector('[data-publish-exercise]').disabled = true
        return
      }
      assignmentsLoaded = true
      form.querySelector('[data-publish-exercise]').disabled = false
      const deadlines = [...new Set((assignments.data || []).filter(a => a.status !== 'revoked').map(a => a.due_at))]
      form.dataset.mixedDeadlines = String(deadlines.length > 1)
      form.querySelector('[data-mixed-deadlines]').hidden = deadlines.length <= 1
      if (deadlines.length === 1 && deadlines[0]) {
        const date = new Date(deadlines[0])
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        form.elements.due_at.value = local.toISOString().slice(0, 16)
      }
      form.querySelectorAll('[name="student_ids"]').forEach(input => {
        input.checked = (assignments.data || []).some(a => a.student_id === input.value && a.status !== 'revoked')
      })
    }
    previewSignature = null
    showStep(2)
  }

  panel.querySelectorAll('[data-open-exercise]').forEach(button => button.onclick = () => openExercise(button.dataset.openExercise))
  panel.querySelectorAll('[data-copy-exercise]').forEach(button => button.onclick = () => openExercise(button.dataset.copyExercise, true))
  panel.querySelectorAll('[data-archive-exercise]').forEach(button => button.onclick = async () => {
    button.disabled = true
    const result = await client.from('exercises').update({ status: 'archived' }).eq('id', button.dataset.archiveExercise).select('id').single()
    if (result.error || !result.data?.id) { status.textContent = 'Archive was not confirmed. Your records are preserved.'; button.disabled = false; return }
    await mountExerciseStudio(panel, client)
  })
  panel.querySelectorAll('[data-unpublish-exercise]').forEach(button => button.onclick = async () => {
    button.disabled = true
    const result = await client.from('exercises').update({ status: 'draft' }).eq('id', button.dataset.unpublishExercise).select('id').single()
    if (result.error || !result.data) {
      status.textContent = 'Unpublish was not confirmed.'
      button.disabled = false
      return
    }
    await mountExerciseStudio(panel, client)
  })
  panel.querySelector('[data-new-exercise]').onclick = () => mountExerciseStudio(panel, client)
  form.querySelectorAll('[data-studio-step],[data-studio-next],[data-studio-back]').forEach(button => button.onclick = () => showStep(button.dataset.studioStep || button.dataset.studioNext || button.dataset.studioBack))
  form.querySelector('[data-add-question]').onclick = () => addQuestion()
  form.elements.exercise_type.onchange = () => {
    if (typeCards.find(card => card.title === baseSettings.activity_variant)?.id !== form.elements.exercise_type.value) delete baseSettings.activity_variant
    const questions = [...editor.children].map(readQuestion)
    for (const question of questions) if (!question.response_type || question.response_type === (editor.dataset.defaultType || 'multiple_choice')) question.response_type = form.elements.exercise_type.value
    editor.dataset.defaultType = form.elements.exercise_type.value
    syncTypeCards()
    editor.innerHTML = ''
    ;(questions.length ? questions : [{}]).forEach(addQuestion)
    previewSignature = null
  }
  form.querySelector('[data-student-search]').oninput = event => form.querySelectorAll('[data-student-option]').forEach(option => { option.hidden = !option.dataset.search.includes(event.target.value.toLowerCase()) })
  form.addEventListener('submit', event => event.preventDefault())
  form.querySelector('[data-save-draft]').onclick = async event => {
    const button = event.currentTarget
    button.disabled = true
    try {
      const savedId = await saveExerciseDraft(client, collect(), current?.id)
      current = { ...(current || {}), id: savedId, status: current?.status || 'draft' }
      status.textContent = 'Draft saved.'
    } catch (error) {
      status.textContent = error.message
    } finally {
      button.disabled = false
    }
  }
  form.querySelector('[data-publish-exercise]').onclick = async event => {
    const button = event.currentTarget
    button.disabled = true
    try {
      const draft = collect()
      if (previewSignature !== JSON.stringify(draft)) throw new Error('Preview this version before publishing.')
      if (form.dataset.mixedDeadlines === 'true' && !form.elements.overwrite_deadlines.checked) throw new Error('Confirm that you want to replace the different student deadlines.')
      const studentIds = [...form.querySelectorAll('[name="student_ids"]:checked')].map(input => input.value)
      const dueAt = form.elements.due_at.value ? new Date(form.elements.due_at.value).toISOString() : null
      const exerciseId = (!current?.id || current?.status === 'draft')
        ? await saveExerciseDraft(client, draft, current?.id)
        : current.id
      const result = await publishExercise(client, { exerciseId, studentIds, dueAt })
      await mountExerciseStudio(panel, client)
      panel.querySelector('[data-form-status]').textContent = `Published with ${result.assignment_count} saved assignment(s).`
    } catch (error) {
      status.textContent = error.message
      button.disabled = false
    }
  }
  setupAttachmentDownloads(client, panel)
  panel.querySelectorAll('[data-review-attempt]').forEach(reviewForm => {
    let reviewVersion = null
    const feedbackParts = ['strengths','natural_alternative','explanation','practical_tip','encouragement']
    const labels = ['What went well','A natural way to say it','Why it works','Try this next','Encouragement']
    reviewForm.querySelector('[name="feedback"]').closest('label').insertAdjacentHTML('afterend', `<details><summary>Personalize feedback cards</summary>${feedbackParts.map((key,index) => `<label>${labels[index]}<textarea name="coach_${key}" maxlength="4000" rows="2"></textarea></label>`).join('')}</details><details data-feedback-history><summary>Saved feedback history</summary><div></div></details>`)
    reviewForm.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = true })
    const reviewedAttempt = (attempts.data || []).find(attempt => attempt.id === reviewForm.dataset.reviewAttempt)
    setupExerciseAIReview(reviewForm, client, { studentId: reviewedAttempt?.exercise_assignments?.student_id, attemptId: reviewForm.dataset.reviewAttempt })
    client.rpc('get_exercise_teacher_review', { p_attempt_id: reviewForm.dataset.reviewAttempt }).then(result => {
      if (!reviewForm.isConnected) return
      if (result.error || result.data?.attempt_id !== reviewForm.dataset.reviewAttempt) {
        reviewForm.querySelector('[data-review-status]').textContent = 'Review history could not load. Apply the reviewed migration or refresh before editing.'
        return
      }
      reviewVersion = result.data.version
      const latest = result.data.history?.[0]?.content
      if (latest) {
        reviewForm.elements.feedback.value = latest.message || ''
        for (const key of feedbackParts) reviewForm.elements[`coach_${key}`].value = latest[key] || ''
      }
      reviewForm.querySelector('[data-feedback-history] div').innerHTML = (result.data.history || []).map(version => `<p><strong>Version ${Number(version.version)} · ${version.released_at ? 'Released' : 'Private draft'}</strong></p><p>${esc(version.content.message)}</p>`).join('') || '<p>No feedback revisions yet.</p>'
      reviewForm.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = false })
    }).catch(() => { reviewForm.querySelector('[data-review-status]').textContent = 'Review history could not load. Refresh before editing.' })
    reviewForm.addEventListener('input', () => { delete reviewForm.dataset.feedbackRequest })
    reviewForm.onsubmit = async event => {
      event.preventDefault()
      if (reviewVersion === null || reviewForm.dataset.saving === 'true') return
      const action = event.submitter?.value || 'draft'
      const button = event.submitter
      if (button) button.disabled = true
      const reviewStatus = reviewForm.querySelector('[data-review-status]')
      reviewForm.dataset.saving = 'true'
      try {
        const content = { message: reviewForm.elements.feedback.value.trim() }
        for (const key of feedbackParts) if (reviewForm.elements[`coach_${key}`].value.trim()) content[key] = reviewForm.elements[`coach_${key}`].value.trim()
        const signature = JSON.stringify({ content, release: action === 'release', aiDraftId: reviewForm.dataset.approvedAiDraft || null })
        if (reviewForm.dataset.feedbackSignature !== signature) { reviewForm.dataset.feedbackSignature = signature; delete reviewForm.dataset.feedbackRequest }
        reviewForm.dataset.feedbackRequest ||= crypto.randomUUID()
        const saved = await saveExerciseFeedback(client, { attemptId: reviewForm.dataset.reviewAttempt, content,
          expectedVersion: reviewVersion, requestId: reviewForm.dataset.feedbackRequest, release: action === 'release', aiDraftId: reviewForm.dataset.approvedAiDraft || null })
        reviewVersion = saved.version
        delete reviewForm.dataset.feedbackRequest
        reviewStatus.textContent = action === 'release' ? 'Feedback published to student.' : 'Feedback draft saved.'
      } catch (error) {
        reviewStatus.textContent = error.message
      } finally {
        reviewForm.dataset.saving = 'false'
        if (button) button.disabled = false
      }
    }
  })
  if (initialDraft) {
    current = null
    baseSettings = structuredClone(initialDraft.settings || {})
    setCorrectionControls(form, initialDraft.settings)
    for (const key of ['title', 'language', 'level', 'objective', 'instructions', 'exercise_type']) if (initialDraft[key]) form.elements[key].value = initialDraft[key]
    editor.dataset.defaultType = form.elements.exercise_type.value
    syncTypeCards()
    ;(initialDraft.questions || []).forEach(addQuestion)
    showStep(2)
  } else addQuestion()
}
