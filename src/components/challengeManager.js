import { requestAcademicDraft, academicAIGenerationEnabled } from '../lib/academicAI.js'
import { listChallengeRecommendations, reviewChallengeRecommendation, publishChallenge, reviewChallengeSubmission } from '../lib/academicChallenges.js'
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

export async function mountChallengeManager(panel, client, { initialDraft = null } = {}) {
  const [students, challenges, responses, publications] = await Promise.all([
    client.from('profiles').select('id,name,language').order('name').limit(1000),
    client.from('weekly_challenges').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('challenge_submissions').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('challenge_publications').select('id,ai_draft_id,created_at').order('created_at', { ascending: false }).limit(200)
  ])
  if (students.error || challenges.error || responses.error || publications.error) {
    panel.innerHTML = '<p role="alert">Challenge Manager could not load. Check your connection and reviewed challenge migration.</p>'
    return
  }
  let recommendations
  try { recommendations = await listChallengeRecommendations(client) }
  catch (error) { panel.innerHTML = `<p role="alert">${esc(error.message)}</p>`; return }
  const studentName = id => students.data.find(student => student.id === id)?.name || 'Student'
  panel.innerHTML = `<section class="teacher-form-card"><h3>Weekly Challenge Manager</h3><p>Listen → Repeat → Personalize → Use. Review a recommendation, select the actual students, then publish. Notifications are saved in the platform.</p><form data-request-challenge><label>Recommendation for<select name="student_id" required><option value="">Choose student</option>${students.data.map(student => `<option value="${esc(student.id)}">${esc(student.name)}</option>`).join('')}</select></label><label>Real communication goal<textarea name="brief" required maxlength="2000" rows="3"></textarea></label><button type="submit">Generate editable recommendation</button><p data-generation-status role="status"></p></form></section><div data-challenge-recommendations></div><section class="teacher-list-card"><h3>Published challenges</h3><ul>${challenges.data.map(challenge => `<li><strong>${esc(challenge.title)}</strong> · ${esc(challenge.student_id ? studentName(challenge.student_id) : 'Legacy shared challenge')} · ${esc(challenge.status)}</li>`).join('') || '<li>No published challenges yet.</li>'}</ul></section><section class="teacher-list-card"><h3>Student challenge responses</h3>${responses.data.map(response => {
    const challenge = challenges.data.find(challenge => challenge.id === response.challenge_id)
    return `<form data-review-challenge-response="${esc(response.id)}"><h4>${esc(studentName(response.student_id))} · ${esc(response.challenge_snapshot?.title || challenge?.title || 'Challenge')}</h4><p style="white-space:pre-wrap">${esc(response.response)}</p><label>Editable teacher feedback<textarea name="feedback" required maxlength="6000" rows="3">${esc(response.teacher_feedback || '')}</textarea></label><button type="submit" value="draft">Save private feedback draft</button><button type="submit" value="release">Approve and send feedback</button><p data-response-status role="status">${esc(response.feedback_status || 'published')}</p></form>`
  }).join('') || '<p>No saved responses yet.</p>'}</section>`
  const host = panel.querySelector('[data-challenge-recommendations]')
  function renderRecommendations() {
    host.innerHTML = recommendations.map(draft => {
      const published = publications.data.find(publication => publication.ai_draft_id === draft.id)
      return `<form class="teacher-form-card" data-challenge-draft="${esc(draft.id)}"><h3>${esc(draft.content.title)}</h3><p>Recommendation · ${esc(draft.status)}${published ? ' · Published' : ''}</p><label>Title<input name="title" value="${esc(draft.content.title)}" required maxlength="160"></label><label>Objective<textarea name="objective" required maxlength="1000">${esc(draft.content.objective)}</textarea></label><label>Language<input name="language" value="${esc(draft.content.language)}" required maxlength="80"></label><label>Level<input name="level" value="${esc(draft.content.level)}" required maxlength="40"></label>${draft.content.steps.map((step, index) => `<label>${esc(step.stage)}<textarea name="stage-${index}" required maxlength="2000">${esc(step.activity)}</textarea></label>`).join('')}<button type="submit" value="draft" ${published ? 'disabled' : ''}>Save edited recommendation</button><button type="submit" value="approve" ${published ? 'disabled' : ''}>Approve reviewed recommendation</button><details><summary>Assign to an individual or a selected group</summary><label>Find students<input type="search" data-challenge-student-search placeholder="Search names or languages"></label><div>${students.data.map(student => `<label data-challenge-student-option data-search="${esc((student.name + ' ' + (student.language || '')).toLowerCase())}"><input type="checkbox" name="student_ids" value="${esc(student.id)}" ${student.id === draft.student_id ? 'checked' : ''}>${esc(student.name)}</label>`).join('')}</div><label>Deadline (your local time)<input type="datetime-local" name="end_at"></label><label>Points<input type="number" name="points" min="0" max="1000" value="10" required></label><button type="button" data-publish-challenge ${published || draft.status !== 'approved' ? 'disabled' : ''}>${published ? 'Already published' : 'Publish to selected students'}</button></details><p data-challenge-status role="status" aria-live="polite"></p></form>`
    }).join('') || '<p>No challenge recommendations yet. Generate a draft above, then review it before publication.</p>'
    host.querySelectorAll('[data-challenge-draft]').forEach(form => {
      const draft = recommendations.find(draft => draft.id === form.dataset.challengeDraft)
      const published = publications.data.some(publication => publication.ai_draft_id === draft.id)
      const status = form.querySelector('[data-challenge-status]')
      const publishButton = form.querySelector('[data-publish-challenge]')
      const signature = () => JSON.stringify(collect())
      const collect = () => ({ ...structuredClone(draft.content), title: form.elements.title.value.trim(), objective: form.elements.objective.value.trim(), language: form.elements.language.value.trim(), level: form.elements.level.value.trim(), steps: draft.content.steps.map((step, index) => ({ stage: step.stage, activity: form.elements[`stage-${index}`].value.trim() })) })
      const approvedSignature = draft.status === 'approved' ? JSON.stringify(draft.content) : null
      if (published) form.querySelectorAll('input,textarea,select,button').forEach(input => { input.disabled = true })
      form.addEventListener('input', () => {
        publishButton.disabled = published || signature() !== approvedSignature
        if (signature() !== approvedSignature) status.textContent = 'Save and approve the edited recommendation before publishing.'
      })
      form.querySelector('[data-challenge-student-search]').oninput = event => form.querySelectorAll('[data-challenge-student-option]').forEach(option => { option.hidden = !option.dataset.search.includes(event.target.value.toLowerCase()) })
      form.onsubmit = async event => {
        event.preventDefault()
        const buttons = [...form.querySelectorAll('button')]; buttons.forEach(button => { button.disabled = true })
        try {
          await reviewChallengeRecommendation(client, { draftId: draft.id, content: collect(), approve: event.submitter?.value === 'approve' })
          await mountChallengeManager(panel, client, { initialDraft: draft })
        } catch (error) { status.textContent = error.message; buttons.forEach(button => { button.disabled = false }); publishButton.disabled = signature() !== approvedSignature }
      }
      publishButton.onclick = async () => {
        publishButton.disabled = true
        try {
          if (draft.status !== 'approved' || signature() !== approvedSignature) throw new Error('Approve this exact recommendation before publishing.')
          form.dataset.requestId ||= crypto.randomUUID()
          const studentIds = [...form.querySelectorAll('[name="student_ids"]:checked')].map(input => input.value)
          const endAt = form.elements.end_at.value ? new Date(form.elements.end_at.value).toISOString() : null
          const saved = await publishChallenge(client, { draftId: draft.id, studentIds, endAt, points: Number(form.elements.points.value), requestId: form.dataset.requestId })
          status.textContent = `Published with ${saved.assignment_count} saved student assignments.`
          form.querySelectorAll('input,textarea,select,button').forEach(input => { input.disabled = true })
        } catch (error) { status.textContent = error.message; publishButton.disabled = false }
      }
    })
  }
  renderRecommendations()
  if (!academicAIGenerationEnabled()) {
    panel.querySelector('[data-request-challenge] [type="submit"]').disabled = true
    panel.querySelector('[data-generation-status]').textContent = 'AI generation is disabled. A configured and verified provider is required.'
  }
  if (initialDraft?.id) host.querySelector(`[data-challenge-draft="${CSS.escape(initialDraft.id)}"]`)?.scrollIntoView({ block: 'nearest' })
  panel.querySelector('[data-request-challenge]').onsubmit = async event => {
    event.preventDefault()
    if (!academicAIGenerationEnabled()) return
    const form = event.currentTarget, button = event.submitter, status = form.querySelector('[data-generation-status]')
    button.disabled = true; status.textContent = 'Preparing an authorized recommendation...'
    try {
      await requestAcademicDraft(client, { kind: 'challenge', studentId: form.elements.student_id.value, brief: form.elements.brief.value })
      recommendations = await listChallengeRecommendations(client); renderRecommendations(); status.textContent = 'Recommendation saved for teacher review.'
    } catch (error) { status.textContent = error.message }
    finally { button.disabled = false }
  }
  panel.querySelectorAll('[data-review-challenge-response]').forEach(form => {
    form.onsubmit = async event => {
      event.preventDefault()
      const buttons = [...form.querySelectorAll('button')]; buttons.forEach(button => { button.disabled = true })
      try {
        const saved = await reviewChallengeSubmission(client, { submissionId: form.dataset.reviewChallengeResponse, feedback: form.elements.feedback.value, release: event.submitter?.value === 'release' })
        form.querySelector('[data-response-status]').textContent = saved.feedback_status === 'published' ? 'Feedback published to the student.' : 'Private feedback draft saved.'
      } catch (error) { form.querySelector('[data-response-status]').textContent = error.message }
      finally { buttons.forEach(button => { button.disabled = false }) }
    }
  })
}
