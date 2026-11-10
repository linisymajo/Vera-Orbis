import { approveAcademicDraft, saveAcademicDraft } from './academicAI.js'

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(error.message || 'The challenge request failed.')
  if (!data) throw new Error('Challenge persistence could not be confirmed.')
  return data
}

export async function listChallengeRecommendations(client) {
  const { data, error } = await client.from('ai_academic_drafts').select('*').eq('kind', 'challenge').order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  return data || []
}

export function reviewChallengeRecommendation(client, { draftId, content, approve }) {
  const fn = approve ? approveAcademicDraft : saveAcademicDraft
  return fn(client, { id: draftId, content, kind: 'challenge' })
}

export async function publishChallenge(client, { draftId, studentIds, endAt = null, points = 10, requestId }) {
  const ids = [...new Set(studentIds || [])].filter(Boolean)
  if (!draftId || !requestId || ids.length < 1 || ids.length > 200) throw new Error('Choose a reviewed recommendation and 1–200 students.')
  if (!Number.isInteger(points) || points < 0 || points > 1000) throw new Error('Points must be between 0 and 1000.')
  const saved = await rpc(client, 'publish_academic_challenge', { p_draft_id: draftId, p_student_ids: ids, p_end_at: endAt, p_points: points, p_request_id: requestId })
  if (!saved.publication_id || saved.assignment_count !== ids.length || !Array.isArray(saved.challenge_ids) || saved.challenge_ids.length !== ids.length) throw new Error('Challenge assignment persistence could not be confirmed. Keep this request and refresh before retrying.')
  return saved
}

export async function submitAcademicChallenge(client, { challengeId, response, requestId }) {
  if (!challengeId || !requestId || typeof response !== 'string' || !response.trim() || response.trim().length > 12000) throw new Error('Add a response of up to 12000 characters.')
  const saved = await rpc(client, 'submit_academic_challenge', { p_challenge_id: challengeId, p_response: response.trim(), p_request_id: requestId })
  if (!saved.id || saved.challenge_id !== challengeId) throw new Error('Your response was not confirmed. Keep your answers and retry the same request.')
  return saved
}

export async function reviewChallengeSubmission(client, { submissionId, feedback, release }) {
  if (!submissionId || typeof feedback !== 'string' || !feedback.trim() || feedback.trim().length > 6000) throw new Error('Add specific feedback of up to 6000 characters.')
  const saved = await rpc(client, 'review_challenge_submission', { p_submission_id: submissionId, p_feedback: feedback.trim(), p_release: Boolean(release) })
  if (saved.id !== submissionId || saved.feedback_status !== (release ? 'published' : 'draft')) throw new Error('Feedback persistence could not be confirmed.')
  return saved
}

export async function listStudentChallenges(client) {
  const [challenges, submissions] = await Promise.all([
    client.from('weekly_challenges').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    client.from('student_challenge_submissions').select('*').order('created_at', { ascending: false })
  ])
  if (challenges.error || submissions.error) throw new Error((challenges.error || submissions.error).message)
  return { challenges: challenges.data || [], submissions: submissions.data || [] }
}
