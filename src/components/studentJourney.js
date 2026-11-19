import { loadStudentJourney } from '../lib/learningJourney.js'
import './studentJourney.css'
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const labels = { completed: 'Completed', current: 'Current', upcoming: 'Upcoming', in_progress: 'In Progress' }
export async function mountStudentJourney(target, client, studentId) {
  const mount = {}; target.__journeyMount = mount
  let pending = false, timer
  const active = () => target.isConnected && target.__journeyMount === mount
  target.innerHTML = '<p role="status">Loading your published learning journey…</p>'
  async function refresh(retry = false) {
    if (pending || !active()) return
    pending = true
    const expanded = new Set([...target.querySelectorAll('[data-journey-flip][aria-expanded=true]')].map(b => b.dataset.journeyFlip))
    const details = new Set([...target.querySelectorAll('details[open]')].map(d => d.dataset.lessonDetails))
    try {
      const data = await loadStudentJourney(client, studentId, { retry })
      if (!active()) return
      target.innerHTML = `<div class="vo-journey-heading"><h3>Your published lesson roadmap</h3><button type="button" data-journey-refresh>Refresh journey</button></div>
      <p role="status" aria-live="polite" data-journey-status>${data.plans.length ? 'Only teacher-approved, student-visible lessons appear here. Class completion uses recorded evidence.' : 'Your teacher has not published a lesson plan yet.'}</p>
      ${data.plans.map(p => `<section class="vo-journey-course"><h4>${esc(p.title)} · Version ${p.version}${p.historical ? ' · Completed history' : ''}</h4><p>${esc(p.language)} · ${esc(p.level)}${p.course ? ' · ' + esc(p.course.name) + ' · ' + p.course.total + ' purchased sessions' : ' · Course association not yet recorded'}</p>
      <div class="vo-journey-grid">${p.lessons.map(l => { const key = p.course_key + ':' + l.objective_id; return `<article class="vo-journey-lesson vo-journey-${l.state}">
        <button type="button" class="vo-journey-flip" data-journey-flip="${esc(key)}" aria-expanded="${expanded.has(key)}" aria-label="Lesson ${l.number}: ${esc(l.title)}. ${labels[l.state]}. Flip card">
        <span class="vo-journey-inner"><span class="vo-journey-face"><span class="vo-journey-status">${labels[l.state]} · Lesson ${l.number}</span><strong>${esc(l.title)}</strong><span>${esc(l.objective)}</span>${l.class ? '<span>Class: ' + esc(new Date(l.class.starts_at).toLocaleString()) + ' · ' + esc(l.class.status) + '</span>' : ''}<span class="vo-journey-hint">Power Expressions & practice ↻</span></span>
        <span class="vo-journey-face vo-journey-back"><strong>Power Expressions</strong><span>${l.power_expressions.map(esc).join(' · ') || 'Your teacher will introduce expressions in class.'}</span><span>${l.activities.map(esc).join(' · ')}</span><span class="vo-journey-hint">Back to your objective ↺</span></span></span></button>
        <details data-lesson-details="${esc(key)}" ${details.has(key) ? 'open' : ''}><summary>Lesson activities, materials & feedback</summary>
          <p>${esc(l.success_criteria)}</p><ol>${(l.steps || []).map(s => `<li><strong>${esc(s.stage)}:</strong> ${esc(s.activity)}</li>`).join('')}</ol>
          <h5>Materials</h5>${l.materials.length ? `<ul>${l.materials.map(m => `<li><a href="#materials" data-platform-view="materials">${esc(m.title)}</a></li>`).join('')}</ul>` : '<p>No material linked to this lesson.</p>'}
          <h5>Practice activities</h5>${l.exercises.length ? `<ul>${l.exercises.map(e => `<li><a href="#exercises" data-platform-view="exercises">${esc(e.title)}</a> · ${e.submitted ? 'Submitted' : e.started ? 'In Progress' : 'Assigned'}${e.feedback ? '<p><strong>Released feedback:</strong> ' + esc(e.feedback.message) + '</p>' : ''}</li>`).join('')}</ul>` : '<p>No published activity assigned to this lesson.</p>'}
          ${l.state === 'completed' ? '<p>Completion is recorded by your teacher or by a completed class with verified attendance.</p>' : '<p>Submitting practice records activity progress; your teacher records lesson completion.</p>'}
        </details></article>` }).join('')}</div></section>`).join('')}`
      target.querySelector('[data-journey-refresh]').onclick = () => refresh(true)
      target.querySelectorAll('[data-journey-flip]').forEach(b => { b.onclick = () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true')) })
    } catch (e) {
      if (active()) {
        const s = target.querySelector('[data-journey-status]')
        if (s) s.textContent = e.message
        else { target.innerHTML = '<p role="alert"></p><button type="button">Retry Journey</button>'; target.querySelector('p').textContent = e.message; target.querySelector('button').onclick = () => refresh(true) }
      }
    } finally { pending = false }
  }
  const focus = () => { if (!active()) { cleanup(); return }; if (!document.hidden) refresh() }
  const cleanup = () => { clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); window.removeEventListener('academic-progress-changed', focus) }
  window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus); window.addEventListener('academic-progress-changed', focus)
  timer = setInterval(() => active() ? focus() : cleanup(), 30000)
  await refresh()
  return cleanup
}
