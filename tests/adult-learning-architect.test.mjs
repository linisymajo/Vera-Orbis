// Tests for Vera Orbis Adult-Only AI Learning Architect
// Verifies adult teacher access enforcement, student rejection, 12-class generation,
// single session regeneration, JSON export/import, and student platform isolation.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { verifyAdultTeacherAccess, AdultAuthError } from '../src/lib/adultTeacherAuth.js'
import { generateCurriculumCourse, generateCurriculumSession } from '../src/lib/curriculumEngine.js'
import { validateArchitectCourse, architectCourseToPlan } from '../supabase/functions/academic-ai/learning-architect.js'
import { validateLearningPlan } from '../src/lib/learningPlans.js'
import { createArchitectApp } from '../server/architect-server.js'

const TEACHER_UUID = '10000000-0000-4000-8000-000000000001'
const STUDENT_UUID = '20000000-0000-4000-8000-000000000001'

// Mock Supabase client generator
function createMockSupabase({
  userId = TEACHER_UUID,
  isTeacher = true,
  role = 'teacher',
  emailVerified = true,
  academicAccess = true
} = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: userId,
            email: isTeacher ? 'teacher@example.test' : 'student@example.test'
          }
        },
        error: null
      })
    },
    from: (table) => {
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: (_col, val) => ({
              maybeSingle: async () => ({
                data: isTeacher && val === userId ? { id: userId } : null,
                error: null
              })
            })
          })
        }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    },
    rpc: async (name) => {
      if (name === 'get_my_enrollment') {
        return {
          data: {
            student_id: userId,
            role,
            email_verified: emailVerified,
            academic_access: academicAccess
          },
          error: null
        }
      }
      return { data: null, error: new Error('Unknown RPC') }
    }
  }
}

test('adult authorization grants verified adult teachers access', async () => {
  const client = createMockSupabase({ userId: TEACHER_UUID, isTeacher: true, role: 'teacher' })
  const verified = await verifyAdultTeacherAccess(client, [TEACHER_UUID])
  assert.equal(verified.teacherId, TEACHER_UUID)
  assert.equal(verified.adultVerified, true)
  assert.equal(verified.role, 'teacher')
})

test('adult authorization strictly rejects student accounts and tokens with HTTP 403', async () => {
  const studentClient = createMockSupabase({
    userId: STUDENT_UUID,
    isTeacher: false, // Student has no row in teachers table
    role: 'student'
  })

  await assert.rejects(
    verifyAdultTeacherAccess(studentClient),
    (err) => {
      assert.ok(err instanceof AdultAuthError)
      assert.equal(err.statusCode, 403)
      assert.ok(err.message.includes('restricted to verified teachers'))
      return true
    }
  )
})

test('adult authorization rejects unverified email or inactive academic access', async () => {
  const unverifiedEmailClient = createMockSupabase({
    userId: TEACHER_UUID,
    isTeacher: true,
    role: 'teacher',
    emailVerified: false
  })
  await assert.rejects(
    verifyAdultTeacherAccess(unverifiedEmailClient, [TEACHER_UUID]),
    (err) => err.statusCode === 403 && err.code === 'unverified_email'
  )

  const inactiveAccessClient = createMockSupabase({
    userId: TEACHER_UUID,
    isTeacher: true,
    role: 'teacher',
    academicAccess: false
  })
  await assert.rejects(
    verifyAdultTeacherAccess(inactiveAccessClient, [TEACHER_UUID]),
    (err) => err.statusCode === 403 && err.code === 'academic_access_inactive'
  )
})

test('adult authorization rejects access if eligibility registry is missing, empty or unlisted', async () => {
  const teacherClient = createMockSupabase({ userId: TEACHER_UUID, isTeacher: true, role: 'teacher' })

  // Missing registry (null)
  await assert.rejects(
    verifyAdultTeacherAccess(teacherClient, null),
    (err) => err instanceof AdultAuthError && err.statusCode === 403 && err.code === 'adult_registry_missing'
  )

  // Empty registry ([])
  await assert.rejects(
    verifyAdultTeacherAccess(teacherClient, []),
    (err) => err instanceof AdultAuthError && err.statusCode === 403 && err.code === 'adult_registry_missing'
  )

  // Unlisted teacher
  await assert.rejects(
    verifyAdultTeacherAccess(teacherClient, ['10000000-0000-4000-8000-000000000099']),
    (err) => err instanceof AdultAuthError && err.statusCode === 403 && err.code === 'adult_registry_unlisted'
  )
})

test('adult authorization calls server-side verify_adult_teacher_eligibility RPC in live mode', async () => {
  let rpcCalled = false
  const rpcClient = {
    auth: {
      getUser: async () => ({
        data: { user: { id: TEACHER_UUID, email: 'teacher.prod@veraorbis.test' } },
        error: null
      })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: TEACHER_UUID }, error: null })
        })
      })
    }),
    rpc: async (name) => {
      if (name === 'get_my_enrollment') {
        return {
          data: { student_id: TEACHER_UUID, role: 'teacher', email_verified: true, academic_access: true },
          error: null
        }
      }
      if (name === 'verify_adult_teacher_eligibility') {
        rpcCalled = true
        return {
          data: {
            teacher_id: TEACHER_UUID,
            email: 'teacher.prod@veraorbis.test',
            role: 'teacher',
            adult_verified: true
          },
          error: null
        }
      }
      return { data: null, error: new Error('Unknown RPC') }
    }
  }

  const verified = await verifyAdultTeacherAccess(rpcClient)
  assert.equal(rpcCalled, true, 'Must call verify_adult_teacher_eligibility RPC on the server')
  assert.equal(verified.adultVerified, true)
  assert.equal(verified.teacherId, TEACHER_UUID)
})

test('curriculum engine generates complete 12-class study plans adhering to all validation rules', () => {
  for (const lang of ['English', 'French', 'Mandarin']) {
    for (const duration of [20, 45, 60, 90, 120]) {
      const request = {
        mode: 'learning_architect',
        studentId: STUDENT_UUID,
        requestId: crypto.randomUUID(),
        language: lang,
        level: 'A1',
        goal: 'Everyday communication',
        classes: 12,
        duration,
        regenerate: null
      }

      const course = generateCurriculumCourse(request)
      assert.equal(course.language, lang)
      assert.equal(course.sessions.length, 12)

      // Validate course against schema
      validateArchitectCourse(course, request)

      // Validate minute allocation across all 12 classes
      course.sessions.forEach((session, i) => {
        const sumMinutes = session.minutes.reduce((a, b) => a + b, 0)
        assert.equal(sumMinutes, duration, `Session ${i + 1} minutes must sum to duration ${duration}`)
        assert.ok(session.power_expressions.length >= 2, `Session ${i + 1} needs Power Expressions`)
        assert.ok(session.vocabulary.length >= 2, `Session ${i + 1} needs vocabulary`)
        assert.ok(session.task.length > 5, `Session ${i + 1} needs a real-world task`)
        assert.equal(session.steps.length, 4, `Session ${i + 1} needs 4 stages`)
        assert.deepEqual(session.steps.map(s => s.stage), ['Listen', 'Repeat', 'Personalize', 'Use'])
      })

      // Convert to full plan and validate
      const plan = architectCourseToPlan(course, request, {})
      validateLearningPlan(plan, { complete: true })
      assert.equal(plan.objectives.length, 12)
    }
  }
})

test('single session regeneration adapts target session while preserving other 11 sessions', () => {
  const request = {
    mode: 'learning_architect',
    studentId: STUDENT_UUID,
    requestId: crypto.randomUUID(),
    language: 'English',
    level: 'A1',
    goal: 'Everyday communication',
    classes: 12,
    duration: 60,
    regenerate: null
  }

  const course = generateCurriculumCourse(request)
  const originalSession5 = structuredClone(course.sessions[4])
  const originalSession6 = structuredClone(course.sessions[5])

  // Regenerate session 5 (0-indexed 4)
  const regenRequest = {
    ...request,
    regenerate: {
      versionId: crypto.randomUUID(),
      revision: 1,
      session: 4
    }
  }

  const regeneratedSession = generateCurriculumSession(regenRequest)
  assert.ok(regeneratedSession.title.includes('(Adapted)'))

  // Replace session 5
  course.sessions[4] = regeneratedSession

  // Verify other session was completely unaffected
  assert.deepEqual(course.sessions[5], originalSession6)
  assert.notDeepEqual(course.sessions[4], originalSession5)
})

test('exported plan JSON conforms to validateLearningPlan and can be imported into Teacher Dashboard drafts', () => {
  const request = {
    mode: 'learning_architect',
    studentId: STUDENT_UUID,
    requestId: crypto.randomUUID(),
    language: 'French',
    level: 'A1',
    goal: 'Everyday communication',
    classes: 12,
    duration: 60,
    regenerate: null
  }

  const course = generateCurriculumCourse(request)
  const plan = architectCourseToPlan(course, request, {})

  // 1. Export: serialized as JSON string
  const exportedJson = JSON.stringify(plan, null, 2)
  assert.ok(exportedJson.length > 500)

  // 2. Import: parsed from JSON string
  const imported = JSON.parse(exportedJson)

  // 3. Validation: validateLearningPlan accepts the imported plan completely
  const validated = validateLearningPlan(imported, { complete: true })
  assert.equal(validated.language, 'French')
  assert.equal(validated.objectives.length, 12)
  assert.equal(validated.architect.sessions.length, 12)
  assert.equal(validated.architect.session_minutes, 60)
})

test('student platform remains completely free of direct AI generation calls', async () => {
  const platformMainSource = await readFile(new URL('../src/platform-main.js', import.meta.url), 'utf8')
  const platformHtmlSource = await readFile(new URL('../platform.html', import.meta.url), 'utf8')

  // Asserts that Student Platform does NOT import learning architect or make AI generation requests
  assert.ok(!platformMainSource.includes('requestLearningArchitect'))
  assert.ok(!platformMainSource.includes('mountLearningArchitect'))
  assert.ok(!platformMainSource.includes('generateLearningArchitect'))
  assert.ok(!platformHtmlSource.includes('learning-architect'))
})

test('server status endpoint reports adult educator scope and gated provider terms state', async () => {
  const app = createArchitectApp()
  await new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const port = server.address().port
      try {
        const res = await fetch(`http://localhost:${port}/api/architect/status`)
        assert.equal(res.status, 200)
        const data = await res.json()
        assert.equal(data.ok, true)
        assert.equal(data.scope, 'adult_teacher_only')
        assert.equal(data.adult_minimum_age, 18)
        assert.ok(data.provider_terms_status.includes('gated') || data.provider_terms_status.includes('gemini'))
        assert.equal(data.decoupled_export_import_enabled, true)
      } finally {
        server.close(resolve)
      }
    })
  })
})
