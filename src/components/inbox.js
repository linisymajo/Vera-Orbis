import { escapeHtml } from '../lib/auth.js'
import { normalizeInterfaceLanguage, t } from '../lib/i18n.js'

/**
 * Renders the Student Inbox view.
 * Displays messages from teacher, read/unread status, message body,
 * and a form to message or reply to the teacher.
 */
export function renderInbox(messages = [], student = {}) {
  const uiLang = normalizeInterfaceLanguage(
    typeof student === 'string'
      ? student
      : (student?.interfaceLanguage || student?.interface_language || 'es')
  )

  const unreadCount = messages.filter((m) => !m.is_read).length

  return `
    <section class="inbox-section" id="inbox-view-container">

      <div class="platform-section-heading">

        <p class="platform-label">
          ${t('inboxKicker', uiLang) || '07 — INBOX & MESSAGES'}
        </p>

        <h2>
          ${t('inboxHeading', uiLang) || 'Your conversations.'}
          <span>${t('inboxHeadingSpan', uiLang) || 'Direct with your teacher.'}</span>
        </h2>

        <p>
          ${t('inboxDesc', uiLang) || 'Stay in touch with your teacher, receive lesson notes, and review announcements.'}
        </p>

        <div class="inbox-status-bar" style="margin-top: 18px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span class="inbox-badge ${unreadCount > 0 ? 'inbox-badge-unread' : 'inbox-badge-read'}">
            ${unreadCount > 0 ? `${unreadCount} ${t('unreadMessages', uiLang) || 'unread'}` : (t('allMessagesRead', uiLang) || 'All messages read')}
          </span>
          <span style="font-size: 13px; color: var(--vo-muted);">
            ${messages.length} ${t('totalMessages', uiLang) || 'messages total'}
          </span>
        </div>

      </div>

      <div class="inbox-layout">

        <!-- COMPOSE MESSAGE TO TEACHER -->
        <div class="inbox-compose-card">
          <div class="inbox-compose-header">
            <h3>${t('sendMessageToTeacher', uiLang) || 'Send a message to your teacher'}</h3>
            <p>${t('sendMessageDesc', uiLang) || 'Have a question about your lessons or homework? Send a note directly.'}</p>
          </div>

          <form id="student-send-message-form" class="inbox-compose-form">
            <label>
              <span>${t('subjectLabel', uiLang) || 'Subject'}</span>
              <input
                type="text"
                name="subject"
                required
                maxlength="160"
                placeholder="${t('subjectPlaceholder', uiLang) || 'e.g. Question about Unit 2 vocabulary'}"
              >
            </label>

            <label>
              <span>${t('messageLabel', uiLang) || 'Message'}</span>
              <textarea
                name="body"
                required
                rows="4"
                placeholder="${t('messagePlaceholder', uiLang) || 'Write your message here...'}"
              ></textarea>
            </label>

            <button type="submit" class="next-step-button" style="margin-top: 8px;">
              ${t('sendMessageBtn', uiLang) || 'Send Message ↗'}
            </button>
            <p class="inbox-form-status" data-inbox-status aria-live="polite"></p>
          </form>
        </div>

        <!-- MESSAGES LIST -->
        <div class="inbox-messages-list">
          <h3 style="margin: 0 0 16px; font-family: 'Playfair Display', serif; font-size: 22px; color: var(--vo-navy);">
            ${t('receivedMessages', uiLang) || 'Messages'}
          </h3>

          ${messages.length === 0 ? `
            <div class="empty-platform-state">
              <p>${t('noMessagesTitle', uiLang) || 'No messages yet.'}</p>
              <small>
                ${t('noMessagesDesc', uiLang) || 'When your teacher sends you personal notes or updates, they will appear here.'}
              </small>
            </div>
          ` : `
            <div class="inbox-cards-grid">
              ${messages.map((msg) => {
                const dateStr = msg.created_at
                  ? new Date(msg.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : ''
                const isUnread = !msg.is_read
                const formattedBody = String(msg.body || '').replace(/\n/g, '<br>')

                return `
                  <article
                    class="inbox-message-card ${isUnread ? 'is-unread' : 'is-read'}"
                    id="inbox-msg-${msg.id}"
                    data-message-id="${msg.id}"
                  >
                    <div class="inbox-card-header">
                      <div class="inbox-sender-info">
                        <span class="inbox-sender-name">
                          ${escapeHtml(msg.sender_name || (msg.sender_role === 'teacher' ? 'Teacher' : 'Vera Orbis'))}
                        </span>
                        <span class="inbox-role-badge inbox-role-${msg.sender_role || 'teacher'}">
                          ${escapeHtml(msg.sender_role || 'teacher')}
                        </span>
                      </div>

                      <div class="inbox-card-meta">
                        <span class="inbox-date">${dateStr}</span>
                        ${isUnread ? `
                          <span class="inbox-unread-dot" title="Unread message">●</span>
                        ` : `
                          <span class="inbox-read-check" title="Read message">✓</span>
                        `}
                      </div>
                    </div>

                    <h4 class="inbox-message-subject">
                      ${escapeHtml(msg.subject || 'No Subject')}
                    </h4>

                    <div class="inbox-message-body">
                      ${formattedBody}
                    </div>

                    <div class="inbox-card-actions">
                      ${isUnread ? `
                        <button
                          type="button"
                          class="inbox-mark-read-btn"
                          data-mark-read-id="${msg.id}"
                        >
                          ${t('markAsRead', uiLang) || 'Mark as read ✓'}
                        </button>
                      ` : `
                        <span class="inbox-read-timestamp">
                          ${t('readOn', uiLang) || 'Read'} ${msg.read_at ? new Date(msg.read_at).toLocaleDateString() : '✓'}
                        </span>
                      `}
                    </div>
                  </article>
                `
              }).join('')}
            </div>
          `}
        </div>

      </div>

    </section>
  `
}

/**
 * Initializes interactive listeners for the inbox:
 * - Marking unread messages as read
 * - Submitting new messages to the teacher
 */
export function setupInboxHandlers(supabase, student, onRefresh) {
  const container = document.querySelector('#inbox-view-container')
  if (!container || !supabase) return

  // Mark as read buttons
  container.querySelectorAll('[data-mark-read-id]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault()
      const msgId = btn.dataset.markReadId
      if (!msgId) return

      btn.disabled = true
      btn.textContent = 'Updating...'

      try {
        const { error } = await supabase
          .from('inbox_messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('id', msgId)
          .eq('recipient_id', student.id)

        if (!error) {
          const card = document.querySelector(`#inbox-msg-${msgId}`)
          if (card) {
            card.classList.remove('is-unread')
            card.classList.add('is-read')
            const actions = card.querySelector('.inbox-card-actions')
            if (actions) {
              actions.innerHTML = '<span class="inbox-read-timestamp">Read just now ✓</span>'
            }
            const dot = card.querySelector('.inbox-unread-dot')
            if (dot) {
              dot.outerHTML = '<span class="inbox-read-check" title="Read message">✓</span>'
            }
          }
          if (typeof onRefresh === 'function') {
            onRefresh()
          }
        } else {
          console.warn('Could not mark message as read:', error.message)
          btn.disabled = false
          btn.textContent = 'Mark as read ✓'
        }
      } catch (err) {
        console.error('Inbox update error:', err)
        btn.disabled = false
        btn.textContent = 'Mark as read ✓'
      }
    })
  })

  // Send message form
  const composeForm = document.querySelector('#student-send-message-form')
  if (composeForm) {
    composeForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const statusEl = composeForm.querySelector('[data-inbox-status]')
      const submitBtn = composeForm.querySelector('button[type="submit"]')
      const formData = new FormData(composeForm)

      const subject = String(formData.get('subject') || '').trim()
      const body = String(formData.get('body') || '').trim()

      if (!subject || !body) {
        if (statusEl) statusEl.textContent = 'Please fill out both subject and message.'
        return
      }

      if (submitBtn) submitBtn.disabled = true
      if (statusEl) {
        statusEl.textContent = 'Sending message...'
        statusEl.className = 'inbox-form-status is-loading'
      }

      try {
        const user = (await supabase.auth.getUser())?.data?.user
        const { error } = await supabase.from('inbox_messages').insert({
          sender_id: user?.id || student.id,
          sender_name: student.name || 'Student',
          sender_role: 'student',
          recipient_id: student.id, // linked to student conversation
          subject: subject,
          body: body,
          is_read: true // sender's own copy is considered read
        })

        if (error) {
          if (statusEl) {
            statusEl.textContent = error.message || 'Could not send message.'
            statusEl.className = 'inbox-form-status is-error'
          }
        } else {
          if (statusEl) {
            statusEl.textContent = 'Message sent to your teacher.'
            statusEl.className = 'inbox-form-status is-success'
          }
          composeForm.reset()
          if (typeof onRefresh === 'function') {
            setTimeout(onRefresh, 500)
          }
        }
      } catch (err) {
        console.error('Error sending message:', err)
        if (statusEl) {
          statusEl.textContent = 'An unexpected error occurred.'
          statusEl.className = 'inbox-form-status is-error'
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false
      }
    })
  }
}
