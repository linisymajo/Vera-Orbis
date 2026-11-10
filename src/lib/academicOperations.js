const documentTypes = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4'
}

export function materialContentType(file) {
  if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024) return null
  const expected = documentTypes[file.name.toLowerCase().split('.').pop()]
  if (!expected) return null
  return !file.type || file.type === expected || file.type === 'application/octet-stream' ? expected : null
}

export async function submitExerciseAttempt(client, assignmentId, answers, requestId = globalThis.crypto.randomUUID(), attachmentIds = []) {
  if (!assignmentId || !Array.isArray(answers) || !answers.length || answers.some(item => !Number.isInteger(item.index) || item.index < 0 || typeof item.answer !== 'string' || !item.answer.trim())) {
    throw new Error('Complete each answer before submitting.')
  }
  const auth = await client.auth.getUser()
  if (auth.error || !auth.data?.user?.id) throw new Error('Your session has expired. Please log in again.')
  const result = attachmentIds.length
    ? await client.rpc('submit_exercise_with_attachments', { p_assignment_id: assignmentId, p_answers: answers, p_request_id: requestId, p_attachment_ids: attachmentIds })
    : await client.rpc('submit_exercise', { p_assignment_id: assignmentId, p_answers: answers, p_request_id: requestId })
  if (result.error || !result.data?.id) throw new Error('Submission was not confirmed. Your answers are still here; check your connection before retrying.')
  return result.data
}