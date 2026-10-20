import { escapeHtml } from '../lib/auth.js'
import { normalizeInterfaceLanguage, t } from '../lib/i18n.js'

/**
 * Renders the Student Academic Report & Summary view.
 */
export function renderAcademicReport(student = {}, platformData = {}) {
  const uiLang = normalizeInterfaceLanguage(
    typeof student === 'string'
      ? student
      : (student?.interfaceLanguage || student?.interface_language || 'es')
  )

  const lessonsCompleted = Number(student.lessonsCompleted || student.lessons_completed || 0)
  const totalLessons = student.totalLessons || student.total_lessons || null
  const progressPct = totalLessons
    ? Math.min(100, Math.round((lessonsCompleted / totalLessons) * 100))
    : Number(student.progress || 0)

  const materialsCount = platformData.materials?.length || 0
  const challengesCount = platformData.challenges?.length || 0
  const submissionsCount = platformData.submissions?.length || 0
  const feedbackCount = platformData.feedback?.length || 0
  const exercisesCount = platformData.exercises?.length || 0
  const classesCount = platformData.classes?.length || 0

  return `
    <section class="academic-report-section" id="academic-report">

      <div class="platform-section-heading">

        <p class="platform-label">
          ${t('reportKicker', uiLang) || '11 — ACADEMIC REPORT'}
        </p>

        <h2>
          ${t('reportHeading', uiLang) || 'Your learning dossier.'}
          <span>${t('reportHeadingSpan', uiLang) || 'Every milestone documented.'}</span>
        </h2>

        <p>
          ${t('reportDesc', uiLang) || 'A comprehensive summary of your level, milestones achieved, attendance, and feedback throughout your journey.'}
        </p>

      </div>

      <!-- DOSSIER CARD -->
      <div class="academic-dossier-card">

        <div class="academic-dossier-header">
          <div class="academic-dossier-identity">
            <span class="dossier-badge">${t('officialRecord', uiLang) || 'VERA ORBIS OFFICIAL RECORD'}</span>
            <h3>${escapeHtml(student.name || 'Student')}</h3>
            <p class="dossier-meta">
              <strong>${escapeHtml(student.language || 'English')}</strong> · ${escapeHtml(student.level || 'A1')} · ${escapeHtml(student.levelName || student.level_name || 'Beginner')}
            </p>
          </div>

          <div class="dossier-progress-box">
            <span class="dossier-progress-label">${t('overallProgress', uiLang) || 'PROGRESS'}</span>
            <strong class="dossier-progress-num">${progressPct}%</strong>
            <span class="dossier-progress-sub">
              ${totalLessons ? `${lessonsCompleted}/${totalLessons} ${t('lessonsCompleted', uiLang) || 'lessons'}` : `${lessonsCompleted} ${t('lessonsCompleted', uiLang) || 'lessons'}`}
            </span>
          </div>
        </div>

        <div class="dossier-progress-track">
          <div class="dossier-progress-fill" style="width: ${progressPct}%;"></div>
        </div>

        <!-- DETAILS GRID -->
        <div class="dossier-details-grid">
          <div class="dossier-detail-item">
            <span class="dossier-item-label">${t('currentModuleLabel', uiLang) || 'CURRENT MODULE'}</span>
            <strong>${escapeHtml(student.currentModule || student.current_module || 'Getting Started')}</strong>
          </div>

          <div class="dossier-detail-item">
            <span class="dossier-item-label">${t('nextMilestoneLabel', uiLang) || 'NEXT MILESTONE'}</span>
            <strong>${escapeHtml(student.nextStep || student.next_step || 'Complete active materials')}</strong>
          </div>

          <div class="dossier-detail-item">
            <span class="dossier-item-label">${t('learningGoalLabel', uiLang) || 'LEARNING GOAL'}</span>
            <strong>${escapeHtml(student.goal || 'Fluency in target language')}</strong>
          </div>

          <div class="dossier-detail-item">
            <span class="dossier-item-label">${t('uiLanguageLabel', uiLang) || 'INTERFACE LANGUAGE'}</span>
            <strong>${(student.interfaceLanguage || student.interface_language || 'es').toUpperCase()}</strong>
          </div>
        </div>

        <!-- ACTIVITY BREAKDOWN -->
        <div class="dossier-stats-breakdown">
          <h4 style="margin: 0 0 14px; font-size: 15px; color: var(--vo-navy); font-weight: 700;">
            ${t('activitySummary', uiLang) || 'Academic Activity Summary'}
          </h4>

          <div class="dossier-stats-grid">
            <div class="dossier-stat-pill">
              <span>📚 ${t('materialsAssigned', uiLang) || 'Materials'}</span>
              <strong>${materialsCount}</strong>
            </div>

            <div class="dossier-stat-pill">
              <span>🎯 ${t('challengesCompleted', uiLang) || 'Challenges Submitted'}</span>
              <strong>${submissionsCount} / ${challengesCount}</strong>
            </div>

            <div class="dossier-stat-pill">
              <span>✍️ ${t('exercisesAssigned', uiLang) || 'Exercises'}</span>
              <strong>${exercisesCount}</strong>
            </div>

            <div class="dossier-stat-pill">
              <span>💬 ${t('feedbackReceived', uiLang) || 'Teacher Feedbacks'}</span>
              <strong>${feedbackCount}</strong>
            </div>

            <div class="dossier-stat-pill">
              <span>🗓️ ${t('scheduledSessions', uiLang) || 'Live Sessions'}</span>
              <strong>${classesCount}</strong>
            </div>
          </div>
        </div>

      </div>

    </section>
  `
}
