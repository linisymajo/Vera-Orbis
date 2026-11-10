import { validateCorrectionDefinition } from './exerciseExperience.js'
const TYPES = ['multiple_choice', 'true_false', 'fill_blank', 'matching', 'ordering', 'reading', 'listening', 'image_vocabulary', 'open_question', 'writing', 'conversation', 'pronunciation']
const nonempty = value => typeof value === 'string' && value.trim().length > 0

export function validateExercise(exercise) {
  if (!nonempty(exercise.title) || exercise.title.length > 160) throw new Error('Add a title of up to 160 characters.')
  if (!nonempty(exercise.language) || !TYPES.includes(exercise.exercise_type)) throw new Error('Choose a language and supported activity type.')
  if (!Array.isArray(exercise.questions) || !exercise.questions.length || exercise.questions.length > 100) throw new Error('Add between 1 and 100 questions.')
  exercise.questions.forEach((q, index) => {
    const fail = message => { throw new Error(`Question ${index + 1}: ${message}`) }
    const type = q?.response_type || exercise.exercise_type
    if (!TYPES.includes(type)) fail('choose a supported response format.')
    if (!q || typeof q !== 'object' || !nonempty(q.prompt) || q.prompt.length > 4000) fail('add a prompt of up to 4000 characters.')
    if (type === 'multiple_choice' && (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 12 || q.options.some(o => !nonempty(o)) || new Set(q.options).size !== q.options.length || !q.options.includes(q.answer))) fail('add 2–12 distinct options and select the answer.')
    if (type === 'matching' && (!Array.isArray(q.left) || !Array.isArray(q.right) || q.left.length < 2 || q.left.length > 100 || q.left.length !== q.right.length || [...q.left, ...q.right].some(o => !nonempty(o) || o.length > 4000))) fail('add matching left and right lists of the same length.')
    if (type === 'ordering' && (!Array.isArray(q.items) || q.items.length < 2 || q.items.length > 100 || q.items.some(o => !nonempty(o) || o.length > 4000))) fail('add at least two sentence blocks.')
    for (const field of ['audio_url', 'image_url']) {
      if (q[field] && !/^https:\/\//i.test(q[field])) fail('media links must use HTTPS.')
    }
  })
  if (exercise.settings?.correction) validateCorrectionDefinition(exercise)
  return exercise
}

export function studentExercise(exercise) {
  const allowed = ['prompt', 'options', 'left', 'right', 'items', 'passage', 'audio_url', 'image_url', 'response_type', 'hint']
  return { ...exercise, questions: (exercise.questions || []).map(q => Object.fromEntries(allowed.filter(key => q[key] != null).map(key => [key, q[key]]))) }
}

export async function saveExerciseDraft(client, draft, id = null) {
  validateExercise(draft)
  const auth = await client.auth.getUser()
  if (auth.error || !auth.data?.user?.id) throw new Error('Please log in again before saving.')
  if (draft.settings?.correction) {
    const capability = await client.rpc('exercise_experience_capabilities')
    if (capability.error || capability.data?.version !== 1) throw new Error('The reviewed Exercise Experience migration is required before saving these correction settings. Your draft is still here.')
  }
  const payload = { ...draft, teacher_id: auth.data.user.id, status: 'draft' }
  const query = id
    ? client.from('exercises').update(payload).eq('id', id).eq('teacher_id', auth.data.user.id).eq('status', 'draft')
    : client.from('exercises').insert(payload)
  const result = await query.select('id').single()
  if (result.error || !result.data?.id) throw new Error('Draft save was not confirmed. Refresh before retrying; only drafts can be edited.')
  return result.data.id
}

export async function publishExercise(client, { exerciseId, studentIds, dueAt = null }) {
  const ids = [...new Set(studentIds)].filter(Boolean)
  if (!exerciseId || !ids.length || ids.length > 200) throw new Error('Select an activity and between 1 and 200 students.')
  const result = await client.rpc('publish_exercise', { p_exercise_id: exerciseId, p_student_ids: ids, p_due_at: dueAt })
  if (result.error || result.data?.exercise_id !== exerciseId || result.data?.assignment_count !== ids.length) throw new Error(result.error?.message || 'Publishing was not confirmed. Refresh before retrying.')
  return result.data
}

export async function reviewExerciseAttempt(client, { attemptId, feedback, release }) {
  if (!nonempty(feedback)) throw new Error('Add specific feedback before saving.')
  const result = await client.rpc('review_exercise_attempt', { p_attempt_id: attemptId, p_feedback: feedback.trim(), p_release: Boolean(release) })
  if (result.error || result.data?.id !== attemptId) throw new Error(result.error?.message || 'Feedback save was not confirmed.')
  return result.data
}
