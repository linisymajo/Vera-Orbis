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
  const loaders = { overview: loadOverview, academic: loadAcademic, 'exercise-studio': loadExerciseStudio, calendar: loadCalendar, finance: loadFinance, leads: loadLeads, culture: loadCulture }
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
    supabase.from('materials').select('id, title, type, language, level, student_id, audience, created_at').order('created_at', { ascending: false }).limit(20),
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
      ${listCard('Materials', materials.data, (item) => `${item.title || 'Untitled'} · ${item.type || 'resource'}`)}
      ${listCard('Challenges', challenges.data, (item) => `${item.title || 'Untitled'} · ${item.status || 'draft'}`)}
    </div>
    ${listCard('Courses', coursesList, (item) => `${item.name} · ${item.language}${item.level ? ` · ${item.level}` : ''} · ${item.status}`)}
    <div class="teacher-inline-note"><strong>Work plans:</strong> ${plans.data?.length || 0} visible plan(s). Open a student profile to update the next step and private notes.</div>
  `

  document.querySelector('#teacher-material-form')?.addEventListener('submit', (event) => saveAcademicRecord(event, 'materials'))
  document.querySelector('#teacher-challenge-form')?.addEventListener('submit', (event) => saveAcademicRecord(event, 'weekly_challenges'))
  document.querySelector('#teacher-course-form')?.addEventListener('submit', saveCourse)
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
  panel.querySelectorAll('[data-exercise-action]').forEach((button) => button.addEventListener('click', () => updateExercise(button.dataset.exerciseAction, button.dataset.exerciseId)))
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

async function saveCourse(event) {
  event.preventDefault()
  const form = event.currentTarget
  const values = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'courses', {
    teacher_id: user?.id, name: values.name.trim(), language: values.language.trim(),
    level: values.level.trim() || null, description: values.description.trim() || null, status: 'draft'
  }, 'Course saved.')
}

async function saveAcademicRecord(event, table) {
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
}

async function loadCalendar(panel) {
  const { data, error } = await supabase.from('classes').select('id, title, starts_at, duration_minutes, modality, status, language, level').order('starts_at', { ascending: true }).limit(30)
  if (error) {
    renderMigrationState(panel, 'Calendar and classes', 'Apply the reviewed teacher operations migration before scheduling classes.')
    return
  }
  panel.innerHTML = `<div class="teacher-action-grid">
    <form class="teacher-form-card" id="teacher-class-form">
      <div><p class="teacher-label">SCHEDULE</p><h3>Create a class</h3></div>
      <label>Title<input name="title" required maxlength="160"></label>
      <label>Start<input name="starts_at" type="datetime-local" required></label>
      <label>Duration<input name="duration_minutes" type="number" min="15" max="240" value="60" required></label>
      <label>Modality<select name="modality"><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
      <label>Language<input name="language"></label><label>Level<input name="level"></label>
      <label>Participant UUIDs (comma separated)<input name="student_ids" required></label>
      <label>Notes<textarea name="notes" rows="3"></textarea></label>
      <button class="teacher-primary-button" type="submit">Schedule class</button><p class="teacher-form-status" data-form-status></p>
    </form>
    ${listCard('Upcoming and recent classes', data, (item) => `${item.title} · ${formatDate(item.starts_at)} · ${item.status}`)}
  </div>`
  document.querySelector('#teacher-class-form')?.addEventListener('submit', saveClass)
}

async function saveClass(event) {
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
}

async function loadFinance(panel) {
  const [payments, expenses, packages] = await Promise.all([
    supabase.from('payments').select('id, student_id, assignment_id, amount, currency, status, paid_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('expenses').select('id, amount, currency, category, spent_at').order('spent_at', { ascending: false }).limit(30),
    supabase.from('packages').select('id, name, class_count, duration_minutes, price, currency, status').order('created_at', { ascending: false }).limit(30)
  ])
  if (payments.error || expenses.error || packages.error) {
    renderMigrationState(panel, 'Finance and payments', 'Apply the reviewed teacher operations migration before recording financial data.')
    return
  }
  panel.innerHTML = `<div class="teacher-action-grid">
    <form class="teacher-form-card" id="teacher-payment-form">
      <div><p class="teacher-label">PAYMENTS</p><h3>Record a payment</h3></div>
      <label>Student UUID<input name="student_id" required></label><label>Assignment UUID<input name="assignment_id"></label>
      <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label>
      <label>Method<select name="method"><option value="bank_transfer">Bank transfer</option><option value="nequi">Nequi</option><option value="daviplata">Daviplata</option><option value="cash">Cash</option></select></label>
      <label>Status<select name="status"><option value="received">Received</option><option value="partial">Partial</option><option value="pending">Pending</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select></label>
      <label>Reference<input name="reference"></label><button class="teacher-primary-button" type="submit">Save payment</button><p class="teacher-form-status" data-form-status></p>
    </form>
    <form class="teacher-form-card" id="teacher-expense-form">
      <div><p class="teacher-label">EXPENSES</p><h3>Record an expense</h3></div>
      <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label><label>Category<input name="category" required></label>
      <label>Date<input name="spent_at" type="date" required></label><label>Description<textarea name="description" rows="3"></textarea></label>
      <button class="teacher-primary-button" type="submit">Save expense</button><p class="teacher-form-status" data-form-status></p>
    </form>
    <form class="teacher-form-card" id="teacher-package-form">
      <div><p class="teacher-label">PACKAGES</p><h3>Create a package</h3></div>
      <label>Name<input name="name" required></label><label>Classes included<input name="class_count" type="number" min="1" required></label>
      <label>Duration<input name="duration_minutes" type="number" min="15" max="240" value="60" required></label><label>Price<input name="price" type="number" min="0" step="0.01" required></label>
      <label>Language<input name="language"></label><label>Level<input name="level"></label>
      <button class="teacher-primary-button" type="submit">Save package</button><p class="teacher-form-status" data-form-status></p>
    </form>
    <form class="teacher-form-card" id="teacher-assignment-form">
      <div><p class="teacher-label">ASSIGNMENTS</p><h3>Assign a package</h3></div>
      <label>Package UUID<input name="package_id" required></label><label>Student UUID<input name="student_id" required></label>
      <button class="teacher-primary-button" type="submit">Assign package</button><p class="teacher-form-status" data-form-status></p>
    </form>
  </div><div class="teacher-workspace-columns">
    ${listCard('Payments', payments.data, (item) => `${item.amount} ${item.currency} · ${item.status}`)}
    ${listCard('Expenses', expenses.data, (item) => `${item.amount} ${item.currency} · ${item.category}`)}
  </div>${listCard('Packages', packages.data, (item) => `${item.name} · ${item.class_count} classes · ${item.price} ${item.currency}`)}`
  document.querySelector('#teacher-payment-form')?.addEventListener('submit', savePayment)
  document.querySelector('#teacher-expense-form')?.addEventListener('submit', saveExpense)
  document.querySelector('#teacher-package-form')?.addEventListener('submit', savePackage)
  document.querySelector('#teacher-assignment-form')?.addEventListener('submit', savePackageAssignment)
}

async function savePayment(event) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'payments', {
    teacher_id: user?.id, student_id: data.student_id.trim(), assignment_id: data.assignment_id.trim() || null,
    amount: Number(data.amount), currency: 'COP', method: data.method, status: data.status,
    paid_at: data.status === 'pending' ? null : new Date().toISOString(), reference: data.reference.trim() || null
  }, 'Payment saved.')
}

async function saveExpense(event) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'expenses', {
    teacher_id: user?.id, amount: Number(data.amount), currency: 'COP', category: data.category.trim(),
    description: data.description.trim() || null, spent_at: data.spent_at
  }, 'Expense saved.')
}

async function savePackage(event) {
  event.preventDefault()
  const form = event.currentTarget
  const data = Object.fromEntries(new FormData(form).entries())
  const user = await getCurrentUser()
  await saveFormRecord(form, form.querySelector('[data-form-status]'), 'packages', {
    teacher_id: user?.id, name: data.name.trim(), class_count: Number(data.class_count),
    duration_minutes: Number(data.duration_minutes), price: Number(data.price), currency: 'COP',
    language: data.language.trim() || null, level: data.level.trim() || null, status: 'active'
  }, 'Package saved.')
}

async function savePackageAssignment(event) {
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
}

async function loadLeads(panel) {
  const { data, error } = await supabase.from('leads').select('id, name, email, language, stage, next_follow_up_at').order('next_follow_up_at', { ascending: true }).limit(50)
  if (error) { renderMigrationState(panel, 'Leads and follow-up', 'Apply the reviewed teacher operations migration before managing leads.'); return }
  panel.innerHTML = `<form class="teacher-form-card" id="teacher-lead-form">
    <div><p class="teacher-label">CRM</p><h3>Add a lead</h3></div><label>Name<input name="name" required></label><label>Email<input name="email" type="email"></label>
    <label>Phone<input name="phone"></label><label>Language<input name="language"></label>
    <label>Stage<select name="stage"><option value="new">New</option><option value="contacted">Contacted</option><option value="assessment">Assessment</option><option value="offer">Offer</option><option value="payment_pending">Payment pending</option><option value="lost">Lost</option></select></label>
    <label>Next follow-up<input name="next_follow_up_at" type="datetime-local"></label><label>Notes<textarea name="notes" rows="3"></textarea></label>
    <button class="teacher-primary-button" type="submit">Save lead</button><p class="teacher-form-status" data-form-status></p>
  </form>${listCard('Follow-up pipeline', data, (item) => `${item.name} · ${item.stage}${item.next_follow_up_at ? ` · ${formatDate(item.next_follow_up_at)}` : ''}`)}`
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
  })
}

async function loadCulture(panel) {
  const { data, error } = await supabase.from('culture_resources').select('id, title, language, topic, status, url').order('created_at', { ascending: false }).limit(50)
  if (error) { renderMigrationState(panel, 'Culture resources', 'Apply the reviewed teacher operations migration before publishing cultural resources.'); return }
  panel.innerHTML = `<form class="teacher-form-card" id="teacher-culture-form">
    <div><p class="teacher-label">CULTURE</p><h3>Add a resource</h3></div><label>Title<input name="title" required></label><label>Language<input name="language" required></label>
    <label>Topic<input name="topic"></label><label>External URL<input name="url" type="url" placeholder="https://"></label><label>Description<textarea name="description" rows="3"></textarea></label>
    <button class="teacher-primary-button" type="submit">Save resource</button><p class="teacher-form-status" data-form-status></p>
  </form>${listCard('Published and draft resources', data, (item) => `${item.title} · ${item.language} · ${item.status}`)}`
  document.querySelector('#teacher-culture-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())
    const user = await getCurrentUser()
    await saveFormRecord(form, form.querySelector('[data-form-status]'), 'culture_resources', {
      teacher_id: user?.id, title: values.title.trim(), language: values.language.trim(), topic: values.topic.trim() || null,
      url: values.url.trim() || null, description: values.description.trim() || null, status: 'draft'
    }, 'Resource saved.')
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

function average(values) {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value))
  return numbers.length ? Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length) : 0
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
