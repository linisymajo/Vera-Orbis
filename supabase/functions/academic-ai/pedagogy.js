// Shared fixed catalog. Never add student text, identifiers or records here.
import { AcademicAIError } from './core.js'

export const PEDAGOGICAL_OBJECTIVES = Object.freeze([
  Object.freeze({ value: 'Everyday communication', practice: Object.freeze(['speaking confidence', 'listening comprehension', 'practical vocabulary']) }),
  Object.freeze({ value: 'Travel and cultural exchange', practice: Object.freeze(['situational conversation', 'cultural awareness', 'listening comprehension']) }),
  Object.freeze({ value: 'Professional conversations', practice: Object.freeze(['collaborative speaking', 'polite requests', 'clear explanations']) }),
  Object.freeze({ value: 'Storytelling and opinions', practice: Object.freeze(['spoken storytelling', 'expressing opinions', 'discussion skills']) }),
])
export const DEFAULT_PEDAGOGICAL_OBJECTIVE = PEDAGOGICAL_OBJECTIVES[0].value
export const isPedagogicalObjective = value => PEDAGOGICAL_OBJECTIVES.some(item => item.value === value)

export function pedagogicalObjective(value) {
  const item = PEDAGOGICAL_OBJECTIVES.find(item => item.value === value)
  if (!item) throw new AcademicAIError('invalid_pedagogy', 'Choose a broad objective from the permitted options. Private text cannot be sent to Gemini.', 422)
  return item
}

// A new object with an explicit allowlist, never a spread/clone of user context.
export function generalizedPedagogy(request) {
  const objective = pedagogicalObjective(request.goal)
  if (!['English', 'French', 'Mandarin'].includes(request.language)
    || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(request.level)
    || !Number.isInteger(request.classes) || request.classes < 1 || request.classes > 12
    || !Number.isInteger(request.duration) || request.duration < 20 || request.duration > 120) {
    throw new AcademicAIError('invalid_pedagogy', 'Choose supported language, level, lesson count and duration.', 422)
  }
  const result = {
    language: request.language,
    cefr_level: request.level,
    communicative_objective: objective.value,
    lesson_count: request.classes,
    class_duration_minutes: request.duration,
    practice_areas: [...objective.practice],
  }
  if (request.regenerate !== null) {
    if (!request.regenerate || !Number.isInteger(request.regenerate.session)
      || request.regenerate.session < 0 || request.regenerate.session >= request.classes) {
      throw new AcademicAIError('invalid_pedagogy', 'Choose a valid lesson number.', 422)
    }
    // Only the ordinal reaches Google. Version/student/request IDs never do.
    result.lesson_number = request.regenerate.session + 1
  }
  return result
}
