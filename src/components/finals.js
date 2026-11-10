import { renderExerciseActivity, setupExerciseForms } from './exercises.js'
import { renderAttachmentReview, setupAttachmentDownloads } from './exerciseAttachments.js'
import { parseFinalCriteria, saveFinalDraft, publishFinalAssessment, saveFinalResult, publishFinalResult } from '../lib/finals.js'

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
const defaultCriteria = 'Communication and meaning | 40\nPersonalization | 30\nUse in context | 30'
const criteriaList = criteria => `<ul class="vo-final-criteria-pills">${(criteria || []).map(c => `<li>${esc(c.label)}: ${esc(c.max_points)} points</li>`).join('')}</ul>`

export function renderFinals(items = []) {
  if (!items.length) {
    return `
      <section class="platform-detail-section vo-student-finals-section">
        <div class="vo-finals-hero-banner">
          <span class="vo-section-kicker">CAPSTONE EVALUATION</span>
          <h2>Final assessments</h2>
          <p>Your teacher will assign your final assessment here.</p>
        </div>
      </section>`
  }
  return `
    <section class="platform-detail-section vo-student-finals-section">
      <div class="vo-finals-hero-banner">
        <span class="vo-section-kicker">CAPSTONE EVALUATION</span>
        <h2>Final assessments</h2>
        <p>Listen → Repeat → Personalize → Use. Show how you use the language in a meaningful situation.</p>
      </div>
      <div class="vo-finals-student-stack">
        ${items.map(item => `
          <section class="vo-student-final-card" data-final-id="${esc(item.final_id)}">
            <details class="vo-final-criteria-drawer" open>
              <summary>Assessment criteria and supporting materials</summary>
              ${criteriaList(item.criteria)}
              ${(item.supporting_materials || []).map(m => `
                <p class="vo-supporting-material-row">
                  <span>${esc(m.title)}</span>
                  ${m.file_path ? `<button type="button" class="btn-studio-secondary" data-final-material="${esc(m.file_path)}">Open supporting file</button>` : ''}
                </p>`).join('')}
            </details>
            ${renderExerciseActivity({ ...item, feedback: null })}
            ${item.result_id && item.result_grade != null ? `
              <aside class="exercise-feedback vo-final-published-result">
                <span class="vo-badge vo-badge--teal">OFFICIAL RELEASED GRADE</span>
                <h3>Published result: ${esc(item.result_grade)} / 100</h3>
                <p>${esc(item.result_feedback)}</p>
                <ul class="vo-final-score-breakdown">
                  ${(item.criteria || []).map((c, i) => `<li>${esc(c.label)}: ${esc(item.result_scores?.[i])} / ${esc(c.max_points)}</li>`).join('')}
                </ul>
                <p class="teacher-meta">Result revision ${esc(item.result_revision)}</p>
              </aside>
            ` : '<p class="vo-final-pending-note">Your grade and assessment feedback will appear after your teacher publishes the results.</p>'}
          </section>
        `).join('')}
      </div>
      <p data-finals-file-status role="status"></p>
    </section>`
}

export function setupFinals(client, root = document) {
  setupExerciseForms(client, root)
  root.querySelectorAll('[data-final-material]').forEach(button => {
    if (button.dataset.bound) return
    button.dataset.bound = 'true'
    button.onclick = async () => {
      const tab = window.open('about:blank', '_blank')
      if (tab) tab.opener = null
      const status = root.querySelector('[data-finals-file-status]')
      button.disabled = true
      try {
        const result = await client.storage.from('materials').createSignedUrl(button.dataset.finalMaterial, 300)
        if (result.error || !result.data?.signedUrl) throw new Error('The supporting file is unavailable. Ask your teacher to check its assignment.')
        if (tab) tab.location.href = result.data.signedUrl
        else throw new Error('Allow this page to open the supporting file, then try again.')
      } catch (error) {
        if (tab) tab.close()
        if (status) status.textContent = error.message
      } finally {
        button.disabled = false
      }
    }
  })
}

export async function mountFinalsStudio(panel, client) {
  const [finals, exercises, students, materials, assignments, attempts, results] = await Promise.all([
    client.from('final_assessments').select('*').order('created_at', { ascending: false }),
    client.from('exercises').select('*').order('created_at', { ascending: false }).limit(300),
    client.from('profiles').select('id,name,language').order('name').limit(1000),
    client.from('materials').select('id,title,student_id,audience').order('title').limit(300),
    client.from('exercise_assignments').select('id,exercise_id,student_id,due_at,status').limit(2000),
    client.from('exercise_attempts').select('id,assignment_id,answers,exercise_snapshot,submitted_at').order('submitted_at', { ascending: false }).limit(300),
    client.from('final_results').select('*').order('revision', { ascending: false }).limit(1000)
  ])
  if ([finals, exercises, students, materials, assignments, attempts, results].some(r => r.error)) {
    panel.innerHTML = '<p role="alert">Final assessments could not load. Check your connection and the reviewed finals migration before continuing.</p>'
    return
  }
  const allFinals = finals.data || []
  const allExercises = exercises.data || []
  const allAssignments = assignments.data || []
  const finalExerciseIds = new Set(allFinals.map(f => f.exercise_id))
  const templates = allExercises.filter(e => !finalExerciseIds.has(e.id))
  const finalAttempts = (attempts.data || []).filter(a => finalExerciseIds.has(allAssignments.find(x => x.id === a.assignment_id)?.exercise_id))
  let current = null
  let saveRequest = crypto.randomUUID()
  let previewSignature = null

  const templateOptions = `<option value="">Choose an activity created in Exercise Studio</option>${templates.map(e => `<option value="${esc(e.id)}">${esc(e.title)} · ${esc(e.exercise_type)}</option>`).join('')}`

  panel.innerHTML = `
    <div class="vo-finals-studio">
      <div class="vo-finals-workflow-strip" aria-label="Final assessment workflow">
        <span class="vo-workflow-chip"><strong>01</strong> Select Activity Template</span>
        <span class="vo-workflow-chip"><strong>02</strong> Configure 100-pt Rubric</span>
        <span class="vo-workflow-chip"><strong>03</strong> Preview Student View</span>
        <span class="vo-workflow-chip"><strong>04</strong> Publish &amp; Assign</span>
        <span class="vo-workflow-chip"><strong>05</strong> Grade &amp; Release Results</span>
      </div>

      <div class="teacher-action-grid vo-finals-studio-grid">
        <article class="teacher-list-card vo-finals-library-card">
          <div class="vo-card-header-flex">
            <div>
              <span class="vo-section-kicker">ASSESSMENT REPOSITORY</span>
              <h3>Final assessments</h3>
            </div>
            <button type="button" class="btn-studio-secondary" data-new-final>New final</button>
          </div>
          <p>Build the communicative activity in Exercise Studio, then use it here with assessment criteria. This creates a separate saved final.</p>
          <ul class="vo-saved-finals-list">
            ${allFinals.map(f => {
              const ex = allExercises.find(e => e.id === f.exercise_id)
              const isAssigned = Boolean(f.published_at)
              return `
                <li class="vo-saved-final-item">
                  <button type="button" class="vo-saved-final-btn" data-open-final="${esc(f.id)}">${esc(ex?.title || 'Final assessment')} · ${isAssigned ? 'assigned' : 'draft'}</button>
                  <span class="vo-badge ${isAssigned ? 'vo-badge--teal' : 'vo-badge--amber'}">${isAssigned ? 'Assigned' : 'Draft'}</span>
                </li>`
            }).join('') || '<li class="teacher-meta">No final assessments saved yet.</li>'}
          </ul>
        </article>

        <form class="teacher-form-card vo-finals-editor-card" data-final-editor>
          <div class="vo-card-header-flex">
            <div>
              <span class="vo-section-kicker">BUILDER &amp; ASSIGNMENT</span>
              <h3>Create and assign a final</h3>
            </div>
          </div>

          <div class="vo-finals-form-grid">
            <label>Activity template<select name="source">${templateOptions}</select></label>
            <label>Final title<input name="title" maxlength="160" required placeholder="e.g. Final: A first meeting"></label>
          </div>

          <label>Instructions<textarea name="instructions" rows="3" maxlength="12000" required placeholder="Listen, repeat, personalize and use the language in this situation."></textarea></label>

          <div class="vo-finals-form-grid">
            <label>Criteria (one per line: criterion | points; total 100)<textarea name="criteria" rows="4">${esc(defaultCriteria)}</textarea></label>
            <label>Student files<select name="attachment_mode"><option value="optional">Optional supporting submission files</option><option value="required">At least one submission file required</option><option value="none">Answers only</option></select></label>
          </div>

          <fieldset class="vo-finals-fieldset">
            <legend>Supporting materials</legend>
            <p class="teacher-meta">Materials must already be shared with all selected students. Private files retain their existing access rules.</p>
            <div class="vo-finals-checkbox-grid">
              ${(materials.data || []).map(m => `
                <label class="vo-checkbox-tile">
                  <input type="checkbox" name="material_ids" value="${esc(m.id)}">
                  <span>${esc(m.title)} · ${m.audience === 'all' ? 'shared' : esc((students.data || []).find(s => s.id === m.student_id)?.name || 'individual student')}</span>
                </label>`).join('') || '<p class="teacher-meta">Add materials in Materials Studio when needed.</p>'}
            </div>
          </fieldset>

          <div class="teacher-inline-actions vo-finals-action-bar">
            <button type="button" class="btn-studio-secondary" data-save-final>Save final draft</button>
            <button type="button" class="btn-studio-secondary" data-preview-final>Preview final</button>
          </div>

          <div class="vo-finals-assign-zone">
            <label>Find students<input type="search" data-final-student-search placeholder="Filter students by name or language..."></label>
            <fieldset class="vo-finals-fieldset">
              <legend>Assign students</legend>
              <div class="vo-finals-checkbox-grid">
                ${(students.data || []).map(s => `<label class="vo-checkbox-tile" data-final-student-option data-search="${esc(`${s.name} ${s.language || ''}`.toLowerCase())}"><input type="checkbox" name="student_ids" value="${esc(s.id)}">${esc(s.name || 'Student')}</label>`).join('')}
              </div>
            </fieldset>
            <div class="vo-finals-form-grid">
              <label>Deadline (your local time)<input type="datetime-local" name="due_at"></label>
            </div>
            <label data-final-mixed-deadlines hidden><input type="checkbox" name="overwrite_deadlines">Apply the selected deadline (or no deadline) to every selected student, replacing their different deadlines.</label>
            <button type="button" class="btn-studio-primary" data-publish-final>Publish and assign final</button>
          </div>

          <p class="vo-studio-status-pill" data-final-status role="status" aria-live="polite"></p>
        </form>
      </div>

      <div class="vo-final-preview-stage" data-final-preview></div>

      <section class="teacher-list-card vo-finals-evaluation-deck">
        <div class="vo-card-header-flex">
          <div>
            <span class="vo-section-kicker">GRADING &amp; RELEASE</span>
            <h3>Evaluate submitted finals</h3>
          </div>
          <span class="vo-badge vo-badge--indigo">${finalAttempts.length} submission${finalAttempts.length === 1 ? '' : 's'}</span>
        </div>
        ${finalAttempts.length ? `<div class="vo-final-reviews-grid">${finalAttempts.map(attempt => {
          const assignment = allAssignments.find(a => a.id === attempt.assignment_id)
          const final = allFinals.find(f => f.exercise_id === assignment.exercise_id)
          const latest = (results.data || []).find(r => r.attempt_id === attempt.id)
          const statusBadge = latest?.published_at
            ? '<span class="vo-badge vo-badge--teal">Released</span>'
            : latest
              ? '<span class="vo-badge vo-badge--amber">Reviewed · Private Draft</span>'
              : '<span class="vo-badge vo-badge--coral">Submitted · Needs Review</span>'
          return `
            <form class="vo-final-review-card" data-final-review="${esc(attempt.id)}" data-saved-result="${latest && !latest.published_at ? esc(latest.id) : ''}">
              <div class="vo-card-header-flex">
                <h4>${esc((students.data || []).find(s => s.id === assignment.student_id)?.name || 'Student')} · ${esc(attempt.exercise_snapshot?.title || 'Final')}</h4>
                ${statusBadge}
              </div>
              <ol class="vo-final-answers-list">
                ${(attempt.answers || []).map(answer => `
                  <li>
                    <strong>${esc(attempt.exercise_snapshot?.questions?.[answer.index]?.prompt || `Question ${Number(answer.index) + 1}`)}</strong>
                    <p>${esc(answer.answer)}</p>
                  </li>`).join('')}
              </ol>
              ${renderAttachmentReview(assignment.id, attempt.id)}
              <div class="vo-final-rubric-inputs">
                ${(final.criteria || []).map((c, i) => `
                  <label>${esc(c.label)} (0–${esc(c.max_points)})<input name="score-${i}" type="number" min="0" max="${esc(c.max_points)}" step="0.01" required value="${esc(latest?.scores?.[i] ?? '')}"></label>
                `).join('')}
              </div>
              <label>Private assessment feedback<textarea name="feedback" required maxlength="12000" rows="3">${esc(latest?.feedback || '')}</textarea></label>
              <div class="teacher-inline-actions">
                <button type="submit" class="btn-studio-secondary">Save private assessment</button>
                <button type="button" class="btn-studio-primary" data-publish-final-result ${!latest || latest.published_at ? 'hidden' : ''}>Publish saved results to student</button>
              </div>
              <p class="vo-studio-status-pill" data-final-review-status role="status">${latest ? `Revision ${esc(latest.revision)} · ${esc(latest.grade)} / 100 · ${latest.published_at ? 'published' : 'private draft'}` : 'No grade saved. Feedback and grades stay private until explicitly published.'}</p>
            </form>`
        }).join('')}</div>` : '<p class="teacher-meta">No submitted finals yet.</p>'}
      </section>
    </div>`

  const form = panel.querySelector('[data-final-editor]')
  const status = form.querySelector('[data-final-status]')
  const checked = name => [...form.querySelectorAll(`[name="${name}"]:checked`)].map(i => i.value)
  const collect = () => {
    const source = allExercises.find(e => e.id === form.elements.source.value)
    if (!source) throw new Error('Choose an activity template. Create its questions in Exercise Studio first.')
    const draft = {
      title: form.elements.title.value.trim(),
      instructions: form.elements.instructions.value.trim(),
      language: source.language,
      level: source.level,
      objective: source.objective,
      exercise_type: source.exercise_type,
      questions: source.questions,
      attachment_mode: form.elements.attachment_mode.value
    }
    if (!draft.title || !draft.instructions) throw new Error('Add a final title and instructions.')
    return { draft, criteria: parseFinalCriteria(form.elements.criteria.value), materialIds: checked('material_ids') }
  }
  const run = async (button, work) => {
    button.disabled = true
    try {
      await work()
    } catch (error) {
      status.textContent = error.message
    } finally {
      button.disabled = false
    }
  }
  form.onsubmit = event => event.preventDefault()
  form.elements.source.onchange = () => {
    const e = allExercises.find(e => e.id === form.elements.source.value)
    if (e) {
      form.elements.title.value = e.title
      form.elements.instructions.value = e.instructions || 'Listen, repeat, personalize, and use the language in this situation.'
    }
    previewSignature = null
  }
  form.querySelector('[data-final-student-search]').oninput = event => {
    form.querySelectorAll('[data-final-student-option]').forEach(option => {
      option.hidden = !option.dataset.search.includes(event.target.value.toLowerCase())
    })
  }
  form.querySelector('[data-save-final]').onclick = event => run(event.currentTarget, async () => {
    const value = collect()
    const saved = await saveFinalDraft(client, { id: current?.id || null, ...value, requestId: saveRequest })
    current = { ...current, ...saved }
    status.textContent = 'Final draft saved. Preview this version before assigning it.'
  })
  form.querySelector('[data-preview-final]').onclick = event => run(event.currentTarget, async () => {
    const value = collect()
    previewSignature = JSON.stringify(value)
    panel.querySelector('[data-final-preview]').innerHTML = `
      <div class="teacher-form-card vo-final-preview-card">
        <span class="vo-section-kicker">STUDENT PREVIEW</span>
        ${criteriaList(value.criteria)}
        ${renderExerciseActivity(value.draft, { preview: true })}
      </div>`
    setupExerciseForms(client, panel.querySelector('[data-final-preview]'))
    status.textContent = 'Preview only. No student attempt has been saved.'
  })
  form.querySelector('[data-publish-final]').onclick = event => run(event.currentTarget, async () => {
    const value = collect()
    if (previewSignature !== JSON.stringify(value)) throw new Error('Preview this version before publishing the final.')
    if (form.dataset.mixedDeadlines === 'true' && !form.elements.overwrite_deadlines.checked) throw new Error('Confirm replacement of the different student deadlines.')
    const studentIds = checked('student_ids')
    if (!studentIds.length) throw new Error('Select at least one student.')
    if (!current?.published_at) {
      const saved = await saveFinalDraft(client, { id: current?.id || null, ...value, requestId: saveRequest })
      current = { ...current, ...saved }
    }
    const dueAt = form.elements.due_at.value ? new Date(form.elements.due_at.value).toISOString() : null
    const saved = await publishFinalAssessment(client, { finalId: current.id, studentIds, dueAt })
    await mountFinalsStudio(panel, client)
    panel.querySelector('[data-final-status]').textContent = `Final published with ${saved.assignment_count} confirmed assignment(s).`
  })
  panel.querySelector('[data-new-final]').onclick = () => mountFinalsStudio(panel, client)
  panel.querySelectorAll('[data-open-final]').forEach(button => {
    button.onclick = () => {
      current = allFinals.find(f => f.id === button.dataset.openFinal)
      const e = allExercises.find(e => e.id === current.exercise_id)
      form.reset()
      form.elements.source.innerHTML = templateOptions + `<option value="${esc(e.id)}">${esc(e.title)} (saved final)</option>`
      form.elements.source.value = e.id
      form.elements.title.value = e.title
      form.elements.instructions.value = e.instructions || ''
      form.elements.criteria.value = current.criteria.map(c => `${c.label} | ${c.max_points}`).join('\n')
      form.elements.attachment_mode.value = e.settings?.attachment_mode || 'optional'
      form.querySelectorAll('[name="material_ids"]').forEach(input => { input.checked = current.material_ids.includes(input.value) })
      const assigned = allAssignments.filter(a => a.exercise_id === e.id && a.status !== 'revoked')
      form.querySelectorAll('[name="student_ids"]').forEach(input => { input.checked = assigned.some(a => a.student_id === input.value) })
      const deadlines = [...new Set(assigned.map(a => a.due_at))]
      form.dataset.mixedDeadlines = String(deadlines.length > 1)
      form.querySelector('[data-final-mixed-deadlines]').hidden = deadlines.length <= 1
      if (deadlines.length === 1 && deadlines[0]) {
        const date = new Date(deadlines[0])
        form.elements.due_at.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      }
      const locked = Boolean(current.published_at || assigned.length)
      for (const name of ['source', 'title', 'instructions', 'criteria', 'attachment_mode']) form.elements[name].disabled = locked
      form.querySelectorAll('[name="material_ids"]').forEach(input => { input.disabled = locked })
      form.querySelector('[data-save-final]').disabled = locked
      saveRequest = current.request_id
      previewSignature = null
      panel.querySelector('[data-final-preview]').innerHTML = ''
      status.textContent = locked ? 'Assigned final content is frozen. You can preview it and update its student assignments.' : 'Draft loaded.'
    }
  })
  panel.querySelectorAll('[data-final-review]').forEach(review => {
    review.addEventListener('input', () => {
      review.dataset.savedResult = ''
      delete review.dataset.requestId
      review.querySelector('[data-publish-final-result]').hidden = true
    })
    review.onsubmit = async event => {
      event.preventDefault()
      const button = review.querySelector('[type="submit"]')
      const message = review.querySelector('[data-final-review-status]')
      button.disabled = true
      try {
        review.dataset.requestId ||= crypto.randomUUID()
        const scores = [...review.querySelectorAll('[name^="score-"]')].map(input => input.value === '' ? NaN : Number(input.value))
        const saved = await saveFinalResult(client, { attemptId: review.dataset.finalReview, scores, feedback: review.elements.feedback.value, requestId: review.dataset.requestId })
        review.dataset.savedResult = saved.id
        review.querySelector('[data-publish-final-result]').hidden = false
        message.textContent = `Private assessment revision ${saved.revision} saved: ${saved.grade} / 100. Publish when approved.`
      } catch (error) {
        message.textContent = error.message
      } finally {
        button.disabled = false
      }
    }
    review.querySelector('[data-publish-final-result]').onclick = async event => {
      const button = event.currentTarget
      button.disabled = true
      try {
        const saved = await publishFinalResult(client, review.dataset.savedResult)
        review.querySelector('[data-final-review-status]').textContent = `Results revision ${saved.revision} published: ${saved.grade} / 100.`
        button.hidden = true
      } catch (error) {
        review.querySelector('[data-final-review-status]').textContent = error.message
      } finally {
        button.disabled = false
      }
    }
  })
  setupAttachmentDownloads(client, panel)
}
