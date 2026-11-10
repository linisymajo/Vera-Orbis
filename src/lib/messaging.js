// In-app persistence confirmation; this does not claim email delivery.
export async function sendAcademicMessage(client, message) {
  try {
    const auth = await client.auth.getUser()
    const userId = auth.data?.user?.id
    if (auth.error || !userId || message.sender_id !== userId) throw new Error('Verify your session before sending a message.')
    if (!['student','teacher'].includes(message.sender_role)) throw new Error('Unsupported message role.')
    const subject = String(message.subject || '').trim()
    const body = String(message.body || '').trim()
    if (!message.recipient_id || !subject || subject.length > 160 || !body || body.length > 20000) throw new Error('Add a subject up to 160 characters and a message up to 20,000 characters.')
    const result = await client.from('inbox_messages').insert({ ...message, sender_id: userId, subject, body, is_read: false }).select('id').single()
    if (result.error) return result
    if (!result.data?.id) throw new Error('Message persistence was not confirmed. Refresh the conversation before retrying.')
    return result
  } catch (error) {
    return { data: null, error: { message: error.message || 'Message persistence was not confirmed.' } }
  }
}