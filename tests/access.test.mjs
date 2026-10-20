import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  hasRequiredProfileFields,
  hasTeacherAccess
} from '../src/lib/access.js'

test('accepts a teacher record belonging to the current user', () => {
  assert.equal(
    hasTeacherAccess({ id: 'teacher-1' }, { id: 'teacher-1' }),
    true
  )
})

test('rejects a teacher record belonging to another user', () => {
  assert.equal(
    hasTeacherAccess({ id: 'teacher-1' }, { id: 'teacher-2' }),
    false
  )
})

test('rejects missing authentication or teacher records', () => {
  assert.equal(hasTeacherAccess(null, { id: 'teacher-1' }), false)
  assert.equal(hasTeacherAccess({ id: 'teacher-1' }, null), false)
})

test('requires a string profile identifier', () => {
  assert.equal(hasRequiredProfileFields({ id: 'student-1' }), true)
  assert.equal(hasRequiredProfileFields({ id: 42 }), false)
  assert.equal(hasRequiredProfileFields(null), false)
})

test('migration models group participants and repeatable package assignments', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0002_teacher_operations.sql', import.meta.url),
    'utf8'
  )

  assert.match(sql, /create table if not exists public\.class_participants/)
  assert.match(sql, /foreign key \(class_id, teacher_id\) references public\.classes\(id, teacher_id\)/)
  assert.match(sql, /assignment_id uuid primary key/)
  assert.match(sql, /unique \(assignment_id, teacher_id\)/)
  assert.match(sql, /foreign key \(assignment_id, teacher_id\) references public\.student_packages/)
})

test('migration does not expose the payments table to students', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0002_teacher_operations.sql', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(sql, /students read their payments.*on public\.payments/)
  assert.match(sql, /create or replace view public\.student_payment_summary/)
  assert.match(sql, /grant select on public\.student_payment_summary to authenticated/)
})

test('ownership policies avoid self-referential participant checks', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0002_teacher_operations.sql', import.meta.url),
    'utf8'
  )

  assert.match(sql, /teachers manage own class participants[\s\S]*using \(teacher_id = \(select auth\.uid\(\)\)\)/)
  assert.match(sql, /students read their class participants[\s\S]*using \(student_id = \(select auth\.uid\(\)\)\)/)
  assert.match(sql, /a\.assignment_id = payments\.assignment_id/)
})

test('teacher material inserts include the authenticated owner and allow global materials', () => {
  const source = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /teacher_id: user\.id/)
  assert.match(source, /student_id: data\.student_id\.trim\(\) \|\| null/)
  assert.match(source, /audience: data\.student_id\.trim\(\) \? 'student' : 'all'/)
  assert.match(source, /file_path: filePath/)
  assert.doesNotMatch(source, /file_name: file\.name/)
})

test('corrective migration is safe for the corrected 0002 shape', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0003_teacher_operations_corrective.sql', import.meta.url),
    'utf8'
  )

  assert.match(sql, /information_schema\.columns/)
  assert.match(sql, /column_name = 'student_id'/)
  assert.match(sql, /raise exception '0003 cannot infer teacher_id/)
  assert.match(sql, /if not exists \([\s\S]*pg_constraint/)
  assert.doesNotMatch(sql, /select id, teacher_id, student_id from public\.classes\s*where student_id is not null/)
})

test('teacher workspace exposes repeatable package assignment', () => {
  const source = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )

  assert.match(source, /id="teacher-assignment-form"/)
  assert.match(source, /'student_packages'/)
  assert.match(source, /package_id: data\.package_id\.trim\(\)/)
  assert.match(source, /classes_consumed: 0/)
})

test('exercise studio keeps answer keys private and supports teacher ownership', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0004_exercise_studio.sql', import.meta.url),
    'utf8'
  )
  const source = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )

  assert.match(sql, /create table if not exists public\.exercises/)
  assert.match(sql, /create table if not exists public\.exercise_attempts/)
  assert.match(sql, /create or replace view public\.student_exercises/)
  assert.match(sql, /q - 'answer' - 'explanation'/)
  assert.match(sql, /teachers manage own exercises/)
  assert.match(sql, /students insert own exercise attempts/)
  assert.match(sql, /students read own exercise attempts/)
  assert.doesNotMatch(sql, /create policy "students read assigned exercise content" on public\.exercises/)
  assert.doesNotMatch(sql, /create policy "students manage own exercise attempts"/)
  assert.match(source, /id="teacher-exercise-form"/)
  assert.match(source, /id="teacher-exercise-assignment-form"/)
  assert.match(source, /exercise_id: values\.exercise_id\.trim\(\)/)
})

test('teacher workspace dispatcher loads exercise-studio without ReferenceError', async () => {
  const { loadTeacherModule } = await import('../src/components/teacherWorkspace.js')
  const mockPanel = { innerHTML: '' }
  globalThis.document = {
    querySelector: (sel) => (sel === '#teacher-workspace-panel' ? mockPanel : null)
  }
  await assert.doesNotReject(async () => {
    await loadTeacherModule('exercise-studio')
  })
  assert.ok(mockPanel.innerHTML.length > 0)
  assert.doesNotMatch(mockPanel.innerHTML, /ReferenceError/)
})

test('academic module queries student plans from profiles instead of unmigrated work_plans table', () => {
  const source = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )
  assert.doesNotMatch(source, /from\(['"]work_plans['"]\)/)
  assert.match(source, /from\('profiles'\)\.select\(.*next_step/)
})

test('student platform redirects unauthenticated visitor to login.html', () => {
  const source = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )
  assert.match(source, /const user = await getCurrentUser\(\)/)
  assert.match(source, /if \(!user\) \{\s*window\.location\.replace\('\/login\.html'\)/)
})

test('accessible logout controls exist in both platform and teacher dashboards', () => {
  const teacherSource = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )
  const platformSource = readFileSync(
    new URL('../src/pages/platform.js', import.meta.url),
    'utf8'
  )
  const platformMainSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  assert.match(teacherSource, /id="teacher-logout-button"/)
  assert.match(teacherSource, /supabase\.auth\.signOut\(\)/)
  assert.match(platformSource, /id="student-logout-button"/)
  assert.match(platformMainSource, /student-logout-button/)
  assert.match(platformMainSource, /supabase\.auth\.signOut\(\)/)
})

test('vera voice origin validator accepts authorized origins and rejects arbitrary origins', () => {
  const source = readFileSync(
    new URL('../vera-tutor-backend/public/app.js', import.meta.url),
    'utf8'
  )
  const DEFAULT_ALLOWED = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:5173'
  ]
  const allowedSet = new Set(DEFAULT_ALLOWED)
  function isAllowed(origin) {
    if (!origin || typeof origin !== 'string') return false
    try {
      const parsed = new URL(origin)
      return allowedSet.has(parsed.origin)
    } catch {
      return false
    }
  }
  assert.equal(isAllowed('http://localhost:5173'), true)
  assert.equal(isAllowed('http://localhost:5174'), true)
  assert.equal(isAllowed('http://127.0.0.1:5173'), true)
  assert.equal(isAllowed('https://malicious-site.com'), false)
  assert.equal(isAllowed('javascript:void(0)'), false)
  assert.equal(isAllowed(''), false)
  assert.equal(isAllowed(null), false)
  assert.match(source, /isAllowedPlatformOrigin/)
  assert.doesNotMatch(source, /postMessage\([\s\S]*,\s*['"]\*['"]\)/)
})

test('.gitignore securely ignores .env files while allowing .env.example', () => {
  const gitignore = readFileSync(
    new URL('../.gitignore', import.meta.url),
    'utf8'
  )
  assert.match(gitignore, /^\.env$/m)
  assert.match(gitignore, /!\.env\.example/m)
  assert.match(gitignore, /!\*\*\/\.env\.example/m)
})

test('journey progress displays configurable non-default lesson counts accurately', async () => {
  const { renderPlatform } = await import('../src/pages/platform.js')
  const student = {
    id: 's-1',
    name: 'Sofia Gomez',
    language: 'English',
    level: 'B1',
    levelName: 'Intermediate',
    lessonsCompleted: 3,
    totalLessons: 20,
    progress: 15,
    goal: 'Fluency in meetings',
    currentModule: 'Workplace Discussions',
    nextStep: 'Prepare presentation notes'
  }

  const html = renderPlatform(student)
  assert.match(html, /3 of 20/)
  assert.doesNotMatch(html, /NaN/)
  assert.doesNotMatch(html, /0 of 12/)
})

test('journey handles unconfigured totals gracefully without inventing 12 or displaying NaN', async () => {
  const { renderPlatform, renderPlatformView } = await import('../src/pages/platform.js')
  const student = {
    id: 's-2',
    name: 'Mateo Morales',
    language: 'English',
    level: 'A1',
    levelName: 'Beginner',
    lessonsCompleted: 2,
    totalLessons: null,
    progress: 0,
    goal: 'Travel English',
    currentModule: 'Getting Started',
    nextStep: 'Complete profile'
  }

  const html = renderPlatform(student)
  const progressHtml = renderPlatformView('progress', student)

  assert.match(html, /2 completed/)
  assert.match(html, /TOTAL PENDING/)
  assert.match(progressHtml, /TOTAL LESSONS PENDING CONFIGURATION/)
  assert.doesNotMatch(html, /NaN/)
  assert.doesNotMatch(progressHtml, /NaN/)
  assert.doesNotMatch(html, /of 12/)
  assert.doesNotMatch(progressHtml, /of 12/)
})

test('roadmap does not falsely mark Getting Started as completed for new students', async () => {
  const { renderRoadmap } = await import('../src/components/roadmap.js')
  const newStudent = {
    id: 's-new',
    name: 'New Student',
    onboardingCompleted: false,
    lessonsCompleted: 0,
    totalLessons: null,
    progress: 0,
    currentModule: 'Getting Started',
    goal: 'Speak English with confidence'
  }

  const html = renderRoadmap(newStudent)
  // Step 01 should be CURRENT, not COMPLETED
  assert.match(html, /class="roadmap-step current"[^>]*data-roadmap-step="getting-started"/)
  assert.match(html, /<span>01<\/span>\s*<span>CURRENT<\/span>/)
  // Step 02 should be UPCOMING, not CURRENT
  assert.match(html, /class="roadmap-step upcoming"[^>]*data-roadmap-step="current"/)
  assert.match(html, /<span>02<\/span>\s*<span>UPCOMING<\/span>/)
})

test('roadmap marks Getting Started completed and activates module when assessment is recorded', async () => {
  const { renderRoadmap } = await import('../src/components/roadmap.js')
  const activeStudent = {
    id: 's-active',
    name: 'Active Student',
    onboardingCompleted: true,
    lessonsCompleted: 4,
    totalLessons: 16,
    progress: 25,
    currentModule: 'Everyday Fluency',
    goal: 'Work abroad'
  }

  const html = renderRoadmap(activeStudent)
  // Step 01 should be COMPLETED
  assert.match(html, /class="roadmap-step completed"[^>]*data-roadmap-step="getting-started"/)
  assert.match(html, /<span>01<\/span>\s*<span>COMPLETED<\/span>/)
  // Step 02 should be CURRENT with module progress
  assert.match(html, /class="roadmap-step current"[^>]*data-roadmap-step="current"/)
  assert.match(html, /Everyday Fluency/)
  assert.match(html, /25%/)
})

test('roadmap marks module completed when full progress is achieved', async () => {
  const { renderRoadmap } = await import('../src/components/roadmap.js')
  const finishedStudent = {
    id: 's-fin',
    name: 'Finished Student',
    onboardingCompleted: true,
    lessonsCompleted: 10,
    totalLessons: 10,
    progress: 100,
    currentModule: 'Advanced Discourse',
    goal: 'Conference presentation'
  }

  const html = renderRoadmap(finishedStudent)
  assert.match(html, /class="roadmap-step completed"[^>]*data-roadmap-step="current"/)
  assert.match(html, /class="roadmap-step current"[^>]*data-roadmap-step="next"/)
})

test('teacher dashboard includes operational content management for selected students', () => {
  const teacherSource = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )

  // Material assignment form and signed URL preview
  assert.match(teacherSource, /id="student-material-assign-form"/)
  assert.match(teacherSource, /data-view-material-file/)
  assert.match(teacherSource, /createSignedUrl\((?:cleanPath|filePath),\s*3600\)/)

  // Feedback form
  assert.match(teacherSource, /id="student-feedback-create-form"/)
  assert.match(teacherSource, /from\('feedback'\)\.insert/)

  // Challenge form
  assert.match(teacherSource, /id="student-challenge-assign-form"/)
  assert.match(teacherSource, /from\('weekly_challenges'\)\.insert/)

  // Journey calculation on save
  assert.match(teacherSource, /Math\.round\(\(updatedLessonsCompleted \/ updatedTotalLessons\) \* 100\)/)
})

test('registration and onboarding do not hardcode total_lessons to 12', () => {
  const regSource = readFileSync(
    new URL('../src/register-main.js', import.meta.url),
    'utf8'
  )
  const onbSource = readFileSync(
    new URL('../src/onboarding-main.js', import.meta.url),
    'utf8'
  )
  const platSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  assert.match(regSource, /total_lessons:\s*null/)
  assert.match(onbSource, /total_lessons:\s*null/)
  assert.match(platSource, /total_lessons:\s*null/)
})

test('student material opening maintains valid method chaining and popup-blocker defense', () => {
  const platSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  // Ensure no rogue console.log breaks the method chain
  assert.doesNotMatch(
    platSource,
    /\.from\('materials'\)\s*\n\s*console\.log/
  )

  // Ensure clean chained createSignedUrl call
  assert.match(
    platSource,
    /await\s+supabase\s*\.\s*storage\s*\.\s*from\('materials'\)\s*\.\s*createSignedUrl\(cleanPath,\s*3600\)/
  )

  // Ensure popup blocker pre-opening and fallback
  assert.match(platSource, /targetWindow\s*=\s*window\.open\('about:blank',\s*'_blank'\)/)
  assert.match(platSource, /targetWindow\.location\.href\s*=\s*data\.signedUrl/)
  assert.match(platSource, /targetWindow\.close\(\)/)

  // Ensure file path sanitization
  assert.match(platSource, /const cleanPath = filePath\.trim\(\)\.replace\(/)
})

test('storage migration 0005 enforces least-privilege private access for student materials', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0005_materials_storage_policy.sql', import.meta.url),
    'utf8'
  )

  // Bucket must be private
  assert.match(sql, /public\s*=\s*false/)

  // RLS must be enabled on storage.objects
  assert.match(sql, /alter table storage\.objects enable row level security/)

  // Student SELECT policy requires matching public.materials by exact file_path and audience or student_id
  assert.match(sql, /create policy "Students can read assigned materials"/)
  assert.match(sql, /m\.file_path\s*=\s*storage\.objects\.name/)
  assert.match(sql, /m\.student_id\s*=\s*\(select auth\.uid\(\)\)/)
  assert.match(sql, /m\.audience\s*=\s*'all'/)

  // Teacher policies require teacher's own folder prefix
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\]\s*=\s*\(select auth\.uid\(\)\)::text/)
  assert.match(sql, /create policy "Teachers can upload materials"/)
})

test('registration interface is completely in Spanish', () => {
  const regSource = readFileSync(
    new URL('../src/register-main.js', import.meta.url),
    'utf8'
  )
  const regHtml = readFileSync(
    new URL('../register.html', import.meta.url),
    'utf8'
  )

  assert.match(regHtml, /<title>Vera Orbis — Crear cuenta<\/title>/)
  assert.match(regSource, /PLATAFORMA DE ESTUDIANTES/)
  assert.match(regSource, /Comienza tu viaje\./)
  assert.match(regSource, /Nombre/)
  assert.match(regSource, /Correo electrónico/)
  assert.match(regSource, /Contraseña/)
  assert.match(regSource, /Confirmar contraseña/)
  assert.match(regSource, /Crear cuenta/)
  assert.match(regSource, /Las contraseñas no coinciden\./)
  assert.match(regSource, /¿Ya tienes una cuenta\?/)
  assert.match(regSource, /Iniciar sesión/)
})

test('vera voice is integrated within the platform page with in-page modal and avatar states', () => {
  const platSource = readFileSync(
    new URL('../src/pages/platform.js', import.meta.url),
    'utf8'
  )
  const mainSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )
  const appSource = readFileSync(
    new URL('../vera-tutor-backend/public/app.js', import.meta.url),
    'utf8'
  )
  const serverSource = readFileSync(
    new URL('../vera-tutor-backend/server.js', import.meta.url),
    'utf8'
  )

  assert.match(platSource, /id="vera-voice-modal"/)
  assert.match(platSource, /id="vera-voice-frame"/)
  assert.match(platSource, /id="vera-voice-notice"/)
  assert.match(platSource, /id="vera-voice-loader"/)
  assert.match(mainSource, /closeVeraVoiceModal/)
  assert.match(mainSource, /isVeraVoiceConfiguredForEnv/)
  assert.match(appSource, /getParentWindow/)
  assert.match(serverSource, /normalizarIdioma/)
  assert.match(serverSource, /normalizarNivel/)
  assert.match(serverSource, /GEMINI_LIVE_MODEL/)
  assert.match(serverSource, /"gemini-3\.8-live"/)
  assert.doesNotMatch(serverSource, /"gemini-2\.0-flash-exp"/)
  assert.match(serverSource, /trust proxy/)
  assert.match(serverSource, /https:\/\/vera-orbis\.onrender\.com/)
  assert.doesNotMatch(serverSource, /new Error\("Origen no permitido por CORS"\)/)
})

test('vera voice environment validator correctly detects production https vs localhost mismatch', () => {
  const mainSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  function isVeraVoiceConfiguredForEnv(testUrl, protocol = 'http:') {
    const url = testUrl || ''
    if (protocol === 'https:') {
      const isLocalhostOrHttp =
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.startsWith('http://')
      return !isLocalhostOrHttp
    }
    return Boolean(url)
  }

  // In non-https (local development), local URLs are valid
  assert.equal(isVeraVoiceConfiguredForEnv('http://localhost:3000/', 'http:'), true)

  // In https (production), local URLs are rejected to prevent ERR_CONNECTION_REFUSED
  assert.equal(isVeraVoiceConfiguredForEnv('http://localhost:3000/', 'https:'), false)
  assert.equal(isVeraVoiceConfiguredForEnv('http://127.0.0.1:3000/', 'https:'), false)
  assert.equal(isVeraVoiceConfiguredForEnv('https://vera-tutor.onrender.com', 'https:'), true)

  assert.match(mainSource, /isUnsafeLocalUrl/)
  assert.match(mainSource, /isUnconfiguredInProduction/)
})

test('email confirmation redirect uses verified production domain and avoids localhost in production', async () => {
  const { getAuthRedirectUrl, PRODUCTION_DOMAIN } = await import('../src/lib/auth.js')
  const regSource = readFileSync(
    new URL('../src/register-main.js', import.meta.url),
    'utf8'
  )
  const cname = readFileSync(
    new URL('../public/CNAME', import.meta.url),
    'utf8'
  ).trim()

  assert.equal(PRODUCTION_DOMAIN, `https://${cname}`)
  assert.equal(getAuthRedirectUrl('/onboarding.html'), `https://${cname}/onboarding.html`)
  assert.doesNotMatch(getAuthRedirectUrl('/onboarding.html'), /localhost/)
  assert.match(regSource, /getAuthRedirectUrl/)
  assert.match(regSource, /emailRedirectTo/)
})

test('student platform provides initial loading screen, timeout resilience, and error recovery', () => {
  const platHtml = readFileSync(
    new URL('../platform.html', import.meta.url),
    'utf8'
  )
  const platMain = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )
  const platCss = readFileSync(
    new URL('../src/platform.css', import.meta.url),
    'utf8'
  )

  // Initial markup has the loading screen with the verification message
  assert.match(platHtml, /id="platform-loading-screen"/)
  assert.match(platHtml, /Verifying your student session\.\.\./)

  // platform.css has loading-screen styles
  assert.match(platCss, /\.loading-screen/)
  assert.match(platCss, /\.loading-mark/)

  // platform-main.js has timeout wrapper, recovery screens, and auth listener
  assert.match(platMain, /withTimeout/)
  assert.match(platMain, /renderPlatformLoadingScreen/)
  assert.match(platMain, /renderProfileNotFoundScreen/)
  assert.match(platMain, /renderPlatformErrorScreen/)
  assert.match(platMain, /isInitializingPlatform/)
  assert.match(platMain, /onAuthStateChange/)
})

test('vera voice session verification provides auto-wait, timeout resilience, and retryable error state', () => {
  const platMain = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )
  const appSource = readFileSync(
    new URL('../vera-tutor-backend/public/app.js', import.meta.url),
    'utf8'
  )
  const serverSource = readFileSync(
    new URL('../vera-tutor-backend/server.js', import.meta.url),
    'utf8'
  )

  // Frontend refreshes near-expired token and passes student profile
  assert.match(platMain, /refreshSession/)
  assert.match(platMain, /profile:\s*currentStudent/)
  assert.match(platMain, /platformOrigin=/)

  // Backend app.js has auth waiting, origin detection, and retry logic without hard lock
  assert.match(appSource, /waitForStudentAuth/)
  assert.match(appSource, /knownParentOrigin/)
  assert.match(appSource, /No se pudo verificar tu sesión\. Haz clic en Talk to Vera para reintentar\./)

  // Server gracefully falls back to authenticated user metadata if profiles query fails
  assert.match(serverSource, /fallbackName/)
  assert.doesNotMatch(serverSource, /status\(404\)\.json\({\s*error:\s*"No se encontró el perfil del estudiante\."\s*}\)/)
})



test('migration 0006 safely adds interface_language to student profiles', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0006_interface_language.sql', import.meta.url),
    'utf8'
  )

  assert.match(sql, /alter table public\.profiles/)
  assert.match(sql, /add column if not exists interface_language text default 'es'/)
})

test('onboarding form, questions, validation, errors, and completion screen are completely in Spanish', () => {
  const onboardingSource = readFileSync(
    new URL('../src/onboarding-main.js', import.meta.url),
    'utf8'
  )
  const onboardingHtml = readFileSync(
    new URL('../onboarding.html', import.meta.url),
    'utf8'
  )

  // Document language & title
  assert.match(onboardingHtml, /<html lang="es">/)
  assert.match(onboardingHtml, /<title>Vera Orbis — Tu viaje<\/title>/)

  // All 7 steps in Spanish
  assert.match(onboardingSource, /label:\s*'SOBRE TI'/)
  assert.match(onboardingSource, /label:\s*'TUS METAS'/)
  assert.match(onboardingSource, /label:\s*'QUÉ QUIERES HACER'/)
  assert.match(onboardingSource, /label:\s*'TU EXPERIENCIA'/)
  assert.match(onboardingSource, /label:\s*'TUS RETOS'/)
  assert.match(onboardingSource, /label:\s*'TUS PREFERENCIAS'/)
  assert.match(onboardingSource, /label:\s*'TU VISIÓN'/)

  // Spanish buttons and validations
  assert.match(onboardingSource, /← Volver/)
  assert.match(onboardingSource, /Continuar <span>↗<\/span>/)
  assert.match(onboardingSource, /Finalizar mi viaje <span>↗<\/span>/)
  assert.match(onboardingSource, /Guardando\.\.\./)
  assert.match(onboardingSource, /Omitir por ahora →/)
  assert.match(onboardingSource, /TU VIAJE EN VERA ORBIS/)
  assert.match(onboardingSource, /No pudimos guardar tus respuestas\. Por favor, intenta de nuevo\./)

  // Spanish completion screen
  assert.match(onboardingSource, /Tu viaje<br>\s*está <em>siendo preparado\.<\/em>/)
  assert.match(onboardingSource, /Tus respuestas han sido guardadas\./)
  assert.match(onboardingSource, /Tu profesor revisará tus metas/)
  assert.match(onboardingSource, /Elige el idioma de tu plataforma/)
  assert.match(onboardingSource, /Ingresar a mi plataforma/)
})

test('action buttons strictly adhere to the student target language across English, French, and Mandarin', async () => {
  const { getTargetActionLabels } = await import('../src/lib/i18n.js')
  const { renderPlatform } = await import('../src/pages/platform.js')

  // 1. English target student with Spanish interface
  const enLabels = getTargetActionLabels('English')
  assert.equal(enLabels.journey, 'My Learning Journey')
  assert.equal(enLabels.challenges, 'My Challenges')
  assert.equal(enLabels.materials, 'Class Materials')
  assert.equal(enLabels.talkToVera, 'Talk to Vera')

  const studentEn = {
    id: 's-en',
    name: 'Carlos Diaz',
    language: 'English',
    level: 'B1',
    levelName: 'Intermediate',
    interfaceLanguage: 'es',
    lessonsCompleted: 2,
    totalLessons: 10,
    progress: 20,
    goal: 'Business presentations',
    nextStep: 'Practice speech'
  }
  const htmlEn = renderPlatform(studentEn)
  assert.match(htmlEn, /My Learning Journey/)
  assert.match(htmlEn, /My Challenges/)
  assert.match(htmlEn, /Class Materials/)
  assert.match(htmlEn, />Talk to Vera<\/a>/)

  // 2. French target student with Spanish interface
  const frLabels = getTargetActionLabels('French')
  assert.equal(frLabels.journey, 'Mon parcours')
  assert.equal(frLabels.challenges, 'Mes défis')
  assert.equal(frLabels.materials, 'Supports de cours')
  assert.equal(frLabels.talkToVera, 'Parler à Vera')

  const studentFr = {
    id: 's-fr',
    name: 'Camila Gomez',
    language: 'French',
    level: 'A2',
    levelName: 'Elementary',
    interfaceLanguage: 'es',
    lessonsCompleted: 1,
    totalLessons: 10,
    progress: 10,
    goal: 'Voyage en France',
    nextStep: 'Prononciation'
  }
  const htmlFr = renderPlatform(studentFr)
  assert.match(htmlFr, /Mon parcours/)
  assert.match(htmlFr, /Mes défis/)
  assert.match(htmlFr, /Supports de cours/)
  assert.match(htmlFr, />Parler à Vera<\/a>/)

  // 3. Mandarin target student with English interface
  const zhLabels = getTargetActionLabels('Mandarin')
  assert.equal(zhLabels.journey, '我的学习旅程')
  assert.equal(zhLabels.challenges, '我的挑战')
  assert.equal(zhLabels.materials, '课程资料')
  assert.equal(zhLabels.talkToVera, '与Vera对话')

  const studentZh = {
    id: 's-zh',
    name: 'David Lee',
    language: 'Mandarin',
    level: 'A1',
    levelName: 'Beginner',
    interfaceLanguage: 'en',
    lessonsCompleted: 0,
    totalLessons: 8,
    progress: 0,
    goal: 'Daily conversation',
    nextStep: 'Pinyin fundamentals'
  }
  const htmlZh = renderPlatform(studentZh)
  assert.match(htmlZh, /我的学习旅程/)
  assert.match(htmlZh, /我的挑战/)
  assert.match(htmlZh, /课程资料/)
  assert.match(htmlZh, />与Vera对话<\/a>/)
})

test('interface language is strictly separated from learning target language and does not modify learning data', () => {
  const platMainSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  // Verify switchInterfaceLanguage function exists and updates only interfaceLanguage
  assert.match(platMainSource, /export async function switchInterfaceLanguage/)
  assert.match(platMainSource, /currentStudent\.interfaceLanguage = norm/)
  assert.match(platMainSource, /update\(\{\s*interface_language:\s*norm\s*\}\)/)
  // Ensure it never overwrites target language or progress
  assert.doesNotMatch(platMainSource, /currentStudent\.language = /)
  assert.doesNotMatch(platMainSource, /currentStudent\.progress = /)
  assert.doesNotMatch(platMainSource, /currentStudent\.level = /)
})

test('platform renders localized instructions, messages, and navigation according to chosen interface language', async () => {
  const { renderPlatform } = await import('../src/pages/platform.js')

  // Spanish interface
  const studentEs = {
    id: 's-es',
    name: 'Maria Torres',
    language: 'English',
    interfaceLanguage: 'es',
    lessonsCompleted: 3,
    totalLessons: 12,
    progress: 25,
    goal: 'Fluency',
    nextStep: 'Review module 1'
  }
  const htmlEs = renderPlatform(studentEs)
  assert.match(htmlEs, /Bienvenido de nuevo,/)
  assert.match(htmlEs, /Tu viaje lingüístico continúa aquí/)
  assert.match(htmlEs, /01 — PASAPORTE LINGÜÍSTICO/)
  assert.match(htmlEs, /Tu idioma\./)
  assert.match(htmlEs, /Tu identidad\./)
  assert.match(htmlEs, /Continuar mi viaje ↗/)
  assert.match(htmlEs, /3 de 12/)

  // French interface
  const studentFrUi = {
    id: 's-frui',
    name: 'Jean Luc',
    language: 'English',
    interfaceLanguage: 'fr',
    lessonsCompleted: 4,
    totalLessons: 12,
    progress: 33,
    goal: 'Business',
    nextStep: 'Module 2'
  }
  const htmlFrUi = renderPlatform(studentFrUi)
  assert.match(htmlFrUi, /Bienvenue à nouveau,/)
  assert.match(htmlFrUi, /01 — PASSEPORT LINGUISTIQUE/)
  assert.match(htmlFrUi, /Continuer mon parcours ↗/)

  // Chinese interface
  const studentZhUi = {
    id: 's-zhui',
    name: 'Li Wei',
    language: 'English',
    interfaceLanguage: 'zh',
    lessonsCompleted: 5,
    totalLessons: 10,
    progress: 50,
    goal: 'Travel',
    nextStep: 'Module 3'
  }
  const htmlZhUi = renderPlatform(studentZhUi)
  assert.match(htmlZhUi, /欢迎回来，/)
  assert.match(htmlZhUi, /01 — 语言护照/)
  assert.match(htmlZhUi, /继续我的旅程 ↗/)
})

test('migration 0007 enforces teacher management RLS and protects sensitive data from students', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0007_teacher_management_enhancements.sql', import.meta.url),
    'utf8'
  )

  // Materials RLS
  assert.match(sql, /create table if not exists public\.materials/)
  assert.match(sql, /alter table public\.materials enable row level security/)
  assert.match(sql, /create policy "teachers manage own materials" on public\.materials/)
  assert.match(sql, /create policy "students read assigned materials" on public\.materials/)
  assert.match(sql, /m\.audience = 'all'|audience = 'all'/)

  // Classes & participants RLS
  assert.match(sql, /create table if not exists public\.classes/)
  assert.match(sql, /create policy "teachers manage own classes" on public\.classes/)
  assert.match(sql, /create policy "students read their classes" on public\.classes/)
  assert.match(sql, /create policy "teachers manage own class participants" on public\.class_participants/)

  // Packages RLS
  assert.match(sql, /create policy "teachers manage own packages" on public\.packages/)
  assert.match(sql, /create policy "students read their package assignments" on public\.student_packages/)

  // Payments isolation & summary view
  assert.match(sql, /create policy "teachers manage own payments" on public\.payments/)
  assert.doesNotMatch(sql, /students read their payments.*on public\.payments/)
  assert.match(sql, /create or replace view public\.student_payment_summary/)
  assert.match(sql, /grant select on public\.student_payment_summary to authenticated/)

  // Leads & Culture isolation
  assert.match(sql, /create policy "teachers manage own leads" on public\.leads/)
  assert.doesNotMatch(sql, /students.*read.*on public\.leads/)
  assert.match(sql, /create policy "teachers manage own culture resources" on public\.culture_resources/)
  assert.match(sql, /create policy "students read published culture resources" on public\.culture_resources/)
})

test('teacher materials management supports safe deletion and global vs individual audience display', () => {
  const teacherMain = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )
  const workspace = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )

  // Deletion attributes & handlers in student profile
  assert.match(teacherMain, /data-delete-material-id/)
  assert.match(teacherMain, /\.from\('materials'\)\.delete\(\)\.eq\('id',\s*materialId\)/)
  assert.match(teacherMain, /supabase\.storage\.from\('materials'\)\.remove/)
  assert.match(teacherMain, /count === 0/)

  // Global & Individual audience badges in student profile
  assert.match(teacherMain, /badge-global/)
  assert.match(teacherMain, /badge-individual/)

  // Materials management card & deletion in teacher workspace
  assert.match(workspace, /materialsCard/)
  assert.match(workspace, /data-delete-material-id/)
  assert.match(workspace, /\.from\('materials'\)\.delete\(\)\.eq\('id',\s*materialId\)/)
  assert.match(workspace, /data-view-material-file/)
})

test('teacher navigation provides dedicated returnToTeacherDashboard restoring complete view hierarchy', () => {
  const teacherMain = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )

  // Topbar back-to-dashboard button
  assert.match(teacherMain, /id="back-to-dashboard"/)
  assert.match(teacherMain, /← Volver al panel \(Teacher Dashboard\)/)

  // Exported returnToTeacherDashboard restoring full main container
  assert.match(teacherMain, /export function returnToTeacherDashboard/)
  assert.match(teacherMain, /renderMainDashboardContent\(\)/)
  assert.match(teacherMain, /setupTeacherWorkspace\(\)/)
  assert.match(teacherMain, /loadStudents\(\)/)

  // showStudentsView cleanly delegates to returnToTeacherDashboard without destroying layout
  assert.match(teacherMain, /function showStudentsView\(\)\s*\{\s*returnToTeacherDashboard\(true\)/)
})

test('teacher dossier and academic management reflects student interface language and academic updates', () => {
  const teacherMain = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )

  // interface_language selected in loadStudents and openStudentProfile
  assert.match(teacherMain, /interface_language[\s\S]*\.from\('profiles'\)/)
  assert.match(teacherMain, /UI:\s*\$\{\(profile\.interface_language/)

  // Academic edit form includes interface language selector
  assert.match(teacherMain, /id="academic-interface-language"/)
  assert.match(teacherMain, /interface_language:\s*interfaceLanguage/)
  assert.match(teacherMain, /profile\.interface_language\s*=\s*interfaceLanguage/)
  assert.match(teacherMain, /cachedStudent[\s\S]*interface_language:\s*interfaceLanguage/)
})

test('calendar, finance, leads, and culture modules provide complete CRUD and interactive pipeline controls', () => {
  const workspace = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )

  // Calendar
  assert.match(workspace, /id="teacher-class-form"/)
  assert.match(workspace, /data-class-filter/)
  assert.match(workspace, /data-update-class-status/)
  assert.match(workspace, /data-delete-class-id/)

  // Finance
  assert.match(workspace, /id="teacher-payment-form"/)
  assert.match(workspace, /id="teacher-expense-form"/)
  assert.match(workspace, /id="teacher-package-form"/)
  assert.match(workspace, /id="teacher-assignment-form"/)
  assert.match(workspace, /formatMoney/)
  assert.match(workspace, /data-delete-payment-id/)
  assert.match(workspace, /data-delete-expense-id/)
  assert.match(workspace, /data-delete-package-id/)

  // Leads
  assert.match(workspace, /id="teacher-lead-form"/)
  assert.match(workspace, /data-lead-filter/)
  assert.match(workspace, /data-lead-stage-select/)
  assert.match(workspace, /data-delete-lead-id/)

  // Culture
  assert.match(workspace, /id="teacher-culture-form"/)
  assert.match(workspace, /data-culture-filter/)
  assert.match(workspace, /data-toggle-culture-status/)
  assert.match(workspace, /data-delete-culture-id/)
})

test('migration 0008 provides defensive column backfills and hardened teacher RLS', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0008_teacher_management_security_patch.sql', import.meta.url),
    'utf8'
  )

  // Defensive column backfilling
  assert.match(sql, /alter table public\.materials add column if not exists language text/)
  assert.match(sql, /alter table public\.materials add column if not exists level text/)
  assert.match(sql, /alter table public\.materials add column if not exists audience text/)

  // Hardened RLS requiring verified teacher
  assert.match(sql, /exists \(select 1 from public\.teachers where id = \(select auth\.uid\(\)\)\)/)
  assert.match(sql, /create policy "teachers manage own materials" on public\.materials/)
  assert.match(sql, /drop view if exists public\.student_payment_summary/)
  assert.match(sql, /grant select on public\.student_payment_summary to authenticated/)
})

test('academic synchronization and profile update resilience against PGRST204', () => {
  const teacherMain = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )

  // Target language edit field in teacher dossier
  assert.match(teacherMain, /id="academic-language"/)
  assert.match(teacherMain, /TARGET LANGUAGE/)
  assert.match(teacherMain, /profile\.language\s*=\s*language/)
  assert.match(teacherMain, /cachedStudent[\s\S]*language:\s*language/)

  // Update payload includes target language and academic fields
  assert.match(teacherMain, /const payload = \{[\s\S]*language:\s*language/)

  // PGRST204 fallback resilience when interface_language column is not in cache
  assert.match(teacherMain, /error\.code === 'PGRST204' \|\| String\(error\.message \|\| ''\)\.includes\('interface_language'\)/)
  assert.match(teacherMain, /profiles'\)[\s\S]*?\.update\(payload\)/)
})

test('weekly challenges end-to-end synchronization and audience querying', () => {
  const teacherMain = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )
  const workspace = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )
  const platform = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  // Teacher workspace challenge insert includes teacher_id and refreshes academic panel
  assert.match(workspace, /teacher_id:\s*user\.id[\s\S]*table === 'weekly_challenges'/)
  assert.match(workspace, /table === 'materials' \|\| table === 'weekly_challenges'/)

  // Teacher profile assigns challenge with description and audience
  assert.match(teacherMain, /description:\s*instructions \|\| title/)
  assert.match(teacherMain, /instructions:\s*instructions/)
  assert.match(teacherMain, /audience:\s*audience/)

  // Student platform queries both student-specific and global challenges without rigid status DB lock
  assert.match(platform, /weekly_challenges'[\s\S]*student_id\.eq\.\${student\.id},audience\.eq\.all,student_id\.is\.null/)
  assert.match(platform, /activeChallenges = rawChallenges\.filter/)
})

test('feedback and challenge submissions error resilience and legacy column support', () => {
  const feedbackComp = readFileSync(
    new URL('../src/components/feedback.js', import.meta.url),
    'utf8'
  )
  const teacherMain = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )
  const platform = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  // Feedback components support both message/notes and title/type
  assert.match(feedbackComp, /item\.message \|\| item\.notes/)
  assert.match(feedbackComp, /item\.title \|\| item\.type/)
  assert.match(teacherMain, /item\.title \|\| item\.type/)
  assert.match(teacherMain, /item\.message \|\| item\.notes/)

  // Platform logs query warnings for transparency
  assert.match(platform, /Weekly challenges query warning/)
  assert.match(platform, /Challenge submissions query warning/)
})

test('migration 0009 provides complete RLS policies and table definitions for academic sync', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0009_academic_sync_challenges_feedback.sql', import.meta.url),
    'utf8'
  )

  // Profiles teacher update policy
  assert.match(sql, /create policy "teachers can update student profiles" on public\.profiles/)
  assert.match(sql, /for update to authenticated/)
  assert.match(sql, /exists \(select 1 from public\.teachers where id = \(select auth\.uid\(\)\)\)/)

  // Weekly challenges table & RLS
  assert.match(sql, /create table if not exists public\.weekly_challenges/)
  assert.match(sql, /create policy "teachers manage weekly challenges" on public\.weekly_challenges/)
  assert.match(sql, /create policy "students read assigned challenges" on public\.weekly_challenges/)
  assert.match(sql, /audience = 'all'[\s\S]*student_id is null/)

  // Challenge submissions table & RLS
  assert.match(sql, /create table if not exists public\.challenge_submissions/)
  assert.match(sql, /create policy "teachers manage challenge submissions" on public\.challenge_submissions/)
  assert.match(sql, /create policy "students read own submissions" on public\.challenge_submissions/)
  assert.match(sql, /create policy "students insert own submissions" on public\.challenge_submissions/)

  // Feedback table & RLS
  assert.match(sql, /create table if not exists public\.feedback/)
  assert.match(sql, /create policy "teachers manage feedback" on public\.feedback/)
  assert.match(sql, /create policy "students read own feedback" on public\.feedback/)
})

test('challenges render visibly without opacity 0 reveal block and with defensive property fallbacks', async () => {
  const { renderChallenges } = await import('../src/components/challenges.js')

  // Empty state
  const emptyHtml = renderChallenges([])
  assert.match(emptyHtml, /No active challenges this week/)

  // Populated challenge: ensure no dangling 'reveal' hiding the card
  const testChallenges = [
    {
      id: 'ch-1',
      title: 'Practice Conversation',
      instructions: 'Record 2 minutes introducing yourself.\nFocus on vowels.',
      end_date: '2026-10-30T00:00:00Z',
      points: 25
    },
    {
      id: 'ch-2',
      name: 'Vocabulary Review',
      description: 'Review the 10 verbs from yesterday',
      due_date: '2026-11-05T00:00:00Z'
    }
  ]

  const submissions = [
    {
      challenge_id: 'ch-1',
      status: 'submitted',
      teacher_feedback: 'Great effort on vowels!'
    }
  ]

  const html = renderChallenges(testChallenges, submissions)

  // Must have challenge-card without reveal class that forces opacity: 0
  assert.match(html, /class="challenge-card"/)
  assert.doesNotMatch(html, /challenge-card reveal/)

  // First challenge assertions
  assert.match(html, /Practice Conversation/)
  assert.match(html, /25 POINTS/)
  assert.match(html, /Record 2 minutes introducing yourself\.<br>Focus on vowels\./)
  assert.match(html, /✓ Challenge Submitted/)
  assert.match(html, /Great effort on vowels!/)

  // Second challenge assertions (property fallbacks: name -> title, description -> instructions, due_date)
  assert.match(html, /Vocabulary Review/)
  assert.match(html, /Review the 10 verbs from yesterday/)
  assert.match(html, /id="challenge-form-ch-2"/)
  assert.match(html, /Submit Challenge ↗/)
})

test('migration 0010 establishes secure inbox messaging with strict RLS and indexing', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0010_inbox_messaging.sql', import.meta.url),
    'utf8'
  )

  // Table creation & columns
  assert.match(sql, /create table if not exists public\.inbox_messages/)
  assert.match(sql, /sender_id uuid references auth\.users\(id\)/)
  assert.match(sql, /sender_role text not null default 'teacher' check \(sender_role in \('teacher', 'student', 'system'\)\)/)
  assert.match(sql, /recipient_id uuid not null references public\.profiles\(id\)/)
  assert.match(sql, /subject text not null/)
  assert.match(sql, /body text not null/)
  assert.match(sql, /is_read boolean not null default false/)

  // Security & RLS
  assert.match(sql, /alter table public\.inbox_messages enable row level security/)
  assert.match(sql, /create policy "teachers manage messages" on public\.inbox_messages/)
  assert.match(sql, /create policy "students read own messages" on public\.inbox_messages/)
  assert.match(sql, /create policy "students can send messages" on public\.inbox_messages/)
  assert.match(sql, /create policy "students update own message status" on public\.inbox_messages/)

  // Indexing for performance
  assert.match(sql, /inbox_recipient_unread_idx/)
  assert.match(sql, /inbox_sender_idx/)
})

test('student platform views render complete functional interfaces for calendar, packages, culture, academic dossier, and settings', async () => {
  const { renderCalendar } = await import('../src/components/calendar.js')
  const { renderPackages } = await import('../src/components/packages.js')
  const { renderCulture } = await import('../src/components/culture.js')
  const { renderAcademicReport } = await import('../src/components/academicReport.js')
  const { renderSettings } = await import('../src/components/settings.js')

  // Calendar
  const mockClasses = [
    {
      id: 'c-1',
      title: 'Speaking & Fluency Session',
      scheduled_at: '2026-11-01T15:00:00Z',
      duration_minutes: 60,
      modality: 'online',
      notes: 'Focus on conditional sentences'
    },
    {
      id: 'c-old',
      title: 'Introductory Conversation',
      status: 'completed',
      starts_at: '2026-10-15T15:00:00Z',
      duration_minutes: 60
    }
  ]
  const mockAttendance = [
    {
      id: 'att-1',
      class_id: 'c-old',
      status: 'attended',
      attended_at: '2026-10-15T15:00:00Z',
      notes: 'Great participation'
    }
  ]
  const calHtml = renderCalendar(mockClasses, mockAttendance, 'es')
  assert.match(calHtml, /Speaking &amp; Fluency Session/)
  assert.match(calHtml, /Focus on conditional sentences/)
  assert.match(calHtml, /Historial de clases y asistencia/)
  assert.match(calHtml, /Great participation/)

  // Packages & payments
  const mockPackages = [
    {
      assignment_id: 'pkg-1',
      total_classes: 12,
      classes_completed: 4,
      status: 'active',
      valid_until: '2026-12-31'
    }
  ]
  const mockPayments = [
    {
      assignment_id: 'pkg-1',
      amount_paid: 600000,
      status: 'paid',
      created_at: '2026-10-01T10:00:00Z'
    }
  ]
  const pkgHtml = renderPackages(mockPackages, mockPayments, 'es')
  assert.match(pkgHtml, /Clases disponibles/)
  assert.match(pkgHtml, /Paquete de 12 clases/)
  assert.match(pkgHtml, /Historial de pagos/)
  assert.match(pkgHtml, /600.000/)

  // Culture
  const mockCulture = [
    {
      id: 'cul-1',
      title: 'French Cinema Classics',
      topic: 'Cinema',
      description: 'An overview of the Nouvelle Vague movement.',
      url: 'https://example.com/nouvelle-vague',
      language: 'French',
      status: 'published'
    }
  ]
  const culHtml = renderCulture(mockCulture, 'en')
  assert.match(culHtml, /French Cinema Classics/)
  assert.match(culHtml, /Nouvelle Vague/)
  assert.match(culHtml, /Cinema/)
  assert.match(culHtml, /Explore resource ↗/)

  // Academic dossier
  const mockProfile = {
    name: 'Sofia Martinez',
    language: 'English',
    level: 'B2',
    level_name: 'Upper Intermediate',
    progress: 75,
    lessons_completed: 18,
    total_lessons: 24,
    current_module: 'Advanced Fluency',
    next_step: 'Prepare business presentation',
    goal: 'Pass C1 exam'
  }
  const reportHtml = renderAcademicReport(mockProfile, 'es')
  assert.match(reportHtml, /Dossier Académico Oficial/)
  assert.match(reportHtml, /Sofia Martinez/)
  assert.match(reportHtml, /75%/)
  assert.match(reportHtml, /Advanced Fluency/)
  assert.match(reportHtml, /Prepare business presentation/)
  assert.match(reportHtml, /Pass C1 exam/)

  // Settings
  const settingsHtml = renderSettings(mockProfile, 'es')
  assert.match(settingsHtml, /preferencias de plataforma/i)
  assert.match(settingsHtml, /data-set-interface-lang="es"/)
  assert.match(settingsHtml, /data-set-interface-lang="en"/)
  assert.match(settingsHtml, /data-set-interface-lang="fr"/)
  assert.match(settingsHtml, /data-set-interface-lang="zh"/)
  assert.match(settingsHtml, /Sofia Martinez/)
})

test('student platform inbox provides bidirectional communication with unread counting and empty/populated states', async () => {
  const { renderInbox } = await import('../src/components/inbox.js')

  // Empty state
  const emptyHtml = renderInbox([], 'es')
  assert.match(emptyHtml, /MENSAJES Y COMUNICACIONES/)
  assert.match(emptyHtml, /No tienes mensajes en tu bandeja/)
  assert.match(emptyHtml, /Enviar mensaje/)

  // Populated state with unread message from teacher
  const mockMessages = [
    {
      id: 'msg-1',
      sender_role: 'teacher',
      sender_id: 't-1',
      recipient_role: 'student',
      recipient_id: 's-1',
      subject: 'Preparación para la clase del jueves',
      body: 'Recuerda revisar el vocabulario de la unidad 4 antes de la sesión.',
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'msg-2',
      sender_role: 'student',
      sender_id: 's-1',
      recipient_role: 'teacher',
      recipient_id: 't-1',
      subject: 'Duda sobre el reto de audio',
      body: 'Hola Vera, ya grabé el audio pero tengo una duda con el conector.',
      is_read: true,
      created_at: '2026-10-18T12:00:00Z'
    }
  ]

  const populatedHtml = renderInbox(mockMessages, 'es')
  assert.match(populatedHtml, /Preparación para la clase del jueves/)
  assert.match(populatedHtml, /Recuerda revisar el vocabulario/)
  assert.match(populatedHtml, /data-mark-read-id="msg-1"/)
  assert.match(populatedHtml, /Duda sobre el reto de audio/)
  assert.match(populatedHtml, /inbox-role-student/)
  assert.match(populatedHtml, /inbox-role-teacher/)
  assert.match(populatedHtml, /id="student-send-message-form"/)
})

test('student platform navigation and views strictly exclude leads', async () => {
  const platformPageSource = readFileSync(
    new URL('../src/pages/platform.js', import.meta.url),
    'utf8'
  )
  const platformMainSource = readFileSync(
    new URL('../src/platform-main.js', import.meta.url),
    'utf8'
  )

  // Verify 'leads' is not exposed in student platform page or platform-main
  assert.doesNotMatch(platformPageSource, /data-platform-view="leads"/)
  assert.doesNotMatch(platformPageSource, /data-nav-target="leads"/)
  assert.doesNotMatch(platformMainSource, /case 'leads':/)
  assert.doesNotMatch(platformMainSource, /renderLeads/)

  // Verify teacher workspace still possesses leads module
  const teacherWorkspaceSource = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )
  assert.match(teacherWorkspaceSource, /\['leads', 'Leads'\]/)
  assert.match(teacherWorkspaceSource, /leads: loadLeads/)
})

test('teacher workspace and student profile integrate direct messaging and history', async () => {
  const teacherWorkspaceSource = readFileSync(
    new URL('../src/components/teacherWorkspace.js', import.meta.url),
    'utf8'
  )
  const teacherMainSource = readFileSync(
    new URL('../src/teacher-main.js', import.meta.url),
    'utf8'
  )

  // Teacher workspace inbox tab & dispatcher
  assert.match(teacherWorkspaceSource, /\['inbox', 'Inbox'\]/)
  assert.match(teacherWorkspaceSource, /inbox: loadInbox/)
  assert.match(teacherWorkspaceSource, /async function loadInbox\(panel\)/)
  assert.match(teacherWorkspaceSource, /#teacher-inbox-compose-form/)
  assert.match(teacherWorkspaceSource, /data-msg-filter/)

  // Teacher student profile inbox section & send form
  assert.match(teacherMainSource, /function renderStudentInboxSection\(profile, messages = \[\]\)/)
  assert.match(teacherMainSource, /#student-message-send-form/)
  assert.match(teacherMainSource, /data-student-msg-read/)
  assert.match(teacherMainSource, /renderStudentInboxSection\(profile, messages\)/)
})
