import test from 'node:test'
import assert from 'node:assert/strict'
import { materialContentType, submitExerciseAttempt } from '../src/lib/academicOperations.js'

test('Office uploads resolve missing browser MIME types and reject mismatches, unsafe types and oversized files', () => {
  for (const extension of ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'pdf']) {
    const type = materialContentType({ name: `lesson.${extension}`, type: '', size: 123 })
    assert.ok(type?.startsWith('application/'))
    assert.equal(materialContentType({ name: `lesson.${extension}`, type, size: 123 }), type)
  }
  for (const file of [
    { name: 'lesson.pptx', type: 'text/html', size: 12 },
    { name: 'lesson.exe', type: 'application/pdf', size: 12 },
    { name: 'lesson.svg', type: 'image/svg+xml', size: 12 },
    { name: 'lesson.pdf', type: '', size: 10485761 },
    { name: 'lesson.pdf', type: '', size: 0 }
  ]) assert.equal(materialContentType(file), null)
})

function client({ user = { id: 'student' }, result = { data: { id: 'attempt' } } } = {}) {
  const calls = []
  return {
    calls,
    auth: { getUser: async () => ({ data: { user } }) },
    async rpc(name, payload) {
      calls.push({ name, payload })
      return result
    }
  }
}
const answers = [{ index: 0, answer: 'Bonjour' }]
test('submission uses authenticated identity and confirms a persisted ID', async () => {
  const api = client()
  assert.deepEqual(await submitExerciseAttempt(api, 'assignment', answers), { id: 'attempt' })
  assert.equal(api.calls[0].name, 'submit_exercise')
  assert.ok(api.calls[0].payload.p_request_id)
  assert.equal(api.calls[0].payload.p_assignment_id, 'assignment')
})
test('incomplete and unauthenticated attempts do not write', async () => {
  const api = client()
  await assert.rejects(submitExerciseAttempt(api, 'assignment', []), /Complete/)
  assert.equal(api.calls.length, 0)
  const anonymous = client({ user: null })
  await assert.rejects(submitExerciseAttempt(anonymous, 'assignment', answers), /session/)
  assert.equal(anonymous.calls.length, 0)
})
test('failed or unconfirmed inserts never report submission success', async () => {
  for (const result of [{ error: { message: 'RLS denied' } }, { data: null }, { data: {} }]) {
    await assert.rejects(submitExerciseAttempt(client({ result }), 'assignment', answers), /not confirmed/)
  }
})