import './teacher.css'

import { getCurrentUser } from './lib/auth.js'
import { supabase } from './lib/supabase.js'
import { hasTeacherAccess } from './lib/access.js'
import {
  renderTeacherWorkspace,
  setupTeacherWorkspace
} from './components/teacherWorkspace.js'

let allStudentsCache = []

const LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'


/* =========================================================
   INITIAL LOAD
   ========================================================= */

async function loadTeacherDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    showAccessDenied(
      'You are not logged in.',
      'Please log in to access the Teacher Dashboard.'
    )

    return
  }

  const {
    data: teacher,
    error
  } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !hasTeacherAccess(user, teacher)) {
    showAccessDenied(
      'Access denied.',
      'This account does not have Teacher access.'
    )

    return
  }

  renderTeacherDashboard(user)
}


/* =========================================================
   ACCESS DENIED
   ========================================================= */

function showAccessDenied(title, message) {
  const app = document.querySelector('#app')

  if (!app) return

  app.innerHTML = `
    <div class="teacher-access-denied">

      <div class="teacher-access-card">

        <div class="teacher-access-logo">
          <img
            src="${LOGO}"
            alt="Vera Orbis"
          >
        </div>

        <p class="teacher-label">
          VERA ORBIS
        </p>

        <h1>
          ${escapeHtml(title)}
        </h1>

        <p>
          ${escapeHtml(message)}
        </p>

        <div class="teacher-access-actions">
          <a href="/login.html" class="teacher-primary-action">
            Go to Sign in ↗
          </a>
          <a href="/" class="teacher-secondary-action">
            Return to Vera Orbis
          </a>
        </div>

      </div>

    </div>
  `
}


/* =========================================================
   MAIN DASHBOARD
   ========================================================= */

function renderMainDashboardContent() {
  return `
    <section class="teacher-welcome">

      <div>

        <p class="teacher-label">
          VERA ORBIS · TEACHER ACCESS
        </p>

        <h1>
          Your students.
          <span>Your journey.</span>
        </h1>

        <p>
          Manage your students, learning materials
          and progress from one place.
        </p>

      </div>


      <div class="teacher-welcome-orbit">

        <div class="teacher-orbit-ring ring-one"></div>

        <div class="teacher-orbit-ring ring-two"></div>

        <div class="teacher-orbit-center">

          <img
            src="${LOGO}"
            alt="Vera Orbis"
          >

        </div>

      </div>

    </section>

    ${renderTeacherWorkspace()}


    <section class="teacher-section" id="teacher-students-section">

      <div class="teacher-section-heading">

        <div>

          <p class="teacher-label">
            STUDENTS
          </p>

          <h2>
            Your students.
          </h2>

        </div>

        <div class="teacher-search-wrapper">

          <input
            type="search"
            id="student-search-input"
            class="teacher-search-input"
            placeholder="Search students by name, language or level..."
            autocomplete="off"
          >

        </div>

      </div>


      <div
        id="teacher-students"
        class="teacher-students"
      >

        <div class="teacher-loading">
          Loading students...
        </div>

      </div>

    </section>


    <section class="teacher-section teacher-tools">

      <div class="teacher-section-heading">

        <div>

          <p class="teacher-label">
            TOOLS
          </p>

          <h2>
            Manage Vera Orbis.
          </h2>

        </div>

      </div>


      <div class="teacher-tools-grid">

        <article class="teacher-tool-card">

          <span class="teacher-tool-icon">
            +
          </span>

          <div>

            <span>
              STUDENTS
            </span>

            <h3>
              Add and manage students
            </h3>

            <p>
              Organize your student profiles and learning journeys.
            </p>

          </div>

        </article>


        <article class="teacher-tool-card">

          <span class="teacher-tool-icon">
            PDF
          </span>

          <div>

            <span>
              MATERIALS
            </span>

            <h3>
              Upload class materials
            </h3>

            <p>
              Give each student personalized resources.
            </p>

          </div>

        </article>


        <article class="teacher-tool-card">

          <span class="teacher-tool-icon">
            %
          </span>

          <div>

            <span>
              PROGRESS
            </span>

            <h3>
              Update student progress
            </h3>

            <p>
              Keep each student's journey up to date.
            </p>

          </div>

        </article>

      </div>

    </section>
  `
}

export function returnToTeacherDashboard(scrollToStudents = false) {
  const mainContainer = document.querySelector('#teacher-main-container')
  if (!mainContainer) return

  if (typeof window !== 'undefined' && window.location?.hash?.startsWith('#student-')) {
    try {
      history.pushState(null, '', '#dashboard')
    } catch {}
  }

  mainContainer.innerHTML = renderMainDashboardContent()
  setupTeacherWorkspace()
  loadStudents()

  if (scrollToStudents) {
    const studentsEl = document.querySelector('#teacher-students-section')
    if (studentsEl) {
      studentsEl.scrollIntoView({ behavior: 'smooth' })
      return
    }
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function renderTeacherDashboard(user) {
  const app = document.querySelector('#app')

  if (!app) return

  app.innerHTML = `
    <div class="teacher-page">

      <header class="teacher-navbar">

        <a
          href="/"
          class="teacher-logo"
        >
          <img
            src="${LOGO}"
            alt="Vera Orbis"
          >

          <span>
            VERA <strong>ORBIS</strong>
          </span>
        </a>

        <div class="teacher-account">

          <span class="teacher-account-label">
            TEACHER
          </span>

          <span class="teacher-account-email">
            ${escapeHtml(user.email || '')}
          </span>

          <button
            type="button"
            id="teacher-logout-button"
            class="teacher-logout-btn"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            Sign out ↗
          </button>

        </div>

      </header>


      <main
        class="teacher-content"
        id="teacher-main-container"
      >
        ${renderMainDashboardContent()}
      </main>


      <footer class="teacher-footer">

        <span>
          VERA ORBIS
        </span>

        <span>
          LEARN IT · LIVE IT · SPEAK IT
        </span>

      </footer>

    </div>
  `

  setupTeacherWorkspace()
  loadStudents()

  if (typeof window !== 'undefined') {
    const handleHashChange = () => {
      const hash = window.location.hash || ''
      const match = hash.match(/^#student-(.+)$/)
      if (match) {
        openStudentProfile(match[1])
      } else if (hash === '' || hash === '#' || hash === '#dashboard') {
        const isProfileOpen = Boolean(document.querySelector('.student-profile-view'))
        if (isProfileOpen) {
          returnToTeacherDashboard(false)
        }
      }
    }

    window.removeEventListener('hashchange', window._teacherHashHandler)
    window._teacherHashHandler = handleHashChange
    window.addEventListener('hashchange', handleHashChange)

    if (window.location.hash && window.location.hash.startsWith('#student-')) {
      handleHashChange()
    }
  }

  document
    .querySelector('#teacher-logout-button')
    ?.addEventListener('click', async () => {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Error signing out:', err)
      } finally {
        window.location.replace('/login.html')
      }
    })
}


/* =========================================================
   STUDENTS LIST
   ========================================================= */

async function loadStudents() {
  const container = document.querySelector('#teacher-students')

  if (!container) return

  container.innerHTML = `
    <div class="teacher-loading">
      Loading students...
    </div>
  `

  const {
    data: students,
    error
  } = await supabase
    .from('profiles')
    .select('*')
    .order('name')

  if (error) {
    console.error('STUDENTS LOAD ERROR:', error)

    container.innerHTML = `
      <div class="teacher-empty-state teacher-error-state">

        <h3>
          Could not load students.
        </h3>

        <p>
          There was a problem loading the student list.
          Check the browser console for technical details.
        </p>

      </div>
    `

    return
  }

  allStudentsCache = students || []

  renderStudentsList(allStudentsCache)

  setupStudentSearch()
}


/* =========================================================
   STUDENT SEARCH
   ========================================================= */

function setupStudentSearch() {
  const searchInput =
    document.querySelector('#student-search-input')

  if (!searchInput) return

  searchInput.addEventListener('input', handleStudentSearch)
}


function handleStudentSearch(event) {
  const query =
    event.target.value
      .toLowerCase()
      .trim()

  if (!query) {
    renderStudentsList(allStudentsCache)
    return
  }

  const filteredStudents =
    allStudentsCache.filter((student) => {

      const name =
        String(student.name || '').toLowerCase()

      const language =
        String(student.language || '').toLowerCase()

      const level =
        String(student.level || '').toLowerCase()

      const levelName =
        String(student.level_name || '').toLowerCase()

      return (
        name.includes(query) ||
        language.includes(query) ||
        level.includes(query) ||
        levelName.includes(query)
      )
    })

  renderStudentsList(filteredStudents)
}


/* =========================================================
   RENDER STUDENTS
   ========================================================= */

function renderStudentsList(students) {
  const container =
    document.querySelector('#teacher-students')

  if (!container) return

  if (!students || students.length === 0) {

    container.innerHTML = `
      <div class="teacher-empty-state">

        <h3>
          No students found.
        </h3>

        <p>
          Try adjusting your search.
        </p>

      </div>
    `

    return
  }

  container.innerHTML =
    students
      .map((student) => {

        const progress =
          normalizeProgress(student.progress)

        const lessonsCompleted =
          Number(student.lessons_completed || 0)

        const totalLessons =
          student.total_lessons != null && Number(student.total_lessons) > 0
            ? Number(student.total_lessons)
            : null

        const language =
          student.language || 'Language'

        const level =
          student.level || 'Level pending'

        const currentModule =
          student.current_module ||
          'Beginning journey'

        return `
          <article
            class="teacher-student-card"
            data-student-id="${escapeHtml(student.id)}"
            tabindex="0"
            role="button"
            aria-label="Open ${escapeHtml(student.name)} profile"
          >

            <div class="teacher-student-avatar">

              <img
                src="${LOGO}"
                alt=""
              >

            </div>


            <div class="teacher-student-info">

              <span class="teacher-student-language">
                ${escapeHtml(language)} · ${escapeHtml(level)}
              </span>

              <h3>
                ${escapeHtml(student.name)}
              </h3>

              <p>
                ${escapeHtml(currentModule)}
              </p>

            </div>


            <div class="teacher-student-progress">

              <div class="teacher-progress-heading">

                <span>
                  PROGRESS
                </span>

                <strong>
                  ${progress}%
                </strong>

              </div>

              <div class="teacher-progress-track">

                <div
                  class="teacher-progress-fill"
                  style="width: ${progress}%"
                ></div>

              </div>

              <small>
                ${totalLessons ? `${lessonsCompleted}/${totalLessons} lessons` : `${lessonsCompleted} lessons · Pending total`}
              </small>

            </div>

          </article>
        `
      })
      .join('')

  attachStudentCardEvents()
}


/* =========================================================
   STUDENT CARD EVENTS
   ========================================================= */

function attachStudentCardEvents() {
  const cards =
    document.querySelectorAll(
      '.teacher-student-card'
    )

  cards.forEach((card) => {

    card.addEventListener('click', () => {

      const studentId =
        card.dataset.studentId

      if (studentId) {
        openStudentProfile(studentId)
      }

    })


    card.addEventListener('keydown', (event) => {

      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {

        event.preventDefault()

        const studentId =
          card.dataset.studentId

        if (studentId) {
          openStudentProfile(studentId)
        }

      }

    })

  })
}


/* =========================================================
   RETURN TO STUDENTS
   ========================================================= */

function showStudentsView() {
  returnToTeacherDashboard(true)
}


/* =========================================================
   STUDENT PROFILE
   ========================================================= */

async function openStudentProfile(studentId) {
  const mainContainer =
    document.querySelector('#teacher-main-container')

  if (!mainContainer) return

  if (typeof window !== 'undefined' && window.location && window.location.hash !== `#student-${studentId}`) {
    try {
      history.pushState(null, '', `#student-${studentId}`)
    } catch {}
  }

  mainContainer.innerHTML = `
    <div class="teacher-loading teacher-profile-loading">

      <div class="teacher-loading-spinner"></div>

      <p>
        Loading student profile...
      </p>

    </div>
  `

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })


  const [
    profileRes,
    onboardingRes,
    materialsRes,
    feedbackRes,
    challengesRes,
    exercisesRes,
    messagesRes
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle(),

    supabase
      .from('onboarding_responses')
      .select(`
        student_id,
        learning_goals,
        motivation,
        previous_experience,
        real_life_needs,
        preferred_topics,
        learning_preferences,
        difficulties,
        about_you,
        most_important,
        experience_positive,
        experience_negative,
        challenge_context,
        lesson_preferences,
        vision
      `)
      .eq('student_id', studentId)
      .maybeSingle(),

    supabase
      .from('materials')
      .select('*')
      .or(`student_id.eq.${studentId},audience.eq.all`)
      .order('created_at', { ascending: false }),

    supabase
      .from('feedback')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),

    supabase
      .from('weekly_challenges')
      .select('*')
      .or(`student_id.eq.${studentId},audience.eq.all,student_id.is.null`)
      .order('created_at', { ascending: false }),

    supabase
      .from('exercise_assignments')
      .select('id, exercise_id, status, assigned_at, due_at')
      .eq('student_id', studentId),

    supabase
      .from('inbox_messages')
      .select('*')
      .or(`recipient_id.eq.${studentId},sender_id.eq.${studentId}`)
      .order('created_at', { ascending: false })
      .limit(30)
  ])

  if (profileRes.error || !profileRes.data) {
    console.error(
      'PROFILE LOAD ERROR:',
      profileRes.error
    )

    renderStudentProfileError()

    return
  }

  const profile = profileRes.data
  const onboarding = onboardingRes.data
  const materials = materialsRes.data || []
  const feedback = feedbackRes.data || []
  const challenges = challengesRes.data || []
  const exercises = exercisesRes.error ? [] : (exercisesRes.data || [])
  const messages = messagesRes.error ? [] : (messagesRes.data || [])

  renderStudentProfile(
    profile,
    onboarding,
    materials,
    feedback,
    challenges,
    exercises,
    messages
  )
}


/* =========================================================
   STUDENT PROFILE ERROR
   ========================================================= */

function renderStudentProfileError() {
  const mainContainer =
    document.querySelector('#teacher-main-container')

  if (!mainContainer) return

  mainContainer.innerHTML = `
    <section class="teacher-section">

      <div class="teacher-empty-state teacher-error-state">

        <p class="teacher-label">
          STUDENT PROFILE
        </p>

        <h2>
          Could not load this student.
        </h2>

        <p>
          The student profile could not be retrieved.
          Please return to the student list and try again.
        </p>

        <button
          type="button"
          id="back-to-students-error"
          class="teacher-primary-button"
        >
          Back to Students
        </button>

      </div>

    </section>
  `

  const backButton =
    document.querySelector(
      '#back-to-students-error'
    )

  if (backButton) {
    backButton.addEventListener(
      'click',
      showStudentsView
    )
  }
}


function renderStudentMaterialsSection(profile, materials = []) {
  return `
    <section class="student-profile-section" id="student-materials-section">
      <div class="student-profile-section-heading">
        <p class="teacher-label">ASSIGNED MATERIALS</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
          <h2>Materials & resources for ${escapeHtml(profile.name)}</h2>
          <span class="teacher-label">${materials.length} available</span>
        </div>
      </div>

      <div class="teacher-workspace-columns" style="display:grid;grid-template-columns:1fr;gap:20px;">
        <div class="teacher-list-card" id="student-materials-list">
          <h3 style="margin-bottom:12px;">Assigned resources</h3>
          ${materials.length ? `
            <ul style="margin:0;">
              ${materials.map(m => `
                <li style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid var(--vo-border);">
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <strong>${escapeHtml(m.title)}</strong>
                      <span class="teacher-badge ${m.audience === 'all' ? 'badge-global' : 'badge-individual'}">${m.audience === 'all' ? 'Global' : 'Individual'}</span>
                    </div>
                    <span style="font-size:12px;color:rgba(24,59,102,0.65);display:block;margin-top:2px;">
                      ${escapeHtml((m.type || 'resource').toUpperCase())} · ${m.audience === 'all' ? 'Shared with all students' : 'Assigned directly to this student'}
                      ${m.description ? ` · ${escapeHtml(m.description)}` : ''}
                    </span>
                  </div>
                  <div class="teacher-inline-actions">
                    ${m.file_path ? `<button type="button" class="teacher-secondary-button" data-view-material-file="${escapeHtml(m.file_path)}" style="padding:6px 14px;font-size:12px;">Open file ↗</button>` : ''}
                    <button type="button" class="teacher-danger-button teacher-delete-material-btn" data-delete-material-id="${escapeHtml(m.id)}" data-material-filepath="${escapeHtml(m.file_path || '')}" data-material-title="${escapeHtml(m.title)}" style="padding:6px 12px;font-size:12px;">Eliminar</button>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="teacher-muted" style="margin-top:10px;">No materials assigned to this student yet.</p>'}
        </div>

        <form class="teacher-form-card" id="student-material-assign-form">
          <div>
            <p class="teacher-label">ASSIGN MATERIAL</p>
            <h3>Upload or create a learning resource</h3>
          </div>
          <label>Title<input name="title" required maxlength="160" placeholder="e.g. Conversation Guide Unit 1"></label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <label>Type<select name="type">
              <option value="class">Class Material</option>
              <option value="practice">Practice</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="resource">Resource</option>
            </select></label>
            <label>Audience<select name="audience">
              <option value="student">This student only (${escapeHtml(profile.name)})</option>
              <option value="all">All students (Global)</option>
            </select></label>
          </div>
          <label>Description<textarea name="description" rows="2" placeholder="Instructions or summary for the student..."></textarea></label>
          <label>Attach private file (PDF, image, audio, video; max 10MB)<input name="file" type="file" accept=".pdf,image/*,audio/*,video/*"></label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
            <button class="teacher-primary-button" type="submit" id="save-student-material-button">Assign material</button>
            <p class="teacher-form-status" id="student-material-status" aria-live="polite"></p>
          </div>
        </form>
      </div>
    </section>
  `
}

function renderStudentFeedbackSection(profile, feedback = []) {
  return `
    <section class="student-profile-section" id="student-feedback-section">
      <div class="student-profile-section-heading">
        <p class="teacher-label">STUDENT FEEDBACK</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
          <h2>Session feedback & progress guidance</h2>
          <span class="teacher-label">${feedback.length} entry/entries</span>
        </div>
      </div>

      <div class="teacher-workspace-columns" style="display:grid;grid-template-columns:1fr;gap:20px;">
        <div class="teacher-list-card" id="student-feedback-list">
          <h3 style="margin-bottom:12px;">Past feedback</h3>
          ${feedback.length ? `
            <ul style="margin:0;">
              ${feedback.map(item => `
                <li style="padding:12px 0;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px;">
                    <strong style="color:var(--vo-purple);font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">
                      ${escapeHtml(item.category || 'General')}
                    </strong>
                    <small style="color:rgba(24,59,102,0.5);">
                      ${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </small>
                  </div>
                  <h4 style="margin:0 0 4px;font-size:15px;color:var(--vo-navy);">${escapeHtml(item.title || item.type || 'Session Feedback')}</h4>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(24,59,102,0.85);">${escapeHtml(item.message || item.notes || '').replace(/\n/g, '<br>')}</p>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="teacher-muted" style="margin-top:10px;">No feedback entries recorded yet for this student.</p>'}
        </div>

        <form class="teacher-form-card" id="student-feedback-create-form">
          <div>
            <p class="teacher-label">NEW FEEDBACK</p>
            <h3>Leave feedback for ${escapeHtml(profile.name)}</h3>
          </div>
          <label>Category<select name="category">
            <option value="Speaking">Speaking</option>
            <option value="Pronunciation">Pronunciation</option>
            <option value="Grammar">Grammar</option>
            <option value="Vocabulary">Vocabulary</option>
            <option value="General">General</option>
          </select></label>
          <label>Title<input name="title" required maxlength="160" placeholder="e.g. Great progress in past continuous fluency"></label>
          <label>Guidance & Observations<textarea name="message" required rows="4" placeholder="Detail what went well, pronunciation points, grammar corrections, or focus areas for the next session..."></textarea></label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
            <button class="teacher-primary-button" type="submit" id="save-student-feedback-button">Save feedback</button>
            <p class="teacher-form-status" id="student-feedback-status" aria-live="polite"></p>
          </div>
        </form>
      </div>
    </section>
  `
}

function renderStudentChallengesSection(profile, challenges = []) {
  return `
    <section class="student-profile-section" id="student-challenges-section">
      <div class="student-profile-section-heading">
        <p class="teacher-label">WEEKLY CHALLENGES</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
          <h2>Assigned challenges & tasks</h2>
          <span class="teacher-label">${challenges.length} active/recent</span>
        </div>
      </div>

      <div class="teacher-workspace-columns" style="display:grid;grid-template-columns:1fr;gap:20px;">
        <div class="teacher-list-card" id="student-challenges-list">
          <h3 style="margin-bottom:12px;">Active challenges</h3>
          ${challenges.length ? `
            <ul style="margin:0;">
              ${challenges.map(c => `
                <li style="padding:12px 0;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <strong>${escapeHtml(c.title)}</strong>
                    <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(32,199,181,0.15);color:var(--vo-navy);font-weight:600;">
                      ${escapeHtml(c.status || 'active').toUpperCase()}
                    </span>
                  </div>
                  ${c.instructions ? `<p style="margin:6px 0;font-size:13px;line-height:1.5;color:rgba(24,59,102,0.8);">${escapeHtml(c.instructions)}</p>` : ''}
                  ${c.end_date ? `<small style="color:rgba(24,59,102,0.5);">Due: ${escapeHtml(c.end_date)}</small>` : ''}
                </li>
              `).join('')}
            </ul>
          ` : '<p class="teacher-muted" style="margin-top:10px;">No challenges assigned yet.</p>'}
        </div>

        <form class="teacher-form-card" id="student-challenge-assign-form">
          <div>
            <p class="teacher-label">NEW CHALLENGE</p>
            <h3>Assign a challenge to ${escapeHtml(profile.name)}</h3>
          </div>
          <label>Title<input name="title" required maxlength="160" placeholder="e.g. Record 2-minute voice reflection on your weekend"></label>
          <label>Instructions<textarea name="instructions" rows="3" placeholder="Provide clear steps for the student..."></textarea></label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <label>Due date<input type="date" name="end_date"></label>
            <label>Audience<select name="audience">
              <option value="student">This student only</option>
              <option value="all">All students (Global)</option>
            </select></label>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
            <button class="teacher-primary-button" type="submit" id="save-student-challenge-button">Publish challenge</button>
            <p class="teacher-form-status" id="student-challenge-status" aria-live="polite"></p>
          </div>
        </form>
      </div>
    </section>
  `
}


function renderStudentInboxSection(profile, messages = []) {
  return `
    <section class="student-profile-section" id="student-inbox-section">
      <div class="student-profile-section-heading">
        <p class="teacher-label">DIRECT MESSAGING & INBOX</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
          <h2>Direct communication with ${escapeHtml(profile.name)}</h2>
          <span class="teacher-label">${messages.length} message(s)</span>
        </div>
      </div>

      <div class="teacher-workspace-columns" style="display:grid;grid-template-columns:1fr;gap:20px;">
        <div class="teacher-list-card">
          <h3 style="margin-bottom:12px;">Message history</h3>
          ${messages.length ? `
            <ul style="margin:0;">
              ${messages.map(m => {
                const isFromStudent = m.sender_role === 'student'
                return `
                  <li style="padding:12px 0;border-bottom:1px solid var(--vo-border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;">
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                        <span class="teacher-badge ${isFromStudent ? 'badge-individual' : 'badge-global'}">
                          ${isFromStudent ? `From: ${escapeHtml(profile.name)}` : 'Sent by Teacher'}
                        </span>
                        <span class="teacher-badge ${m.is_read ? 'badge-published' : 'badge-draft'}">
                          ${m.is_read ? 'Read' : 'Unread'}
                        </span>
                        <span style="font-size:11px;color:rgba(24,59,102,0.6);">${formatDate(m.created_at)}</span>
                      </div>
                      <strong style="font-size:14px;color:var(--vo-navy);display:block;">${escapeHtml(m.subject)}</strong>
                      <p style="margin:4px 0 0;font-size:13px;color:rgba(24,59,102,0.85);white-space:pre-wrap;line-height:1.4;">${escapeHtml(m.body)}</p>
                    </div>
                    ${isFromStudent && !m.is_read ? `
                      <button type="button" class="teacher-secondary-button" data-student-msg-read="${escapeHtml(m.id)}" style="padding:4px 10px;font-size:11px;">Mark read</button>
                    ` : ''}
                  </li>
                `
              }).join('')}
            </ul>
          ` : '<p class="teacher-muted" style="margin-top:10px;">No messages exchanged with this student yet.</p>'}
        </div>

        <form class="teacher-form-card" id="student-message-send-form">
          <div>
            <p class="teacher-label">COMPOSE MESSAGE</p>
            <h3>Send a direct note to ${escapeHtml(profile.name)}</h3>
          </div>
          <label>Subject
            <input name="subject" required maxlength="160" placeholder="e.g. Preparation for our next session">
          </label>
          <label>Message
            <textarea name="body" required rows="3" placeholder="Write your message or recommendations..."></textarea>
          </label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
            <button class="teacher-primary-button" type="submit" id="save-student-message-button">Send message</button>
            <p class="teacher-form-status" id="student-message-status" aria-live="polite"></p>
          </div>
        </form>
      </div>
    </section>
  `
}

/* =========================================================
   RENDER STUDENT PROFILE
   ========================================================= */
function renderStudentProfile(
  profile,
  onboarding,
  materials = [],
  feedback = [],
  challenges = [],
  exercises = [],
  messages = []
) {
  const mainContainer =
    document.querySelector('#teacher-main-container')

  if (!mainContainer) return


  const lessonsCompleted =
    Number(profile.lessons_completed || 0)

  const totalLessons =
    profile.total_lessons != null && Number(profile.total_lessons) > 0
      ? Number(profile.total_lessons)
      : null

  const progress =
    totalLessons
      ? Math.min(100, Math.round((lessonsCompleted / totalLessons) * 100))
      : normalizeProgress(profile.progress)


  mainContainer.innerHTML = `
    <section class="student-profile-view">

      <div class="student-profile-topbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px;">

        <button
          type="button"
          id="back-to-dashboard"
          class="teacher-secondary-button"
        >
          ← Volver al panel (Teacher Dashboard)
        </button>

        <button
          type="button"
          id="back-to-students"
          class="teacher-secondary-button"
        >
          Ver lista de estudiantes
        </button>

      </div>


      <!-- =====================================================
           STUDENT HEADER
           ===================================================== -->

      <header class="student-profile-header">

        <div class="student-profile-identity">

          <div class="student-profile-avatar">

            <img
              src="${LOGO}"
              alt=""
            >

          </div>

          <div>

            <p class="teacher-label">
              STUDENT DOSSIER
            </p>

            <h1>
              ${escapeHtml(profile.name)}
            </h1>

            <p class="student-profile-meta">

              <strong>
                ${escapeHtml(
                  profile.language ||
                  'Language not specified'
                )}
              </strong>

              <span>·</span>

              ${escapeHtml(
                profile.level ||
                'Level pending'
              )}

              ${
                profile.level_name
                  ? `
                    <span>·</span>
                    ${escapeHtml(
                      profile.level_name
                    )}
                  `
                  : ''
              }

              <span>·</span>
              <span class="teacher-badge badge-global" title="Idioma de interfaz seleccionado">UI: ${(profile.interface_language || 'es').toUpperCase()}</span>

            </p>

          </div>

        </div>


        <div class="student-profile-progress-card">

          <span class="student-profile-card-label">
            CURRENT JOURNEY
          </span>

          <div class="student-profile-progress-value">

            <strong>
              ${progress}%
            </strong>

            <span>
              ${totalLessons ? `${lessonsCompleted}/${totalLessons} lessons` : `${lessonsCompleted} completed · Total pending`}
            </span>

          </div>

          <div class="teacher-progress-track">

            <div
              class="teacher-progress-fill"
              style="width: ${progress}%"
            ></div>

          </div>

          <p>
            ${escapeHtml(
              profile.current_module ||
              'Beginning journey'
            )}
          </p>

        </div>

      </header>


      <div class="student-profile-grid">

        <div class="student-profile-main">


          <!-- =================================================
               CURRENT JOURNEY
               ================================================= -->

          <section class="student-profile-section">

            <div class="student-profile-section-heading">

              <p class="teacher-label">
                CURRENT JOURNEY
              </p>

              <h2>
                Where they are now.
              </h2>

            </div>


            <div class="student-journey-grid">

              ${renderJourneyItem(
                'Goal',
                profile.goal
              )}

              ${renderJourneyItem(
                'Current module',
                profile.current_module
              )}

              ${renderJourneyItem(
                'Next step',
                profile.next_step
              )}

              ${renderJourneyItem(
                'Lessons',
                totalLessons ? `${lessonsCompleted} of ${totalLessons}` : `${lessonsCompleted} completed · Pending total`
              )}

            </div>

          </section>


          <!-- =================================================
               ACADEMIC INFORMATION
               ================================================= -->

          <section
            class="student-profile-section"
            id="academic-information-section"
          >

            <div class="student-profile-section-heading">

              <p class="teacher-label">
                ACADEMIC INFORMATION
              </p>

              <div
                style="
                  display:flex;
                  align-items:center;
                  justify-content:space-between;
                  gap:20px;
                  flex-wrap:wrap;
                "
              >

                <h2>
                  Their current academic record.
                </h2>

                <button
                  type="button"
                  id="edit-academic-information"
                  class="teacher-secondary-button"
                >
                  Edit information
                </button>

              </div>

            </div>


            <!-- VIEW MODE -->

            <div id="academic-information-view">

              <div class="student-journey-grid">

                ${renderJourneyItem(
                  'Level',
                  profile.level
                )}

                ${renderJourneyItem(
                  'Level name',
                  profile.level_name
                )}

                ${renderJourneyItem(
                  'Progress',
                  `${progress}%`
                )}

                ${renderJourneyItem(
                  'Lessons completed',
                  lessonsCompleted
                )}

                ${renderJourneyItem(
                  'Total lessons',
                  totalLessons ? totalLessons : 'Pending configuration'
                )}

                ${renderJourneyItem(
                  'Current module',
                  profile.current_module
                )}

                ${renderJourneyItem(
                  'Next step',
                  profile.next_step
                )}

                ${renderJourneyItem(
                  'Goal',
                  profile.goal
                )}

                ${renderJourneyItem(
                  'Interface language',
                  (profile.interface_language || 'es').toUpperCase()
                )}

              </div>

            </div>


            <!-- EDIT MODE -->

            <div
              id="academic-information-edit"
              style="display:none;"
            >

              <div
                style="
                  display:grid;
                  grid-template-columns:repeat(2,minmax(0,1fr));
                  gap:16px;
                "
              >

                <label class="teacher-form-field">

                  <span class="teacher-label">
                    TARGET LANGUAGE
                  </span>

                  <input
                    type="text"
                    id="academic-language"
                    value="${escapeHtml(
                      profile.language || 'English'
                    )}"
                    placeholder="e.g. English, French, Mandarin"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    LEVEL
                  </span>

                  <input
                    type="text"
                    id="academic-level"
                    value="${escapeHtml(
                      profile.level || ''
                    )}"
                    placeholder="e.g. B1"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    LEVEL NAME
                  </span>

                  <input
                    type="text"
                    id="academic-level-name"
                    value="${escapeHtml(
                      profile.level_name || ''
                    )}"
                    placeholder="e.g. Intermediate"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    PROGRESS (%)
                  </span>

                  <input
                    type="number"
                    id="academic-progress"
                    min="0"
                    max="100"
                    value="${progress}"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    LESSONS COMPLETED
                  </span>

                  <input
                    type="number"
                    id="academic-lessons-completed"
                    min="0"
                    value="${lessonsCompleted}"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    TOTAL LESSONS
                  </span>

                  <input
                    type="number"
                    id="academic-total-lessons"
                    min="1"
                    value="${totalLessons || ''}"
                    placeholder="e.g. 20 (leave empty if pending)"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    CURRENT MODULE
                  </span>

                  <input
                    type="text"
                    id="academic-current-module"
                    value="${escapeHtml(
                      profile.current_module || ''
                    )}"
                    placeholder="e.g. Speaking Foundations"
                  >

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    INTERFACE LANGUAGE
                  </span>

                  <select
                    id="academic-interface-language"
                  >
                    <option value="es"${(profile.interface_language || 'es') === 'es' ? ' selected' : ''}>Español (es)</option>
                    <option value="en"${profile.interface_language === 'en' ? ' selected' : ''}>English (en)</option>
                    <option value="fr"${profile.interface_language === 'fr' ? ' selected' : ''}>Français (fr)</option>
                    <option value="zh"${profile.interface_language === 'zh' ? ' selected' : ''}>简体中文 (zh)</option>
                  </select>

                </label>

              </div>


              <div
                style="
                  display:grid;
                  grid-template-columns:1fr;
                  gap:16px;
                  margin-top:16px;
                "
              >

                <label class="teacher-form-field">

                  <span class="teacher-label">
                    NEXT STEP
                  </span>

                  <textarea
                    id="academic-next-step"
                    rows="3"
                    placeholder="What should the student work on next?"
                  >${escapeHtml(
                    profile.next_step || ''
                  )}</textarea>

                </label>


                <label class="teacher-form-field">

                  <span class="teacher-label">
                    GOAL
                  </span>

                  <textarea
                    id="academic-goal"
                    rows="3"
                    placeholder="What is the student's current goal?"
                  >${escapeHtml(
                    profile.goal || ''
                  )}</textarea>

                </label>

              </div>


              <div
                style="
                  display:flex;
                  align-items:center;
                  gap:10px;
                  flex-wrap:wrap;
                  margin-top:20px;
                "
              >

                <button
                  type="button"
                  id="save-academic-information"
                  class="teacher-primary-button"
                >
                  Save changes
                </button>

                <button
                  type="button"
                  id="cancel-academic-information"
                  class="teacher-secondary-button"
                >
                  Cancel
                </button>

                <p
                  id="academic-save-status"
                  class="teacher-notes-status"
                  aria-live="polite"
                ></p>

              </div>

            </div>

          </section>


          <!-- =================================================
               ASSIGNED MATERIALS
               ================================================= -->
          ${renderStudentMaterialsSection(profile, materials)}

          <!-- =================================================
               STUDENT FEEDBACK
               ================================================= -->
          ${renderStudentFeedbackSection(profile, feedback)}

          <!-- =================================================
               WEEKLY CHALLENGES
               ================================================= -->
          ${renderStudentChallengesSection(profile, challenges)}

          <!-- =================================================
               DIRECT MESSAGING & INBOX
               ================================================= -->
          ${renderStudentInboxSection(profile, messages)}


          <!-- =================================================
               LEARNING PROFILE
               ================================================= -->

          <section class="student-profile-section">

            <div class="student-profile-section-heading">

              <p class="teacher-label">
                LEARNING PROFILE
              </p>

              <h2>
                Who they are as a learner.
              </h2>

            </div>


            ${
              onboarding
                ? `
                  <div class="student-profile-fields">

                    ${renderOnboardingField(
                      'About the student',
                      onboarding.about_you
                    )}

                    ${renderOnboardingField(
                      'Main goal',
                      onboarding.learning_goals
                    )}

                    ${renderOnboardingChips(
                      'What matters most',
                      onboarding.most_important
                    )}

                    ${renderOnboardingChips(
                      'Real-life needs',
                      onboarding.real_life_needs
                    )}

                    ${renderOnboardingChips(
                      'Preferred topics',
                      onboarding.preferred_topics
                    )}

                  </div>
                `
                : renderNoOnboarding()
            }

          </section>


          ${
            onboarding
              ? `

                <!-- =========================================
                     EXPERIENCE
                     ========================================= -->

                <section class="student-profile-section">

                  <div class="student-profile-section-heading">

                    <p class="teacher-label">
                      EXPERIENCE
                    </p>

                    <h2>
                      Their previous learning journey.
                    </h2>

                  </div>


                  <div class="student-experience-grid">

                    ${renderOnboardingField(
                      'Previous experience',
                      onboarding.previous_experience
                    )}

                    ${renderOnboardingField(
                      'What worked',
                      onboarding.experience_positive
                    )}

                    ${renderOnboardingField(
                      "What didn't work",
                      onboarding.experience_negative
                    )}

                  </div>

                </section>


                <!-- =========================================
                     CHALLENGES
                     ========================================= -->

                <section class="student-profile-section">

                  <div class="student-profile-section-heading">

                    <p class="teacher-label">
                      CHALLENGES
                    </p>

                    <h2>
                      What needs attention.
                    </h2>

                  </div>


                  <div class="student-profile-fields">

                    ${renderOnboardingField(
                      'Difficulties',
                      onboarding.difficulties
                    )}

                    ${renderOnboardingChips(
                      'Challenge context',
                      onboarding.challenge_context
                    )}

                  </div>

                </section>


                <!-- =========================================
                     LEARNING STYLE
                     ========================================= -->

                <section class="student-profile-section">

                  <div class="student-profile-section-heading">

                    <p class="teacher-label">
                      LEARNING STYLE
                    </p>

                    <h2>
                      How they learn best.
                    </h2>

                  </div>


                  <div class="student-profile-fields">

                    ${renderOnboardingChips(
                      'Learning preferences',
                      onboarding.learning_preferences
                    )}

                    ${renderOnboardingField(
                      'Lesson preferences',
                      onboarding.lesson_preferences
                    )}

                  </div>

                </section>


                <!-- =========================================
                     VISION
                     ========================================= -->

                <section class="student-profile-section">

                  <div class="student-profile-section-heading">

                    <p class="teacher-label">
                      VISION
                    </p>

                    <h2>
                      Where they want to go.
                    </h2>

                  </div>


                  <div class="student-profile-fields">

                    ${renderOnboardingField(
                      'Vision',
                      onboarding.vision
                    )}

                    ${renderOnboardingField(
                      'Motivation',
                      onboarding.motivation
                    )}

                  </div>

                </section>

              `
              : ''
          }

        </div>


        <!-- =================================================
             SIDEBAR
             ================================================= -->

        <aside class="student-profile-sidebar">


          <!-- ===============================================
               TEACHER NOTES
               =============================================== -->

          <section class="teacher-notes-card">

            <p class="teacher-label">
              TEACHER NOTES
            </p>

            <h2>
              Private observations.
            </h2>

            <p class="teacher-notes-description">
              Private notes for planning lessons,
              tracking progress, and personalizing
              the student's learning experience.
            </p>

            <textarea
              id="teacher-private-notes"
              class="teacher-notes-textarea"
              placeholder="Write observations, pronunciation notes, goals for the next lesson, or ideas for personalized activities..."
            ></textarea>

            <button
              type="button"
              id="save-teacher-notes"
              class="teacher-primary-button"
            >
              Save notes
            </button>

            <p
              id="teacher-notes-status"
              class="teacher-notes-status"
              aria-live="polite"
            ></p>

          </section>


          <!-- ===============================================
               QUICK SUMMARY
               =============================================== -->

          <section class="student-summary-card">

            <p class="teacher-label">
              AT A GLANCE
            </p>

            <h2>
              Teaching focus.
            </h2>

            <div class="student-summary-list">

              ${renderSummaryItem(
                'Language',
                profile.language
              )}

              ${renderSummaryItem(
                'Level',
                profile.level_name ||
                profile.level
              )}

              ${renderSummaryItem(
                'Progress',
                `${progress}%`
              )}

              ${renderSummaryItem(
                'Current module',
                profile.current_module
              )}

            </div>

          </section>

        </aside>

      </div>

    </section>
  `


  /* =========================================================
     EXISTING PROFILE EVENTS
     ========================================================= */


  /* Direct student message send form */
  const studentMessageForm = document.querySelector('#student-message-send-form')
  if (studentMessageForm) {
    studentMessageForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const statusEl = document.querySelector('#student-message-status')
      const submitBtn = document.querySelector('#save-student-message-button')
      try {
        const user = await getCurrentUser()
        if (!user) {
          if (statusEl) {
            statusEl.textContent = 'Session expired. Please log in.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        const formData = new FormData(studentMessageForm)
        const subject = String(formData.get('subject') || '').trim()
        const body = String(formData.get('body') || '').trim()

        if (!subject || !body) {
          if (statusEl) {
            statusEl.textContent = 'Please enter both subject and message.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (submitBtn) {
          submitBtn.disabled = true
          submitBtn.textContent = 'Sending...'
        }

        const { error } = await supabase.from('inbox_messages').insert({
          sender_id: user.id,
          sender_role: 'teacher',
          recipient_id: profile.id,
          recipient_role: 'student',
          subject,
          body,
          is_read: false
        })

        if (error) {
          if (statusEl) {
            statusEl.textContent = error.message || 'Could not send message.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (statusEl) {
          statusEl.textContent = 'Message sent to student.'
          statusEl.className = 'teacher-form-status is-success'
        }
        studentMessageForm.reset()
        setTimeout(() => {
          openStudentProfile(profile.id)
        }, 600)
      } catch (err) {
        console.error('Send student message error:', err)
        if (statusEl) {
          statusEl.textContent = 'An unexpected error occurred.'
          statusEl.className = 'teacher-form-status is-error'
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Send message'
        }
      }
    })
  }

  /* Direct student message mark-as-read buttons */
  document.querySelectorAll('[data-student-msg-read]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgId = btn.dataset.studentMsgRead
      btn.disabled = true
      await supabase.from('inbox_messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', msgId)
      openStudentProfile(profile.id)
    })
  })

    attachStudentProfileEvents(
    profile.id
  )


  /* =========================================================
     ACADEMIC INFORMATION EVENTS
     ========================================================= */

  const editAcademicButton =
    document.querySelector(
      '#edit-academic-information'
    )

  const academicView =
    document.querySelector(
      '#academic-information-view'
    )

  const academicEdit =
    document.querySelector(
      '#academic-information-edit'
    )

  const cancelAcademicButton =
    document.querySelector(
      '#cancel-academic-information'
    )

  if (
    editAcademicButton &&
    academicView &&
    academicEdit
  ) {

    editAcademicButton.addEventListener(
      'click',
      () => {

        academicView.style.display =
          'none'

        academicEdit.style.display =
          'block'

        editAcademicButton.style.display =
          'none'

        const firstInput =
          document.querySelector(
            '#academic-level'
          )

        if (firstInput) {
          firstInput.focus()
        }

      }
    )

  }


  if (
    cancelAcademicButton &&
    academicView &&
    academicEdit &&
    editAcademicButton
  ) {

    cancelAcademicButton.addEventListener(
      'click',
      () => {

        academicEdit.style.display =
          'none'

        academicView.style.display =
          'block'

        editAcademicButton.style.display =
          'inline-flex'

      }
    )

  }


  const saveAcademicButton =
  document.querySelector(
    '#save-academic-information'
  )

const academicStatus =
  document.querySelector(
    '#academic-save-status'
  )

if (saveAcademicButton) {

  saveAcademicButton.addEventListener(
    'click',
    async () => {

      try {

        const user =
          await getCurrentUser()

        if (!user) {

          if (academicStatus) {
            academicStatus.textContent =
              'Your session has expired. Please log in again.'

            academicStatus.classList.remove(
              'is-success'
            )

            academicStatus.classList.add(
              'is-visible',
              'is-error'
            )
          }

          return
        }

        const language =
          document.querySelector(
            '#academic-language'
          )?.value.trim() || profile.language || 'English'

        const level =
          document.querySelector(
            '#academic-level'
          )?.value.trim() || null

        const levelName =
          document.querySelector(
            '#academic-level-name'
          )?.value.trim() || null

        const lessonsCompletedInput =
          document.querySelector(
            '#academic-lessons-completed'
          )?.value

        let updatedLessonsCompleted =
          Math.max(0, Number(lessonsCompletedInput || 0))

        const totalLessonsInput =
          document.querySelector(
            '#academic-total-lessons'
          )?.value.trim()

        const updatedTotalLessons =
          totalLessonsInput && !Number.isNaN(Number(totalLessonsInput)) && Number(totalLessonsInput) > 0
            ? Number(totalLessonsInput)
            : null

        const progressInput =
          document.querySelector(
            '#academic-progress'
          )?.value

        let updatedProgress =
          updatedTotalLessons
            ? Math.min(100, Math.round((updatedLessonsCompleted / updatedTotalLessons) * 100))
            : Math.max(0, Math.min(100, Number(progressInput || 0)))

        const currentModule =
          document.querySelector(
            '#academic-current-module'
          )?.value.trim() || null

        const nextStep =
          document.querySelector(
            '#academic-next-step'
          )?.value.trim() || null

        const goal =
          document.querySelector(
            '#academic-goal'
          )?.value.trim() || null

        const interfaceLanguage =
          document.querySelector(
            '#academic-interface-language'
          )?.value || 'es'

        saveAcademicButton.disabled = true
        saveAcademicButton.textContent = 'Saving...'

        const payload = {
          language: language,
          level: level,
          level_name: levelName,
          progress: updatedProgress,
          goal: goal,
          lessons_completed:
            updatedLessonsCompleted,
          total_lessons:
            updatedTotalLessons,
          current_module:
            currentModule,
          next_step:
            nextStep
        }

        let updateResult =
          await supabase
            .from('profiles')
            .update({
              ...payload,
              interface_language: interfaceLanguage
            })
            .eq(
              'id',
              profile.id
            )
            .select('id')

        let error = updateResult.error

        // Handle PGRST204 if interface_language column does not exist on profiles
        if (error && (error.code === 'PGRST204' || String(error.message || '').includes('interface_language'))) {
          console.warn('interface_language column not available in profiles; saving academic fields without it:', error.message)
          const fallback = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', profile.id)
            .select('id')
          error = fallback.error
          updateResult = fallback
        }

        if (error) {

          console.error(
            'ACADEMIC PROFILE SAVE ERROR:',
            error
          )

          if (academicStatus) {
            academicStatus.textContent =
              'Could not save the changes. Please try again.'

            academicStatus.classList.remove(
              'is-success'
            )

            academicStatus.classList.add(
              'is-visible',
              'is-error'
            )
          }

          return
        }

        profile.language =
          language

        profile.level =
          level

        profile.level_name =
          levelName

        profile.progress =
          updatedProgress

        profile.goal =
          goal

        profile.lessons_completed =
          updatedLessonsCompleted

        profile.total_lessons =
          updatedTotalLessons

        profile.current_module =
          currentModule

        profile.next_step =
          nextStep

        profile.interface_language =
          interfaceLanguage

        if (academicStatus) {

          academicStatus.textContent =
            'Academic information saved.'

          academicStatus.classList.remove(
            'is-error'
          )

          academicStatus.classList.add(
            'is-visible',
            'is-success'
          )
        }

        const cachedStudent =
          allStudentsCache.find(
            student =>
              student.id === profile.id
          )

        if (cachedStudent) {

          Object.assign(
            cachedStudent,
            {
              language: language,
              level: level,
              level_name: levelName,
              progress: updatedProgress,
              goal: goal,
              lessons_completed:
                updatedLessonsCompleted,
              total_lessons:
                updatedTotalLessons,
              current_module:
                currentModule,
              next_step:
                nextStep,
              interface_language:
                interfaceLanguage
            }
          )
        }

        setTimeout(() => {
          openStudentProfile(profile.id)
        }, 600)

      } catch (error) {

        console.error(
          'ACADEMIC PROFILE SAVE ERROR:',
          error
        )

        if (academicStatus) {

          academicStatus.textContent =
            'Something went wrong while saving.'

          academicStatus.classList.remove(
            'is-success'
          )

          academicStatus.classList.add(
            'is-visible',
            'is-error'
          )
        }

      } finally {

        saveAcademicButton.disabled =
          false

        saveAcademicButton.textContent =
          'Save changes'
      }
    }
  )
}

  /* Auto-calculate progress % when lessons inputs change */
  const lessonsCompletedEl = document.querySelector('#academic-lessons-completed')
  const totalLessonsEl = document.querySelector('#academic-total-lessons')
  const progressEl = document.querySelector('#academic-progress')

  const autoCalcProgress = () => {
    const comp = Math.max(0, Number(lessonsCompletedEl?.value || 0))
    const totRaw = totalLessonsEl?.value?.trim()
    const tot = totRaw && !Number.isNaN(Number(totRaw)) && Number(totRaw) > 0 ? Number(totRaw) : null
    if (tot && progressEl) {
      progressEl.value = Math.min(100, Math.round((comp / tot) * 100))
    }
  }

  lessonsCompletedEl?.addEventListener('input', autoCalcProgress)
  totalLessonsEl?.addEventListener('input', autoCalcProgress)

  /* Material view file buttons */
  document.querySelectorAll('[data-view-material-file]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      const filePath = btn.dataset.viewMaterialFile
      if (!filePath) return

      let targetWindow = null
      try {
        targetWindow = window.open('about:blank', '_blank')
      } catch {
        targetWindow = null
      }

      try {
        const cleanPath = String(filePath).trim().replace(/^\/+/, '')
        const { data, error } = await supabase.storage.from('materials').createSignedUrl(cleanPath, 3600)
        if (error || !data?.signedUrl) {
          if (targetWindow && !targetWindow.closed) {
            targetWindow.close()
          }
          console.error('Error opening material:', error?.message || error)
          alert('Could not open file. Check storage permissions.')
          return
        }

        if (targetWindow && !targetWindow.closed) {
          targetWindow.location.href = data.signedUrl
        } else {
          const link = document.createElement('a')
          link.href = data.signedUrl
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } catch (err) {
        if (targetWindow && !targetWindow.closed) {
          targetWindow.close()
        }
        console.error('Error opening material:', err?.message || err)
        alert('Could not open material file.')
      }
    })
  })

  /* Material delete buttons */
  document.querySelectorAll('.teacher-delete-material-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      const materialId = btn.dataset.deleteMaterialId
      if (!materialId) return
      const filePath = btn.dataset.materialFilepath
      const title = btn.dataset.materialTitle || 'este material'

      const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el material "${title}"?\nEsta acción no se puede deshacer.`)
      if (!confirmed) return

      btn.disabled = true
      const originalText = btn.textContent
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

        openStudentProfile(profile.id)
      } catch (err) {
        console.error('Delete material error:', err)
        alert(`No se pudo eliminar el material: ${err.message || 'Error desconocido'}`)
        btn.disabled = false
        btn.textContent = originalText
      }
    })
  })

  /* Material upload / assign form */
  const materialForm = document.querySelector('#student-material-assign-form')
  if (materialForm) {
    materialForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const statusEl = document.querySelector('#student-material-status')
      const submitBtn = document.querySelector('#save-student-material-button')
      try {
        const user = await getCurrentUser()
        if (!user) {
          if (statusEl) {
            statusEl.textContent = 'Session expired. Please log in.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        const formData = new FormData(materialForm)
        const title = String(formData.get('title') || '').trim()
        const type = String(formData.get('type') || 'class')
        const audience = String(formData.get('audience') || 'student')
        const description = String(formData.get('description') || '').trim() || null
        const file = materialForm.elements.file?.files?.[0]

        if (!title) {
          if (statusEl) {
            statusEl.textContent = 'Please enter a title.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (submitBtn) {
          submitBtn.disabled = true
          submitBtn.textContent = 'Saving...'
        }
        if (statusEl) {
          statusEl.textContent = 'Uploading and assigning material...'
          statusEl.className = 'teacher-form-status'
        }

        let uploadedFilePath = null
        if (file && file.size > 0) {
          const allowed = file.type === 'application/pdf' || file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')
          if (!allowed || file.size > 10 * 1024 * 1024) {
            if (statusEl) {
              statusEl.textContent = 'Supported files: PDF, image, audio, video under 10 MB.'
              statusEl.className = 'teacher-form-status is-error'
            }
            if (submitBtn) {
              submitBtn.disabled = false
              submitBtn.textContent = 'Assign material'
            }
            return
          }

          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const filePath = `${user.id}/${crypto.randomUUID()}-${safeName}`
          const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, file, { contentType: file.type, upsert: false })
          if (uploadError) {
            if (statusEl) {
              statusEl.textContent = uploadError.message || 'File upload failed.'
              statusEl.className = 'teacher-form-status is-error'
            }
            if (submitBtn) {
              submitBtn.disabled = false
              submitBtn.textContent = 'Assign material'
            }
            return
          }
          uploadedFilePath = filePath
        }

        const payload = {
          teacher_id: user.id,
          student_id: audience === 'all' ? null : profile.id,
          audience: audience,
          title: title,
          type: type,
          description: description,
          file_path: uploadedFilePath
        }

        const { error: insertError } = await supabase.from('materials').insert(payload)
        if (insertError) {
          if (uploadedFilePath) {
            await supabase.storage.from('materials').remove([uploadedFilePath])
          }
          if (statusEl) {
            statusEl.textContent = insertError.message || 'Could not save material record.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (statusEl) {
          statusEl.textContent = 'Material assigned successfully.'
          statusEl.className = 'teacher-form-status is-success'
        }
        materialForm.reset()
        setTimeout(() => {
          openStudentProfile(profile.id)
        }, 600)
      } catch (err) {
        console.error('Save material error:', err)
        if (statusEl) {
          statusEl.textContent = 'An unexpected error occurred.'
          statusEl.className = 'teacher-form-status is-error'
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Assign material'
        }
      }
    })
  }

  /* Feedback create form */
  const feedbackForm = document.querySelector('#student-feedback-create-form')
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const statusEl = document.querySelector('#student-feedback-status')
      const submitBtn = document.querySelector('#save-student-feedback-button')
      try {
        const user = await getCurrentUser()
        if (!user) {
          if (statusEl) {
            statusEl.textContent = 'Session expired. Please log in.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        const formData = new FormData(feedbackForm)
        const category = String(formData.get('category') || 'General')
        const title = String(formData.get('title') || '').trim()
        const message = String(formData.get('message') || '').trim()

        if (!title || !message) {
          if (statusEl) {
            statusEl.textContent = 'Please fill out both title and feedback message.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (submitBtn) {
          submitBtn.disabled = true
          submitBtn.textContent = 'Saving...'
        }
        if (statusEl) {
          statusEl.textContent = 'Saving feedback...'
          statusEl.className = 'teacher-form-status'
        }

        const { error: insertError } = await supabase.from('feedback').insert({
          teacher_id: user.id,
          student_id: profile.id,
          category: category,
          title: title,
          message: message
        })

        if (insertError) {
          if (statusEl) {
            statusEl.textContent = insertError.message || 'Could not save feedback.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (statusEl) {
          statusEl.textContent = 'Feedback saved successfully.'
          statusEl.className = 'teacher-form-status is-success'
        }
        feedbackForm.reset()
        setTimeout(() => {
          openStudentProfile(profile.id)
        }, 600)
      } catch (err) {
        console.error('Save feedback error:', err)
        if (statusEl) {
          statusEl.textContent = 'An unexpected error occurred.'
          statusEl.className = 'teacher-form-status is-error'
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Save feedback'
        }
      }
    })
  }

  /* Challenge assign form */
  const challengeForm = document.querySelector('#student-challenge-assign-form')
  if (challengeForm) {
    challengeForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const statusEl = document.querySelector('#student-challenge-status')
      const submitBtn = document.querySelector('#save-student-challenge-button')
      try {
        const user = await getCurrentUser()
        if (!user) {
          if (statusEl) {
            statusEl.textContent = 'Session expired. Please log in.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        const formData = new FormData(challengeForm)
        const title = String(formData.get('title') || '').trim()
        const instructions = String(formData.get('instructions') || '').trim() || null
        const endDate = formData.get('end_date') || null
        const audience = String(formData.get('audience') || 'student')

        if (!title) {
          if (statusEl) {
            statusEl.textContent = 'Please provide a title.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (submitBtn) {
          submitBtn.disabled = true
          submitBtn.textContent = 'Publishing...'
        }
        if (statusEl) {
          statusEl.textContent = 'Publishing challenge...'
          statusEl.className = 'teacher-form-status'
        }

        const { error: insertError } = await supabase.from('weekly_challenges').insert({
          teacher_id: user.id,
          student_id: audience === 'all' ? null : profile.id,
          audience: audience,
          title: title,
          description: instructions || title,
          instructions: instructions,
          end_date: endDate,
          status: 'active'
        })

        if (insertError) {
          if (statusEl) {
            statusEl.textContent = insertError.message || 'Could not publish challenge.'
            statusEl.className = 'teacher-form-status is-error'
          }
          return
        }

        if (statusEl) {
          statusEl.textContent = 'Challenge published and assigned.'
          statusEl.className = 'teacher-form-status is-success'
        }
        challengeForm.reset()
        setTimeout(() => {
          openStudentProfile(profile.id)
        }, 600)
      } catch (err) {
        console.error('Save challenge error:', err)
        if (statusEl) {
          statusEl.textContent = 'An unexpected error occurred.'
          statusEl.className = 'teacher-form-status is-error'
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Publish challenge'
        }
      }
    })
  }
}
/* =========================================================
   PROFILE EVENTS
   ========================================================= */

function attachStudentProfileEvents(studentId) {
  const backToDashboard =
    document.querySelector(
      '#back-to-dashboard'
    )

  if (backToDashboard) {
    backToDashboard.addEventListener(
      'click',
      () => returnToTeacherDashboard(false)
    )
  }

  const backButton =
    document.querySelector(
      '#back-to-students'
    )

  if (backButton) {
    backButton.addEventListener(
      'click',
      showStudentsView
    )
  }

  const saveButton =
    document.querySelector(
      '#save-teacher-notes'
    )

  if (saveButton) {
    saveButton.addEventListener(
      'click',
      () => saveTeacherNotes(studentId)
    )
  }

  loadTeacherNotes(studentId)
}


/* =========================================================
   TEACHER NOTES — SUPABASE
   ========================================================= */

async function loadTeacherNotes(studentId) {
  const textarea =
    document.querySelector(
      '#teacher-private-notes'
    )

  if (!textarea) return

  try {

    const user =
      await getCurrentUser()

    if (!user) {
      textarea.value = ''
      return
    }

    const { data, error } =
      await supabase
        .from('teacher_notes')
        .select('notes')
        .eq('teacher_id', user.id)
        .eq('student_id', studentId)
        .maybeSingle()

    if (error) {
      console.error(
        'TEACHER NOTES LOAD ERROR:',
        error
      )
      return
    }

    textarea.value =
      data?.notes || ''

  } catch (error) {

    console.error(
      'TEACHER NOTES LOAD ERROR:',
      error
    )

  }
}


async function saveTeacherNotes(studentId) {
  const textarea =
    document.querySelector(
      '#teacher-private-notes'
    )

  const status =
    document.querySelector(
      '#teacher-notes-status'
    )

  const saveButton =
    document.querySelector(
      '#save-teacher-notes'
    )

  if (!textarea || !status) return

  try {

    const user =
      await getCurrentUser()

    if (!user) {

      status.textContent =
        'Your session has expired. Please log in again.'

      status.classList.remove(
        'is-success'
      )

      status.classList.add(
        'is-visible',
        'is-error'
      )

      return
    }

    if (saveButton) {
      saveButton.disabled = true
      saveButton.textContent = 'Saving...'
    }

    const notes =
      textarea.value.trim()

    const { error } =
      await supabase
        .from('teacher_notes')
        .upsert(
          {
            teacher_id: user.id,
            student_id: studentId,
            notes: notes || null,
            updated_at:
              new Date().toISOString()
          },
          {
            onConflict:
              'teacher_id,student_id'
          }
        )

    if (error) {

      console.error(
        'TEACHER NOTES SAVE ERROR:',
        error
      )

      status.textContent =
        'Could not save the notes. Please try again.'

      status.classList.remove(
        'is-success'
      )

      status.classList.add(
        'is-visible',
        'is-error'
      )

      return
    }

    status.textContent =
      'Notes saved successfully.'

    status.classList.remove(
      'is-error'
    )

    status.classList.add(
      'is-visible',
      'is-success'
    )

    setTimeout(() => {

      status.classList.remove(
        'is-visible'
      )

    }, 3500)

  } catch (error) {

    console.error(
      'TEACHER NOTES SAVE ERROR:',
      error
    )

    status.textContent =
      'Something went wrong while saving.'

    status.classList.remove(
      'is-success'
    )

    status.classList.add(
      'is-visible',
      'is-error'
    )

  } finally {

    if (saveButton) {
      saveButton.disabled = false
      saveButton.textContent = 'Save Notes'
    }

  }
}
/* =========================================================
   ONBOARDING RENDER HELPERS
   ========================================================= */

function renderOnboardingField(
  title,
  value
) {
  const hasValue =
    value &&
    String(value).trim() !== ''

  return `
    <div class="student-profile-field">

      <h3>
        ${escapeHtml(title)}
      </h3>

      ${
        hasValue
          ? `
            <p>
              ${escapeHtml(value)}
            </p>
          `
          : `
            <p class="is-empty">
              Not specified.
            </p>
          `
      }

    </div>
  `
}


function renderOnboardingChips(
  title,
  value
) {
  const items =
    String(value || '')
      .split('||')
      .map((item) => item.trim())
      .filter(Boolean)

  return `
    <div class="student-profile-field">

      <h3>
        ${escapeHtml(title)}
      </h3>

      ${
        items.length
          ? `
            <div class="student-profile-chips">

              ${items
                .map(
                  (item) => `
                    <span class="student-profile-chip">
                      ${escapeHtml(item)}
                    </span>
                  `
                )
                .join('')}

            </div>
          `
          : `
            <p class="is-empty">
              Not specified.
            </p>
          `
      }

    </div>
  `
}


function renderNoOnboarding() {
  return `
    <div class="student-no-onboarding">

      <h3>
        Onboarding profile not completed.
      </h3>

      <p>
        This student has not completed the Vera Orbis
        onboarding questionnaire yet.
      </p>

    </div>
  `
}


/* =========================================================
   JOURNEY HELPERS
   ========================================================= */

function renderJourneyItem(
  label,
  value
) {
  return `
    <div class="student-journey-item">

      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${escapeHtml(
          value ||
          'Not specified'
        )}
      </strong>

    </div>
  `
}


function renderSummaryItem(
  label,
  value
) {
  return `
    <div class="student-summary-item">

      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${escapeHtml(
          value ||
          'Not specified'
        )}
      </strong>

    </div>
  `
}


/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function normalizeProgress(value) {
  const numericValue =
    Number(value)

  if (
    Number.isNaN(numericValue) ||
    numericValue < 0
  ) {
    return 0
  }

  return Math.min(
    100,
    Math.round(numericValue)
  )
}


function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


/* =========================================================
   START
   ========================================================= */

loadTeacherDashboard()