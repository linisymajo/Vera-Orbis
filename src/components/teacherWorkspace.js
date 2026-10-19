import { supabase } from '../lib/supabase.js'
import { getCurrentUser } from '../lib/auth.js'

const MODULES = [
  ['overview', 'Overview'],
  ['academic', 'Academic'],
  ['exercise-studio', 'Exercise Studio'],
  ['calendar', 'Calendar'],
  ['finance', 'Finance'],
  ['leads', 'Leads'],
  ['culture', 'Culture']
]

export function renderTeacherWorkspace() {
  return `
    <section class="teacher-workspace" aria-labelledby="teacher-workspace-title">
      <div class="teacher-section-heading">
        <div>
          <p class="teacher-label">TEACHER WORKSPACE</p>
          <h2 id="teacher-workspace-title">Teach with intention.</h2>
          <p class="teacher-section-description">Plan learning, review evidence and keep every student moving forward.</p>
        </div>
      </div>
      <nav class="teacher-module-nav" aria-label="Teacher modules">
        ${MODULES.map(([id, label], index) => `<button type="button" class="teacher-module-tab${index === 0 ? ' is-active' : ''}" data-teacher-module="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}
      </nav>
      <div id="teacher-workspace-panel" class="teacher-workspace-panel" aria-live="polite">
        <div class="teacher-loading">Loading your teaching overview...</div>
      </div>
    </section>
  `
}

export function setupTeacherWorkspace() {
  const nav = document.querySelector('.teacher-module-nav')
  if (!nav) return

  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-teacher-module]')
    if (!button) return
    nav.querySelectorAll('[data-teacher-module]').forEach((item) => {
      const active = item === button
      item.classList.toggle('is-active', active)
      item.setAttribute('aria-selected', String(active))
    })
    loadTeacherModule(button.dataset.teacherModule)
  })

  loadTeacherModule('overview')
}

export async function loadTeacherModule(module) {
  const panel = document.querySelector('#teacher-workspace-panel')
  if (!panel) return
  panel.innerHTML = '<div class="teacher-loading">Loading module...</div>'
  const loaders = {
    overview: loadOverview,
    academic: loadAcademic,
    'exercise-studio': loadExerciseStudio,
    calendar: loadCalendar,
    finance: loadFinance,
    leads: loadLeads,
    culture: loadCulture
  }
  await (loaders[module] || loadOverview)(panel)
}

async function loadOverview(panel) {
  const [students, materials, challenges, submissions] = await Promise.all([
    supabase.from('profiles').select('id, progress, lessons_completed, total_lessons'),
    supabase.from('materials').select('id, title, type, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('weekly_challenges').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('challenge_submissions').select('id, status, created_at').order('created_at', { ascending: false }).limit(20)
  ])

  if (students.error || materials.error || challenges.error || submissions.error) {
    renderError(panel, 'Some teaching data could not be loaded. Check your Supabase policies and try again.')
    return
  }

  panel.innerHTML = `
    <div class="teacher-metric-grid">
      ${metricCard('Students', students.data?.length || 0, 'active profiles')}
      ${metricCard('Average progress', `${average((students.data || []).map((item) => item.progress))}%`, 'across visible students')}
      ${metricCard('Materials', materials.data?.length || 0, 'recent resources')}
      ${metricCard('To review', (submissions.data || []).filter((item) => item.status !== 'reviewed').length, 'challenge submissions')}
    </div>
    <div class="teacher-workspace-columns">
      ${listCard('Recent materials', materials.data, (item) => `${item.title || 'Untitled material'} · ${item.type || 'resource'}`)}
      ${listCard('Active challenges', challenges.data, (item) => `${item.title || 'Untitled challenge'} · ${item.status || 'draft'}`)}
    </div>
  `
}

async function loadAcademic(panel) {
  const [materials, challenges, plans, courses] = await Promise.all([
    supabase.from('materials').select('id, title, type, language, level, student_id, audience, file_path, created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('weekly_challenges').select('id, title, status, student_id, end_date, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('profiles').select('id, name, current_module, next_step, goal').not('next_step', 'is', null).limit(20),
    supabase.from('courses').select('id, name, language, level, status').order('created_at', { ascending: false }).limit(20)
  ])

  if (materials.error || challenges.error || plans.error) {
    renderError(panel, 'Academic data could not be loaded. Verify the existing table policies.')
    return
  }

  const coursesList = courses.error ? [] : (courses.data || [])

  panel.innerHTML = `
    <div class="teacher-action-grid">
      ${materialForm()}
      ${challengeForm()}
      ${courseForm()}
    </div>
    <div class="teacher-workspace-columns">
      ${materialsCard(materials.data)}
      ${listCard('Challenges', challenges.data, (item) => `${item.title || 'Untitled'} · ${item.status || 'draft'}`)}
    </div>
    ${listCard('Courses', coursesList, (item) => `${item.name} · ${item.language}${item.level ? ` · ${item.level}` : ''} · ${item.status}`)}
    <div class="teacher-inline-note"><strong>Work plans:</strong> ${plans.data?.length || 0} visible plan(s). Open a student profile to update the next step and private notes.</div>
  `

  document.querySelector('#teacher-material-form')?.addEventListener('submit', (event) => saveAcademicRecord(event, 'materials', panel))
  document.querySelector('#teacher-challenge-form')?.addEventListener('submit', (event) => saveAcademicRecord(event, 'weekly_challenges', panel))
  document.querySelector('#teacher-course-form')?.addEventListener('submit', (event) => saveCourse(event, panel))

  // Material file view button
  panel.querySelectorAll('[data-view-material-file]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      const filePath = btn.dataset.viewMaterialFile
      if (!filePath) return
      try {
        const cleanPath = String(filePath).trim().replace(/^\/+/, '')
        const { data, error } = await supabase.storage.from('materials').createSignedUrl(cleanPath, 3600)
        if (error || !data?.signedUrl) {
          alert('Could not open file. Check storage permissions.')
          return
        }
        window.open(data.signedUrl, '_blank')
      } catch (err) {
        alert('Could not open material file.')
      }
    })
  })

  // Material delete button
  panel.querySelectorAll('[data-delete-material-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      const materialId = btn.dataset.deleteMaterialId
      if (!materialId) return
      const filePath = btn.dataset.materialFilepath
      const title = btn.dataset.materialTitle || 'este material'

      const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el material "${title}"?\nEsta acción no se puede deshacer.`)
      if (!confirmed) return

      btn.disabled = true
      const origText = btn.textContent
      btn.textContent = 'Eliminando...'

      try {
        if (filePath) {
          const cleanPath = String(filePath).trim().replace(/^\/+/, '')
          const { count, error: countErr } = await supabase
            .from('materials')
            .select('id', { count: 'exact', head: true })
            .eq('file_path', cleanPath)
            .neq('id', materialId)

          if (!countErr && (count === 0 || count == null)) {
            const { error: storageErr } = await supabase.storage.from('materials').remove([cleanPath])
            if (storageErr) {
              console.warn('Storage file deletion warning:', storageErr.message || storageErr)
            }
          }
        }

        const { error: deleteErr } = await supabase.from('materials').delete().eq('id', materialId)
        if (deleteErr) throw deleteErr

        loadAcademic(panel)
      } catch (err) {
        console.error('Delete material error:', err)
        alert(`No se pudo eliminar el material: ${err.message || 'Error desconocido'}`)
        btn.disabled = false
        btn.textContent = origText
      }
    })
  })
}

function materialsCard(items = []) {
  return `<article class="teacher-list-card" id="teacher-materials-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h3 style="margin:0;">Materials (${items?.length || 0})</h3>
    </div>
    ${items?.length ? `
      <ul style="margin:0;">
        ${items.map((item) => `
          <li style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--vo-border);flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong>${escapeHtml(item.title || 'Untitled')}</strong>
                <span class="teacher-badge ${item.audience === 'all' ? 'badge-global' : 'badge-individual'}">${item.audience === 'all' ? 'Global' : 'Individual'}</span>
                <span class="teacher-badge badge-draft">${escapeHtml((item.type || 'resource').toUpperCase())}</span>
              </div>
              <small style="color:var(--vo-muted);display:block;margin-top:2px;">
                ${item.audience === 'all' ? 'Shared with all students' : 'Assigned to individual student'}
                ${item.description ? ` · ${escapeHtml(item.description)}` : ''}
              </small>
            </div>
            <div class="teacher-inline-actions">
              ${item.file_path ? `<button type="button" class="teacher-secondary-button" data-view-material-file="${escapeHtml(item.file_path)}" style="padding:4px 10px;font-size:11px;">Open file ↗</button>` : ''}
              <button type="button" class="teacher-danger-button" data-delete-material-id="${escapeHtml(item.id)}" data-material-filepath="${escapeHtml(item.file_path || '')}" data-material-title="${escapeHtml(item.title || '')}" style="padding:4px 10px;font-size:11px;">Eliminar</button>
            </div>
          </li>
        `).join('')}
      </ul>
    ` : '<p class="teacher-muted">No materials created yet.</p>'}
  </article>`
}

async function loadExerciseStudio(panel) {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, title, language, level, exercise_type, status, objective, questions, instructions')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    renderMigrationState(panel, 'Exercise Studio', 'Apply the reviewed exercise migration before creating interactive activities.')
    return
  }
  panel.innerHTML = `
    <div class="teacher-action-grid">
      <form class="teacher-form-card" id="teacher-exercise-form">
        <div><p class="teacher-label">EXERCISE STUDIO</p><h3>Create an editable activity</h3></div>
        <label>Title<input name="title" required maxlength="160"></label>
        <label>Type<select name="exercise_type">
          <option value="multiple_choice">Multiple choice</option><option value="true_false">True or false</option>
          <option value="fill_blank">Fill in the blank</option><option value="matching">Matching</option>
          <option value="ordering">Ordering</option><option value="reading">Reading</option>
          <option value="listening">Listening</option><option value="image_vocabulary">Image vocabulary</option>
          <option value="open_question">Open question</option><option value="writing">Writing</option>
          <option value="conversation">Conversation</option><option value="pronunciation">Pronunciation</option>
        </select></label>
        <label>Language<input name="language" required maxlength="80"></label><label>Level<input name="level" maxlength="40"></label>
        <label>Objective<input name="objective" maxlength="240"></label>
        <label>Instructions<textarea name="instructions" rows="3"></textarea></label>
        <label>Questions JSON <small>Use an array of objects; answers are kept private from students.</small>
          <textarea name="questions" rows="7" placeholder='[{"prompt":"Choose the correct answer","options":["A","B"],"answer":"A","explanation":"..."}]' required></textarea></label>
        <button class="teacher-primary-button" type="submit">Save draft</button><p class="teacher-form-status" data-form-status></p>
      </form>
      ${exerciseList(data)}
      <form class="teacher-form-card" id="teacher-exercise-assignment-form">
        <div><p class="teacher-label">ASSIGN</p><h3>Assign a published exercise</h3></div>
        <label>Exercise UUID<input name="exercise_id" required></label><label>Student UUID<input name="student_id" required></label>
        <button class="teacher-primary-button" type="submit">Assign exercise</button><p class="teacher-form-status" data-form-status></p>
      </form>
    </div>
    <div class="teacher-inline-note">Drafts are editable data for the next revision. Publishing and assignment should be an explicit teacher action after preview.</div>
  `
  document.querySelector('#teacher-exercise-form')?.addEventListener('submit', saveExercise)
  document.querySelector('#teacher-exercise-assignment-form')?.addEventListener('submit', saveExerciseAssignment)
  panel.querySelectorAll?.('[data-exercise-action]')?.forEach((button) => button.addEventListener('click', () => updateExercise(button.dataset.exerciseAction, button.dataset.exerciseId)))
}

function exerciseList(items = []) {
  return `<article class="teacher-list-card"><h3>Your exercises</h3>${items.length ? `<ul>${items.map((item) => `<li><span>${escapeHtml(item.title)} · ${escapeHtml(item.exercise_type)} · ${escapeHtml(item.status)}</span><span class="teacher-inline-actions"><button type="button" data-exercise-action="${item.status === 'published' ? 'archive' : 'publish'}" data-exercise-id="${escapeHtml(item.id)}">${item.status === 'published' ? 'Archive' : 'Publish'}</button><button type="button" data-exercise-action="duplicate" data-exercise-id="${escapeHtml(item.id)}">Duplicate</button></span></li>`).join('')}</ul>` : '<p class="teacher-muted">Nothing here yet.</p>'}</article>`
}

async function updateExercise(action, id) {
  const user = await getCurrentUser()
  if (!user?.id) return
  const { data: exercise, error: readError } = await supabase.from('exercises').select('title, instructions, language, level, objective, exercise_type, questions, settings, status').eq('id', id).eq('teacher_id', user.id).single()
  if (readError) return
  const payload = action === 'duplicate'
    ? { ...exercise, title: `${exercise.title} (copy)`, status: 'draft', teacher_id: user.id }
    : { status: action === 'publish' ? 'published' : 'archived' }
  if (action === 'duplicate') {
    await supabase.from('exercises').insert(payload)
  } else {
    await supabase.from('exercises').update(payload).eq('id', id).eq('teacher_id', user.id)
  }
  loadTeacherModule('exercise-studio')
}

async function saveExerciseAssignment(event) {
  event.preventDefault()
  const form = event.currentTarget
  const values = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'exercise_assignments', {
    teacher_id: user?.id, exercise_id: values.exercise_id.trim(), student_id: values.student_id.trim(), status: 'assigned'
  }, 'Exercise assigned.')
}

async function saveExercise(event) {
  event.preventDefault()
  const form = event.currentTarget
  const values = Object.fromEntries(new FormData(form).entries())
  const status = form.querySelector('[data-form-status]')
  let questions
  try {
    questions = JSON.parse(values.questions)
    if (!Array.isArray(questions)) throw new Error('Questions must be an array.')
  } catch (error) {
    status.textContent = 'Questions must be valid JSON in an array.'
    return
  }
  const user = await getCurrentUser()
  await saveFormRecord(form, status, 'exercises', {
    teacher_id: user?.id, title: values.title.trim(), instructions: values.instructions.trim() || null,
    language: values.language.trim(), level: values.level.trim() || null, objective: values.objective.trim() || null,
    exercise_type: values.exercise_type, questions, settings: { max_attempts: 1 }, status: 'draft'
  }, 'Exercise draft saved.')
}

function materialForm() {
  return `<form class="teacher-form-card" id="teacher-material-form">
    <div><p class="teacher-label">MATERIALS</p><h3>Create a resource</h3></div>
    <label>Title<input name="title" required maxlength="160"></label>
    <label>Type<select name="type"><option value="class">Class</option><option value="practice">Practice</option><option value="vocabulary">Vocabulary</option><option value="resource">Resource</option></select></label>
    <label>Student UUID or leave blank for all<input name="student_id"></label>
    <label>Description<textarea name="description" rows="3"></textarea></label>
    <label>Private file (PDF, image, audio or video; 10 MB max)<input name="file" type="file" accept=".pdf,image/*,audio/*,video/*"></label>
    <button class="teacher-primary-button" type="submit">Save material</button><p class="teacher-form-status" data-form-status></p>
  </form>`
}

function challengeForm() {
  return `<form class="teacher-form-card" id="teacher-challenge-form">
    <div><p class="teacher-label">ACTIVITIES</p><h3>Create a challenge</h3></div>
    <label>Title<input name="title" required maxlength="160"></label>
    <label>Student UUID or leave blank for all<input name="student_id"></label>
    <label>Instructions<textarea name="instructions" rows="3"></textarea></label>
    <label>Due date<input type="date" name="end_date"></label>
    <button class="teacher-primary-button" type="submit">Publish challenge</button><p class="teacher-form-status" data-form-status></p>
  </form>`
}

function courseForm() {
  return `<form class="teacher-form-card" id="teacher-course-form">
    <div><p class="teacher-label">COURSES</p><h3>Create a course</h3></div>
    <label>Name<input name="name" required maxlength="160"></label>
    <label>Language<input name="language" required maxlength="80"></label>
    <label>Level<input name="level" maxlength="40"></label>
    <label>Description<textarea name="description" rows="3"></textarea></label>
    <button class="teacher-primary-button" type="submit">Save course</button><p class="teacher-form-status" data-form-status></p>
  </form>`
}

async function saveCourse(event, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const values = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'courses', {
    teacher_id: user?.id, name: values.name.trim(), language: values.language.trim(),
    level: values.level.trim() || null, description: values.description.trim() || null, status: 'draft'
  }, 'Course saved.')
  if (panel) loadAcademic(panel)
}

async function saveAcademicRecord(event, table, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const status = form.querySelector('[data-form-status]')
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  if (!user?.id) {
    status.textContent = 'Your session has expired. Please log in again.'
    return
  }

  let payload = table === 'materials'
    ? { teacher_id: user.id, title: data.title.trim(), type: data.type, student_id: data.student_id.trim() || null, audience: data.student_id.trim() ? 'student' : 'all', description: data.description.trim() || null }
    : { title: data.title.trim(), student_id: data.student_id.trim() || null, audience: data.student_id.trim() ? 'student' : 'all', instructions: data.instructions.trim() || null, end_date: data.end_date || null, status: 'active' }

  status.textContent = 'Saving...'
  let uploadedFilePath = null
  if (table === 'materials') {
    const file = form.elements.file.files[0]
    if (file) {
      const allowed = file.type === 'application/pdf' || file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')
      if (!allowed || file.size > 10 * 1024 * 1024) {
        status.textContent = 'Choose a supported file smaller than 10 MB.'
        return
      }
      const filePath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const upload = await supabase.storage.from('materials').upload(filePath, file, { contentType: file.type, upsert: false })
      if (upload.error) {
        status.textContent = formatSupabaseError(upload.error, 'The file could not be uploaded.')
        return
      }
      uploadedFilePath = filePath
      payload = { ...payload, file_path: filePath }
    }
  }

  const { error } = await supabase.from(table).insert(payload)
  if (error) {
    if (uploadedFilePath) await supabase.storage.from('materials').remove([uploadedFilePath])
    status.textContent = formatSupabaseError(error, 'Could not save this item. Check the table policy and required fields.')
    return
  }
  status.textContent = 'Saved.'
  form.reset()
  if (panel && table === 'materials') loadAcademic(panel)
}

async function loadCalendar(panel) {
  const [classesRes, participantsRes, studentsRes] = await Promise.all([
    supabase.from('classes').select('id, title, starts_at, duration_minutes, modality, status, language, level, notes').order('starts_at', { ascending: true }).limit(50),
    supabase.from('class_participants').select('class_id, student_id'),
    supabase.from('profiles').select('id, name').order('name')
  ])

  if (classesRes.error) {
    console.warn('Calendar query notice:', classesRes.error.message)
    renderMigrationState(panel, 'Calendar and classes', 'The classes table is not yet initialized or RLS blocked. Execute migration 0007_teacher_management_enhancements.sql in Supabase.')
    return
  }

  const classes = classesRes.data || []
  const participants = participantsRes.data || []
  const students = studentsRes.data || []

  const studentMap = new Map(students.map(s => [s.id, s.name]))
  const participantsMap = new Map()
  participants.forEach(p => {
    if (!participantsMap.has(p.class_id)) participantsMap.set(p.class_id, [])
    participantsMap.get(p.class_id).push(studentMap.get(p.student_id) || p.student_id)
  })

  panel.innerHTML = `
    <div class="teacher-action-grid">
      <form class="teacher-form-card" id="teacher-class-form">
        <div><p class="teacher-label">SCHEDULE</p><h3>Create a class</h3></div>
        <label>Title<input name="title" required maxlength="160" placeholder="e.g. Conversation Practice B1"></label>
        <label>Start<input name="starts_at" type="datetime-local" required></label>
        <label>Duration (minutes)<input name="duration_minutes" type="number" min="15" max="240" value="60" required></label>
        <label>Modality<select name="modality"><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
        <label>Language<input name="language" placeholder="e.g. English"></label>
        <label>Level<input name="level" placeholder="e.g. B1"></label>
        <label>Participant UUIDs (comma separated)
          <input name="student_ids" required placeholder="Select student or paste UUID" list="calendar-students-list">
          <datalist id="calendar-students-list">
            ${students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
          </datalist>
        </label>
        <label>Notes<textarea name="notes" rows="3" placeholder="Lesson plan or link..."></textarea></label>
        <button class="teacher-primary-button" type="submit">Schedule class</button>
        <p class="teacher-form-status" data-form-status></p>
      </form>
      <div class="teacher-list-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;">Upcoming & scheduled classes (${classes.length})</h3>
          <div class="teacher-filter-bar" style="margin:0;">
            <button type="button" class="teacher-filter-btn is-active" data-class-filter="all">All</button>
            <button type="button" class="teacher-filter-btn" data-class-filter="scheduled">Scheduled</button>
            <button type="button" class="teacher-filter-btn" data-class-filter="completed">Completed</button>
            <button type="button" class="teacher-filter-btn" data-class-filter="cancelled">Cancelled</button>
          </div>
        </div>
        ${classes.length ? `
          <ul style="margin:0;">
            ${classes.map(item => {
              const classStudents = participantsMap.get(item.id) || []
              return `
                <li class="teacher-class-item" data-class-status-val="${escapeHtml(item.status || 'scheduled')}" style="padding:12px 0;border-bottom:1px solid var(--vo-border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <strong>${escapeHtml(item.title)}</strong>
                      <span class="teacher-badge badge-${escapeHtml(item.status)}">${escapeHtml((item.status || 'scheduled').toUpperCase())}</span>
                      <span class="teacher-badge badge-global">${escapeHtml(item.modality || 'online')}</span>
                    </div>
                    <small style="color:var(--vo-muted);display:block;margin-top:2px;">
                      ${formatDate(item.starts_at)} (${item.duration_minutes} min)${item.language ? ` · ${escapeHtml(item.language)}` : ''}${item.level ? ` · ${escapeHtml(item.level)}` : ''}
                      ${classStudents.length ? ` · Students: ${escapeHtml(classStudents.join(', '))}` : ''}
                    </small>
                    ${item.notes ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(24,59,102,0.8);">${escapeHtml(item.notes)}</p>` : ''}
                  </div>
                  <div class="teacher-inline-actions">
                    ${item.status === 'scheduled' ? `<button type="button" class="teacher-secondary-button" data-update-class-status="completed" data-class-id="${escapeHtml(item.id)}" style="padding:4px 10px;font-size:11px;">Completar</button><button type="button" class="teacher-secondary-button" data-update-class-status="cancelled" data-class-id="${escapeHtml(item.id)}" style="padding:4px 10px;font-size:11px;">Cancelar</button>` : ''}
                    ${item.status === 'cancelled' ? `<button type="button" class="teacher-secondary-button" data-update-class-status="scheduled" data-class-id="${escapeHtml(item.id)}" style="padding:4px 10px;font-size:11px;">Reactivar</button>` : ''}
                    <button type="button" class="teacher-danger-button" data-delete-class-id="${escapeHtml(item.id)}" data-class-title="${escapeHtml(item.title)}" style="padding:4px 10px;font-size:11px;">Eliminar</button>
                  </div>
                </li>
              `
            }).join('')}
          </ul>
        ` : '<p class="teacher-muted">No classes scheduled yet.</p>'}
      </div>
    </div>
  `

  document.querySelector('#teacher-class-form')?.addEventListener('submit', (e) => saveClass(e, panel))

  panel.querySelectorAll?.('[data-class-filter]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-class-filter]').forEach(b => b.classList.toggle('is-active', b === btn))
      const filter = btn.dataset.classFilter
      panel.querySelectorAll('.teacher-class-item').forEach(el => {
        el.style.display = (filter === 'all' || el.dataset.classStatusVal === filter) ? 'flex' : 'none'
      })
    })
  })

  panel.querySelectorAll?.('[data-update-class-status]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const classId = btn.dataset.classId
      const newStatus = btn.dataset.updateClassStatus
      btn.disabled = true
      await supabase.from('classes').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', classId)
      loadCalendar(panel)
    })
  })

  panel.querySelectorAll?.('[data-delete-class-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const classId = btn.dataset.deleteClassId
      const title = btn.dataset.classTitle || 'esta clase'
      if (!window.confirm(`¿Eliminar la clase "${title}"?`)) return
      btn.disabled = true
      await supabase.from('classes').delete().eq('id', classId)
      loadCalendar(panel)
    })
  })
}

async function saveClass(event, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const status = form.querySelector('[data-form-status]')
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  const studentIds = data.student_ids.split(',').map((id) => id.trim()).filter(Boolean)
  if (!user?.id) { status.textContent = 'Your session has expired. Please log in again.'; return }
  const startsAt = new Date(data.starts_at)
  const duration = Number(data.duration_minutes)
  const { data: existing, error: conflictError } = await supabase.from('classes').select('starts_at, duration_minutes').eq('teacher_id', user.id).neq('status', 'cancelled')
  if (conflictError) { status.textContent = formatSupabaseError(conflictError, 'Could not verify schedule.'); return }
  const conflict = (existing || []).some((item) => {
    const start = new Date(item.starts_at)
    const end = new Date(start.getTime() + Number(item.duration_minutes) * 60000)
    return startsAt < end && new Date(startsAt.getTime() + duration * 60000) > start
  })
  if (conflict) { status.textContent = 'This teacher already has a class during that time.'; return }
  const { data: created, error } = await supabase.from('classes').insert({
    teacher_id: user.id, title: data.title.trim(), starts_at: startsAt.toISOString(), duration_minutes: duration,
    modality: data.modality, language: data.language.trim() || null, level: data.level.trim() || null, notes: data.notes.trim() || null
  }).select('id').single()
  if (error) { status.textContent = formatSupabaseError(error, 'Could not schedule this class.'); return }
  const { error: participantError } = await supabase.from('class_participants').insert(studentIds.map((student_id) => ({ class_id: created.id, teacher_id: user.id, student_id })))
  if (participantError) {
    await supabase.from('classes').delete().eq('id', created.id).eq('teacher_id', user.id)
    status.textContent = formatSupabaseError(participantError, 'Could not save class participants.')
    return
  }
  status.textContent = 'Class scheduled.'
  form.reset()
  if (panel) loadCalendar(panel)
}

async function loadFinance(panel) {
  const [payments, expenses, packages, assignmentsRes, studentsRes] = await Promise.all([
    supabase.from('payments').select('id, student_id, assignment_id, amount, currency, method, status, paid_at, reference, notes, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('expenses').select('id, amount, currency, category, description, spent_at, created_at').order('spent_at', { ascending: false }).limit(50),
    supabase.from('packages').select('id, name, class_count, duration_minutes, price, currency, status, language, level').order('created_at', { ascending: false }).limit(30),
    supabase.from('student_packages').select('assignment_id, package_id, student_id, classes_consumed, status, purchased_at').order('purchased_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('id, name').order('name')
  ])

  if (payments.error || expenses.error || packages.error) {
    console.warn('Finance query notice:', payments.error?.message || expenses.error?.message || packages.error?.message)
    renderMigrationState(panel, 'Finance and payments', 'Finance tables not yet initialized. Apply migration 0007_teacher_management_enhancements.sql in Supabase.')
    return
  }

  const paymentsList = payments.data || []
  const expensesList = expenses.data || []
  const packagesList = packages.data || []
  const students = studentsRes.data || []
  const studentMap = new Map(students.map(s => [s.id, s.name]))

  // Financial metrics
  const totalReceived = paymentsList.filter(p => p.status === 'received').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalPending = paymentsList.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalExpenses = expensesList.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const netBalance = totalReceived - totalExpenses

  panel.innerHTML = `
    <div class="teacher-metric-grid">
      ${metricCard('Total Recaudado', formatMoney(totalReceived, 'COP'), 'pagos confirmados')}
      ${metricCard('Pendiente por Cobrar', formatMoney(totalPending, 'COP'), 'pagos pendientes')}
      ${metricCard('Gastos Operativos', formatMoney(totalExpenses, 'COP'), 'gastos registrados')}
      ${metricCard('Balance Neto', formatMoney(netBalance, 'COP'), 'recaudado - gastos')}
    </div>
    <div class="teacher-action-grid">
      <form class="teacher-form-card" id="teacher-payment-form">
        <div><p class="teacher-label">PAYMENTS</p><h3>Record a payment</h3></div>
        <label>Student UUID
          <input name="student_id" required placeholder="Select student or UUID" list="finance-students-list">
          <datalist id="finance-students-list">
            ${students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
          </datalist>
        </label>
        <label>Assignment UUID<input name="assignment_id"></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required placeholder="e.g. 150000"></label>
        <label>Method<select name="method"><option value="bank_transfer">Bank transfer</option><option value="nequi">Nequi</option><option value="daviplata">Daviplata</option><option value="cash">Cash</option></select></label>
        <label>Status<select name="status"><option value="received">Received</option><option value="partial">Partial</option><option value="pending">Pending</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select></label>
        <label>Reference<input name="reference" placeholder="e.g. Nequi M123456"></label>
        <button class="teacher-primary-button" type="submit">Save payment</button><p class="teacher-form-status" data-form-status></p>
      </form>
      <form class="teacher-form-card" id="teacher-expense-form">
        <div><p class="teacher-label">EXPENSES</p><h3>Record an expense</h3></div>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required placeholder="e.g. 50000"></label>
        <label>Category<input name="category" required placeholder="e.g. Software, Materials, Internet"></label>
        <label>Date<input name="spent_at" type="date" required value="${new Date().toISOString().split('T')[0]}"></label>
        <label>Description<textarea name="description" rows="3"></textarea></label>
        <button class="teacher-primary-button" type="submit">Save expense</button><p class="teacher-form-status" data-form-status></p>
      </form>
      <form class="teacher-form-card" id="teacher-package-form">
        <div><p class="teacher-label">PACKAGES</p><h3>Create a package</h3></div>
        <label>Name<input name="name" required placeholder="e.g. 10 Classes B1 Pack"></label>
        <label>Classes included<input name="class_count" type="number" min="1" required value="10"></label>
        <label>Duration<input name="duration_minutes" type="number" min="15" max="240" value="60" required></label>
        <label>Price<input name="price" type="number" min="0" step="0.01" required placeholder="e.g. 450000"></label>
        <label>Language<input name="language"></label><label>Level<input name="level"></label>
        <button class="teacher-primary-button" type="submit">Save package</button><p class="teacher-form-status" data-form-status></p>
      </form>
      <form class="teacher-form-card" id="teacher-assignment-form">
        <div><p class="teacher-label">ASSIGNMENTS</p><h3>Assign a package</h3></div>
        <label>Package UUID
          <input name="package_id" required placeholder="Select package or UUID" list="finance-packages-list">
          <datalist id="finance-packages-list">
            ${packagesList.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${p.price} ${p.currency})</option>`).join('')}
          </datalist>
        </label>
        <label>Student UUID
          <input name="student_id" required placeholder="Select student or UUID" list="finance-students-assign-list">
          <datalist id="finance-students-assign-list">
            ${students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
          </datalist>
        </label>
        <button class="teacher-primary-button" type="submit">Assign package</button><p class="teacher-form-status" data-form-status></p>
      </form>
    </div>
    <div class="teacher-workspace-columns">
      <article class="teacher-list-card">
        <h3>Payments (${paymentsList.length})</h3>
        ${paymentsList.length ? `
          <ul style="margin:0;">
            ${paymentsList.map(p => `
              <li style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--vo-border);flex-wrap:wrap;gap:8px;">
                <div>
                  <strong>${formatMoney(p.amount, p.currency || 'COP')}</strong> · <span class="teacher-badge badge-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>
                  <small style="color:var(--vo-muted);display:block;">${escapeHtml(studentMap.get(p.student_id) || p.student_id)} · ${escapeHtml(p.method)}${p.paid_at ? ` · ${new Date(p.paid_at).toLocaleDateString()}` : ''}</small>
                </div>
                <div class="teacher-inline-actions">
                  ${p.status === 'pending' ? `<button type="button" class="teacher-secondary-button" data-payment-status="received" data-payment-id="${escapeHtml(p.id)}" style="padding:4px 8px;font-size:11px;">Marcar Pagado</button>` : ''}
                  <button type="button" class="teacher-danger-button" data-delete-payment-id="${escapeHtml(p.id)}" style="padding:4px 8px;font-size:11px;">Eliminar</button>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="teacher-muted">No payments recorded.</p>'}
      </article>
      <article class="teacher-list-card">
        <h3>Expenses (${expensesList.length})</h3>
        ${expensesList.length ? `
          <ul style="margin:0;">
            ${expensesList.map(e => `
              <li style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--vo-border);flex-wrap:wrap;gap:8px;">
                <div>
                  <strong>${formatMoney(e.amount, e.currency || 'COP')}</strong> · ${escapeHtml(e.category)}
                  <small style="color:var(--vo-muted);display:block;">${e.spent_at ? new Date(e.spent_at).toLocaleDateString() : ''}${e.description ? ` · ${escapeHtml(e.description)}` : ''}</small>
                </div>
                <button type="button" class="teacher-danger-button" data-delete-expense-id="${escapeHtml(e.id)}" style="padding:4px 8px;font-size:11px;">Eliminar</button>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="teacher-muted">No expenses recorded.</p>'}
      </article>
    </div>
    <article class="teacher-list-card" style="margin-top:20px;">
      <h3>Packages (${packagesList.length})</h3>
      ${packagesList.length ? `
        <ul style="margin:0;">
          ${packagesList.map(pkg => `
            <li style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--vo-border);flex-wrap:wrap;gap:8px;">
              <div>
                <strong>${escapeHtml(pkg.name)}</strong> · ${pkg.class_count} classes · ${formatMoney(pkg.price, pkg.currency || 'COP')}
                <small style="color:var(--vo-muted);display:block;">${pkg.duration_minutes} min/class · ${escapeHtml(pkg.status)}</small>
              </div>
              <button type="button" class="teacher-danger-button" data-delete-package-id="${escapeHtml(pkg.id)}" data-package-name="${escapeHtml(pkg.name)}" style="padding:4px 8px;font-size:11px;">Eliminar</button>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="teacher-muted">No packages configured.</p>'}
    </article>
  `

  document.querySelector('#teacher-payment-form')?.addEventListener('submit', (e) => savePayment(e, panel))
  document.querySelector('#teacher-expense-form')?.addEventListener('submit', (e) => saveExpense(e, panel))
  document.querySelector('#teacher-package-form')?.addEventListener('submit', (e) => savePackage(e, panel))
  document.querySelector('#teacher-assignment-form')?.addEventListener('submit', (e) => savePackageAssignment(e, panel))

  panel.querySelectorAll?.('[data-delete-payment-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('¿Eliminar este registro de pago?')) return
      btn.disabled = true
      await supabase.from('payments').delete().eq('id', btn.dataset.deletePaymentId)
      loadFinance(panel)
    })
  })

  panel.querySelectorAll?.('[data-payment-status]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true
      await supabase.from('payments').update({ status: btn.dataset.paymentStatus, paid_at: new Date().toISOString() }).eq('id', btn.dataset.paymentId)
      loadFinance(panel)
    })
  })

  panel.querySelectorAll?.('[data-delete-expense-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('¿Eliminar este gasto?')) return
      btn.disabled = true
      await supabase.from('expenses').delete().eq('id', btn.dataset.deleteExpenseId)
      loadFinance(panel)
    })
  })

  panel.querySelectorAll?.('[data-delete-package-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.packageName || 'este paquete'
      if (!window.confirm(`¿Eliminar el paquete "${name}"?`)) return
      btn.disabled = true
      await supabase.from('packages').delete().eq('id', btn.dataset.deletePackageId)
      loadFinance(panel)
    })
  })
}

async function savePayment(event, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'payments', {
    teacher_id: user?.id, student_id: data.student_id.trim(), assignment_id: data.assignment_id?.trim() || null,
    amount: Number(data.amount), currency: 'COP', method: data.method, status: data.status,
    paid_at: data.status === 'pending' ? null : new Date().toISOString(), reference: data.reference?.trim() || null
  }, 'Payment saved.')
  if (panel) loadFinance(panel)
}

async function saveExpense(event, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'expenses', {
    teacher_id: user?.id, amount: Number(data.amount), currency: 'COP', category: data.category.trim(),
    description: data.description?.trim() || null, spent_at: data.spent_at
  }, 'Expense saved.')
  if (panel) loadFinance(panel)
}

async function savePackage(event, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'packages', {
    teacher_id: user?.id, name: data.name.trim(), class_count: Number(data.class_count),
    duration_minutes: Number(data.duration_minutes), price: Number(data.price), currency: 'COP',
    language: data.language?.trim() || null, level: data.level?.trim() || null, status: 'active'
  }, 'Package saved.')
  if (panel) loadFinance(panel)
}

async function savePackageAssignment(event, panel) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'student_packages', {
    teacher_id: user?.id,
    package_id: data.package_id.trim(),
    student_id: data.student_id.trim(),
    purchased_at: new Date().toISOString(),
    classes_consumed: 0,
    status: 'active'
  }, 'Package assigned.')
  if (panel) loadFinance(panel)
}

async function loadLeads(panel) {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email, phone, language, level, stage, next_follow_up_at, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('Leads query notice:', error.message)
    renderMigrationState(panel, 'Leads and follow-up', 'Leads table not yet initialized. Apply migration 0007_teacher_management_enhancements.sql in Supabase.')
    return
  }

  const leads = data || []
  panel.innerHTML = `
    <div class="teacher-action-grid">
      <form class="teacher-form-card" id="teacher-lead-form">
        <div><p class="teacher-label">CRM</p><h3>Add a lead</h3></div>
        <label>Name<input name="name" required placeholder="Lead full name"></label>
        <label>Email<input name="email" type="email" placeholder="student@example.com"></label>
        <label>Phone<input name="phone" placeholder="+57 300 0000000"></label>
        <label>Language<input name="language" placeholder="e.g. English, French"></label>
        <label>Stage<select name="stage">
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="assessment">Assessment</option>
          <option value="offer">Offer</option>
          <option value="payment_pending">Payment pending</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select></label>
        <label>Next follow-up<input name="next_follow_up_at" type="datetime-local"></label>
        <label>Notes<textarea name="notes" rows="3" placeholder="Interests, schedule preferences..."></textarea></label>
        <button class="teacher-primary-button" type="submit">Save lead</button><p class="teacher-form-status" data-form-status></p>
      </form>
      <div class="teacher-list-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;">Follow-up pipeline (${leads.length})</h3>
          <div class="teacher-filter-bar" style="margin:0;">
            <button type="button" class="teacher-filter-btn is-active" data-lead-filter="all">All</button>
            <button type="button" class="teacher-filter-btn" data-lead-filter="new">New</button>
            <button type="button" class="teacher-filter-btn" data-lead-filter="contacted">Contacted</button>
            <button type="button" class="teacher-filter-btn" data-lead-filter="assessment">Assessment</button>
            <button type="button" class="teacher-filter-btn" data-lead-filter="converted">Converted</button>
          </div>
        </div>
        ${leads.length ? `
          <ul style="margin:0;">
            ${leads.map(item => `
              <li class="teacher-lead-item" data-lead-stage-val="${escapeHtml(item.stage || 'new')}" style="padding:12px 0;border-bottom:1px solid var(--vo-border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="teacher-badge badge-${escapeHtml(item.stage)}">${escapeHtml(item.stage)}</span>
                    ${item.language ? `<span class="teacher-badge badge-global">${escapeHtml(item.language)}</span>` : ''}
                  </div>
                  <small style="color:var(--vo-muted);display:block;margin-top:2px;">
                    ${item.email ? `Email: ${escapeHtml(item.email)} · ` : ''}${item.phone ? `Tel: ${escapeHtml(item.phone)} · ` : ''}
                    Follow-up: ${item.next_follow_up_at ? formatDate(item.next_follow_up_at) : 'Not scheduled'}
                  </small>
                  ${item.notes ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(24,59,102,0.8);">${escapeHtml(item.notes)}</p>` : ''}
                </div>
                <div class="teacher-inline-actions">
                  <select data-lead-stage-select="${escapeHtml(item.id)}" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid var(--vo-border);">
                    <option value="new"${item.stage === 'new' ? ' selected' : ''}>New</option>
                    <option value="contacted"${item.stage === 'contacted' ? ' selected' : ''}>Contacted</option>
                    <option value="assessment"${item.stage === 'assessment' ? ' selected' : ''}>Assessment</option>
                    <option value="offer"${item.stage === 'offer' ? ' selected' : ''}>Offer</option>
                    <option value="payment_pending"${item.stage === 'payment_pending' ? ' selected' : ''}>Payment pending</option>
                    <option value="converted"${item.stage === 'converted' ? ' selected' : ''}>Converted</option>
                    <option value="lost"${item.stage === 'lost' ? ' selected' : ''}>Lost</option>
                  </select>
                  <button type="button" class="teacher-danger-button" data-delete-lead-id="${escapeHtml(item.id)}" data-lead-name="${escapeHtml(item.name)}" style="padding:4px 8px;font-size:11px;">Eliminar</button>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="teacher-muted">No leads in the pipeline.</p>'}
      </div>
    </div>
  `

  document.querySelector('#teacher-lead-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())
    const user = await getCurrentUser()
    await saveFormRecord(form, form.querySelector('[data-form-status]'), 'leads', {
      teacher_id: user?.id, name: values.name.trim(), email: values.email.trim() || null, phone: values.phone.trim() || null,
      language: values.language.trim() || null, stage: values.stage, next_follow_up_at: values.next_follow_up_at ? new Date(values.next_follow_up_at).toISOString() : null,
      notes: values.notes.trim() || null
    }, 'Lead saved.')
    loadLeads(panel)
  })

  panel.querySelectorAll?.('[data-lead-filter]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-lead-filter]').forEach(b => b.classList.toggle('is-active', b === btn))
      const filter = btn.dataset.leadFilter
      panel.querySelectorAll('.teacher-lead-item').forEach(el => {
        el.style.display = (filter === 'all' || el.dataset.leadStageVal === filter) ? 'flex' : 'none'
      })
    })
  })

  panel.querySelectorAll?.('[data-lead-stage-select]')?.forEach((sel) => {
    sel.addEventListener('change', async () => {
      const leadId = sel.dataset.leadStageSelect
      await supabase.from('leads').update({ stage: sel.value, updated_at: new Date().toISOString() }).eq('id', leadId)
      loadLeads(panel)
    })
  })

  panel.querySelectorAll?.('[data-delete-lead-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.leadName || 'este lead'
      if (!window.confirm(`¿Eliminar el prospecto "${name}"?`)) return
      btn.disabled = true
      await supabase.from('leads').delete().eq('id', btn.dataset.deleteLeadId)
      loadLeads(panel)
    })
  })
}

async function loadCulture(panel) {
  const { data, error } = await supabase
    .from('culture_resources')
    .select('id, title, language, topic, status, url, description, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('Culture query notice:', error.message)
    renderMigrationState(panel, 'Culture resources', 'Culture resources table not yet initialized. Apply migration 0007_teacher_management_enhancements.sql in Supabase.')
    return
  }

  const resources = data || []
  panel.innerHTML = `
    <div class="teacher-action-grid">
      <form class="teacher-form-card" id="teacher-culture-form">
        <div><p class="teacher-label">CULTURE</p><h3>Add a resource</h3></div>
        <label>Title<input name="title" required placeholder="e.g. Traditional Celebrations in Bogotá"></label>
        <label>Language<input name="language" required placeholder="e.g. Spanish, English"></label>
        <label>Topic<input name="topic" placeholder="e.g. History, Gastronomy, Art"></label>
        <label>External URL<input name="url" type="url" placeholder="https://example.com/article"></label>
        <label>Description<textarea name="description" rows="3" placeholder="Context or discussion prompts for students..."></textarea></label>
        <button class="teacher-primary-button" type="submit">Save resource</button><p class="teacher-form-status" data-form-status></p>
      </form>
      <div class="teacher-list-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;">Culture resources (${resources.length})</h3>
          <div class="teacher-filter-bar" style="margin:0;">
            <button type="button" class="teacher-filter-btn is-active" data-culture-filter="all">All</button>
            <button type="button" class="teacher-filter-btn" data-culture-filter="published">Published</button>
            <button type="button" class="teacher-filter-btn" data-culture-filter="draft">Draft</button>
          </div>
        </div>
        ${resources.length ? `
          <ul style="margin:0;">
            ${resources.map(item => `
              <li class="teacher-culture-item" data-culture-status-val="${escapeHtml(item.status || 'draft')}" style="padding:12px 0;border-bottom:1px solid var(--vo-border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span class="teacher-badge badge-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
                    <span class="teacher-badge badge-global">${escapeHtml(item.language)}</span>
                    ${item.topic ? `<span class="teacher-badge badge-draft">${escapeHtml(item.topic)}</span>` : ''}
                  </div>
                  ${item.description ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(24,59,102,0.8);">${escapeHtml(item.description)}</p>` : ''}
                  ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--vo-purple);text-decoration:underline;display:inline-block;margin-top:2px;">Abrir enlace ↗</a>` : ''}
                </div>
                <div class="teacher-inline-actions">
                  <button type="button" class="teacher-secondary-button" data-toggle-culture-status="${escapeHtml(item.id)}" data-next-status="${item.status === 'published' ? 'draft' : 'published'}" style="padding:4px 10px;font-size:11px;">
                    ${item.status === 'published' ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button type="button" class="teacher-danger-button" data-delete-culture-id="${escapeHtml(item.id)}" data-culture-title="${escapeHtml(item.title)}" style="padding:4px 10px;font-size:11px;">Eliminar</button>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="teacher-muted">No culture resources added yet.</p>'}
      </div>
    </div>
  `

  document.querySelector('#teacher-culture-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())
    const user = await getCurrentUser()
    await saveFormRecord(form, form.querySelector('[data-form-status]'), 'culture_resources', {
      teacher_id: user?.id, title: values.title.trim(), language: values.language.trim(), topic: values.topic.trim() || null,
      url: values.url.trim() || null, description: values.description.trim() || null, status: 'draft'
    }, 'Resource saved.')
    loadCulture(panel)
  })

  panel.querySelectorAll?.('[data-culture-filter]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-culture-filter]').forEach(b => b.classList.toggle('is-active', b === btn))
      const filter = btn.dataset.cultureFilter
      panel.querySelectorAll('.teacher-culture-item').forEach(el => {
        el.style.display = (filter === 'all' || el.dataset.cultureStatusVal === filter) ? 'flex' : 'none'
      })
    })
  })

  panel.querySelectorAll?.('[data-toggle-culture-status]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const resourceId = btn.dataset.toggleCultureStatus
      const nextStatus = btn.dataset.nextStatus
      btn.disabled = true
      await supabase.from('culture_resources').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', resourceId)
      loadCulture(panel)
    })
  })

  panel.querySelectorAll?.('[data-delete-culture-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const title = btn.dataset.cultureTitle || 'este recurso'
      if (!window.confirm(`¿Eliminar el recurso "${title}"?`)) return
      btn.disabled = true
      await supabase.from('culture_resources').delete().eq('id', btn.dataset.deleteCultureId)
      loadCulture(panel)
    })
  })
}

async function saveFormRecord(form, status, table, payload, successMessage) {
  if (!payload.teacher_id) { status.textContent = 'Your session has expired. Please log in again.'; return }
  status.textContent = 'Saving...'
  const { error } = await supabase.from(table).insert(payload)
  if (error) { status.textContent = formatSupabaseError(error, 'Could not save this record.'); return }
  status.textContent = successMessage
  form.reset()
}

function formatSupabaseError(error, fallback) {
  if (!import.meta.env.DEV) return fallback
  const parts = [error?.message, error?.code, error?.details].filter(Boolean).map(String)
  return parts.length ? `${fallback} ${parts.join(' · ')}` : fallback
}

function metricCard(label, value, detail) {
  return `<article class="teacher-metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`
}

function listCard(title, items = [], format) {
  return `<article class="teacher-list-card"><h3>${escapeHtml(title)}</h3>${items?.length ? `<ul>${items.map((item) => `<li>${escapeHtml(format(item))}</li>`).join('')}</ul>` : '<p class="teacher-muted">Nothing here yet.</p>'}</article>`
}

function renderError(panel, message) {
  panel.innerHTML = `<div class="teacher-empty-state teacher-error-state"><h3>Workspace unavailable</h3><p>${escapeHtml(message)}</p></div>`
}

function renderMigrationState(panel, title, message) {
  panel.innerHTML = `<div class="teacher-empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><small>This module is unavailable until the reviewed Supabase migration is applied.</small></div>`
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleString()
}

function formatMoney(amount, currency = 'COP') {
  const num = Number(amount || 0)
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(num)
}

function average(values) {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value))
  return numbers.length ? Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length) : 0
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
