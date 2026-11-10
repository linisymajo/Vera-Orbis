import {
  newLearningObjective, validateLearningPlan, listLearningPlanVersions, listLearningObjectiveEvents,
  createLearningPlanVersion, saveLearningPlanVersion, approveLearningPlanVersion,
  setLearningObjectiveCompletion, generateLearningPlanDraft,
} from '../lib/learningPlans.js'
import { listAcademicDrafts, academicAIGenerationEnabled } from '../lib/academicAI.js'

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
const date = value => value ? new Date(value).toLocaleString() : ''
const disabledBeforeBusy = new WeakMap()
const busy = (element, value) => element.querySelectorAll('button,input,textarea,select').forEach(control => {
  if (value) {
    disabledBeforeBusy.set(control, control.disabled)
    control.disabled = true
  } else {
    control.disabled = disabledBeforeBusy.get(control) ?? false
    disabledBeforeBusy.delete(control)
  }
})

const STAGE_META = {
  Listen: { step: '01', theme: 'teal', hint: 'Input & model recognition' },
  Repeat: { step: '02', theme: 'indigo', hint: 'Guided form & rhythm practice' },
  Personalize: { step: '03', theme: 'violet', hint: 'Adapt to student context' },
  Use: { step: '04', theme: 'coral', hint: 'Spontaneous real-world mission' }
}

export async function mountLearningPlans(panel, client, { studentId = null, studentView = false } = {}) {
  const initialContent = panel.firstChild
  const auth = await client.auth.getUser()
  if (panel.firstChild !== initialContent) return
  if (auth.error || !auth.data?.user?.id) {
    panel.innerHTML = '<p role="alert">Sign in to view learning plans.</p>'
    return
  }
  const actorId = auth.data.user.id
  let selectedStudent = studentView ? actorId : studentId
  let selectedVersion = null
  let versions = []
  let students = []
  let aiDrafts = []
  const pendingRequests = new Map()
  const requestId = key => {
    if (!pendingRequests.has(key)) pendingRequests.set(key, crypto.randomUUID())
    return pendingRequests.get(key)
  }

  if (!studentView) {
    const result = await client.from('profiles').select('id,name,language,level').order('name').limit(1000)
    if (panel.firstChild !== initialContent) return
    if (result.error) {
      panel.innerHTML = '<p role="alert">Authorized students could not be loaded.</p>'
      return
    }
    students = result.data || []
  }

  panel.innerHTML = `
    <div class="vo-learning-plan-studio" data-learning-plan-workspace>
      <section class="teacher-form-card vo-plan-command-card">
        <div class="vo-plan-header-row">
          <div>
            <span class="vo-section-kicker">${studentView ? 'PERSONALIZED LANGUAGE ROADMAP' : 'CURRICULUM & ROADMAP ARCHITECT'}</span>
            <h3>${studentView ? 'My learning plan' : 'Learning plan versions'}</h3>
            <p>Listen -&gt; Repeat -&gt; Personalize -&gt; Use. Approved plans keep their original content. Changes begin in a new draft.</p>
          </div>
          <div class="vo-stage-legend" aria-hidden="true">
            <span class="vo-stage-pill vo-stage-pill--teal">01 Listen</span>
            <span class="vo-stage-pill vo-stage-pill--indigo">02 Repeat</span>
            <span class="vo-stage-pill vo-stage-pill--violet">03 Personalize</span>
            <span class="vo-stage-pill vo-stage-pill--coral">04 Use</span>
          </div>
        </div>
        ${studentView ? '' : `
          <div class="vo-plan-selector-bar">
            <label>Find student<input type="search" data-plan-search placeholder="Search name or language"></label>
            <label>Student<select data-plan-student><option value="">Choose a student</option>${students.map(s => `<option value="${esc(s.id)}" data-search="${esc((s.name + ' ' + (s.language || '')).toLowerCase())}">${esc(s.name)}  -  ${esc(s.language)}</option>`).join('')}</select></label>
            <div class="vo-plan-selector-actions">
              <button type="button" class="btn-studio-primary" data-plan-new>Create a plan draft</button>
              <button type="button" class="btn-studio-secondary" data-plan-reload>Reload saved plans</button>
            </div>
          </div>
        `}
        ${studentView ? `<div class="vo-plan-selector-actions"><button type="button" class="btn-studio-secondary" data-plan-reload>Reload saved plans</button></div>` : ''}
        <p role="status" aria-live="polite" class="vo-studio-status-pill" data-plan-status></p>
      </section>

      <section data-plan-ai></section>
      <nav class="vo-plan-versions-nav" data-plan-versions aria-label="Learning plan history"></nav>
      <section data-plan-editor></section>
    </div>
  `

  const workspace = panel.querySelector('[data-learning-plan-workspace]')
  const status = message => { workspace.querySelector('[data-plan-status]').textContent = message }

  async function refresh() {
    if (!selectedStudent) {
      versions = []
      render()
      return
    }
    const forStudent = selectedStudent
    const loaded = await listLearningPlanVersions(client, forStudent)
    if (forStudent !== selectedStudent) return
    versions = loaded
    if (!versions.some(v => v.id === selectedVersion)) {
      selectedVersion = versions.find(v => v.status === 'draft')?.id
        || [...versions].filter(v => v.status === 'approved').sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at))[0]?.id
        || null
    }
    render()
  }

  async function create(source, key) {
    const row = await createLearningPlanVersion(client, { studentId: selectedStudent, ...source, requestId: requestId(key) })
    selectedVersion = row.id
    pendingRequests.delete(key)
    await refresh()
    status(row.status === 'approved' ? 'This saved version is already approved.' : 'Plan draft saved. Review its objectives before approval.')
  }

  function render() {
    workspace.querySelector('[data-plan-new]')?.toggleAttribute('disabled', !selectedStudent)
    const list = workspace.querySelector('[data-plan-versions]')
    list.innerHTML = versions.map(v => `
      <button type="button" class="vo-version-pill ${v.id === selectedVersion ? 'is-active' : ''} vo-version-pill--${esc(v.status)}" data-plan-version="${esc(v.id)}" aria-pressed="${v.id === selectedVersion}" aria-current="${v.id === selectedVersion}">Version ${v.version_number}  -  ${esc(v.status)}  -  ${esc(v.content.title)}</button>
    `).join('') || '<p class="teacher-meta">No saved learning plan versions.</p>'
    list.querySelectorAll('[data-plan-version]').forEach(button => {
      button.onclick = () => {
        selectedVersion = button.dataset.planVersion
        render()
      }
    })
    renderEditor()
  }

  function renderEditor(override = null) {
    const target = workspace.querySelector('[data-plan-editor]')
    const version = versions.find(v => v.id === selectedVersion)
    if (!version) {
      target.innerHTML = `
        <div class="vo-plan-empty-state">
          <strong>No learning plan version open</strong>
          <p>Select a student and create a draft, or open an approved version.</p>
        </div>`
      return
    }
    const content = override || structuredClone(version.content)
    if (version.status === 'draft' && !studentView) {
      target.innerHTML = `
        <form class="teacher-form-card vo-plan-draft-editor" data-plan-edit>
          <div class="vo-plan-editor-header">
            <div>
              <span class="vo-badge vo-badge--amber">DRAFT WORKSPACE</span>
              <h3>Edit version ${version.version_number}</h3>
              <p>This draft is private until you approve it.</p>
            </div>
          </div>
          <div class="vo-plan-meta-grid">
            <label>Title<input name="title" maxlength="160" value="${esc(content.title)}"></label>
            <label>Language<input name="language" maxlength="80" value="${esc(content.language)}"></label>
            <label>Level<input name="level" maxlength="40" value="${esc(content.level)}"></label>
          </div>
          <label>Plan summary<textarea name="summary" rows="3" maxlength="3000">${esc(content.summary)}</textarea></label>

          <div class="vo-plan-objectives-stack">
            ${content.objectives.map((o, i) => `
              <fieldset class="vo-plan-objective-card" data-plan-objective="${esc(o.id)}">
                <legend>Objective ${i + 1}</legend>
                <div class="vo-plan-objective-top">
                  <label>Communicative objective<input name="objective-${i}" maxlength="300" value="${esc(o.title)}"></label>
                  <label>How we will know it is complete<textarea name="criteria-${i}" rows="2" maxlength="1000">${esc(o.success_criteria)}</textarea></label>
                </div>
                <div class="vo-plan-stage-grid">
                  ${o.steps.map((step, n) => {
                    const meta = STAGE_META[step.stage] || { step: `0${n + 1}`, theme: 'indigo', hint: '' }
                    return `
                      <div class="vo-plan-stage-card vo-plan-stage-card--${meta.theme}">
                        <div class="vo-plan-stage-badge" aria-hidden="true">${meta.step} · ${esc(meta.hint)}</div>
                        <label>${esc(step.stage)}<textarea name="step-${i}-${n}" rows="3" maxlength="2000">${esc(step.activity)}</textarea></label>
                      </div>`
                  }).join('')}
                </div>
                <div class="vo-plan-objective-footer">
                  <button type="button" class="btn-studio-ghost" data-remove-objective="${i}">Remove objective</button>
                </div>
              </fieldset>
            `).join('')}
          </div>

          <div class="vo-plan-editor-actions">
            <button type="button" class="btn-studio-secondary" data-add-objective ${content.objectives.length >= 10 ? 'disabled' : ''}>Add objective</button>
            <button type="submit" class="btn-studio-secondary" value="save">Save draft</button>
            <button type="submit" class="btn-studio-primary" value="approve">Save and approve plan</button>
          </div>
          <p data-plan-edit-status role="status"></p>
        </form>`
      const form = target.querySelector('form')
      const read = () => ({
        ...content,
        ...Object.fromEntries(['title', 'language', 'level', 'summary'].map(k => [k, form.elements[k].value])),
        objectives: content.objectives.map((o, i) => ({
          ...o,
          title: form.elements['objective-' + i].value,
          success_criteria: form.elements['criteria-' + i].value,
          steps: o.steps.map((s, n) => ({ ...s, activity: form.elements['step-' + i + '-' + n].value }))
        }))
      })
      form.querySelector('[data-add-objective]').onclick = () => {
        const edited = read()
        edited.objectives.push(newLearningObjective())
        renderEditor(edited)
      }
      form.querySelectorAll('[data-remove-objective]').forEach(button => {
        button.onclick = () => {
          const edited = read()
          edited.objectives.splice(Number(button.dataset.removeObjective), 1)
          renderEditor(edited)
        }
      })
      form.onsubmit = async event => {
        event.preventDefault()
        const approve = event.submitter?.value === 'approve'
        try {
          const edited = validateLearningPlan(read(), { complete: approve })
          busy(form, true)
          const saved = await saveLearningPlanVersion(client, { id: version.id, revision: version.revision, content: edited })
          version.revision = saved.revision
          version.content = saved.content
          if (approve) await approveLearningPlanVersion(client, { id: version.id, revision: saved.revision })
          await refresh()
          status(approve ? 'Learning plan approved and available to the student.' : 'Learning plan draft saved.')
        } catch (error) {
          form.querySelector('[data-plan-edit-status]').textContent = error.message
          busy(form, false)
        }
      }
      return
    }

    const totalObjectives = content.objectives.length || 1
    const completedCount = content.objectives.filter(o => (version.progress || []).find(p => p.objective_id === o.id)?.completed).length
    const progressPct = Math.round((completedCount / totalObjectives) * 100)

    target.innerHTML = `
      <article class="teacher-form-card vo-plan-approved-roadmap">
        <div class="vo-plan-approved-header">
          <div>
            <span class="vo-badge vo-badge--teal">APPROVED ROADMAP · VERSION ${version.version_number}</span>
            <h3>${esc(content.title)}  -  Version ${version.version_number}</h3>
            <p class="teacher-meta">${esc(content.language)}  -  ${esc(content.level)}  -  Approved ${esc(date(version.approved_at))}</p>
          </div>
          <div class="vo-plan-progress-pill">
            <strong>${completedCount} / ${content.objectives.length} objectives completed (${progressPct}%)</strong>
            <div class="vo-plan-progress-bar"><span style="width:${progressPct}%"></span></div>
          </div>
        </div>
        <p class="vo-plan-summary-lead">${esc(content.summary)}</p>

        <div class="vo-plan-objectives-stack">
          ${content.objectives.map((o, idx) => {
            const progress = (version.progress || []).find(p => p.objective_id === o.id)
            return `
              <section class="teacher-form-card vo-plan-milestone-card ${progress?.completed ? 'is-completed' : ''}">
                <div class="vo-plan-milestone-head">
                  <div>
                    <span class="vo-section-kicker">MILESTONE 0${idx + 1}</span>
                    <h4>${esc(o.title)}</h4>
                    <p>${esc(o.success_criteria)}</p>
                  </div>
                  <span class="vo-badge ${progress?.completed ? 'vo-badge--teal' : 'vo-badge--indigo'}">${progress?.completed ? 'Completed' : 'In Progress'}</span>
                </div>
                <ol class="vo-plan-stage-grid vo-plan-stage-list">
                  ${o.steps.map((step, n) => {
                    const meta = STAGE_META[step.stage] || { step: `0${n + 1}`, theme: 'indigo' }
                    return `
                      <li class="vo-plan-stage-card vo-plan-stage-card--${meta.theme}">
                        <strong>${esc(step.stage)}</strong>
                        <p>${esc(step.activity)}</p>
                      </li>`
                  }).join('')}
                </ol>
                <div class="vo-plan-milestone-footer">
                  <label class="vo-plan-complete-toggle"><input type="checkbox" data-plan-complete="${esc(o.id)}" ${progress?.completed ? 'checked' : ''}>${studentView ? 'Mark this objective complete' : 'Record objective completion'}</label>
                  ${progress ? `<p class="teacher-meta">Last recorded ${esc(date(progress.updated_at))}${progress.updated_by === actorId ? ' by you' : ''}.</p>` : ''}
                </div>
              </section>`
          }).join('')}
        </div>

        <div class="vo-plan-editor-actions">
          ${studentView ? '' : '<button type="button" class="btn-studio-primary" data-plan-copy>Create a new draft from this version</button>'}
          <button type="button" class="btn-studio-secondary" data-plan-audit>View recent completion history</button>
        </div>
        <div class="vo-plan-events-box" data-plan-events></div>
      </article>`

    target.querySelector('[data-plan-copy]')?.addEventListener('click', async event => {
      const button = event.currentTarget
      button.disabled = true
      try {
        await create({ baseVersionId: version.id }, 'copy:' + version.id)
      } catch (error) {
        status(error.message)
        button.disabled = false
      }
    })
    target.querySelectorAll('[data-plan-complete]').forEach(checkbox => {
      checkbox.onchange = async () => {
        const objectiveId = checkbox.dataset.planComplete
        const previous = (version.progress || []).find(p => p.objective_id === objectiveId)
        const completed = checkbox.checked
        const key = 'complete:' + version.id + ':' + objectiveId + ':' + completed
        checkbox.disabled = true
        try {
          await setLearningObjectiveCompletion(client, { versionId: version.id, objectiveId, revision: previous?.revision || 0, completed, requestId: requestId(key) })
          pendingRequests.delete(key)
          await refresh()
          status('Objective completion saved.')
        } catch (error) {
          checkbox.checked = Boolean(previous?.completed)
          checkbox.disabled = false
          status(error.message)
        }
      }
    })
    target.querySelector('[data-plan-audit]').onclick = async event => {
      const button = event.currentTarget
      button.disabled = true
      try {
        const events = await listLearningObjectiveEvents(client, version.id)
        if (selectedVersion !== version.id) return
        target.querySelector('[data-plan-events]').innerHTML = events.length
          ? '<ul class="vo-audit-timeline">' + events.map(e => `<li>${esc(content.objectives.find(o => o.id === e.objective_id)?.title || 'Objective')}: ${e.completed ? 'completed' : 'reopened'}  -  ${esc(date(e.created_at))}${e.actor_id === actorId ? '  -  you' : ''}</li>`).join('') + '</ul>'
          : '<p class="teacher-meta">No completion changes recorded.</p>'
      } catch (error) {
        status(error.message)
      } finally {
        button.disabled = false
      }
    }
  }

  async function renderAI() {
    const target = workspace.querySelector('[data-plan-ai]')
    if (studentView || !selectedStudent) {
      target.innerHTML = ''
      return
    }
    const forStudent = selectedStudent
    let error = ''
    try {
      aiDrafts = (await listAcademicDrafts(client)).filter(d => d.student_id === forStudent && d.kind === 'learning_plan' && d.status !== 'rejected')
    } catch (e) {
      aiDrafts = []
      error = e.message
    }
    if (forStudent !== selectedStudent) return
    target.innerHTML = `
      <section class="teacher-form-card vo-plan-ai-card">
        <div class="vo-plan-header-row">
          <div>
            <span class="vo-section-kicker">AI LEARNING ARCHITECT</span>
            <h3>Prepare a learning draft with AI</h3>
            <p>Uses the student's authorized academic data and current approved plan. Consent and a configured server provider are required. Generation saves an AI draft; importing a plan version is a separate action.</p>
          </div>
        </div>
        <form data-plan-generate>
          <label>Learning goals and requirements<textarea name="brief" rows="2" maxlength="2000" required placeholder="Describe communicative goals, professional context, or upcoming milestones..."></textarea></label>
          <div class="vo-plan-selector-actions">
            <button type="submit" class="btn-studio-secondary" ${academicAIGenerationEnabled() ? '' : 'disabled'}>Generate AI learning draft</button>
          </div>
          <p data-plan-ai-status role="status" class="teacher-meta">${esc(error || (!academicAIGenerationEnabled() ? 'AI generation is disabled until the server provider and student consent settings are configured.' : ''))}</p>
        </form>
        <div class="vo-ai-draft-list" data-plan-ai-list>
          ${aiDrafts.map(d => `
            <details class="vo-ai-draft-item">
              <summary>${esc(d.content.title)}  -  AI ${esc(d.status)}</summary>
              <p>${esc(d.content.objective)}</p>
              <ol>${d.content.steps.map(s => `<li>${esc(s.stage)}: ${esc(s.activity)}</li>`).join('')}</ol>
              <button type="button" class="btn-studio-primary" data-import-learning-ai="${esc(d.id)}">Import into a new plan draft</button>
            </details>`).join('')}
        </div>
      </section>`
    const form = target.querySelector('form')
    form.onsubmit = async event => {
      event.preventDefault()
      if (!academicAIGenerationEnabled()) {
        form.querySelector('[data-plan-ai-status]').textContent = 'AI generation is not configured.'
        return
      }
      busy(form, true)
      try {
        await generateLearningPlanDraft(client, { studentId: selectedStudent, brief: form.elements.brief.value })
        await renderAI()
        status('AI draft saved for review. Import it explicitly to create a plan version.')
      } catch (e) {
        form.querySelector('[data-plan-ai-status]').textContent = e.message
        busy(form, false)
      }
    }
    target.querySelectorAll('[data-import-learning-ai]').forEach(button => {
      button.onclick = async () => {
        button.disabled = true
        try {
          await create({ sourceAIDraftId: button.dataset.importLearningAi }, 'ai:' + button.dataset.importLearningAi)
        } catch (e) {
          status(e.message)
          button.disabled = false
        }
      }
    })
  }

  if (!studentView) {
    const select = workspace.querySelector('[data-plan-student]')
    select.value = selectedStudent || ''
    workspace.querySelector('[data-plan-search]').oninput = event => {
      for (const option of select.options) {
        if (option.value) option.hidden = !option.dataset.search.includes(event.target.value.toLowerCase())
      }
    }
    select.onchange = async () => {
      selectedStudent = select.value
      selectedVersion = null
      status('')
      try {
        await refresh()
        await renderAI()
      } catch (e) {
        status(e.message)
      }
    }
    workspace.querySelector('[data-plan-new]').onclick = async event => {
      const button = event.currentTarget
      button.disabled = true
      try {
        await create({}, 'blank:' + selectedStudent)
      } catch (e) {
        status(e.message)
        button.disabled = false
      }
    }
  }
  workspace.querySelector('[data-plan-reload]').onclick = async () => {
    try {
      await refresh()
      await renderAI()
      status('Saved plans reloaded.')
    } catch (e) {
      status(e.message)
    }
  }
  try {
    await refresh()
    await renderAI()
  } catch (e) {
    status(e.message)
  }
}
