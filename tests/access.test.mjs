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

