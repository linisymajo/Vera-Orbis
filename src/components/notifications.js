import { listNotifications, markNotificationRead, unreadNotificationCount, getUnreadNotificationCount } from '../lib/notifications.js'
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

function categoryLabel(item) {
  const view = String(item?.target_view || item?.kind || '').toLowerCase()
  if (view.includes('exercise')) return { label: 'Practice Activity', theme: 'indigo' }
  if (view.includes('final')) return { label: 'Final Assessment', theme: 'coral' }
  if (view.includes('plan') || view.includes('journey')) return { label: 'Learning Plan', theme: 'teal' }
  if (view.includes('challenge')) return { label: 'Weekly Challenge', theme: 'gold' }
  if (view.includes('inbox') || view.includes('message')) return { label: 'Direct Message', theme: 'violet' }
  if (view.includes('material')) return { label: 'Study Material', theme: 'teal' }
  return { label: 'Academic Update', theme: 'indigo' }
}

export function renderNotifications(items = []) {
  const unreadCount = unreadNotificationCount(items)
  return `
    <section class="academic-notifications vo-notifications-center" aria-label="Academic notifications">
      <header class="vo-notifications-header">
        <div>
          <span class="vo-section-kicker">ACTIVITY &amp; ALERTS FEED</span>
          <h3>Notifications <span class="vo-unread-counter" data-notification-count>${unreadCount}</span></h3>
        </div>
        <div class="vo-notifications-actions">
          <button type="button" class="btn-studio-secondary" data-notifications-refresh>Refresh</button>
        </div>
      </header>
      <p class="vo-studio-status-pill" data-notification-status role="status" aria-live="polite"></p>
      <ul class="vo-notifications-list">
        ${items.map(item => {
          const cat = categoryLabel(item)
          return `
            <li class="${item.read_at ? 'is-read' : 'is-unread'} vo-notification-card vo-notification-card--${cat.theme}">
              <div class="vo-notification-body">
                <div class="vo-notification-meta-top">
                  <span class="vo-badge vo-badge--${cat.theme}">${cat.label}</span>
                  <small>${esc(new Date(item.created_at).toLocaleString())}</small>
                </div>
                <strong>${esc(item.title)}</strong>
                <p>${esc(item.body)}</p>
              </div>
              <div class="vo-notification-controls">
                <button type="button" class="btn-studio-primary" data-open-notification="${esc(item.id)}">Open</button>
                ${!item.read_at ? `<button type="button" class="btn-studio-secondary" data-read-notification="${esc(item.id)}">Mark as read</button>` : '<span class="vo-read-pill">Read</span>'}
              </div>
            </li>`
        }).join('') || '<li class="vo-notification-empty">No notifications yet.</li>'}
      </ul>
    </section>`
}

export async function mountNotifications(panel, client, { onNavigate, onCountChange } = {}) {
  let items = []
  async function refresh() {
    try {
      let unread
      ;[items, unread] = await Promise.all([listNotifications(client), getUnreadNotificationCount(client)])
      panel.innerHTML = renderNotifications(items)
      panel.querySelector('[data-notification-count]').textContent = String(unread)
      onCountChange?.(unread)
      panel.querySelector('[data-notifications-refresh]').onclick = refresh
      panel.querySelectorAll('[data-open-notification], [data-read-notification]').forEach(button => {
        button.onclick = async () => {
          const item = items.find(item => item.id === (button.dataset.openNotification || button.dataset.readNotification))
          button.disabled = true
          try {
            if (!item.read_at) await markNotificationRead(client, item.id)
            await refresh()
            if (button.dataset.openNotification) onNavigate?.(item.target_view, item.entity_id)
          } catch (error) {
            panel.querySelector('[data-notification-status]').textContent = error.message
            button.disabled = false
          }
        }
      })
    } catch (error) {
      panel.innerHTML = `<p role="alert">Notifications unavailable: ${esc(error.message)}</p><button type="button" data-notifications-refresh>Retry</button>`
      panel.querySelector('button').onclick = refresh
    }
  }
  await refresh()
  return refresh
}
