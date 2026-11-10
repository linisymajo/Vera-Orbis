import { validateCoachFeedback } from '../../supabase/functions/academic-ai/feedback-coach.js'
// One correction contract for teacher authoring, shared preview and practice.
// The database independently validates/scorers responses; these helpers never
// authorize a grade, reveal a private answer or release teacher feedback.
export const CORRECTION_MODES = Object.freeze(['teacher_only', 'objective', 'ai_draft', 'ai_auto'])
export const OBJECTIVE_TYPES = Object.freeze(['multiple_choice', 'true_false', 'fill_blank', 'matching', 'ordering', 'image_vocabulary'])
export const QUESTION_TYPES = Object.freeze([...OBJECTIVE_TYPES, 'reading', 'listening', 'open_question', 'writing', 'conversation', 'pronunciation'])
export const DEFAULT_CORRECTION = Object.freeze({ version: 1, mode: 'teacher_only', timing: 'after_submission',
  retry_incorrect_only: false, reveal_after_attempt: 99, hide_solutions_until_complete: true,
  show_score: false, scoring: 'first', retry_penalty: 10, ai_auto_authorized: false })

export function correctionSettings(settings = {}) {
  const value = settings.correction
  if (value == null) return { ...DEFAULT_CORRECTION }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !Object.hasOwn(DEFAULT_CORRECTION, k))) throw new Error('Choose valid correction settings.')
  const result = { ...DEFAULT_CORRECTION, ...value }
  if (result.version !== 1 || !CORRECTION_MODES.includes(result.mode) || !['immediate', 'after_submission'].includes(result.timing) ||
    !['first', 'best', 'penalized'].includes(result.scoring) || !Number.isInteger(result.reveal_after_attempt) ||
    result.reveal_after_attempt < 1 || result.reveal_after_attempt > 99 || !Number.isInteger(result.retry_penalty) ||
    result.retry_penalty < 0 || result.retry_penalty > 100 ||
    ['retry_incorrect_only','hide_solutions_until_complete','show_score','ai_auto_authorized'].some(k => typeof result[k] !== 'boolean') ||
    (result.mode === 'ai_auto' && !result.ai_auto_authorized) || (result.timing === 'immediate' && result.mode !== 'objective')) throw new Error('Choose valid correction, reveal and retry settings.')
  return result
}

export function validateCorrectionDefinition(exercise) {
  const config = correctionSettings(exercise.settings)
  const attempts = exercise.settings?.max_attempts ?? 1
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 99) throw new Error('Choose between 1 and 99 attempts.')
  for (const [index, question] of (exercise.questions || []).entries()) {
    const type = question.response_type || exercise.exercise_type
    if (!QUESTION_TYPES.includes(type)) throw new Error(`Question ${index + 1}: choose a supported response format.`)
    if (config.mode !== 'objective') continue
    if (!OBJECTIVE_TYPES.includes(type)) throw new Error(`Question ${index + 1}: open responses need teacher or AI-assisted review.`)
    const alternatives = question.accepted_answers ?? []
    if (!Array.isArray(alternatives) || alternatives.length > 20 || alternatives.some(a => typeof a !== 'string' || !a.trim() || a.length > 4000)) throw new Error(`Question ${index + 1}: add valid accepted alternatives.`)
    if (type === 'matching') {
      if (!Array.isArray(question.answer) || question.answer.length !== question.left?.length || question.answer.some(a => !question.right?.includes(a))) throw new Error(`Question ${index + 1}: choose a correct match for every expression.`)
    } else if (typeof question.answer !== 'string' || !question.answer.trim() || question.answer.length > 4000) throw new Error(`Question ${index + 1}: define the expected answer.`)
    if (type === 'true_false' && !['True','False'].includes(question.answer)) throw new Error(`Question ${index + 1}: choose True or False.`)
    if (question.explanation != null && (typeof question.explanation !== 'string' || question.explanation.length > 2000)) throw new Error(`Question ${index + 1}: keep the explanation under 2,000 characters.`)
  }
  return exercise
}

// Used only in the teacher's private preview. Production corrections come from
// PostgreSQL, using the same conservative whitespace/case policy and no fuzzy AI.
export function checkPreviewAnswer(question, answer, defaultType) {
  const type = question.response_type || defaultType
  if (!OBJECTIVE_TYPES.includes(type)) return { state: 'awaiting_review', correct: null }
  const normalize = value => String(value).trim().replace(/\s+/g, ' ').toLowerCase()
  if (type === 'matching') {
    let value
    try { value = JSON.parse(answer) } catch { return { state: 'needs_practice', correct: false } }
    return { state: JSON.stringify(value) === JSON.stringify(question.answer) ? 'correct' : 'needs_practice', correct: JSON.stringify(value) === JSON.stringify(question.answer) }
  }
  const expected = [question.answer, ...(question.accepted_answers || [])].filter(a => typeof a === 'string')
  const correct = expected.some(a => ['multiple_choice','true_false'].includes(type) ? a === answer : normalize(a) === normalize(answer))
  return { state: correct ? 'correct' : 'needs_practice', correct }
}

export function supportiveMessage(correct) {
  return correct === true ? "Exactly! You've got it." : correct === false ? "Good try! Let's give it another go." : "Your answer is in! Your teacher will take a look and share feedback soon."
}

export async function loadExercisePractice(client, assignmentId) {
  const { data, error } = await client.rpc('get_exercise_practice_state', { p_assignment_id: assignmentId })
  if (error || data?.assignment_id !== assignmentId) throw new Error('Practice progress could not load. Your saved submission is safe; refresh to try again.')
  return data
}

export async function checkExerciseQuestion(client, { assignmentId, index, answer, requestId }) {
  const { data, error } = await client.rpc('check_exercise_question', { p_assignment_id: assignmentId, p_index:index, p_answer:answer, p_request_id:requestId })
  if (error || data?.index !== index) throw new Error('The check was not confirmed. Keep your answer and retry the same request.')
  return data
}

export async function saveExerciseFeedback(client, { attemptId, content, expectedVersion, requestId, release = false, aiDraftId = null }) {
  const { data, error } = await client.rpc('save_exercise_feedback', { p_attempt_id:attemptId, p_content:validateCoachFeedback(content),
    p_expected_version:expectedVersion, p_request_id:requestId, p_release:release, p_ai_draft_id:aiDraftId })
  if (error || data?.attempt_id !== attemptId || !data?.version) throw new Error('Feedback was not confirmed. Reload the latest review before saving again.')
  return data
}

export function duplicateQuestion(question) { return structuredClone(question) }
export function reorderQuestion(questions, from, to) {
  if (![from,to].every(n => Number.isInteger(n) && n >= 0 && n < questions.length)) throw new Error('Choose an existing question.')
  const result = questions.map(duplicateQuestion)
  result.splice(to, 0, result.splice(from, 1)[0])
  return result
}
