import test from 'node:test'
import assert from 'node:assert/strict'
import { unifiedAcademicFixture, T, T2, S, S2 } from './fixtures/unified-academic-db.mjs'
import { syntheticCourse } from './fixtures/architect-course.mjs'
import { generateUnifiedAcademic, projectReviewedContext, validateCitations } from '../supabase/functions/academic-ai/academic-context.js'
import { unifiedProviderStatus, createAnthropicAcademicProvider } from '../supabase/functions/academic-ai/unified-providers.js'
import { exerciseStudioDraftFromAI } from '../src/lib/studentAcademicContext.js'
import { validateExercise } from '../src/lib/exerciseWorkflow.js'
const settings = { language: 'English', level: 'B1', goal: 'Use practical travel expressions', total: 12, completed: 5, duration: 60, priorities: 'Speak confidently in authentic situations', excluded: [], corrections: {}, confirmed: true }
const request = () => ({ mode: 'unified_academic', kind: 'learning_plan', studentId: S, requestId: crypto.randomUUID(), reviewRevision: 1, exerciseType: null, lesson: null, regenerate: null })
test('actual PostgreSQL student-aware context and existing plan/exercise workflows', async t => {
  const f = await unifiedAcademicFixture(), { db, rpc, client } = f
  try {
    for (let i = 0; i < 6; i++) { const c = (await db.query("insert into classes(teacher_id,title,starts_at,status) values($1,$2,now()-interval '1 day',$3) returning id", [T, 'Travel class ' + i, i < 5 ? 'completed' : 'scheduled'])).rows[0]; await db.query('insert into class_participants(class_id,teacher_id,student_id) values($1,$2,$3)', [c.id, T, S]); await db.query("insert into class_attendance values($1,$2,'present',null,now())", [c.id, S]) }
    const mid = (await db.query("insert into materials(teacher_id,student_id,title,language,description,file_path) values($1,$2,'Travel expressions.pptx','English','Prior teaching',$3) returning id", [T, S, T + '/travel.pptx'])).rows[0].id
    await db.query("insert into storage.objects(bucket_id,name,metadata) values('materials',$1,'{}')", [T + '/travel.pptx'])
    await db.query("insert into teacher_notes values($1,$2,'Student asked to practise polite requests.',now())", [T, S])
    const exercise = (await db.query("insert into exercises(teacher_id,title,language,exercise_type,questions) values($1,'Previous writing','English','writing',$2) returning id", [T, JSON.stringify([{ prompt: 'Ask politely for directions.' }])])).rows[0].id
    await rpc(T, 'publish_exercise', { p_exercise_id: exercise, p_student_ids: [S], p_due_at: null })
    const assignment = (await db.query('select id from exercise_assignments where exercise_id=$1', [exercise])).rows[0].id
    const response = await rpc(S, 'submit_exercise', { p_assignment_id: assignment, p_answers: [{ index: 0, answer: 'Could you tell me where the station is?' }], p_request_id: crypto.randomUUID() })
    await rpc(T, 'save_exercise_feedback', { p_attempt_id: response.id, p_content: { message: 'Your polite request is clear. Try a follow-up question next.' }, p_expected_version: 0, p_request_id: crypto.randomUUID(), p_release: true })
    await rpc(T, 'save_exercise_feedback', { p_attempt_id: response.id, p_content: { message: 'PRIVATE_UNRELEASED_FEEDBACK_CANARY' }, p_expected_version: 1, p_request_id: crypto.randomUUID(), p_release: false })
    let ctx = await rpc(T, 'get_student_academic_context', { p_student_id: S })
    await t.test('scope and evidence distinguish five completed sessions from a sixth scheduled class', async () => {
      assert.equal(ctx.verified_completed, 5); assert.equal(ctx.profile.recorded_total, 12); assert.equal(ctx.profile.recorded_completed, 5)
      assert.equal(ctx.sources.filter(s => s.evidence_state === 'calendar_record_only').length, 1)
      const answer = ctx.sources.find(s => s.kind === 'response'); assert.match(JSON.stringify(answer.payload), /Could you tell/); assert.match(JSON.stringify(answer.payload), /follow-up question/); assert.ok(!JSON.stringify(answer).includes('PRIVATE_UNRELEASED_FEEDBACK_CANARY'))
      await assert.rejects(rpc(T2, 'get_student_academic_context', { p_student_id: S }), /teacher/)
      await assert.rejects(rpc(S, 'get_student_academic_context', { p_student_id: S }), /teacher/)
      assert.equal((await f.as(S, tx => tx.query('select * from academic_context_reviews'))).rows.length, 0)
    })
    await t.test('private extraction version, source changes and cross-student file access are enforced', async () => {
      const src = await rpc(T, 'get_academic_material_source', { p_student_id: S, p_material_id: mid })
      await assert.rejects(rpc(T2, 'get_academic_material_source', { p_student_id: S2, p_material_id: mid }), /material/)
      const args = { p_student_id: S, p_material_id: mid, p_fingerprint: src.fingerprint, p_content_hash: 'a'.repeat(64), p_parser_version: 'academic-text-1', p_status: 'ready', p_sections: [{ locator: 'slide 1', text: 'Could you tell me how to get to the station?' }] }
      const first = await rpc(T, 'save_academic_material_text', args); assert.equal((await rpc(T, 'save_academic_material_text', args)).id, first.id)
      ctx = await rpc(T, 'get_student_academic_context', { p_student_id: S }); assert.equal(ctx.sources.find(s => s.kind === 'material').evidence_state, 'ready')
      await db.query("update storage.objects set metadata='{" + '"revision":2' + "}' where name=$1", [T + '/travel.pptx'])
      await assert.rejects(rpc(T, 'save_academic_material_text', args), /changed/)
      const stale = await rpc(T, 'get_student_academic_context', { p_student_id: S }); assert.equal(stale.sources.find(s => s.kind === 'material').evidence_state, 'not_indexed_or_changed')
      await db.query("update storage.objects set metadata='{}' where name=$1", [T + '/travel.pptx'])
    })
    const save = () => rpc(T, 'save_academic_context_review', { p_student_id: S, p_expected_revision: 0, p_settings: settings })
    await save(); ctx = await rpc(T, 'get_student_academic_context', { p_student_id: S })
    await t.test('review corrections preserve originals and reject unrelated references or stale revisions', async () => {
      await assert.rejects(save(), /Reload/)
      await assert.rejects(rpc(T, 'save_academic_context_review', { p_student_id: S, p_expected_revision: 1, p_settings: { ...settings, excluded: ['material:' + crypto.randomUUID()] } }), /Source/)
      const ref = ctx.sources.find(s => s.kind === 'observation').ref
      const projection = projectReviewedContext(ctx, { ...settings, corrections: { [ref]: 'Teacher correction, not a verified mastery claim' } })
      assert.ok(projection.evidence.some(s => s.teacher_correction.includes('Teacher correction')))
      assert.ok(!JSON.stringify(projection.evidence).includes(S)); assert.ok(!JSON.stringify(projection.evidence).includes(T + '/travel'))
      const changed = structuredClone(ctx); changed.sources[0].fingerprint = 'changed'
      assert.throws(() => projectReviewedContext(changed, settings), /changed/)
      const added = structuredClone(ctx); added.sources.push({ ref: 'material:unknown-after-review', kind: 'material', payload: { description: 'Not reviewed' } })
      assert.equal(projectReviewedContext(added, settings).evidence.length, projectReviewedContext(ctx, settings).evidence.length)
    })
    let version, providerCalls = 0
    await t.test('5 of 12 produces seven lessons from a mocked provider, private draft and idempotent persistence', async () => {
      const r = request(), provider = async body => {
        providerCalls++; const input = JSON.parse(body.input); assert.equal(input.remaining_sessions, 7); assert.ok(input.evidence.some(s => s.kind === 'material'))
        const course = syntheticCourse(); course.language = 'English'; course.level = 'B1'; course.sessions = Array.from({ length: 7 }, (_, i) => structuredClone(course.sessions[i % 2]))
        const source = input.evidence.find(s => s.kind === 'material')
        return { content: { content: course, citations: [{ source: source.source, locator: 'slide 1', reason: 'Practise previously introduced polite travel requests.' }] }, inputTokens: 200, outputTokens: 2200 }
      }
      const result = await generateUnifiedAcademic(client(T), r, provider); version = result.result
      assert.equal(version.status, 'draft'); assert.equal(version.content.objectives.length, 7)
      assert.equal((await generateUnifiedAcademic(client(T), r, provider)).result.id, version.id); assert.equal(providerCalls, 1)
      assert.equal((await f.as(S, tx => tx.query('select * from learning_plan_versions'))).rows.length, 0)
      assert.equal((await rpc(T, 'get_unified_academic_provenance', { p_result_id: version.id })).citations[0].locator, 'slide 1')
      assert.equal(await rpc(T2, 'get_unified_academic_provenance', { p_result_id: version.id }), null)
    })
    await t.test('teacher edits and approves privately, publishes explicitly and preserves approved history', async () => {
      version.content.architect.sessions[6].title = 'Teacher edited final lesson'
      version = await rpc(T, 'save_learning_plan_version', { p_version_id: version.id, p_expected_revision: version.revision, p_content: version.content })
      version = await rpc(T, 'approve_learning_plan_version', { p_version_id: version.id, p_expected_revision: version.revision })
      assert.equal((await f.as(S, tx => tx.query('select * from learning_plan_versions'))).rows.length, 0)
      await rpc(T, 'publish_learning_architect_plan', { p_version_id: version.id })
      assert.equal((await f.as(S, tx => tx.query('select * from learning_plan_versions'))).rows.length, 1)
      await assert.rejects(rpc(T, 'save_learning_plan_version', { p_version_id: version.id, p_expected_revision: version.revision, p_content: version.content }), /immutable/)
    })
    await t.test('material-grounded exercise becomes actual editable Studio cards, never an automatic assignment', async () => {
      await rpc(T, 'save_academic_context_review', { p_student_id: S, p_expected_revision: 1, p_settings: settings })
      const r = { ...request(), reviewRevision: 2, kind: 'exercise', exerciseType: 'fill_blank', lesson: { versionId: version.id, session: 0 } }
      const result = await generateUnifiedAcademic(client(T), r, async body => {
        const evidence = JSON.parse(body.input).evidence.find(s => s.kind === 'material')
        return { content: { content: { title: 'A polite request', objective: 'Ask for directions', language: 'English', level: 'B1', steps: ['Listen', 'Repeat', 'Personalize', 'Use'].map(stage => ({ stage, activity: stage + ' a practical request' })), exercise_type: 'fill_blank', questions: [{ prompt: 'Could you ___ me where the station is?', options: [], answer: 'tell', explanation: 'Almost! Use tell when you ask someone for information.', left: [], right: [], items: [], passage: null, accepted_answers: ['please tell'] }], feedback: null }, citations: [{ source: evidence.source, locator: 'slide 1', reason: 'Uses the expression from the source slide.' }] }, inputTokens: 100, outputTokens: 500 }
      })
      const draft = exerciseStudioDraftFromAI(result.result.content, result.requestId, result.sources); validateExercise(draft); assert.equal(draft.questions[0].accepted_answers[0], 'please tell')
      assert.equal(result.result.status, 'draft'); assert.equal((await db.query('select count(*)::int n from exercise_assignments')).rows[0].n, 1) // Only the prior response fixture was assigned.
    })
    await t.test('consent revoked during inference prevents saving or publishing the generated content', async () => {
      const before = (await db.query('select count(*)::int n from learning_plan_versions')).rows[0].n
      await assert.rejects(generateUnifiedAcademic(client(T), { ...request(), reviewRevision: 2 }, async body => {
        await rpc(S, 'set_academic_ai_consent', { p_allowed: false })
        const course = syntheticCourse(); course.language = 'English'; course.level = 'B1'; course.sessions = Array.from({ length: 7 }, (_, i) => structuredClone(course.sessions[i % 2]))
        return { content: { content: course, citations: [{ source: JSON.parse(body.input).evidence[0].source, locator: 'record', reason: 'Synthetic source reference' }] }, inputTokens: 100, outputTokens: 1000 }
      }), e => e.status === 403)
      assert.equal((await db.query('select count(*)::int n from learning_plan_versions')).rows[0].n, before)
      await rpc(S, 'set_academic_ai_consent', { p_allowed: true })
    })
  } finally { await db.close() }
})
test('provider gates cannot be bypassed with Gemini, mock configuration or partial approvals', () => {
  for (const env of [{}, { ACADEMIC_AI_UNIFIED_ENABLED: 'true', ACADEMIC_AI_UNIFIED_PROVIDER: 'gemini' }, { ACADEMIC_AI_UNIFIED_ENABLED: 'true', ACADEMIC_AI_UNIFIED_PROVIDER: 'mock' }, { ACADEMIC_AI_UNIFIED_ENABLED: 'true', ACADEMIC_AI_UNIFIED_PROVIDER: 'anthropic' }]) assert.equal(unifiedProviderStatus(k => env[k]).enabled, false)
  assert.throws(() => validateCitations([{ source: 'S99', locator: 'slide 1', reason: 'Invented evidence' }], []))
})
test('unsupported request formats cannot read academic records or consume a provider request', async () => {
  let calls = 0
  for (const patch of [{ kind: 'exercise', exerciseType: 'invented-format' }, { kind: 'learning_plan', exerciseType: 'writing' }, { reviewRevision: 0 }]) await assert.rejects(generateUnifiedAcademic({ rpc: async () => { calls++; throw Error('Must not read') } }, { ...request(), ...patch }, async () => { calls++ }))
  assert.equal(calls, 0)
})
test('alternative adapter bounds actual outbound transport, keeps IDs local and sanitizes provider errors', async () => {
  let calls = 0
  const provider = createAnthropicAcademicProvider({ apiKey: 'synthetic-never-valid', fetchImpl: async (url, options) => { calls++; assert.equal(url, 'https://api.anthropic.com/v1/messages'); const body = JSON.parse(options.body); assert.equal(body.model, 'claude-haiku-5-5'); assert.equal(body.output_config.format.type, 'json_schema'); assert.equal(body.tools, undefined); return new Response('private provider detail', { status: 429 }) } })
  await assert.rejects(provider({ instructions: 'Synthetic test', input: '{}', schema: { type: 'object' }, max_output_tokens: 100 }), e => e.status === 429 && !e.message.includes('private provider detail')); assert.equal(calls, 1)
})
