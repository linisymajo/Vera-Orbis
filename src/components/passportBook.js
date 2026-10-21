import { escapeHtml } from '../lib/auth.js'
import { normalizeInterfaceLanguage, t } from '../lib/i18n.js'

const VO_LOGO = '/logo/Logo%20Vera%20Orbis%20recoloreado.png'

/**
 * Renders the Interactive 3D Passport Book component.
 */
export function renderPassportBook(student = {}, platformData = {}, langOrStudent = 'es') {
  const uiLang = normalizeInterfaceLanguage(
    typeof langOrStudent === 'string'
      ? langOrStudent
      : (langOrStudent?.interfaceLanguage || langOrStudent?.interface_language || 'es')
  )

  const studentName = student.name || 'Estudiante Vera Orbis'
  const studentLang = student.language || 'English'
  const studentLevel = student.level || 'B1'
  const studentLevelName = student.levelName || 'Intermediate'
  const studentGoal = student.goal || 'Conversational Fluency'
  const studentProgress = Math.min(100, Math.max(0, Number(student.progress || 0)))
  const lessonsCompleted = Number(student.lessonsCompleted || 0)
  const totalLessons = student.totalLessons ? Number(student.totalLessons) : null
  const currentModule = student.currentModule || 'Speaking Foundations'
  const nextStep = student.nextStep || 'Practice active conversation'
  const studentId = String(student.id || 'VO-STUDENT').slice(0, 8).toUpperCase()

  // Data counts
  const challengesCount = Array.isArray(platformData.challenges) ? platformData.challenges.length : 0
  const submissionsCount = Array.isArray(platformData.submissions) ? platformData.submissions.length : 0
  const exercisesCount = Array.isArray(platformData.exercises) ? platformData.exercises.length : 0
  const feedbackCount = Array.isArray(platformData.feedback) ? platformData.feedback.length : 0
  const classesCount = Array.isArray(platformData.classes) ? platformData.classes.length : 0
  const attendanceCount = Array.isArray(platformData.attendance) ? platformData.attendance.length : 0
  const packagesCount = Array.isArray(platformData.packages) ? platformData.packages.length : 0

  // Machine Readable Zone line generation
  const mrzName = studentName.toUpperCase().replace(/[^A-Z]/g, '<').slice(0, 28).padEnd(28, '<')
  const mrzLang = studentLang.slice(0, 3).toUpperCase().padEnd(3, '<')
  const mrzLine1 = `P<VORBIS<<${mrzName}<<<<<<<<<<<<`
  const mrzLine2 = `VO${studentId}COL8510206M2610207${mrzLang}<<<<<<<<<<<<<<<04`

  return `
    <div class="passport-book-container" id="passport-book-interactive">

      <!-- =====================================================
           CLOSED PASSPORT BOOK (PORTADA FÍSICA)
      ====================================================== -->
      <div
        class="passport-book-closed"
        id="passport-cover"
        role="button"
        tabindex="0"
        aria-label="${t('passportTitle', uiLang) || 'Pasaporte Lingüístico'}. ${uiLang === 'es' ? 'Pulsa para abrir el libro' : 'Click to open passport book'}."
        aria-expanded="false"
      >
        <div class="passport-book-spine" aria-hidden="true"></div>
        <div class="passport-cover-surface">
          <div class="passport-gold-border">

            <div class="passport-cover-header">
              <span class="passport-nation">VERA ORBIS</span>
              <span class="passport-type">PASAPORTE LINGÜÍSTICO · LINGUISTIC PASSPORT</span>
            </div>

            <!-- EMBLEMA CENTRAL DORADO -->
            <div class="passport-emblem-wrap" aria-hidden="true">
              <div class="passport-emblem-halo"></div>
              <svg class="passport-gold-emblem" viewBox="0 0 160 160" width="104" height="104" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="80" cy="80" r="70" stroke="url(#voPassportGold)" stroke-width="2" stroke-dasharray="4 2"/>
                <circle cx="80" cy="80" r="56" stroke="url(#voPassportGold)" stroke-width="1.5"/>
                <ellipse cx="80" cy="80" rx="56" ry="24" stroke="url(#voPassportGold)" stroke-width="1.2" transform="rotate(-25 80 80)"/>
                <ellipse cx="80" cy="80" rx="56" ry="24" stroke="url(#voPassportGold)" stroke-width="1.2" transform="rotate(25 80 80)"/>
                <path d="M80 14 V146 M14 80 H146" stroke="url(#voPassportGold)" stroke-width="1" stroke-opacity="0.65"/>
                <!-- Compass Rose / North Star -->
                <path d="M80 48 L88 72 L112 80 L88 88 L80 112 L72 88 L48 80 L72 72 Z" fill="url(#voPassportGold)" fill-opacity="0.95"/>
                <circle cx="80" cy="80" r="4.5" fill="#1b0840"/>
                <!-- Stars -->
                <path d="M38 42 L40 48 L46 50 L40 52 L38 58 L36 52 L30 50 L36 48 Z" fill="url(#voPassportGold)"/>
                <path d="M122 42 L124 48 L130 50 L124 52 L122 58 L120 52 L114 50 L120 48 Z" fill="url(#voPassportGold)"/>
                <path d="M40 118 L42 124 L48 126 L42 128 L40 134 L38 128 L32 126 L38 124 Z" fill="url(#voPassportGold)"/>
                <path d="M120 118 L122 124 L128 126 L122 128 L120 134 L118 128 L112 126 L118 124 Z" fill="url(#voPassportGold)"/>
                <defs>
                  <linearGradient id="voPassportGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFF2B2"/>
                    <stop offset="35%" stop-color="#E5C158"/>
                    <stop offset="70%" stop-color="#D4AF37"/>
                    <stop offset="100%" stop-color="#A57A1E"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <!-- BIOMETRIC LINGUISTIC CHIP -->
            <div class="passport-chip" aria-hidden="true">
              <div class="passport-chip-lines"></div>
            </div>

            <div class="passport-cover-footer">
              <div class="passport-target-lang-pill">
                <span>✦ ${escapeHtml(studentLang.toUpperCase())} ✦</span>
              </div>
              <div class="passport-motto-gold">DISCE · VIVE · LOQUERE</div>
              <div class="passport-tap-hint">
                <span>${uiLang === 'es' ? '✦ Pulsa para abrir ✦' : (uiLang === 'fr' ? '✦ Cliquez pour ouvrir ✦' : (uiLang === 'zh' ? '✦ 点击打开护照 ✦' : '✦ Click to open ✦'))}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- =====================================================
           OPEN PASSPORT BOOK SPREAD (EL LIBRO ABIERTO)
      ====================================================== -->
      <div class="passport-book-open" id="passport-spread" hidden aria-hidden="true">

        <!-- SPREAD TOOLBAR -->
        <div class="passport-spread-toolbar">
          <div class="passport-page-tabs" role="tablist">
            <button
              type="button"
              class="passport-tab-btn is-active"
              data-passport-target-spread="1"
              role="tab"
              aria-selected="true"
            >
              1. ${uiLang === 'es' ? 'Identidad & Visa' : (uiLang === 'fr' ? 'Identité & Visa' : (uiLang === 'zh' ? '身份与签证' : 'Identity & Visa'))}
            </button>
            <button
              type="button"
              class="passport-tab-btn"
              data-passport-target-spread="2"
              role="tab"
              aria-selected="false"
            >
              2. ${uiLang === 'es' ? 'Expediente & Actividad' : (uiLang === 'fr' ? 'Dossier & Activité' : (uiLang === 'zh' ? '档案与活跃度' : 'Record & Activity'))}
            </button>
          </div>

          <button
            type="button"
            class="passport-close-btn"
            id="passport-close-trigger"
            aria-label="${uiLang === 'es' ? 'Cerrar pasaporte' : 'Close passport'}"
          >
            ✕ ${uiLang === 'es' ? 'Cerrar pasaporte' : (uiLang === 'fr' ? 'Fermer le passeport' : (uiLang === 'zh' ? '关闭护照' : 'Close passport'))}
          </button>
        </div>

        <!-- 3D BOOK PAGES CONTAINER -->
        <div class="passport-spread-book">

          <!-- SPREAD 1: SPREAD IDENTIDAD Y PROGRESO -->
          <div class="passport-spread-pair is-active" id="passport-spread-1">

            <!-- LEFT PAGE: HOJA DE IDENTIDAD OFICIAL -->
            <div class="passport-page passport-page-left">
              <div class="passport-paper-watermark">VERA ORBIS</div>
              <div class="passport-security-line"></div>

              <div class="passport-page-inner">
                <div class="passport-page-header">
                  <span class="passport-page-nation">REPÚBLICA DE VERA ORBIS</span>
                  <span class="passport-page-subtitle">DOCUMENTO OFICIAL DE IDENTIDAD LINGÜÍSTICA</span>
                </div>

                <div class="passport-identity-content">
                  <div class="passport-photo-box">
                    <div class="passport-photo-frame">
                      <img src="${VO_LOGO}" alt="${escapeHtml(studentName)}" class="passport-photo-img">
                      <div class="passport-official-stamp-overlay" aria-hidden="true">
                        <span>VERA ORBIS</span>
                        <small>OFFICIAL</small>
                      </div>
                    </div>
                    <span class="passport-photo-caption">ID: ${escapeHtml(studentId)}</span>
                  </div>

                  <div class="passport-fields-table">
                    <div class="passport-field-row">
                      <label>${uiLang === 'es' ? 'APELLIDOS Y NOMBRES' : 'FULL NAME'}</label>
                      <strong>${escapeHtml(studentName)}</strong>
                    </div>

                    <div class="passport-field-row">
                      <label>${uiLang === 'es' ? 'IDIOMA OBJETIVO' : 'TARGET LANGUAGE'}</label>
                      <strong class="passport-highlight-text">${escapeHtml(studentLang)}</strong>
                    </div>

                    <div class="passport-field-split">
                      <div class="passport-field-row">
                        <label>${uiLang === 'es' ? 'NIVEL CEFR' : 'CEFR LEVEL'}</label>
                        <strong>${escapeHtml(studentLevel)}</strong>
                        <small>${escapeHtml(studentLevelName)}</small>
                      </div>
                      <div class="passport-field-row">
                        <label>${uiLang === 'es' ? 'ESTADO' : 'STATUS'}</label>
                        <span class="passport-status-pill">
                          <span class="status-pulse-dot"></span>
                          ${uiLang === 'es' ? 'ACTIVO' : 'ACTIVE'}
                        </span>
                      </div>
                    </div>

                    <div class="passport-field-row">
                      <label>${uiLang === 'es' ? 'DESTINO / META' : 'LEARNING GOAL'}</label>
                      <p class="passport-goal-text">${escapeHtml(studentGoal)}</p>
                    </div>
                  </div>
                </div>

                <!-- MACHINE READABLE ZONE -->
                <div class="passport-mrz-zone" aria-hidden="true">
                  <p>${mrzLine1}</p>
                  <p>${mrzLine2}</p>
                </div>
              </div>
            </div>

            <!-- RIGHT PAGE: PROGRESO Y SELLOS OFICIALES -->
            <div class="passport-page passport-page-right">
              <div class="passport-paper-watermark">VERA ORBIS</div>

              <div class="passport-page-inner">
                <div class="passport-page-header">
                  <span class="passport-page-nation">${uiLang === 'es' ? 'VISAS & AVANCE DE TRAYECTO' : 'VISAS & JOURNEY RECORD'}</span>
                  <span class="passport-page-subtitle">PROGRESO CERTIFICADO EN TIEMPO REAL</span>
                </div>

                <!-- PROGRESS METER -->
                <div class="passport-progress-card">
                  <div class="passport-gauge-header">
                    <div>
                      <span class="passport-gauge-label">${t('journeyProgress', uiLang) || (uiLang === 'es' ? 'PROGRESO ACUMULADO' : 'CUMULATIVE PROGRESS')}</span>
                      <strong class="passport-gauge-pct">${studentProgress}%</strong>
                    </div>
                    <div class="passport-lessons-badge">
                      <span class="passport-lessons-count">
                        ${totalLessons ? `${lessonsCompleted} ${t('of', uiLang)} ${totalLessons}` : `${lessonsCompleted} ${t('completed', uiLang)}`}
                      </span>
                      <small class="passport-lessons-sub">
                        ${totalLessons ? t('lessonsLabel', uiLang) : t('totalPending', uiLang)}
                      </small>
                    </div>
                  </div>

                  <div class="passport-progress-bar-track">
                    <div class="passport-progress-bar-fill" style="width: ${studentProgress}%;"></div>
                  </div>

                  <div class="passport-journey-milestones">
                    <div class="milestone-box">
                      <span class="milestone-kicker">${uiLang === 'es' ? 'MÓDULO ACTUAL' : 'CURRENT MODULE'}</span>
                      <p>${escapeHtml(currentModule)}</p>
                    </div>
                    <div class="milestone-box">
                      <span class="milestone-kicker">${uiLang === 'es' ? 'PRÓXIMO PASO' : 'NEXT STEP'}</span>
                      <p>${escapeHtml(nextStep)}</p>
                    </div>
                  </div>
                </div>

                <!-- OFFICIAL INK STAMPS -->
                <div class="passport-stamps-gallery">
                  <div class="passport-rubber-stamp stamp-aprende stamp-turquoise">
                    <span class="stamp-border-circle"></span>
                    <span class="stamp-text-arch">VERA ORBIS</span>
                    <strong class="stamp-text-center">${t('learnIt', uiLang) || 'APRENDE'}</strong>
                    <span class="stamp-text-sub">DISCE</span>
                  </div>

                  <div class="passport-rubber-stamp stamp-vive stamp-purple">
                    <span class="stamp-border-hex"></span>
                    <span class="stamp-text-arch">ACADÉMICO</span>
                    <strong class="stamp-text-center">${t('liveIt', uiLang) || 'VIVE'}</strong>
                    <span class="stamp-text-sub">VIVE</span>
                  </div>

                  <div class="passport-rubber-stamp stamp-habla stamp-coral">
                    <span class="stamp-border-oval"></span>
                    <span class="stamp-text-arch">CONVERSACIÓN</span>
                    <strong class="stamp-text-center">${t('speakIt', uiLang) || 'HABLA'}</strong>
                    <span class="stamp-text-sub">LOQUERE</span>
                  </div>

                  <div class="passport-rubber-stamp stamp-cefr stamp-gold">
                    <span class="stamp-border-cert"></span>
                    <span class="stamp-text-arch">CEFR LEVEL</span>
                    <strong class="stamp-text-center">${escapeHtml(studentLevel)}</strong>
                    <span class="stamp-text-sub">VALIDATED</span>
                  </div>
                </div>

                <div class="passport-page-number">Pág. 2</div>
              </div>
            </div>

          </div>

          <!-- SPREAD 2: EXPEDIENTE, RETOS Y SESIONES -->
          <div class="passport-spread-pair" id="passport-spread-2">

            <!-- LEFT PAGE: RETOS Y PRÁCTICA -->
            <div class="passport-page passport-page-left">
              <div class="passport-paper-watermark">VERA ORBIS</div>
              <div class="passport-security-line"></div>

              <div class="passport-page-inner">
                <div class="passport-page-header">
                  <span class="passport-page-nation">${uiLang === 'es' ? 'EVALUACIÓN CONTINUA & RETOS' : 'CHALLENGES & EVIDENCE'}</span>
                  <span class="passport-page-subtitle">${uiLang === 'es' ? 'HISTORIAL DE RETOS Y PRÁCTICA' : 'PRACTICE AND ASSIGNMENTS'}</span>
                </div>

                <div class="passport-stats-dossier">
                  <div class="passport-stat-item">
                    <span class="stat-icon">🎯</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Retos semanales' : 'Weekly Challenges'}</span>
                      <strong>${challengesCount} ${uiLang === 'es' ? 'activos / disponibles' : 'available'}</strong>
                    </div>
                  </div>

                  <div class="passport-stat-item">
                    <span class="stat-icon">✍️</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Retos entregados' : 'Submissions'}</span>
                      <strong>${submissionsCount} ${uiLang === 'es' ? 'entregas evaluadas' : 'evaluated'}</strong>
                    </div>
                  </div>

                  <div class="passport-stat-item">
                    <span class="stat-icon">📝</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Ejercicios de studio' : 'Exercise Studio'}</span>
                      <strong>${exercisesCount} ${uiLang === 'es' ? 'asignados' : 'assigned'}</strong>
                    </div>
                  </div>

                  <div class="passport-stat-item">
                    <span class="stat-icon">💬</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Retroalimentaciones' : 'Teacher Feedback'}</span>
                      <strong>${feedbackCount} ${uiLang === 'es' ? 'devoluciones de tu profesora' : 'reviews received'}</strong>
                    </div>
                  </div>
                </div>

                <div class="passport-endorsement-box">
                  <p>
                    ${uiLang === 'es'
                      ? '«Cada reto y entrega documentada fortalece tu fluidez lingüística y confianza comunicativa.»'
                      : '“Every documented challenge and submission strengthens your communicative confidence.”'}
                  </p>
                  <span class="passport-seal-small">VERA ORBIS · ACADEMIA</span>
                </div>

                <div class="passport-page-number">Pág. 3</div>
              </div>
            </div>

            <!-- RIGHT PAGE: SESIONES EN VIVO Y MATRÍCULA -->
            <div class="passport-page passport-page-right">
              <div class="passport-paper-watermark">VERA ORBIS</div>

              <div class="passport-page-inner">
                <div class="passport-page-header">
                  <span class="passport-page-nation">${uiLang === 'es' ? 'BITÁCORA DE SESIONES & MATRÍCULA' : 'ATTENDANCE & SESSIONS LOG'}</span>
                  <span class="passport-page-subtitle">${uiLang === 'es' ? 'REGISTRO DE HORAS Y ASISTENCIA' : 'HOURS AND RECORDED SESSIONS'}</span>
                </div>

                <div class="passport-stats-dossier">
                  <div class="passport-stat-item">
                    <span class="stat-icon">🗓️</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Clases programadas' : 'Scheduled Classes'}</span>
                      <strong>${classesCount} ${uiLang === 'es' ? 'sesiones agendadas' : 'classes on calendar'}</strong>
                    </div>
                  </div>

                  <div class="passport-stat-item">
                    <span class="stat-icon">✓</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Asistencia verificada' : 'Verified Attendance'}</span>
                      <strong>${attendanceCount} ${uiLang === 'es' ? 'sesiones completadas' : 'completed sessions'}</strong>
                    </div>
                  </div>

                  <div class="passport-stat-item">
                    <span class="stat-icon">💳</span>
                    <div>
                      <span class="stat-label">${uiLang === 'es' ? 'Paquetes de clase' : 'Class Packages'}</span>
                      <strong>${packagesCount} ${uiLang === 'es' ? 'paquetes activos' : 'active packages'}</strong>
                    </div>
                  </div>
                </div>

                <div class="passport-coordinates-footer">
                  <span class="coord-label">COORDINATES:</span>
                  <strong>04° 36' N — 74° 05' W</strong>
                  <small>BOGOTÁ · COLOMBIA · ONLINE WORLDWIDE</small>
                </div>

                <div class="passport-page-number">Pág. 4</div>
              </div>
            </div>

          </div>

          <!-- CENTER BINDING CREASE -->
          <div class="passport-center-crease" aria-hidden="true"></div>
        </div>

        <!-- SPREAD BOTTOM NAVIGATION CONTROLS -->
        <div class="passport-spread-footer">
          <button type="button" class="passport-nav-turn-btn" id="passport-prev-btn" disabled>
            ← ${uiLang === 'es' ? 'Página anterior' : 'Previous page'}
          </button>

          <span class="passport-page-indicator" id="passport-page-indicator">
            ${uiLang === 'es' ? 'Páginas 1 – 2 de 4' : 'Pages 1 – 2 of 4'}
          </span>

          <button type="button" class="passport-nav-turn-btn" id="passport-next-btn">
            ${uiLang === 'es' ? 'Página siguiente' : 'Next page'} →
          </button>
        </div>

      </div>

    </div>
  `
}

/**
 * Attaches interactive listeners to open/close book, turn pages, and keyboard shortcuts.
 */
export function setupPassportBook(root = document) {
  const container = root.querySelector('#passport-book-interactive')
  if (!container) return

  const cover = root.querySelector('#passport-cover')
  const spread = root.querySelector('#passport-spread')
  const closeBtn = root.querySelector('#passport-close-trigger')
  const prevBtn = root.querySelector('#passport-prev-btn')
  const nextBtn = root.querySelector('#passport-next-btn')
  const pageIndicator = root.querySelector('#passport-page-indicator')
  const tabs = root.querySelectorAll('[data-passport-target-spread]')

  let currentSpread = 1
  const totalSpreads = 2

  function updateSpreadView(spreadNum) {
    currentSpread = spreadNum

    // Toggle spread pairs
    root.querySelectorAll('.passport-spread-pair').forEach((pair) => {
      const isTarget = pair.id === `passport-spread-${spreadNum}`
      pair.classList.toggle('is-active', isTarget)
    })

    // Update tabs
    tabs.forEach((tab) => {
      const isTarget = Number(tab.dataset.passportTargetSpread) === spreadNum
      tab.classList.toggle('is-active', isTarget)
      tab.setAttribute('aria-selected', String(isTarget))
    })

    // Update footer buttons
    if (prevBtn) prevBtn.disabled = spreadNum <= 1
    if (nextBtn) nextBtn.disabled = spreadNum >= totalSpreads

    // Update indicator
    if (pageIndicator) {
      pageIndicator.textContent = spreadNum === 1 ? 'Páginas 1 – 2 de 4' : 'Páginas 3 – 4 de 4'
    }
  }

  function openPassport() {
    container.classList.add('is-open')
    if (cover) {
      cover.hidden = true
      cover.setAttribute('aria-expanded', 'true')
    }
    if (spread) {
      spread.hidden = false
      spread.setAttribute('aria-hidden', 'false')
    }
    updateSpreadView(1)

    // Smooth scroll into passport area
    try {
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch {}
  }

  function closePassport() {
    container.classList.remove('is-open')
    if (spread) {
      spread.hidden = true
      spread.setAttribute('aria-hidden', 'true')
    }
    if (cover) {
      cover.hidden = false
      cover.setAttribute('aria-expanded', 'false')
      cover.focus()
    }
  }

  // Cover click / keydown to open
  cover?.addEventListener('click', (e) => {
    e.preventDefault()
    openPassport()
  })

  cover?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPassport()
    }
  })

  // Close button
  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    closePassport()
  })

  // Page turns
  prevBtn?.addEventListener('click', () => {
    if (currentSpread > 1) updateSpreadView(currentSpread - 1)
  })

  nextBtn?.addEventListener('click', () => {
    if (currentSpread < totalSpreads) updateSpreadView(currentSpread + 1)
  })

  // Tab clicks
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = Number(tab.dataset.passportTargetSpread || 1)
      updateSpreadView(target)
    })
  })

  // Keyboard shortcut: Escape to close when open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('is-open')) {
      closePassport()
    }
  })
}
