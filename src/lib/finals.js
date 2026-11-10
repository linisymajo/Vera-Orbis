const nonempty = value => typeof value === 'string' && value.trim().length > 0

export function validateFinalCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length < 1 || criteria.length > 20) throw new Error('Add between 1 and 20 assessment criteria.')
  if (criteria.some(c => !c || !nonempty(c.label) || c.label.length > 160 || !Number.isFinite(c.max_points) || c.max_points <= 0 || c.max_points > 100 || Math.round(c.max_points * 100) !== c.max_points * 100)) throw new Error('Each criterion needs a label and positive points with at most two decimal places.')
  if (Math.abs(criteria.reduce((sum, c) => sum + c.max_points, 0) - 100) > 0.000001) throw new Error('Assessment criteria must total 100 points.')
  return criteria.map(c => ({ label: c.label.trim(), max_points: c.max_points }))
}

export function parseFinalCriteria(text) {
  return validateFinalCriteria(String(text).split('\n').filter(line => line.trim()).map(line => {
    const divider = line.lastIndexOf('|')
    return { label: divider < 0 ? '' : line.slice(0, divider).trim(), max_points: Number(line.slice(divider + 1).trim()) }
  }))
}

export async function saveFinalDraft(client, { id = null, draft, criteria, materialIds = [], requestId = globalThis.crypto.randomUUID() }) {
  validateFinalCriteria(criteria)
  const result = await client.rpc('save_final_draft', { p_final_id: id, p_draft: draft, p_criteria: criteria, p_material_ids: [...new Set(materialIds)], p_request_id: requestId })
  if (result.error || !result.data?.id || !result.data?.exercise_id) throw new Error(result.error?.message || 'Final assessment save was not confirmed. Keep this form open before retrying.')
  return result.data
}

export async function publishFinalAssessment(client, { finalId, studentIds, dueAt = null }) {
  const ids = [...new Set(studentIds)].filter(Boolean)
  if (!finalId || !ids.length || ids.length > 200) throw new Error('Select a final assessment and between 1 and 200 students.')
  const result = await client.rpc('publish_final_assessment', { p_final_id: finalId, p_student_ids: ids, p_due_at: dueAt })
  if (result.error || result.data?.id !== finalId || result.data?.assignment_count !== ids.length) throw new Error(result.error?.message || 'Final publication was not confirmed. Refresh before retrying.')
  return result.data
}

export async function saveFinalResult(client, { attemptId, scores, feedback, requestId = globalThis.crypto.randomUUID() }) {
  if (!attemptId || !Array.isArray(scores) || !scores.length || scores.some(score => !Number.isFinite(score) || score < 0) || !nonempty(feedback)) throw new Error('Complete every criterion score and add specific feedback.')
  const result = await client.rpc('save_final_result', { p_attempt_id: attemptId, p_scores: scores, p_feedback: feedback.trim(), p_request_id: requestId })
  if (result.error || !result.data?.id || !Number.isFinite(Number(result.data.grade)) || result.data.status !== 'draft') throw new Error(result.error?.message || 'Private assessment save was not confirmed.')
  return result.data
}

export async function publishFinalResult(client, resultId) {
  if (!resultId) throw new Error('Save the private assessment before publishing results.')
  const result = await client.rpc('publish_final_result', { p_result_id: resultId })
  if (result.error || result.data?.id !== resultId || result.data?.status !== 'published') throw new Error(result.error?.message || 'Results publication was not confirmed.')
  return result.data
}
