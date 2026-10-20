import { escapeHtml } from '../lib/auth.js'
import { normalizeInterfaceLanguage, t } from '../lib/i18n.js'

/**
 * Renders the Student Calendar, Scheduled Classes, and Attendance History view.
 */
export function renderCalendar(classes = [], attendance = [], student = {}) {
  const uiLang = normalizeInterfaceLanguage(
    typeof student === 'string'
      ? student
      : (student?.interfaceLanguage || student?.interface_language || 'es')
  )

  const now = new Date()

  // Split into upcoming and past sessions
  const upcomingClasses = classes.filter((c) => {
    if (c.status === 'completed' || c.status === 'cancelled') return false
    if (!c.starts_at) return true
    return new Date(c.starts_at) >= now
  })

  const pastClasses = classes.filter((c) => {
    if (c.status === 'completed') return true
    if (c.starts_at && new Date(c.starts_at) < now) return true
    return false
  })

  return `
    <section class="calendar-section" id="calendar">

      <div class="platform-section-heading">

        <p class="platform-label">
          ${t('calendarKicker', uiLang) || '08 — CALENDAR & SCHEDULE'}
        </p>

        <h2>
          ${t('calendarHeading', uiLang) || 'Your scheduled sessions.'}
          <span>${t('calendarHeadingSpan', uiLang) || 'Learn in real time.'}</span>
        </h2>

        <p>
          ${t('calendarDesc', uiLang) || 'Track your live classes, upcoming session schedules, modality, and past attendance record.'}
        </p>

        <div class="calendar-summary-badges" style="margin-top: 18px; display: flex; gap: 12px; flex-wrap: wrap;">
          <span class="calendar-badge">
            <strong>${upcomingClasses.length}</strong> ${t('upcomingSessions', uiLang) || 'upcoming sessions'}
          </span>
          <span class="calendar-badge calendar-badge-past">
            <strong>${pastClasses.length}</strong> ${t('pastSessions', uiLang) || 'completed sessions'}
          </span>
        </div>

      </div>

      <div class="calendar-layout">

        <!-- UPCOMING CLASSES -->
        <div class="calendar-subgroup">
          <h3 style="margin: 0 0 16px; font-family: 'Playfair Display', serif; font-size: 22px; color: var(--vo-navy);">
            ${t('upcomingClassesTitle', uiLang) || 'Upcoming Live Classes'}
          </h3>

          ${upcomingClasses.length === 0 ? `
            <div class="empty-platform-state">
              <p>${t('noUpcomingClasses', uiLang) || 'No classes currently scheduled.'}</p>
              <small>${t('noUpcomingClassesHint', uiLang) || 'Your teacher will add your next scheduled session time here.'}</small>
            </div>
          ` : `
            <div class="calendar-cards-list">
              ${upcomingClasses.map((item) => {
                const dateObj = item.starts_at ? new Date(item.starts_at) : null
                const dateStr = dateObj
                  ? dateObj.toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Date pending'
                const timeStr = dateObj
                  ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  : ''

                return `
                  <article class="calendar-class-card calendar-card-upcoming">
                    <div class="calendar-card-header">
                      <div class="calendar-date-pill">
                        <span class="calendar-pill-day">${dateObj ? dateObj.getDate() : '—'}</span>
                        <span class="calendar-pill-month">${dateObj ? dateObj.toLocaleString(undefined, { month: 'short' }).toUpperCase() : 'PENDING'}</span>
                      </div>

                      <div class="calendar-class-meta">
                        <span class="calendar-modality-badge modality-${item.modality || 'online'}">
                          ${(item.modality || 'online').toUpperCase()}
                        </span>
                        <span class="calendar-duration-text">
                          ⏱ ${item.duration_minutes || 60} min
                        </span>
                        ${item.language ? `
                          <span class="calendar-lang-badge">${escapeHtml(item.language)}${item.level ? ` · ${escapeHtml(item.level)}` : ''}</span>
                        ` : ''}
                      </div>
                    </div>

                    <h4 class="calendar-class-title">
                      ${escapeHtml(item.title || 'Live Learning Session')}
                    </h4>

                    <div class="calendar-time-row">
                      <span>🗓 ${dateStr}</span>
                      ${timeStr ? `<span>⏰ ${timeStr}</span>` : ''}
                    </div>

                    ${item.notes ? `
                      <div class="calendar-class-notes">
                        <strong>${t('sessionNotes', uiLang) || 'Preparation & Notes:'}</strong>
                        <p>${escapeHtml(item.notes)}</p>
                      </div>
                    ` : ''}
                  </article>
                `
              }).join('')}
            </div>
          `}
        </div>

        <!-- PAST CLASSES & ATTENDANCE -->
        <div class="calendar-subgroup" style="margin-top: 36px;">
          <h3 style="margin: 0 0 16px; font-family: 'Playfair Display', serif; font-size: 22px; color: var(--vo-navy);">
            ${t('pastSessionsTitle', uiLang) || 'Class History & Attendance'}
          </h3>

          ${pastClasses.length === 0 ? `
            <div class="empty-platform-state">
              <p>${t('noPastClasses', uiLang) || 'No past sessions recorded yet.'}</p>
              <small>${t('noPastClassesHint', uiLang) || 'As you attend your classes, your complete attendance log will appear here.'}</small>
            </div>
          ` : `
            <div class="calendar-cards-list">
              ${pastClasses.map((item) => {
                const dateObj = item.starts_at ? new Date(item.starts_at) : null
                const dateStr = dateObj ? dateObj.toLocaleDateString() : 'Previous date'
                const attRecord = attendance.find((a) => a.class_id === item.id)
                const attStatus = attRecord?.status || 'attended'

                return `
                  <article class="calendar-class-card calendar-card-past">
                    <div class="calendar-card-header">
                      <div>
                        <span class="calendar-date-text">🗓 ${dateStr}</span>
                        <h4 class="calendar-class-title" style="margin-top: 4px;">
                          ${escapeHtml(item.title || 'Completed Session')}
                        </h4>
                      </div>

                      <span class="attendance-badge attendance-${attStatus}">
                        ${attStatus === 'present' || attStatus === 'attended' ? '✓ Asistió / Present' : (attStatus === 'excused' ? 'Excused' : 'Completed')}
                      </span>
                    </div>

                    ${attRecord?.notes ? `
                      <p class="calendar-attendance-note">
                        <em>${escapeHtml(attRecord.notes)}</em>
                      </p>
                    ` : ''}
                  </article>
                `
              }).join('')}
            </div>
          `}
        </div>

      </div>

    </section>
  `
}
