// Vera Orbis — Adult Teacher AI Learning Architect Frontend
// Strict Adult Educator Only (18+) · Decoupled Export/Import Architecture

import { supabase } from './lib/supabase.js'
import { verifyAdultTeacherAccess, AdultAuthError } from './lib/adultTeacherAuth.js'
import { generateCurriculumCourse, generateCurriculumSession } from './lib/curriculumEngine.js'
import { LANGUAGES, LEVELS, validateArchitectCourse, architectCourseToPlan } from '../supabase/functions/academic-ai/learning-architect.js'
import { PEDAGOGICAL_OBJECTIVES, DEFAULT_PEDAGOGICAL_OBJECTIVE } from '../supabase/functions/academic-ai/pedagogy.js'
import { validateLearningPlan } from './lib/learningPlans.js'

const app = document.getElementById('architectApp')
const headerStatus = document.getElementById('headerAuthStatus')

let currentTeacher = null
let currentPlan = null
let currentCourse = null

// Show a temporary feedback toast
function showToast(message, type = 'info') {
  const existing = document.querySelector('.architect-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.className = 'architect-toast'
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✓'}</span> <span>${message}</span>`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

function getEligibleTeacherRegistry() {
  const envVar = import.meta.env?.VITE_ELIGIBLE_ADULT_TEACHER_IDS
  if (envVar) {
    return envVar.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (typeof window !== 'undefined' && Array.isArray(window.__VERA_ADULT_TEACHER_REGISTRY__)) {
    return window.__VERA_ADULT_TEACHER_REGISTRY__
  }
  return []
}

// 1. Initial State: Check if teacher is already authenticated
async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      renderVerifying()
      const verified = await verifyAdultTeacherAccess(supabase, getEligibleTeacherRegistry())
      currentTeacher = verified
      renderWorkspace()
    } else {
      renderLogin()
    }
  } catch (err) {
    console.error('Adult auth verification failed:', err)
    renderLogin(err.message)
  }
}

function renderVerifying() {
  app.innerHTML = `
    <div class="architect-loading-box">
      <div class="architect-spinner"></div>
      <p>Verifying instructor credentials and adult eligibility against academic registry…</p>
    </div>`
}

// 2. Login View with Strict Adult Notice
function renderLogin(errorMessage = null) {
  headerStatus.innerHTML = `<span class="adult-badge">ADULT EDUCATORS ONLY (18+)</span>`

  app.innerHTML = `
    <div class="architect-auth-banner">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <span class="adult-badge">RESTRICTED ACCESS · ADULT INSTRUCTORS ONLY (18+)</span>
      </div>
      <h2>Instructor Authentication</h2>
      <p class="architect-auth-desc">
        Welcome to the Vera Orbis AI Learning Architect. This isolated environment is strictly reserved for verified adult educators (18+).
      </p>

      <div class="architect-auth-warning">
        <strong>Security & Compliance Policy:</strong><br>
        Student accounts, minor learners, and unverified credentials cannot access this environment. Server-side role checks reject all non-instructor tokens.
      </div>

      ${errorMessage ? `<div class="architect-auth-warning" style="background: rgba(225, 29, 72, 0.2); border-left-color: #f43f5e; color: #fecdd3;"><strong>Access Denied:</strong> ${errorMessage}</div>` : ''}

      <form id="architectLoginForm">
        <div class="architect-input-group">
          <label for="teacherEmail">Instructor Email Address</label>
          <input type="email" id="teacherEmail" required placeholder="teacher@example.com" autocomplete="email">
        </div>
        <div class="architect-input-group">
          <label for="teacherPassword">Password</label>
          <input type="password" id="teacherPassword" required placeholder="••••••••••••" autocomplete="current-password">
        </div>
        <div style="margin-top: 1.5rem;">
          <button type="submit" class="architect-button-primary" style="width: 100%;">
            Verify Credentials & Enter Studio
          </button>
        </div>
      </form>
    </div>`

  const form = document.getElementById('architectLoginForm')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('teacherEmail').value.trim()
    const password = document.getElementById('teacherPassword').value

    renderVerifying()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)

      // Strict server-side verification: Rejects student accounts immediately
      const verified = await verifyAdultTeacherAccess(supabase, getEligibleTeacherRegistry())
      currentTeacher = verified
      renderWorkspace()
    } catch (err) {
      await supabase.auth.signOut().catch(() => {})
      renderLogin(err.message)
    }
  })
}

// 3. Workspace View
function renderWorkspace() {
  headerStatus.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <span class="adult-badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #34d399;">
        ✓ VERIFIED ADULT INSTRUCTOR (18+)
      </span>
      <span style="font-size: 0.825rem; color: #94a3b8;">${currentTeacher.email}</span>
      <button type="button" class="architect-button-secondary" id="signOutBtn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">
        Sign Out
      </button>
    </div>`

  document.getElementById('signOutBtn').onclick = async () => {
    await supabase.auth.signOut()
    currentTeacher = null
    currentPlan = null
    currentCourse = null
    renderLogin()
  }

  app.innerHTML = `
    <!-- Clear Provider & Generation Mode Disclosure -->
    <div class="architect-card" style="border-left: 4px solid #38bdf8; background: rgba(15, 23, 42, 0.85);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="architect-eyebrow" style="color: #38bdf8;">TRANSPARENCIA TECNOLÓGICA & ESTADO OPERATIVO</span>
          <h3 style="margin: 0.25rem 0 0.5rem 0; font-size: 1.15rem; color: #ffffff;">Modo Operativo: Catálogo Pedagógico Estructurado (Plantillas 12 Clases)</h3>
          <p style="margin: 0; font-size: 0.85rem; line-height: 1.5; color: #cbd5e1; max-width: 850px;">
            <strong>Modo Activo:</strong> Generación estructurada determinista basada en el banco curricular y la metodología Vera Orbis (<em>Power Expressions → Listen → Repeat → Personalize → Use</em>). Permite generar, editar en tiempo real, regenerar sesiones y exportar/importar planes completos de 12 clases sin enviar datos a APIs externas.<br>
            <strong>Inferencia Neuronal Gemini LLM (gemini-3.1-flash-lite):</strong> Preservada y verificada en el entorno de Staging aislado, pero <strong>bloqueada en producción</strong> por salvaguarda contractual (restricción de clientes de API accesibles por menores de edad según los términos de Google). No se presentan ambos sistemas como equivalentes.
          </p>
        </div>
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 0.4rem 0.8rem; border-radius: 6px; display: inline-block;">
            GEMINI PRODUCCIÓN: BLOQUEADO (Elegibilidad Google Pendiente)
          </span>
        </div>
      </div>
    </div>

    <div class="architect-card">
      <div class="architect-card-header">
        <div>
          <span class="architect-eyebrow">STEP 1: PARÁMETROS PEDAGÓGICOS</span>
          <h3>Configuración del Curso</h3>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #94a3b8;">
            Selecciona idioma meta, nivel MCER, objetivo comunicativo y duración por clase. No se aceptan datos personales ni identificadores de alumnos.
          </p>
        </div>
      </div>

      <form id="architectConfigForm">
        <div class="architect-config-grid">
          <div class="architect-input-group">
            <label for="cfgLanguage">Target Language</label>
            <select id="cfgLanguage" required>
              ${LANGUAGES.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
          <div class="architect-input-group">
            <label for="cfgLevel">CEFR Proficiency Level</label>
            <select id="cfgLevel" required>
              ${LEVELS.map(lvl => `<option value="${lvl}">${lvl}</option>`).join('')}
            </select>
          </div>
          <div class="architect-input-group">
            <label for="cfgGoal">Broad Communicative Goal</label>
            <select id="cfgGoal" required>
              ${PEDAGOGICAL_OBJECTIVES.map(g => `<option value="${g.value}">${g.value}</option>`).join('')}
            </select>
          </div>
          <div class="architect-input-group">
            <label for="cfgDuration">Class Duration (Minutes)</label>
            <input type="number" id="cfgDuration" min="20" max="120" value="60" required>
          </div>
          <div class="architect-input-group">
            <label for="cfgClasses">Number of Classes</label>
            <input type="number" id="cfgClasses" min="1" max="12" value="12" required>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <p style="margin: 0; font-size: 0.825rem; color: #64748b;">
            Power Expressions → Listen → Repeat → Personalize → Use. Generates complete 12-session syllabus.
          </p>
          <button type="submit" class="architect-button-primary" id="generateBtn">
            <span>✨</span> Generate 12-Class Study Plan
          </button>
        </div>
      </form>
    </div>

    <div id="architectPlanWorkspace">
      <!-- Renders when plan is generated -->
    </div>`

  const configForm = document.getElementById('architectConfigForm')
  configForm.addEventListener('submit', (e) => {
    e.preventDefault()
    handleGeneratePlan()
  })
}

// 4. Handle Plan Generation
function handleGeneratePlan() {
  const language = document.getElementById('cfgLanguage').value
  const level = document.getElementById('cfgLevel').value
  const goal = document.getElementById('cfgGoal').value
  const duration = Number(document.getElementById('cfgDuration').value)
  const classes = Number(document.getElementById('cfgClasses').value)

  const generateBtn = document.getElementById('generateBtn')
  generateBtn.disabled = true
  generateBtn.innerHTML = `<span>⏳</span> Generating 12-Class Course…`

  try {
    const request = {
      mode: 'learning_architect',
      studentId: '20000000-0000-4000-8000-000000000001',
      requestId: crypto.randomUUID(),
      language,
      level,
      goal,
      classes,
      duration,
      regenerate: null
    }

    const course = generateCurriculumCourse(request)
    const plan = architectCourseToPlan(course, request, {})
    validateLearningPlan(plan, { complete: true })

    currentCourse = course
    currentPlan = plan

    renderPlanWorkspace()
    showToast('Complete 12-Class Study Plan generated successfully!')
  } catch (err) {
    console.error('Plan generation error:', err)
    showToast(err.message, 'error')
  } finally {
    generateBtn.disabled = false
    generateBtn.innerHTML = `<span>✨</span> Generate 12-Class Study Plan`
  }
}

// 5. Render Plan Workspace
function renderPlanWorkspace() {
  const container = document.getElementById('architectPlanWorkspace')
  if (!currentCourse || !currentPlan) {
    container.innerHTML = ''
    return
  }

  container.innerHTML = `
    <!-- Course Overview Card -->
    <div class="architect-card">
      <div class="architect-card-header">
        <div>
          <span class="architect-eyebrow">STEP 2: COURSE OVERVIEW & PEDAGOGY</span>
          <h3>Course Architecture: ${currentCourse.title}</h3>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <span class="adult-badge" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
            ${currentCourse.language} · ${currentCourse.level} · ${currentCourse.sessions.length} Classes
          </span>
        </div>
      </div>

      <div class="architect-input-group">
        <label for="planTitle">Course Title</label>
        <input type="text" id="planTitle" value="${escapeHtml(currentCourse.title)}" maxlength="160">
      </div>

      <div class="architect-input-group">
        <label for="planSummary">Pedagogical Summary</label>
        <textarea id="planSummary" rows="2" maxlength="2000">${escapeHtml(currentCourse.summary)}</textarea>
      </div>

      <div class="architect-config-grid">
        <div class="architect-input-group">
          <label for="planNeeds">Needs Analysis & Context</label>
          <textarea id="planNeeds" rows="2" maxlength="2000">${escapeHtml(currentCourse.needs)}</textarea>
        </div>
        <div class="architect-input-group">
          <label for="planApproach">Communicative Approach</label>
          <textarea id="planApproach" rows="2" maxlength="2000">${escapeHtml(currentCourse.approach)}</textarea>
        </div>
      </div>
    </div>

    <!-- 12 Editable Lesson Cards -->
    <div class="architect-card">
      <div class="architect-card-header">
        <div>
          <span class="architect-eyebrow">STEP 3: LESSON ARCHITECTURE</span>
          <h3>Individual Session Modules (1 to ${currentCourse.sessions.length})</h3>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: #94a3b8;">
            Edit any card in-place or regenerate individual sessions without altering the rest of your course.
          </p>
        </div>
      </div>

      <div id="sessionsStack">
        ${currentCourse.sessions.map((session, idx) => renderSessionCardHtml(session, idx)).join('')}
      </div>
    </div>

    <!-- Export & Integration Bar -->
    <div class="architect-export-bar">
      <div>
        <strong style="color: #ffffff; font-size: 1rem;">Export & Vera Orbis Integration</strong>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.825rem; color: #94a3b8;">
          Ready to use in the Vera Orbis Teacher Dashboard. Export JSON or copy to clipboard.
        </p>
      </div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button type="button" class="architect-button-secondary" id="howToImportBtn">
          <span>📖</span> How to Import Guide
        </button>
        <button type="button" class="architect-button-secondary" id="copyJsonBtn">
          <span>📋</span> Copy Plan JSON
        </button>
        <button type="button" class="architect-button-secondary" id="exportSyllabusBtn">
          <span>📄</span> Export Syllabus (TXT)
        </button>
        <button type="button" class="architect-button-primary" id="downloadJsonBtn">
          <span>📥</span> Export Plan JSON (for Vera Orbis)
        </button>
      </div>
    </div>`

  attachSessionListeners()
  attachExportListeners()
}

function renderSessionCardHtml(session, idx) {
  const num = idx + 1
  return `
    <div class="architect-session-card" data-session-index="${idx}">
      <div class="architect-session-head">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="architect-session-number">CLASS ${num < 10 ? '0' + num : num}</span>
          <strong style="color: #ffffff; font-size: 1.05rem;">${escapeHtml(session.title)}</strong>
        </div>
        <button type="button" class="architect-button-secondary" data-action="regenerate-session" data-index="${idx}" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
          <span>🔄</span> Regenerate This Session
        </button>
      </div>

      <div class="architect-input-group">
        <label>Session Title</label>
        <input type="text" data-field="title" value="${escapeHtml(session.title)}" maxlength="160">
      </div>

      <div class="architect-config-grid">
        <div class="architect-input-group">
          <label>Communicative Objective</label>
          <input type="text" data-field="objective" value="${escapeHtml(session.objective)}" maxlength="300">
        </div>
        <div class="architect-input-group">
          <label>Success Criteria & Evidence</label>
          <input type="text" data-field="evidence" value="${escapeHtml(session.evidence)}" maxlength="600">
        </div>
      </div>

      <!-- Minute Allocation Matrix -->
      <div class="architect-input-group">
        <label>Stage Minute Allocation (Listen / Repeat / Personalize / Use)</label>
        <div class="architect-minute-grid">
          <div class="architect-stage-pill">
            <span>01 Listen</span>
            <input type="number" min="1" max="120" data-field="minute-0" value="${session.minutes[0]}">
          </div>
          <div class="architect-stage-pill">
            <span>02 Repeat</span>
            <input type="number" min="1" max="120" data-field="minute-1" value="${session.minutes[1]}">
          </div>
          <div class="architect-stage-pill">
            <span>03 Personalize</span>
            <input type="number" min="1" max="120" data-field="minute-2" value="${session.minutes[2]}">
          </div>
          <div class="architect-stage-pill">
            <span>04 Use</span>
            <input type="number" min="1" max="120" data-field="minute-3" value="${session.minutes[3]}">
          </div>
        </div>
      </div>

      <div class="architect-config-grid">
        <div class="architect-input-group">
          <label>Power Expressions (One per line)</label>
          <textarea rows="3" data-field="power_expressions">${escapeHtml(session.power_expressions.join('\n'))}</textarea>
        </div>
        <div class="architect-input-group">
          <label>Target Vocabulary (One per line)</label>
          <textarea rows="3" data-field="vocabulary">${escapeHtml(session.vocabulary.join('\n'))}</textarea>
        </div>
      </div>

      <div class="architect-input-group">
        <label>Real-World Communicative Task</label>
        <textarea rows="2" data-field="task" maxlength="600">${escapeHtml(session.task)}</textarea>
      </div>

      <div class="architect-config-grid">
        <div class="architect-input-group">
          <label>Contextual Input (Listening / Dialogue)</label>
          <textarea rows="2" data-field="contextual_input" maxlength="600">${escapeHtml(session.contextual_input)}</textarea>
        </div>
        <div class="architect-input-group">
          <label>Guided Practice (Drill / Scaffolding)</label>
          <textarea rows="2" data-field="guided_practice" maxlength="600">${escapeHtml(session.guided_practice)}</textarea>
        </div>
      </div>

      <div class="architect-config-grid">
        <div class="architect-input-group">
          <label>Personalization Activity</label>
          <textarea rows="2" data-field="personalization" maxlength="600">${escapeHtml(session.personalization)}</textarea>
        </div>
        <div class="architect-input-group">
          <label>Suggested Activities (One per line)</label>
          <textarea rows="2" data-field="activities">${escapeHtml(session.activities.join('\n'))}</textarea>
        </div>
      </div>

      <div class="architect-config-grid">
        <div class="architect-input-group">
          <label>Homework / Real-World Challenge</label>
          <input type="text" data-field="homework" value="${escapeHtml(session.homework)}" maxlength="600">
        </div>
        <div class="architect-input-group">
          <label>Pedagogical Checkpoint</label>
          <input type="text" data-field="checkpoint" value="${escapeHtml(session.checkpoint)}" maxlength="600">
        </div>
      </div>
    </div>`
}

function attachSessionListeners() {
  const stack = document.getElementById('sessionsStack')
  if (!stack) return

  // Single Session Regeneration
  stack.querySelectorAll('[data-action="regenerate-session"]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.index)
      handleRegenerateSession(idx, btn)
    }
  })
}

function handleRegenerateSession(idx, btn) {
  readFormValuesIntoModel()
  btn.disabled = true
  btn.innerHTML = `<span>⏳</span> Regenerating…`

  try {
    const request = {
      mode: 'learning_architect',
      studentId: '20000000-0000-4000-8000-000000000001',
      requestId: crypto.randomUUID(),
      language: currentCourse.language,
      level: currentCourse.level,
      goal: currentPlan.architect.goal,
      classes: currentCourse.sessions.length,
      duration: currentPlan.architect.session_minutes,
      regenerate: {
        versionId: crypto.randomUUID(),
        revision: 1,
        session: idx
      }
    }

    const newSession = generateCurriculumSession(request)
    currentCourse.sessions[idx] = newSession

    // Update corresponding objective in plan
    currentPlan.objectives[idx] = {
      ...currentPlan.objectives[idx],
      title: newSession.objective,
      success_criteria: newSession.evidence,
      steps: newSession.steps
    }
    const { objective, evidence, steps, ...details } = newSession
    currentPlan.architect.sessions[idx] = details

    validateLearningPlan(currentPlan, { complete: true })

    // Re-render only that card
    const card = document.querySelector(`[data-session-index="${idx}"]`)
    if (card) {
      card.outerHTML = renderSessionCardHtml(newSession, idx)
      attachSessionListeners()
    }
    showToast(`Class ${idx + 1} regenerated successfully. All other sessions preserved!`)
  } catch (err) {
    console.error('Session regeneration error:', err)
    showToast(err.message, 'error')
  } finally {
    btn.disabled = false
    btn.innerHTML = `<span>🔄</span> Regenerate This Session`
  }
}

// Read all user edits from DOM back into data model
function readFormValuesIntoModel() {
  if (!currentCourse || !currentPlan) return

  currentCourse.title = document.getElementById('planTitle')?.value.trim() || currentCourse.title
  currentCourse.summary = document.getElementById('planSummary')?.value.trim() || currentCourse.summary
  currentCourse.needs = document.getElementById('planNeeds')?.value.trim() || currentCourse.needs
  currentCourse.approach = document.getElementById('planApproach')?.value.trim() || currentCourse.approach

  currentPlan.title = currentCourse.title
  currentPlan.summary = currentCourse.summary
  currentPlan.architect.needs = currentCourse.needs
  currentPlan.architect.approach = currentCourse.approach

  document.querySelectorAll('.architect-session-card').forEach(card => {
    const idx = Number(card.dataset.sessionIndex)
    const session = currentCourse.sessions[idx]
    if (!session) return

    session.title = card.querySelector('[data-field="title"]').value.trim()
    session.objective = card.querySelector('[data-field="objective"]').value.trim()
    session.evidence = card.querySelector('[data-field="evidence"]').value.trim()
    session.minutes = [0, 1, 2, 3].map(n => Number(card.querySelector(`[data-field="minute-${n}"]`).value) || 15)
    session.power_expressions = card.querySelector('[data-field="power_expressions"]').value.split('\n').map(s => s.trim()).filter(Boolean)
    session.vocabulary = card.querySelector('[data-field="vocabulary"]').value.split('\n').map(s => s.trim()).filter(Boolean)
    session.task = card.querySelector('[data-field="task"]').value.trim()
    session.contextual_input = card.querySelector('[data-field="contextual_input"]').value.trim()
    session.guided_practice = card.querySelector('[data-field="guided_practice"]').value.trim()
    session.personalization = card.querySelector('[data-field="personalization"]').value.trim()
    session.activities = card.querySelector('[data-field="activities"]').value.split('\n').map(s => s.trim()).filter(Boolean)
    session.homework = card.querySelector('[data-field="homework"]').value.trim()
    session.checkpoint = card.querySelector('[data-field="checkpoint"]').value.trim()

    session.steps = [
      { stage: 'Listen', activity: session.contextual_input },
      { stage: 'Repeat', activity: session.guided_practice },
      { stage: 'Personalize', activity: session.personalization },
      { stage: 'Use', activity: session.task }
    ]

    currentPlan.objectives[idx] = {
      ...currentPlan.objectives[idx],
      title: session.objective,
      success_criteria: session.evidence,
      steps: session.steps
    }

    const { objective, evidence, steps, ...details } = session
    currentPlan.architect.sessions[idx] = details
  })

  validateLearningPlan(currentPlan, { complete: true })
}

function attachExportListeners() {
  // 1. Copy JSON
  document.getElementById('copyJsonBtn').onclick = () => {
    try {
      readFormValuesIntoModel()
      const jsonStr = JSON.stringify(currentPlan, null, 2)
      navigator.clipboard.writeText(jsonStr)
      showToast('Plan JSON copied to clipboard!')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // 2. Download JSON
  document.getElementById('downloadJsonBtn').onclick = () => {
    try {
      readFormValuesIntoModel()
      const jsonStr = JSON.stringify(currentPlan, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `learning-plan-${currentCourse.language.toLowerCase()}-${currentCourse.level.toLowerCase()}-12classes.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Learning plan JSON downloaded!')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // 3. Export Syllabus TXT
  document.getElementById('exportSyllabusBtn').onclick = () => {
    try {
      readFormValuesIntoModel()
      let txt = `=========================================================\n`
      txt += `VERA ORBIS — 12-CLASS COMMUNICATIVE SYLLABUS\n`
      txt += `=========================================================\n`
      txt += `Course: ${currentCourse.title}\n`
      txt += `Language: ${currentCourse.language} | Level: ${currentCourse.level}\n`
      txt += `Goal: ${currentPlan.architect.goal} | Session Duration: ${currentPlan.architect.session_minutes} min\n`
      txt += `Summary: ${currentCourse.summary}\n\n`
      txt += `Needs: ${currentCourse.needs}\n`
      txt += `Approach: ${currentCourse.approach}\n\n`

      currentCourse.sessions.forEach((s, idx) => {
        txt += `---------------------------------------------------------\n`
        txt += `CLASS ${idx + 1}: ${s.title}\n`
        txt += `Objective: ${s.objective}\n`
        txt += `Evidence: ${s.evidence}\n`
        txt += `Time Breakdown: Listen: ${s.minutes[0]}m | Repeat: ${s.minutes[1]}m | Personalize: ${s.minutes[2]}m | Use: ${s.minutes[3]}m\n`
        txt += `Power Expressions:\n  - ${s.power_expressions.join('\n  - ')}\n`
        txt += `Vocabulary: ${s.vocabulary.join(', ')}\n`
        txt += `Real-World Task: ${s.task}\n`
        txt += `Homework: ${s.homework}\n`
        txt += `Checkpoint: ${s.checkpoint}\n\n`
      })

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `syllabus-${currentCourse.language.toLowerCase()}-${currentCourse.level.toLowerCase()}.txt`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Syllabus text file downloaded!')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // 4. How to Import Walkthrough Modal
  document.getElementById('howToImportBtn').onclick = () => {
    const modal = document.createElement('div')
    modal.className = 'modal-backdrop'
    modal.innerHTML = `
      <div class="modal-card">
        <h3>How to Import into Vera Orbis Teacher Dashboard</h3>
        <p style="color: #94a3b8; font-size: 0.9rem;">Follow these 3 simple steps to assign this study plan to a student in Vera Orbis:</p>
        <ol>
          <li><strong>Export Plan JSON:</strong> Click the blue <em>"Export Plan JSON"</em> button above to save the validated file on your device (or click <em>"Copy Plan JSON"</em>).</li>
          <li><strong>Open Teacher Dashboard:</strong> Go to <a href="/teacher.html" target="_blank" style="color: #38bdf8;">veraorbis.studio/teacher.html</a> and navigate to the <strong>Learning Plans</strong> section.</li>
          <li><strong>Import into Student Draft:</strong> Select your enrolled student, click <strong>"Import plan JSON"</strong>, select your downloaded file, and review the 12 lesson cards. Click <em>"Save draft"</em> or <em>"Save and approve plan"</em>, then <em>"Publish to Student"</em>!</li>
        </ol>
        <div class="modal-actions">
          <button type="button" class="architect-button-primary" id="closeModalBtn">Got it, thanks!</button>
        </div>
      </div>`
    document.body.appendChild(modal)
    document.getElementById('closeModalBtn').onclick = () => modal.remove()
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

init()
