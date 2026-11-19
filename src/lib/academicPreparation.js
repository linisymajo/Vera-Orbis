import { architectCourseToPlan } from '../../supabase/functions/academic-ai/learning-architect.js'
import { validateContextReview, remainingLessons } from '../../supabase/functions/academic-ai/academic-context.js'
import { createLearningPlanVersion, saveLearningPlanVersion } from './learningPlans.js'
// Pedagogical scaffolding only. This does not infer weaknesses, summarize files,
// generate student history or call an LLM. The teacher supplies the lesson content.
export function prepareRemainingPlan(settings, sources) {
  validateContextReview(settings, sources)
  const n = remainingLessons(settings)
  if (n < 1 || n > 12) throw Error('Prepare between one and twelve remaining lessons per plan.')
  const themes = ['Model a useful exchange', 'Clarify and ask follow-up questions', 'Build a personal response', 'Extend a conversation', 'Compare cultural situations', 'Tell a short story', 'Complete an authentic speaking task', 'Handle a practical challenge', 'Explain a preference', 'Repair a misunderstanding', 'Rehearse an independent exchange', 'Demonstrate the communicative goal']
  const stages = ['Listen', 'Repeat', 'Personalize', 'Use']
  const minutes = [Math.floor(settings.duration / 4), Math.floor(settings.duration / 4), Math.floor(settings.duration / 4), settings.duration - 3 * Math.floor(settings.duration / 4)]
  const course = { title: 'Teacher planning template · remaining lessons', language: settings.language, level: settings.level,
    summary: 'Deterministic planning scaffold based on teacher-confirmed counts. No AI inference. Review academic evidence and replace generic activities before publication.',
    needs: 'Teacher to confirm specific needs from reviewed evidence.', approach: 'Power Expressions → Listen → Repeat → Personalize → Use; speaking, cultural context and practical communication.',
    adaptations: ['Teacher to adapt these activities to reviewed academic evidence.'], revisit: ['Teacher to exclude or adapt topics already covered.'],
    sessions: Array.from({ length: n }, (_, i) => {
      const title = `Session ${settings.completed + i + 1}: ${themes[i]}`
      const steps = ['Listen to a teacher-selected authentic exchange and notice useful Power Expressions.', 'Repeat and vary the expressions with attention to rhythm and meaning.', 'Adapt the exchange to a teacher-approved, non-confidential situation.', 'Use the expressions in an unscripted practical exchange with a follow-up question.']
      return { title, objective: themes[i], evidence: 'Teacher observes a clear communicative response and records specific feedback.',
        contextual_input: 'Teacher selects a relevant authorized material; no material content was inferred.', guided_practice: steps[1], personalization: steps[2], task: steps[3],
        homework: 'Rehearse a short spoken exchange and note one question for the next class.', checkpoint: 'Teacher checks achievement against the lesson objective.',
        power_expressions: ['Teacher: add expressions from an authorized source.'], vocabulary: ['Teacher: add contextual vocabulary.'], activities: ['Authentic listening', 'Guided speaking', 'Practical communication'],
        steps: stages.map((stage, k) => ({ stage, activity: steps[k] })), minutes: [...minutes] }
    }) }
  return architectCourseToPlan(course, { language: settings.language, level: settings.level, goal: settings.goal, duration: settings.duration, classes: n }, {})
}
export async function savePreparedPlan(client, studentId, settings, sources, requestId) {
  const content = prepareRemainingPlan(settings, sources)
  const draft = await createLearningPlanVersion(client, { studentId, requestId })
  if (draft.status !== 'draft') throw Error('This preparation request is already approved. Create a new draft to revise it.')
  // A retry must preserve the teacher's existing edits.
  if (draft.revision > 1) return draft
  return saveLearningPlanVersion(client, { id: draft.id, revision: draft.revision, content })
}
export function prepareLessonExercise(version, index, studentId) {
  const o = version.content.objectives[index]
  if (!o || version.status !== 'approved' || version.student_id !== studentId || (version.content.architect && !version.published_at)) throw Error('Choose a published lesson for this student.')
  const session = version.content.architect?.sessions[index]
  return { title: ('Practice: ' + (session?.title || o.title)).slice(0, 160), language: version.content.language, level: version.content.level,
    objective: o.title.slice(0, 240), instructions: 'Teacher-prepared lesson activity. Review and personalize before assigning.\n' + o.steps.map(s => `${s.stage}: ${s.activity}`).join('\n'), exercise_type: 'open_question',
    questions: [{ prompt: `Use the lesson objective in a practical exchange: ${o.title}`, response_type: 'open_question', explanation: '', hint: '' }],
    settings: { learning_journey: { student_id: studentId, version_id: version.id, objective_id: o.id }, max_attempts: 1, correction: { mode: 'teacher_only', timing: 'after_submission' } } }
}
