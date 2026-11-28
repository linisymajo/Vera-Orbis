import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createGeminiProvider } from '../supabase/functions/academic-ai/gemini-provider.js'
import { generalizedPedagogy } from '../supabase/functions/academic-ai/pedagogy.js'
import { generateLearningArchitect } from '../supabase/functions/academic-ai/learning-architect.js'
import { authorizeAdultArchitectTeacher } from '../supabase/functions/academic-ai/teacher-access.js'
import { syntheticCourse } from './fixtures/architect-course.mjs'
const require = createRequire(new URL('../supabase/functions/academic-ai/package.json', import.meta.url))
const { GoogleGenAI } = require('@google/genai')
const T = '10000000-0000-4000-8000-000000000001', S = '20000000-0000-4000-8000-000000000001'
const settings = () => ({ mode: 'learning_architect', studentId: S, requestId: crypto.randomUUID(), language: 'French', level: 'A2', goal: 'Travel and cultural exchange', classes: 2, duration: 60, regenerate: null })

test('actual Google SDK outbound bytes are independent of identities, evidence and manually edited lessons', async () => {
  const bodies = [], canaries = ['SECRET_NAME', 'private@example.test', 'PRIVATE_ASSESSMENT', 'PRIVATE_FILE', 'PRIVATE_LESSON', 'PRIVATE_GOAL']
  const privateContext = { profile: { name: canaries[0], email: canaries[1], goal: canaries[5], studentId: S }, assessment: canaries[2], files: canaries[3], saved_course: { selected_session: canaries[4] } }
  const provider = createGeminiProvider({ apiKey: 'synthetic-key', GoogleGenAI, fetchImpl: async (url, options) => {
    assert.equal(new URL(String(url)).origin, 'https://generativelanguage.googleapis.com')
    const serialized = JSON.stringify({ url: String(url), body: options.body, headers: options.headers })
    for (const forbidden of [...canaries, S, T]) assert.ok(!serialized.includes(forbidden))
    const b = JSON.parse(options.body); bodies.push(b)
    const input = JSON.parse(b.contents[0].parts[0].text)
    assert.deepEqual(Object.keys(input), ['pedagogy'])
    assert.deepEqual(Object.keys(input.pedagogy).sort(), ['language', 'cefr_level', 'communicative_objective', 'lesson_count', 'class_duration_minutes', 'practice_areas', ...(input.pedagogy.lesson_number ? ['lesson_number'] : [])].sort())
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(syntheticCourse()) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 1000 } })
  } })
  const r = settings()
  await provider(r, privateContext)
  // A throwing proxy proves that context is never read by the request builder.
  await provider({ ...r, studentId: crypto.randomUUID(), requestId: crypto.randomUUID() }, new Proxy({}, { get() { throw Error('Private context accessed') } }))
  assert.deepEqual(bodies[0], bodies[1])
  await provider({ ...r, regenerate: { versionId: crypto.randomUUID(), revision: 9, session: 1 } }, privateContext)
  assert.equal(JSON.parse(bodies[2].contents[0].parts[0].text).pedagogy.lesson_number, 2)
})

test('free text and malformed pedagogical fields fail before database reservation or provider transport', async () => {
  for (const override of [{ goal: 'Travel and cultural exchange private@example.test' }, { goal: 'PRIVATE_NARRATIVE' }, { language: 'French PRIVATE_NAME' }, { level: 'B1 private' }, { classes: 13 }, { duration: 121 }, { regenerate: { session: -1 } }]) {
    const r = { ...settings(), ...override }
    assert.throws(() => generalizedPedagogy(r))
    let calls = 0
    await assert.rejects(generateLearningArchitect({ rpc: async () => { calls++; throw Error('Must not read or reserve') } }, r, async () => { calls++; throw Error('Must not transmit') }))
    assert.equal(calls, 0)
  }
})

test('adult eligibility is administrator-controlled and verified against live teacher enrollment', async () => {
  const config = { SUPABASE_URL: 'https://duinvkphfnugoyvvlbbq.supabase.co', ACADEMIC_AI_DATA_MODE: 'anonymous_pedagogy_v1', ACADEMIC_AI_CLIENT_SCOPE: 'adult_teacher_only', ACADEMIC_AI_ADULT_CLIENT_CONFIRMED: 'true', ACADEMIC_AI_ADULT_TEACHER_IDS: T }
  const enrollment = { student_id: T, role: 'teacher', email_verified: true, academic_access: true, adult_admitted:true }
  const client = (access = enrollment, member = T) => ({ rpc: async name => { return { data: name==='get_my_enrollment'?access:{teacher_id:T,adult_verified:true} } }, from: table => { assert.equal(table, 'teachers'); return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: member ? { id: member } : null }) }) }) } } })
  await authorizeAdultArchitectTeacher(k => config[k], client(), { id: T })
  for (const patch of [{ ACADEMIC_AI_DATA_MODE: 'synthetic_only' }, { ACADEMIC_AI_ADULT_CLIENT_CONFIRMED: 'false' }, { ACADEMIC_AI_ADULT_TEACHER_IDS: '' }, { ACADEMIC_AI_ADULT_TEACHER_IDS: S }]) {
    await assert.rejects(authorizeAdultArchitectTeacher(k => ({ ...config, ...patch })[k], client(), { id: T, user_metadata: { adult: true, role: 'teacher' } }), e => e.status === 403)
  }
  for (const access of [{ ...enrollment, role: 'student' }, { ...enrollment, email_verified: false }, { ...enrollment, academic_access: false }, { ...enrollment, student_id: S }]) await assert.rejects(authorizeAdultArchitectTeacher(k => config[k], client(access), { id: T }), e => e.status === 403)
  await assert.rejects(authorizeAdultArchitectTeacher(k => config[k], client(enrollment, null), { id: T }), e => e.status === 403)
  await assert.rejects(authorizeAdultArchitectTeacher(k => config[k], client({...enrollment,adult_admitted:false}), { id:T }),e=>e.status===403)
  const revoked=client();const original=revoked.rpc;revoked.rpc=async name=>name==='verify_adult_teacher_eligibility'?{data:{teacher_id:T,adult_verified:false}}:original(name)
  await assert.rejects(authorizeAdultArchitectTeacher(k=>config[k],revoked,{id:T}),e=>e.status===403)
})
