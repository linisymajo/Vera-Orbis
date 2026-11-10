export async function listNotifications(client, { limit = 100 } = {}) {
  const auth = await client.auth.getUser()
  if (auth.error || !auth.data?.user?.id) throw new Error('Sign in to read your notifications.')
  const { data, error } = await client.from('academic_notifications').select('id,kind,entity_id,target_view,title,body,read_at,created_at').eq('recipient_id', auth.data.user.id).order('created_at', { ascending: false }).limit(Math.min(200, Math.max(1, limit)))
  if (error) throw new Error(error.message)
  return data || []
}

export async function markNotificationRead(client, id) {
  if (!id) throw new Error('Choose a notification.')
  const { data, error } = await client.rpc('mark_academic_notification_read', { p_notification_id: id })
  if (error) throw new Error(error.message)
  if (data?.id !== id || !data?.read_at) throw new Error('The notification read receipt was not confirmed.')
  return data
}

export async function getUnreadNotificationCount(client) {
  const auth = await client.auth.getUser()
  if (auth.error || !auth.data?.user?.id) throw new Error('Sign in to read your notifications.')
  const { count, error } = await client.from('academic_notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', auth.data.user.id).is('read_at', null)
  if (error) throw new Error(error.message)
  if (!Number.isInteger(count)) throw new Error('The notification count could not be confirmed.')
  return count
}

export function unreadNotificationCount(notifications = []) {
  return notifications.filter(item => !item.read_at).length
}
