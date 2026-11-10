import { supabase } from '../lib/supabase.js'
import { escapeHtml } from '../lib/auth.js'
import { createStudentInvitation, invitationRegistrationUrl, readEnrollmentAccess, reviewEnrollment, EnrollmentServiceError, renderEnrollmentServiceError } from '../lib/enrollment.js'

export function renderEnrollmentPanel() {
  return '<section class="teacher-section" id="enrollment-panel" aria-label="Student enrollment"><h2>Student enrollment</h2><p role="status">Loading enrollment tools...</p></section>'
}

export async function setupEnrollmentPanel({ retryEnrollment = false } = {}) {
  const panel = document.querySelector('#enrollment-panel')
  if (!panel) return
  try {
    const access = await readEnrollmentAccess(supabase, { retry: retryEnrollment })
    if (!['teacher', 'admin'].includes(access.role) || !access.academic_access) throw new Error('Verified staff access required.')
    const [requests, teachers] = access.role === 'admin'
      ? await Promise.all([supabase.rpc('list_pending_enrollments'), supabase.rpc('list_enrollment_teachers')])
      : [{ data: [] }, { data: [] }]
    if (requests.error || teachers.error) throw requests.error || teachers.error
    const canInvite = access.role === 'teacher' || teachers.data?.some(teacher => teacher.id === access.student_id)
    panel.innerHTML = `<h2>Student enrollment</h2>
      <p>Invite a student with a link for their email. They must verify that email before the invitation grants access. Links expire in seven days.</p>
      ${canInvite ? `<form id="student-invitation-form" class="teacher-inline-form">
        <label>Student email<input type="email" name="email" required autocomplete="email"></label>
        <button type="submit" class="teacher-primary-action">Create invitation link</button>
      </form>` : '<p>Teacher invitation links are created by the assigned teacher.</p>'}
      <div id="invitation-link-result"></div>
      <p id="enrollment-staff-status" role="status" aria-live="polite"></p>
      ${access.role === 'admin' ? `<h3>Pending registration requests</h3>
        <p>Approve only after reviewing the student's request and assigning their teacher.</p>
        <div class="teacher-table-wrap"><table class="teacher-table"><thead><tr><th>Student</th><th>Email</th><th>Teacher</th><th>Review</th></tr></thead>
        <tbody>${(requests.data || []).map(request => `<tr>
          <td>${escapeHtml(request.name || 'Student')}</td><td>${escapeHtml(request.email)}<br><small>${request.email_verified ? 'Email verified' : 'Email verification pending'}</small></td>
          <td><select data-enrollment-teacher="${escapeHtml(request.student_id)}"><option value="">Select teacher</option>${(teachers.data || []).map(teacher => `<option value="${escapeHtml(teacher.id)}">${escapeHtml(teacher.email)}</option>`).join('')}</select></td>
          <td><button type="button" data-enrollment-approve="${escapeHtml(request.student_id)}" ${!request.email_verified ? 'disabled' : ''}>Approve</button>
          <button type="button" data-enrollment-reject="${escapeHtml(request.student_id)}">Reject</button></td>
        </tr>`).join('') || '<tr><td colspan="4">No pending requests.</td></tr>'}</tbody></table></div>` : '<p>Self-registration requests require administrator approval.</p>'}`
    const status = panel.querySelector('#enrollment-staff-status')
    panel.querySelector('#student-invitation-form')?.addEventListener('submit', async event => {
      event.preventDefault()
      const button = event.currentTarget.querySelector('button')
      button.disabled = true
      status.textContent = ''
      try {
        const invite = await createStudentInvitation(supabase, new FormData(event.currentTarget).get('email'))
        const link = invitationRegistrationUrl(window.location.origin, invite.token)
        panel.querySelector('#invitation-link-result').innerHTML = `<label>Copy this private invitation link and share it with the student<input type="text" readonly value="${escapeHtml(link)}"></label>`
        status.textContent = 'Invitation saved. Share the link with the invited student.'
      } catch (error) { status.textContent = error.message }
      finally { button.disabled = false }
    })
    panel.querySelectorAll('[data-enrollment-approve], [data-enrollment-reject]').forEach(button => {
      button.addEventListener('click', async () => {
        const approve = Boolean(button.dataset.enrollmentApprove)
        const studentId = button.dataset.enrollmentApprove || button.dataset.enrollmentReject
        const teacherId = panel.querySelector(`[data-enrollment-teacher="${studentId}"]`)?.value
        button.disabled = true
        try {
          await reviewEnrollment(supabase, studentId, approve, teacherId)
          button.closest('tr').remove()
          status.textContent = approve ? 'Enrollment approved and saved.' : 'Enrollment rejected and saved.'
        } catch (error) { status.textContent = error.message; button.disabled = false }
      })
    })
  } catch (error) {
    if (error instanceof EnrollmentServiceError) {
      renderEnrollmentServiceError(error, { app: panel, client: supabase, onRetry: () => setupEnrollmentPanel({ retryEnrollment: true }) })
      return
    }
    panel.innerHTML = `<h2>Student enrollment</h2><p role="alert">${escapeHtml(error.message || 'Enrollment tools are unavailable.')}</p>`
  }
}
