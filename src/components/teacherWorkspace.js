import { sendAcademicMessage } from '../lib/messaging.js'
import { mountAcademicAI } from './academicAI.js'
import { mountExerciseStudio } from './exerciseStudio.js'
import { mountLearningPlans } from './learningPlans.js'
import { mountChallengeManager } from './challengeManager.js'
import { mountFinalsStudio } from './finals.js'
import { mountNotifications } from './notifications.js'
import { mountMaterialsStudio } from './materialsStudio.js'
import { uploadMaterialFile } from '../lib/materialStorage.js'
import { supabase } from '../lib/supabase.js'
import { getCurrentUser } from '../lib/auth.js'
import { isTeacherModule, readTeacherRoute, writeTeacherModuleRoute } from '../lib/academicRoutes.js'

const MODULE_META = {
  overview: {
    label: 'Overview',
    group: 'primary',
    kicker: 'ACADEMIC COMMAND CENTER',
    title: 'We speak the world.',
    subtitle: 'Live classes, student progress, pending reviews and creative teaching studios in one command center.',
    theme: 'indigo',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>'
  },
  calendar: {
    label: 'Calendar',
    group: 'primary',
    kicker: 'LIVE SCHEDULING & AGENDA',
    title: 'Calendar & Class Sessions',
    subtitle: 'Schedule live classes, track assignment deadlines and synchronize student agendas.',
    theme: 'teal',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>'
  },
  students: {
    label: 'Students',
    group: 'primary',
    kicker: 'STUDENT DIRECTORY & ENROLLMENT',
    title: 'Students & Academic Dossiers',
    subtitle: 'Search, filter and open student dossiers, or invite and approve new learners.',
    theme: 'coral',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  'exercise-studio': {
    label: 'Exercise Studio',
    group: 'primary',
    kicker: 'GUIDED ACTIVITY AUTHORING',
    title: 'Interactive Exercise Studio',
    subtitle: 'Design communicative activities following Listen -> Repeat -> Personalize -> Use.',
    theme: 'violet',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
  },
  'materials-studio': {
    label: 'Materials Studio',
    group: 'primary',
    kicker: 'PRIVATE ACADEMIC LIBRARY',
    title: 'Materials & Document Studio',
    subtitle: 'Upload PDF, Word, PowerPoint, Excel and media resources with private student access.',
    theme: 'gold',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>'
  },
  'learning-plans': {
    label: 'Learning Plans',
    group: 'primary',
    kicker: 'PERSONALIZED CURRICULUM',
    title: 'Learning Plans & Roadmaps',
    subtitle: 'Build versioned communicative roadmaps and track student objective completion.',
    theme: 'teal',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>'
  },
  finals: {
    label: 'Finals',
    group: 'primary',
    kicker: 'CAPSTONE EVALUATION STUDIO',
    title: 'Final Assessments',
    subtitle: 'Configure rubric criteria, assign capstone evaluations and release graded feedback.',
    theme: 'coral',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
  },
  inbox: {
    label: 'Inbox',
    group: 'primary',
    kicker: 'DIRECT ACADEMIC MESSAGING',
    title: 'Student Inbox & Threads',
    subtitle: 'Communicate directly with your assigned students in a focused two-panel messenger.',
    theme: 'indigo',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  },
  notifications: {
    label: 'Notifications',
    group: 'primary',
    kicker: 'ACTIVITY & ALERT STREAM',
    title: 'Notifications Center',
    subtitle: 'Stay updated on student submissions, schedule updates and academic alerts.',
    theme: 'gold',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
  },
  challenges: {
    label: 'Challenges',
    group: 'studio',
    kicker: 'WEEKLY COMMUNICATIVE MISSIONS',
    title: 'Weekly Challenges',
    subtitle: 'Publish real-world speaking and cultural missions and review student reflections.',
    theme: 'coral',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  },
  'academic-ai': {
    label: 'Create with AI',
    group: 'studio',
    kicker: 'AI PEDAGOGICAL ARCHITECT',
    title: 'AI Academic Studio',
    subtitle: 'Draft exercises, learning plans and feedback aligned with Listen -> Repeat -> Personalize -> Use.',
    theme: 'violet',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>'
  },
  academic: {
    label: 'Courses & Setup',
    group: 'admin',
    kicker: 'ACADEMIC CATALOG',
    title: 'Courses & Quick Resources',
    subtitle: 'Manage structured courses, quick materials and global challenges.',
    theme: 'indigo',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
  },
  finance: {
    label: 'Finance & Packs',
    group: 'admin',
    kicker: 'ADMINISTRATION & PACKAGES',
    title: 'Finance, Packages & Billing',
    subtitle: 'Track student class packages, payments received and operational expenses.',
    theme: 'teal',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'
  },
  leads: {
    label: 'Admissions CRM',
    group: 'admin',
    kicker: 'PROSPECT PIPELINE',
    title: 'Leads & Admissions',
    subtitle: 'Follow up with prospective learners and track conversion stages.',
    theme: 'gold',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
  },
  culture: {
    label: 'Culture Hub',
    group: 'admin',
    kicker: 'CULTURE IN MOTION',
    title: 'Cultural Immersion Library',
    subtitle: 'Curate articles, music, film and cultural notes for your students.',
    theme: 'coral',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  }
}

const MODULES = [
  ['overview', 'Overview'],
  ['calendar', 'Calendar'],
  ['students', 'Students'],
  ['academic', 'Academic'],
  ['materials-studio', 'Materials Studio'],
  ['exercise-studio', 'Exercise Studio'],
  ['learning-plans', 'Learning Plans'],
  ['challenges', 'Challenges'],
  ['finals', 'Finals'],
  ['notifications', 'Notifications'],
  ['academic-ai', 'Create with AI'],
  ['finance', 'Finance'],
  ['leads', 'Leads'],
  ['culture', 'Culture'],
  ['inbox', 'Inbox']
]

function renderNavButton(id) {
  const meta = MODULE_META[id] || { label: id, icon: '' }
  const isOverview = id === 'overview'
  const badgeHtml = id === 'notifications'
    ? '<span data-academic-unread class="academic-unread-badge" hidden></span>'
    : id === 'inbox'
      ? '<span data-inbox-unread class="academic-unread-badge" hidden></span>'
      : ''
  return `<button type="button" class="teacher-module-tab${isOverview ? ' is-active' : ''}" data-teacher-module="${id}" aria-pressed="${isOverview}" title="${escapeHtml(meta.label)}">
    <span class="teacher-nav-icon" aria-hidden="true">${meta.icon}</span>
    <span class="teacher-nav-label">${escapeHtml(meta.label)}</span>
    ${badgeHtml}
  </button>`
}

export function renderTeacherWorkspace() {
  const primaryIds = ['overview', 'calendar', 'students', 'exercise-studio', 'materials-studio', 'learning-plans', 'finals', 'inbox', 'notifications']
  const studioIds = ['challenges', 'academic-ai']
  const adminIds = ['academic', 'finance', 'leads', 'culture']

  return `
    <section class="teacher-workspace" aria-labelledby="teacher-workspace-title">
      <div class="teacher-workspace-shell" data-workspace-shell>
        <aside class="teacher-sidebar" id="teacher-sidebar" aria-label="Academic command navigation">
          <div class="teacher-sidebar-top">
            <span class="teacher-sidebar-kicker">COMMAND CENTER</span>
            <button type="button" class="teacher-sidebar-collapse-btn" data-sidebar-collapse aria-label="Toggle compact sidebar" title="Collapse or expand sidebar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>
          <nav class="teacher-module-nav" aria-label="Teacher modules">
            <div class="teacher-nav-group">
              <span class="teacher-nav-group-title">DAILY TEACHING</span>
              ${primaryIds.map(renderNavButton).join('')}
            </div>
            <div class="teacher-nav-group">
              <span class="teacher-nav-group-title">CREATIVE STUDIOS</span>
              ${studioIds.map(renderNavButton).join('')}
            </div>
            <div class="teacher-nav-group">
              <span class="teacher-nav-group-title">ADMINISTRATION</span>
              ${adminIds.map(renderNavButton).join('')}
            </div>
          </nav>
        </aside>

        <div class="teacher-workspace-stage">
          <header class="teacher-workspace-banner" data-workspace-banner="indigo">
            <div class="teacher-workspace-banner-copy">
              <p class="teacher-label" id="teacher-workspace-kicker">ACADEMIC COMMAND CENTER</p>
              <h2 id="teacher-workspace-title">We speak the world.</h2>
              <p class="teacher-section-description" id="teacher-workspace-subtitle">Live classes, student progress, pending reviews and creative teaching studios in one command center.</p>
            </div>
            <div class="teacher-workspace-quick-actions">
              <button type="button" class="vo-action-pill vo-pill-teal" data-quick-open-module="calendar">Calendar</button>
              <button type="button" class="vo-action-pill vo-pill-violet" data-quick-open-module="exercise-studio">+ Exercise</button>
              <button type="button" class="vo-action-pill vo-pill-gold" data-quick-open-module="materials-studio">+ Material</button>
              <button type="button" class="vo-action-pill vo-pill-coral" data-quick-open-module="students">Students</button>
            </div>
          </header>

          <div id="teacher-workspace-panel" class="teacher-workspace-panel" aria-live="polite">
            <div class="teacher-loading">Loading your teaching overview...</div>
          </div>
        </div>
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
    loadTeacherModule(button.dataset.teacherModule)
    nav.querySelector('details')?.removeAttribute('open')
    document.querySelector('#teacher-sidebar')?.classList.remove('is-mobile-open')
  })

  document.querySelector?.('[data-sidebar-collapse]')?.addEventListener?.('click', () => {
    const shell = document.querySelector?.('[data-workspace-shell]')
    if (shell) shell.classList.toggle('is-sidebar-collapsed')
  })

  document.querySelectorAll?.('[data-quick-open-module]')?.forEach?.((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.quickOpenModule) loadTeacherModule(btn.dataset.quickOpenModule)
    })
  })

  const route = readTeacherRoute()
  if (!route.studentId) loadTeacherModule(route.module, { updateHistory: false })
}

export async function loadTeacherModule(module, { updateHistory = true } = {}) {
  const workspace = document.querySelector('#teacher-workspace-panel')
  if (!workspace) return
  module = isTeacherModule(module) ? module : 'overview'
  document.querySelector('.teacher-module-nav')?.querySelectorAll('[data-teacher-module]').forEach(item => {
    const active = item.dataset.teacherModule === module
    item.classList.toggle('is-active', active)
    item.setAttribute('aria-pressed', String(active))
  })

  const meta = MODULE_META[module] || MODULE_META.overview
  const kickerEl = document.querySelector?.('#teacher-workspace-kicker')
  const titleEl = document.querySelector?.('#teacher-workspace-title')
  const subtitleEl = document.querySelector?.('#teacher-workspace-subtitle')
  const bannerEl = document.querySelector?.('[data-workspace-banner]')
  const topbarSectionEl = document.querySelector?.('#teacher-topbar-current-module')
  const mainContainer = document.querySelector?.('#teacher-main-container')
  if (kickerEl) kickerEl.textContent = meta.kicker
  if (titleEl) titleEl.textContent = meta.title
  if (subtitleEl) subtitleEl.textContent = meta.subtitle
  if (bannerEl) bannerEl.setAttribute('data-workspace-banner', meta.theme || 'indigo')
  if (topbarSectionEl) topbarSectionEl.textContent = meta.label
  if (mainContainer) mainContainer.setAttribute('data-active-module', module)

  if (updateHistory) writeTeacherModuleRoute(module)
  workspace.innerHTML = '<div data-module-content><div class="teacher-loading">Loading module...</div></div>'
  const panel = workspace.querySelector('[data-module-content]')
  const loaders = {
    overview: loadOverview,
    calendar: loadCalendar,
    students: loadStudentsDirectoryModule,
    academic: loadAcademic,
    'exercise-studio': loadExerciseStudio,
    'materials-studio': panel => mountMaterialsStudio(panel, supabase),
    'learning-plans': panel => mountLearningPlans(panel, supabase),
    challenges: panel => mountChallengeManager(panel, supabase),
    finals: panel => mountFinalsStudio(panel, supabase),
    notifications: panel => mountNotifications(panel, supabase, { onNavigate: view => loadTeacherModule(view === 'exercises' ? 'exercise-studio' : view) }),
    'academic-ai': panel => mountAcademicAI(panel, supabase, { onUseExercise: draft => mountExerciseStudio(panel, supabase, draft) }),
    finance: loadFinance,
    leads: loadLeads,
    culture: loadCulture,
    inbox: loadInbox
  }
  await (loaders[module] || loadOverview)(panel)
}

async function loadOverview(panel) {
  const [students, materials, challenges, submissions, classesRes, attemptsRes, inboxRes] = await Promise.all([
    supabase.from('profiles').select('id, name, language, level, progress, lessons_completed, total_lessons, current_module'),
    supabase.from('materials').select('id, title, type, language, level, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('weekly_challenges').select('id, title, status, end_date, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('challenge_submissions').select('id, status, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('classes').select('id, title, starts_at, duration_minutes, modality, status, language, level').order('starts_at', { ascending: true }).limit(20),
    supabase.from('exercise_attempts').select('id, feedback_status, submitted_at').order('submitted_at', { ascending: false }).limit(30),
    supabase.from('inbox_messages').select('id, sender_role, is_read, subject, created_at').order('created_at', { ascending: false }).limit(20)
  ])

  if (students.error || materials.error || challenges.error || submissions.error) {
    renderError(panel, 'Some teaching data could not be loaded. Check your Supabase policies and try again.')
    return
  }

  const studentList = students.data || []
  const materialList = materials.data || []
  const challengeList = challenges.data || []
  const classList = (classesRes?.data || []).filter(c => c.status !== 'cancelled')
  const now = new Date()
  const upcomingClasses = classList.filter(c => new Date(c.starts_at) >= new Date(now.getTime() - 3600000))
  const todayStr = now.toISOString().slice(0, 10)
  const todaysClasses = classList.filter(c => String(c.starts_at || '').slice(0, 10) === todayStr)
  const nextClass = upcomingClasses[0] || null

  const unreviewedChallenges = (submissions.data || []).filter(item => item.status !== 'reviewed').length
  const unreviewedExercises = (attemptsRes?.data || []).filter(item => item.feedback_status !== 'published').length
  const totalPendingReviews = unreviewedChallenges + unreviewedExercises
  const unreadMessages = (inboxRes?.data || []).filter(m => m.sender_role === 'student' && !m.is_read).length

  const inboxBadge = document.querySelector?.('[data-inbox-unread]')
  if (inboxBadge) {
    inboxBadge.textContent = unreadMessages ? String(unreadMessages) : ''
    inboxBadge.hidden = !unreadMessages
  }

  const commandCards = [
    {
      kicker: 'NEXT SESSION',
      title: nextClass ? nextClass.title : 'Upcoming Class',
      stat: nextClass ? formatDate(nextClass.starts_at) : `${todaysClasses.length} today`,
      desc: nextClass ? `${nextClass.language || 'Language'} · ${nextClass.duration_minutes || 60} min · ${nextClass.modality || 'online'}` : 'Schedule your next live class session in Calendar.',
      module: 'calendar',
      cta: 'Open Schedule ↗',
      theme: 'teal'
    },
    {
      kicker: 'SCHEDULE & DEADLINES',
      title: 'Calendar',
      stat: `${upcomingClasses.length} upcoming`,
      desc: 'Month, week and daily agenda for classes, exercises and finals.',
      module: 'calendar',
      cta: 'Open Calendar ↗',
      theme: 'indigo'
    },
    {
      kicker: 'LEARNER ROSTER',
      title: 'Students',
      stat: `${studentList.length} active`,
      desc: 'Searchable student directory, invitations and academic dossiers.',
      module: 'students',
      cta: 'Explore Students ↗',
      theme: 'coral'
    },
    {
      kicker: 'GUIDED AUTHORING',
      title: 'Create Exercise',
      stat: '5-Step Studio',
      desc: 'Power expressions, storytelling, matching, listening and speaking.',
      module: 'exercise-studio',
      cta: 'Launch Studio ↗',
      theme: 'violet'
    },
    {
      kicker: 'PRIVATE REPOSITORY',
      title: 'Upload Materials',
      stat: `${materialList.length} recent`,
      desc: 'Batch-upload PDF, Word, PowerPoint, Excel and audio/video files.',
      module: 'materials-studio',
      cta: 'Open Library ↗',
      theme: 'gold'
    },
    {
      kicker: 'FEEDBACK & GRADING',
      title: 'Review Submissions',
      stat: `${totalPendingReviews} pending`,
      desc: `${unreviewedExercises} exercise attempt(s) and ${unreviewedChallenges} challenge response(s) awaiting feedback.`,
      module: 'exercise-studio',
      cta: 'Review Work ↗',
      theme: 'terracotta'
    },
    {
      kicker: 'DIRECT COMMUNICATION',
      title: 'Messages',
      stat: unreadMessages ? `${unreadMessages} unread` : 'All read',
      desc: 'Two-panel student messenger for lesson prep and direct support.',
      module: 'inbox',
      cta: 'Open Inbox ↗',
      theme: 'indigo'
    },
    {
      kicker: 'CURRICULUM & CAPSTONES',
      title: 'Learning Plans',
      stat: `${average(studentList.map(s => s.progress))}% avg progress`,
      desc: 'Versioned communicative roadmaps and final assessment rubrics.',
      module: 'learning-plans',
      cta: 'Plan Journeys ↗',
      theme: 'violet'
    }
  ]

  panel.innerHTML = `
    <div class="teacher-metric-grid">
      ${metricCard('Students', studentList.length, 'active profiles', 'coral')}
      ${metricCard('Average progress', `${average(studentList.map((item) => item.progress))}%`, 'across visible students', 'violet')}
      ${metricCard('Materials', materialList.length, 'recent resources', 'gold')}
      ${metricCard('To review', totalPendingReviews, 'pending submissions', 'teal')}
    </div>

    <section class="vo-command-deck" aria-label="Interactive command cards">
      <div class="vo-section-bar">
        <div>
          <span class="teacher-label">COMMAND MODULES</span>
          <h3>Where do you want to teach today?</h3>
        </div>
      </div>
      <div class="vo-interactive-cards-grid">
        ${commandCards.map(card => `
          <button type="button" class="vo-command-card vo-card-${card.theme}" data-go-module="${card.module}">
            <div class="vo-command-card-top">
              <span class="vo-command-kicker">${escapeHtml(card.kicker)}</span>
              <span class="vo-command-stat">${escapeHtml(card.stat)}</span>
            </div>
            <h4>${escapeHtml(card.title)}</h4>
            <p>${escapeHtml(card.desc)}</p>
            <span class="vo-command-cta">${escapeHtml(card.cta)}</span>
          </button>
        `).join('')}
      </div>
    </section>

    <div class="teacher-workspace-columns vo-overview-Feeds">
      <article class="teacher-list-card vo-feed-card vo-feed-teal">
        <div class="vo-feed-header">
          <div>
            <span class="teacher-label">LIVE SCHEDULE</span>
            <h3>Today's & Next Classes</h3>
          </div>
          <button type="button" class="teacher-secondary-button" data-go-module="calendar">Full Calendar ↗</button>
        </div>
        ${upcomingClasses.length ? `
          <ul class="vo-rich-list">
            ${upcomingClasses.slice(0, 4).map(c => `
              <li>
                <div>
                  <strong>${escapeHtml(c.title)}</strong>
                  <small>${formatDate(c.starts_at)} · ${c.duration_minutes || 60} min · ${escapeHtml(c.language || 'General')}</small>
                </div>
                <span class="teacher-badge badge-global">${escapeHtml(c.modality || 'online')}</span>
              </li>
            `).join('')}
          </ul>
        ` : '<div class="vo-empty-inline"><p>No upcoming classes scheduled yet.</p><button type="button" class="teacher-primary-button" data-go-module="calendar">Schedule a Class</button></div>'}
      </article>

      <article class="teacher-list-card vo-feed-card vo-feed-violet">
        <div class="vo-feed-header">
          <div>
            <span class="teacher-label">ATTENTION REQUIRED</span>
            <h3>Academic Tasks & Reviews</h3>
          </div>
          <button type="button" class="teacher-secondary-button" data-go-module="exercise-studio">Open Studio ↗</button>
        </div>
        <ul class="vo-rich-list">
          <li>
            <div>
              <strong>Exercise submissions awaiting feedback</strong>
              <small>Review student answers and release private feedback</small>
            </div>
            <span class="teacher-badge ${unreviewedExercises ? 'badge-draft' : 'badge-published'}">${unreviewedExercises} pending</span>
          </li>
          <li>
            <div>
              <strong>Weekly challenge reflections</strong>
              <small>Communicative missions submitted by students</small>
            </div>
            <span class="teacher-badge ${unreviewedChallenges ? 'badge-draft' : 'badge-published'}">${unreviewedChallenges} to review</span>
          </li>
          <li>
            <div>
              <strong>Unread student messages</strong>
              <small>Direct questions and session preparation notes</small>
            </div>
            <span class="teacher-badge ${unreadMessages ? 'badge-individual' : 'badge-published'}">${unreadMessages} unread</span>
          </li>
        </ul>
      </article>
    </div>

    <div class="teacher-workspace-columns">
      ${listCard('Recent materials', materialList, (item) => `${item.title || 'Untitled material'} · ${item.type || 'resource'}`)}
      ${listCard('Active challenges', challengeList, (item) => `${item.title || 'Untitled challenge'} · ${item.status || 'draft'}`)}
    </div>
  `

  panel.querySelectorAll?.('[data-go-module]')?.forEach(btn => {
    btn.addEventListener('click', () => loadTeacherModule(btn.dataset.goModule))
  })
}

async function loadStudentsDirectoryModule(panel) {
  const [studentsRes, classesRes, assignmentsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('name').limit(1000),
    supabase.from('classes').select('id, title, starts_at, status').neq('status', 'cancelled').order('starts_at', { ascending: true }).limit(100),
    supabase.from('exercise_assignments').select('id, student_id, status').neq('status', 'revoked').limit(1000)
  ])

  if (studentsRes.error) {
    renderError(panel, 'Could not load the student directory.')
    return
  }

  const students = studentsRes.data || []
  const assignments = assignmentsRes?.data || []
  const assignmentCountByStudent = new Map()
  assignments.forEach(a => {
    assignmentCountByStudent.set(a.student_id, (assignmentCountByStudent.get(a.student_id) || 0) + 1)
  })

  const languages = [...new Set(students.map(s => s.language).filter(Boolean))]
  const levels = [...new Set(students.map(s => s.level).filter(Boolean))]

  panel.innerHTML = `
    <div class="vo-student-directory-workspace">
      <section class="teacher-form-card vo-directory-toolbar">
        <div class="vo-directory-toolbar-header">
          <div>
            <p class="teacher-label">SCALABLE STUDENT DIRECTORY</p>
            <h3>Find, filter and launch student workspaces (${students.length})</h3>
          </div>
          <div class="vo-directory-view-toggle">
            <button type="button" class="teacher-filter-btn is-active" data-dir-view="grid">Cards</button>
            <button type="button" class="teacher-filter-btn" data-dir-view="rows">Compact Rows</button>
          </div>
        </div>
        <div class="vo-directory-filters">
          <label>Search by name, language or UUID
            <input type="search" data-dir-search placeholder="Type student name, language, level or ID...">
          </label>
          <label>Language
            <select data-dir-lang>
              <option value="">All languages</option>
              ${languages.map(l => `<option value="${escapeHtml(l.toLowerCase())}">${escapeHtml(l)}</option>`).join('')}
            </select>
          </label>
          <label>Level
            <select data-dir-level>
              <option value="">All levels</option>
              ${levels.map(lv => `<option value="${escapeHtml(lv.toLowerCase())}">${escapeHtml(lv)}</option>`).join('')}
            </select>
          </label>
        </div>
      </section>

      <div class="vo-directory-results is-grid-view" data-dir-list>
        ${students.length ? students.map(s => {
          const prog = Math.max(0, Math.min(100, Number(s.progress || 0)))
          const pendingCount = assignmentCountByStudent.get(s.id) || 0
          return `
            <article class="vo-student-dir-card" data-dir-item data-search="${escapeHtml(`${s.name || ''} ${s.id || ''} ${s.language || ''} ${s.level || ''}`.toLowerCase())}" data-lang="${escapeHtml((s.language || '').toLowerCase())}" data-level="${escapeHtml((s.level || '').toLowerCase())}">
              <div class="vo-student-dir-top">
                <span class="vo-student-avatar-badge">${escapeHtml((s.name || 'S').slice(0, 2).toUpperCase())}</span>
                <div class="vo-student-dir-identity">
                  <span class="vo-student-lang-pill">${escapeHtml(s.language || 'Language pending')} · ${escapeHtml(s.level || 'Level pending')}</span>
                  <h4>${escapeHtml(s.name || 'Student')}</h4>
                  <small>${escapeHtml(s.current_module || 'Active learning journey')}</small>
                </div>
              </div>
              <div class="vo-student-dir-metrics">
                <div><span>Progress</span><strong>${prog}%</strong></div>
                <div><span>Lessons</span><strong>${Number(s.lessons_completed || 0)}${s.total_lessons ? `/${s.total_lessons}` : ''}</strong></div>
                <div><span>Assigned</span><strong>${pendingCount}</strong></div>
              </div>
              <div class="teacher-progress-track"><div class="teacher-progress-fill" style="width:${prog}%"></div></div>
              <div class="vo-student-dir-actions">
                <a href="#student-${escapeHtml(s.id)}" class="teacher-primary-button">Open Dossier ↗</a>
                <button type="button" class="teacher-secondary-button" data-dir-plan="${escapeHtml(s.id)}">Learning Plan</button>
                <button type="button" class="teacher-secondary-button" data-dir-msg="${escapeHtml(s.id)}">Message</button>
              </div>
            </article>
          `
        }).join('') : `
          <div class="teacher-empty-state">
            <h3>No enrolled students yet</h3>
            <p>Use the Student Enrollment invitation form below to invite your first student, or approve pending self-registrations.</p>
          </div>
        `}
      </div>
    </div>
  `

  const filterItems = () => {
    const q = (panel.querySelector('[data-dir-search]')?.value || '').toLowerCase().trim()
    const lang = (panel.querySelector('[data-dir-lang]')?.value || '').toLowerCase()
    const lvl = (panel.querySelector('[data-dir-level]')?.value || '').toLowerCase()
    panel.querySelectorAll('[data-dir-item]').forEach(el => {
      const matchQ = !q || el.dataset.search.includes(q)
      const matchLang = !lang || el.dataset.lang === lang
      const matchLvl = !lvl || el.dataset.level === lvl
      el.hidden = !(matchQ && matchLang && matchLvl)
    })
  }
  panel.querySelector('[data-dir-search]')?.addEventListener('input', filterItems)
  panel.querySelector('[data-dir-lang]')?.addEventListener('change', filterItems)
  panel.querySelector('[data-dir-level]')?.addEventListener('change', filterItems)

  panel.querySelectorAll('[data-dir-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-dir-view]').forEach(b => b.classList.toggle('is-active', b === btn))
      const list = panel.querySelector('[data-dir-list]')
      if (list) {
        list.classList.toggle('is-grid-view', btn.dataset.dirView === 'grid')
        list.classList.toggle('is-row-view', btn.dataset.dirView === 'rows')
      }
    })
  })

  panel.querySelectorAll('[data-dir-plan]').forEach(btn => {
    btn.addEventListener('click', () => loadTeacherModule('learning-plans'))
  })
  panel.querySelectorAll('[data-dir-msg]').forEach(btn => {
    btn.addEventListener('click', () => loadTeacherModule('inbox'))
  })
}

async function loadAcademic(panel) {
  const [materials, challenges, plans, courses, studentsRes] = await Promise.all([
    supabase.from('materials').select('id, title, type, language, level, student_id, audience, file_path, created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('weekly_challenges').select('id, title, status, student_id, end_date, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('profiles').select('id, name, current_module, next_step, goal').not('next_step', 'is', null).limit(20),
    supabase.from('courses').select('id, name, language, level, status').order('created_at', { ascending: false }).limit(20),
    supabase.from('profiles').select('id, name').order('name')
  ])

  if (materials.error || challenges.error || plans.error) {
    renderError(panel, 'Academic data could not be loaded. Verify the existing table policies.')
    return
  }

  const coursesList = courses.error ? [] : (courses.data || [])
  const students = studentsRes.error ? [] : (studentsRes.data || [])
  const studentMap = new Map(students.map(s => [s.id, s.name]))

  panel.innerHTML = `
    <div class="teacher-action-grid">
      ${materialForm(students)}
      ${challengeForm(students)}
      ${courseForm()}
    </div>
    <div class="teacher-workspace-columns">
      ${materialsCard(materials.data, studentMap)}
      ${listCard('Challenges', challenges.data, (item) => `${item.title || 'Untitled'} · ${item.status || 'draft'}`)}
    </div>
    ${listCard('Courses', coursesList, (item) => `${item.name} · ${item.language}${item.level ? ` · ${item.level}` : ''} · ${item.status}`)}
    <div class="teacher-inline-note"><strong>Work plans:</strong> ${plans.data?.length || 0} visible plan(s). Open a student profile to update the next step and private notes.</div>
  `

  document.querySelector('#teacher-material-form')?.addEventListener('submit', (event) => saveAcademicRecord(event, 'materials', panel))
  document.querySelector('#teacher-challenge-form')?.addEventListener('submit', (event) => saveAcademicRecord(event, 'weekly_challenges', panel))
  document.querySelector('#teacher-course-form')?.addEventListener('submit', (event) => saveCourse(event, panel))

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

function materialsCard(items = [], studentMap = new Map()) {
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
                ${item.language ? `<span class="teacher-badge badge-global">${escapeHtml(item.language)}</span>` : ''}
                ${item.level ? `<span class="teacher-badge badge-draft">${escapeHtml(item.level)}</span>` : ''}
              </div>
              <small style="color:var(--vo-muted);display:block;margin-top:2px;">
                ${item.audience === 'all' ? 'Shared with all students' : `Assigned to: ${escapeHtml(studentMap.get(item.student_id) || item.student_id || 'Individual student')}`}
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
  await mountExerciseStudio(panel, supabase)
}

function materialForm(students = []) {
  return `<form class="teacher-form-card" id="teacher-material-form">
    <div><p class="teacher-label">MATERIALS</p><h3>Create a resource</h3></div>
    <label>Title<input name="title" required maxlength="160" placeholder="e.g. Conversation Guide Unit 1"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <label>Language<input name="language" placeholder="e.g. English"></label>
      <label>Level<input name="level" placeholder="e.g. B1"></label>
    </div>
    <label>Type<select name="type"><option value="class">Class</option><option value="practice">Practice</option><option value="vocabulary">Vocabulary</option><option value="resource" selected>Resource</option></select></label>
    <label>Student (or leave blank for all)
      <input name="student_id" placeholder="Select student or leave blank for Global" list="academic-students-list">
      <datalist id="academic-students-list">
        ${students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
      </datalist>
    </label>
    <label>Description<textarea name="description" rows="3" placeholder="Brief description or instructions..."></textarea></label>
    <label>Private file (PDF, Word, PowerPoint, Excel, image, audio or video; 10 MB max)<input name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,audio/*,video/*"></label>
    <button class="teacher-primary-button" type="submit">Save material</button><p class="teacher-form-status" data-form-status></p>
  </form>`
}

function challengeForm(students = []) {
  return `<form class="teacher-form-card" id="teacher-challenge-form">
    <div><p class="teacher-label">ACTIVITIES</p><h3>Create a challenge</h3></div>
    <label>Title<input name="title" required maxlength="160" placeholder="e.g. 5-Minute Speech Challenge"></label>
    <label>Student (or leave blank for all)
      <input name="student_id" placeholder="Select student or leave blank for Global" list="academic-challenge-students-list">
      <datalist id="academic-challenge-students-list">
        ${students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
      </datalist>
    </label>
    <label>Instructions<textarea name="instructions" rows="3" placeholder="Challenge instructions..."></textarea></label>
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
    ? { teacher_id: user.id, title: data.title.trim(), type: data.type, student_id: data.student_id.trim() || null, audience: data.student_id.trim() ? 'student' : 'all', description: data.description.trim() || null, language: data.language?.trim() || null, level: data.level?.trim() || null }
    : { teacher_id: user.id, title: data.title.trim(), student_id: data.student_id.trim() || null, audience: data.student_id.trim() ? 'student' : 'all', description: data.instructions?.trim() || null, instructions: data.instructions.trim() || null, end_date: data.end_date || null, status: 'active' }

  status.textContent = 'Saving...'
  let uploadedFilePath = null
  if (table === 'materials') {
    const file = form.elements.file.files[0]
    if (file) {
      try {
        const { path } = await uploadMaterialFile(supabase, file, { teacherId: user.id })
        uploadedFilePath = path
        payload = { ...payload, file_path: path }
      } catch (error) {
        status.textContent = error.message || 'The upload could not be confirmed.'
        return
      }
    }
  }

  const result = await supabase.from(table).insert(payload).select('id').single()
  if (result.error || !result.data?.id) {
    status.textContent = uploadedFilePath
      ? 'The file upload completed, but its material record was not confirmed. Refresh materials before retrying.'
      : formatSupabaseError(result.error, 'The saved record was not confirmed. Refresh before retrying.')
    return
  }
  status.textContent = 'Saved.'
  form.reset()
  if (panel && (table === 'materials' || table === 'weekly_challenges')) loadAcademic(panel)
}

async function loadCalendar(panel) {
  const [classesRes, participantsRes, studentsRes, assignmentsRes] = await Promise.all([
    supabase.from('classes').select('id, title, starts_at, duration_minutes, modality, status, language, level, notes').order('starts_at', { ascending: true }).limit(100),
    supabase.from('class_participants').select('class_id, student_id'),
    supabase.from('profiles').select('id, name, language, level').order('name'),
    supabase.from('exercise_assignments').select('id, exercise_id, student_id, due_at, status').not('due_at', 'is', null).neq('status', 'revoked').limit(100)
  ])

  if (classesRes.error) {
    console.warn('Calendar query notice:', classesRes.error.message)
    renderMigrationState(panel, 'Calendar and classes', 'The classes table is not yet initialized or RLS blocked. Execute migration 0007_teacher_management_enhancements.sql in Supabase.')
    return
  }

  const classes = classesRes.data || []
  const participants = participantsRes.data || []
  const students = studentsRes.data || []
  const deadlines = assignmentsRes?.data || []

  const studentMap = new Map(students.map(s => [s.id, s.name]))
  const participantsMap = new Map()
  participants.forEach(p => {
    if (!participantsMap.has(p.class_id)) participantsMap.set(p.class_id, [])
    participantsMap.get(p.class_id).push(studentMap.get(p.student_id) || p.student_id)
  })

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const eventsByDay = new Map()
  classes.forEach(c => {
    const d = new Date(c.starts_at)
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate()
      if (!eventsByDay.has(day)) eventsByDay.set(day, [])
      eventsByDay.get(day).push({ kind: 'class', title: c.title, status: c.status || 'scheduled', time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    }
  })
  deadlines.forEach(a => {
    const d = new Date(a.due_at)
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate()
      if (!eventsByDay.has(day)) eventsByDay.set(day, [])
      eventsByDay.get(day).push({ kind: 'deadline', title: `Deadline: ${studentMap.get(a.student_id) || 'Student'}`, status: 'deadline', time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    }
  })

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) calendarCells.push('<div class="vo-cal-cell is-empty"></div>')
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === now.getDate()
    const dayEvents = eventsByDay.get(day) || []
    calendarCells.push(`
      <div class="vo-cal-cell${isToday ? ' is-today' : ''}${dayEvents.length ? ' has-events' : ''}">
        <span class="vo-cal-day-num">${day}</span>
        <div class="vo-cal-day-events">
          ${dayEvents.slice(0, 3).map(ev => `<span class="vo-cal-pill is-${escapeHtml(ev.kind)} is-${escapeHtml(ev.status)}" title="${escapeHtml(ev.title)}">${escapeHtml(ev.time)} ${escapeHtml(ev.title)}</span>`).join('')}
        </div>
      </div>
    `)
  }

  panel.innerHTML = `
    <div class="vo-calendar-studio">
      <div class="teacher-metric-grid">
        ${metricCard('Scheduled classes', classes.filter(c => c.status === 'scheduled').length, 'active sessions', 'teal')}
        ${metricCard('Completed sessions', classes.filter(c => c.status === 'completed').length, 'logged classes', 'indigo')}
        ${metricCard('Assignment deadlines', deadlines.length, 'synced due dates', 'violet')}
        ${metricCard('Enrolled students', students.length, 'available for scheduling', 'coral')}
      </div>

      <section class="teacher-list-card vo-calendar-board">
        <div class="vo-calendar-board-header">
          <div>
            <span class="teacher-label">INTERACTIVE TIMELINE</span>
            <h3>${escapeHtml(monthLabel)}</h3>
          </div>
          <div class="teacher-filter-bar" role="tablist" aria-label="Calendar view modes">
            <button type="button" class="teacher-filter-btn is-active" data-cal-mode="agenda">Daily Agenda & List</button>
            <button type="button" class="teacher-filter-btn" data-cal-mode="month">Monthly Grid</button>
          </div>
        </div>

        <div data-cal-panel="month" hidden>
          <div class="vo-cal-weekdays">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div class="vo-cal-grid">
            ${calendarCells.join('')}
          </div>
        </div>

        <div data-cal-panel="agenda">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
            <h4 style="margin:0;">Upcoming & scheduled classes (${classes.length})</h4>
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
                  <li class="teacher-class-item" data-class-status-val="${escapeHtml(item.status || 'scheduled')}" style="padding:14px 0;border-bottom:1px solid var(--vo-border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <strong>${escapeHtml(item.title)}</strong>
                        <span class="teacher-badge badge-${escapeHtml(item.status)}">${escapeHtml((item.status || 'scheduled').toUpperCase())}</span>
                        <span class="teacher-badge badge-global">${escapeHtml(item.modality || 'online')}</span>
                      </div>
                      <small style="color:var(--vo-muted);display:block;margin-top:4px;">
                        ${formatDate(item.starts_at)} (${item.duration_minutes} min)${item.language ? ` · ${escapeHtml(item.language)}` : ''}${item.level ? ` · ${escapeHtml(item.level)}` : ''}
                        ${classStudents.length ? ` · Students: ${escapeHtml(classStudents.join(', '))}` : ''}
                      </small>
                      ${item.notes ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(24,59,102,0.85);">${escapeHtml(item.notes)}</p>` : ''}
                    </div>
                    <div class="teacher-inline-actions">
                      ${item.status === 'scheduled' ? `<button type="button" class="teacher-secondary-button" data-update-class-status="completed" data-class-id="${escapeHtml(item.id)}" style="padding:6px 12px;font-size:12px;">Completar</button><button type="button" class="teacher-secondary-button" data-update-class-status="cancelled" data-class-id="${escapeHtml(item.id)}" style="padding:6px 12px;font-size:12px;">Cancelar</button>` : ''}
                      ${item.status === 'cancelled' ? `<button type="button" class="teacher-secondary-button" data-update-class-status="scheduled" data-class-id="${escapeHtml(item.id)}" style="padding:6px 12px;font-size:12px;">Reactivar</button>` : ''}
                      <button type="button" class="teacher-danger-button" data-delete-class-id="${escapeHtml(item.id)}" data-class-title="${escapeHtml(item.title)}" style="padding:6px 12px;font-size:12px;">Eliminar</button>
                    </div>
                  </li>
                `
              }).join('')}
            </ul>
          ` : '<p class="teacher-muted">No classes scheduled yet. Use the Class Scheduler below to create your first session.</p>'}
        </div>
      </section>

      <form class="teacher-form-card vo-schedule-form-card" id="teacher-class-form">
        <div>
          <p class="teacher-label">SCHEDULE SESSION</p>
          <h3>Create & synchronize a class</h3>
          <p class="teacher-muted">Classes automatically appear on the selected students' calendars.</p>
        </div>
        <div class="vo-form-grid-2">
          <label>Title<input name="title" required maxlength="160" placeholder="e.g. Conversation Practice B1"></label>
          <label>Start<input name="starts_at" type="datetime-local" required></label>
        </div>
        <div class="vo-form-grid-3">
          <label>Duration (minutes)<input name="duration_minutes" type="number" min="15" max="240" value="60" required></label>
          <label>Modality<select name="modality"><option value="online">Online</option><option value="in_person">In person</option><option value="hybrid">Hybrid</option></select></label>
          <label>Language<input name="language" placeholder="e.g. English, French, Mandarin"></label>
        </div>
        <div class="vo-form-grid-2">
          <label>Level<input name="level" placeholder="e.g. B1 / HSK 2"></label>
          <label>Participant UUIDs (comma separated)
            <input name="student_ids" required placeholder="Select students below or paste UUID" list="calendar-students-list">
            <datalist id="calendar-students-list">
              ${students.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
            </datalist>
          </label>
        </div>
        ${students.length ? `
          <fieldset class="vo-student-chip-picker">
            <legend>Quick student selection (click to toggle)</legend>
            <div class="vo-chip-list">
              ${students.map(s => `<label class="vo-student-chip"><input type="checkbox" data-cal-student-pick="${escapeHtml(s.id)}"><span>${escapeHtml(s.name)} (${escapeHtml(s.language || 'Learner')})</span></label>`).join('')}
            </div>
          </fieldset>
        ` : ''}
        <label>Notes & Meeting Link<textarea name="notes" rows="3" placeholder="Meeting link, communicative objective or preparation instructions..."></textarea></label>
        <button class="teacher-primary-button" type="submit">Schedule class</button>
        <p class="teacher-form-status" data-form-status></p>
      </form>
    </div>
  `

  document.querySelector('#teacher-class-form')?.addEventListener('submit', (e) => saveClass(e, panel))

  panel.querySelectorAll?.('[data-cal-student-pick]')?.forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = [...panel.querySelectorAll('[data-cal-student-pick]:checked')].map(el => el.dataset.calStudentPick)
      const input = panel.querySelector('#teacher-class-form input[name="student_ids"]')
      if (input) input.value = selected.join(', ')
    })
  })

  panel.querySelectorAll?.('[data-cal-mode]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-cal-mode]').forEach(b => b.classList.toggle('is-active', b === btn))
      const mode = btn.dataset.calMode
      panel.querySelectorAll('[data-cal-panel]').forEach(p => { p.hidden = p.dataset.calPanel !== mode })
    })
  })

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

  const totalReceived = paymentsList.filter(p => p.status === 'received').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalPending = paymentsList.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalExpenses = expensesList.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const netBalance = totalReceived - totalExpenses

  panel.innerHTML = `
    <div class="teacher-metric-grid">
      ${metricCard('Total Recaudado', formatMoney(totalReceived, 'COP'), 'pagos confirmados', 'teal')}
      ${metricCard('Pendiente por Cobrar', formatMoney(totalPending, 'COP'), 'pagos pendientes', 'gold')}
      ${metricCard('Gastos Operativos', formatMoney(totalExpenses, 'COP'), 'gastos registrados', 'coral')}
      ${metricCard('Balance Neto', formatMoney(netBalance, 'COP'), 'recaudado - gastos', 'indigo')}
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
        <label>Assignment UUID (optional)
          <input name="assignment_id" placeholder="Select assignment or leave blank" list="finance-assignments-list">
          <datalist id="finance-assignments-list">
            ${(assignmentsRes.data || []).map(a => {
              const studentName = studentMap.get(a.student_id) || a.student_id
              const pkg = packagesList.find(p => p.id === a.package_id)
              const pkgName = pkg ? pkg.name : a.package_id
              return `<option value="${escapeHtml(a.assignment_id)}">${escapeHtml(studentName)} — ${escapeHtml(pkgName)} (${escapeHtml(a.status)})</option>`
            }).join('')}
          </datalist>
        </label>
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
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <h3 style="margin:0;">Follow-up pipeline (${leads.length})</h3>
          </div>
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

async function loadInbox(panel) {
  const [studentsRes, messagesRes] = await Promise.all([
    supabase.from('profiles').select('id, name, language, level').order('name'),
    supabase.from('inbox_messages').select('*').order('created_at', { ascending: false }).limit(60)
  ])

  if (studentsRes.error || messagesRes.error) {
    const err = messagesRes.error || studentsRes.error
    if (err?.code === '42P01' || err?.code === 'PGRST205' || err?.message?.includes('does not exist') || err?.message?.includes('schema cache')) {
      renderMigrationState(panel, 'Inbox messaging not ready', 'The inbox_messages table has not been created yet in Supabase. Please execute migration 0010_inbox_messaging.sql in the Supabase SQL Editor.')
      return
    }
    renderError(panel, 'Could not load messages. Check your connection or permissions.')
    return
  }

  const students = studentsRes.data || []
  const studentMap = new Map(students.map(s => [s.id, s.name]))
  const messages = messagesRes.data || []
  const fromStudents = messages.filter(m => m.sender_role === 'student')
  const unreadFromStudents = fromStudents.filter(m => !m.is_read)

  panel.innerHTML = `
    <div class="teacher-metric-grid">
      ${metricCard('Total messages', messages.length, 'direct communications', 'indigo')}
      ${metricCard('From students', fromStudents.length, 'student inquiries', 'teal')}
      ${metricCard('Unread inquiries', unreadFromStudents.length, 'awaiting response', 'coral')}
      ${metricCard('Active students', students.length, 'registered learners', 'violet')}
    </div>

    <div class="vo-inbox-two-panel">
      <div class="teacher-list-card vo-inbox-threads-column">
        <div class="vo-inbox-threads-header">
          <div>
            <span class="teacher-label">CONVERSATIONS</span>
            <h3>Recent communications (${messages.length})</h3>
          </div>
          <div class="teacher-filter-bar" style="margin:0;">
            <button type="button" class="teacher-filter-btn is-active" data-msg-filter="all">All</button>
            <button type="button" class="teacher-filter-btn" data-msg-filter="student">From students</button>
            <button type="button" class="teacher-filter-btn" data-msg-filter="teacher">Sent</button>
          </div>
        </div>
        <label class="vo-inbox-search-label">Search conversations
          <input type="search" data-inbox-search placeholder="Filter by student, subject or message...">
        </label>

        ${messages.length ? `
          <ul style="margin:0;" id="teacher-messages-list" class="vo-inbox-thread-list">
            ${messages.map(item => {
              const isFromStudent = item.sender_role === 'student'
              const peerId = isFromStudent ? item.sender_id : item.recipient_id
              const peerName = studentMap.get(peerId) || 'Student'

              return `
                <li class="teacher-inbox-msg-item${!item.is_read && isFromStudent ? ' is-unread-msg' : ''}" data-sender-role="${escapeHtml(item.sender_role || 'teacher')}" data-peer-id="${escapeHtml(peerId || '')}" data-msg-search="${escapeHtml(`${peerName} ${item.subject || ''} ${item.body || ''}`.toLowerCase())}">
                  <div style="flex:1;min-width:200px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                      <span class="teacher-badge ${isFromStudent ? 'badge-individual' : 'badge-global'}">
                        ${isFromStudent ? `From: ${escapeHtml(peerName)}` : `To: ${escapeHtml(peerName)}`}
                      </span>
                      <span class="teacher-badge ${item.is_read ? 'badge-published' : 'badge-draft'}">
                        ${item.is_read ? 'Read' : 'Unread'}
                      </span>
                      <span style="font-size:11px;color:rgba(24,59,102,0.6);">${formatDate(item.created_at)}</span>
                    </div>
                    <strong style="display:block;font-size:14px;color:var(--vo-navy);">${escapeHtml(item.subject)}</strong>
                    <p style="margin:4px 0 0;font-size:13px;color:rgba(24,59,102,0.85);white-space:pre-wrap;line-height:1.4;">${escapeHtml(item.body)}</p>
                  </div>
                  <div class="teacher-inline-actions" style="margin-top:4px;">
                    ${isFromStudent && !item.is_read ? `
                      <button type="button" class="teacher-secondary-button" data-mark-read-id="${escapeHtml(item.id)}" style="padding:4px 10px;font-size:11px;">Mark read</button>
                    ` : ''}
                    ${peerId ? `
                      <button type="button" class="teacher-secondary-button" data-reply-peer="${escapeHtml(peerId)}" data-reply-subject="${escapeHtml(item.subject || '')}" style="padding:4px 10px;font-size:11px;">Reply</button>
                      <a href="#student-${escapeHtml(peerId)}" class="teacher-secondary-button" style="padding:4px 10px;font-size:11px;text-decoration:none;">View dossier ↗</a>
                    ` : ''}
                  </div>
                </li>
              `
            }).join('')}
          </ul>
        ` : '<div class="teacher-empty-state"><h3>No messages yet</h3><p>Use the message composer on the right to start a direct conversation with a student.</p></div>'}
      </div>

      <form class="teacher-form-card vo-inbox-composer-card" id="teacher-inbox-compose-form">
        <div>
          <p class="teacher-label">DIRECT MESSAGING</p>
          <h3>Send a message to a student</h3>
        </div>
        <label>Student recipient
          <select name="recipient_id" required>
            <option value="">Select a student...</option>
            ${students.map(s => `
              <option value="${escapeHtml(s.id)}">${escapeHtml(s.name || 'Unnamed')} (${escapeHtml(s.language || 'General')} · ${escapeHtml(s.level || 'No level')})</option>
            `).join('')}
          </select>
        </label>
        <label>Subject
          <input name="subject" required maxlength="160" placeholder="e.g. Feedback on recent progress, Next class prep...">
        </label>
        <label>Message
          <textarea name="body" required rows="5" placeholder="Write your message to the student..."></textarea>
        </label>
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap;">
          <button class="teacher-primary-button" type="submit" id="teacher-send-msg-btn">Send message</button>
          <p class="teacher-form-status" data-inbox-status aria-live="polite"></p>
        </div>
      </form>
    </div>
  `

  const form = document.querySelector('#teacher-inbox-compose-form')
  form?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const status = form.querySelector('[data-inbox-status]')
    const submitBtn = document.querySelector('#teacher-send-msg-btn')
    const values = Object.fromEntries(new FormData(form).entries())
    const user = await getCurrentUser()

    if (!user) {
      if (status) status.textContent = 'Session expired. Please log in.'
      return
    }

    if (submitBtn) submitBtn.disabled = true
    if (status) status.textContent = 'Sending message...'

    const { error } = await sendAcademicMessage(supabase, {
      sender_id: user.id,
      sender_role: 'teacher',
      recipient_id: values.recipient_id,
      recipient_role: 'student',
      subject: values.subject.trim(),
      body: values.body.trim(),
      is_read: false
    })

    if (error) {
      if (status) status.textContent = formatSupabaseError(error, 'Could not send message.')
      if (submitBtn) submitBtn.disabled = false
      return
    }

    if (status) status.textContent = 'Message sent successfully.'
    form.reset()
    setTimeout(() => loadInbox(panel), 600)
  })

  panel.querySelector('[data-inbox-search]')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim()
    panel.querySelectorAll('.teacher-inbox-msg-item').forEach(el => {
      el.hidden = Boolean(q && !el.dataset.msgSearch?.includes(q))
    })
  })

  panel.querySelectorAll?.('[data-reply-peer]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!form) return
      form.elements.recipient_id.value = btn.dataset.replyPeer
      const subj = btn.dataset.replySubject || ''
      form.elements.subject.value = subj.startsWith('Re:') ? subj : `Re: ${subj}`
      form.elements.body.focus()
    })
  })

  panel.querySelectorAll?.('[data-msg-filter]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-msg-filter]').forEach(b => b.classList.toggle('is-active', b === btn))
      const filter = btn.dataset.msgFilter
      panel.querySelectorAll('.teacher-inbox-msg-item').forEach(el => {
        el.style.display = (filter === 'all' || el.dataset.senderRole === filter) ? 'flex' : 'none'
      })
    })
  })

  panel.querySelectorAll?.('[data-mark-read-id]')?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgId = btn.dataset.markReadId
      btn.disabled = true
      const result = await supabase.rpc('mark_inbox_message_as_read', { p_message_id: msgId })
      if (result.error || result.data !== true) { btn.disabled = false; return }
      loadInbox(panel)
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

function metricCard(label, value, detail, theme = 'indigo') {
  return `<article class="teacher-metric-card vo-metric-${escapeHtml(theme)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`
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
