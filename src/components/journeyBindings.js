import { saveJourneyBinding } from '../lib/learningJourney.js'
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const unavailable = new WeakSet()
export async function mountJourneyBindings(target, client, version) {
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_ACADEMIC_CONTEXT_READY !== 'true') unavailable.add(client)
  if (unavailable.has(client)) { target.textContent = 'Course and resource links await the reviewed Journey database release.'; return }
  const [b, opts] = await Promise.all([client.rpc('get_learning_journey_binding', { p_version_id: version.id }), client.rpc('get_learning_journey_options', { p_student_id: version.student_id })])
  if (!target.isConnected) return
  if (b.error || opts.error) {
    if ([b.error?.code, opts.error?.code].some(c => ['PGRST202', '42883'].includes(c))) unavailable.add(client)
    target.textContent = 'Journey resource links are unavailable. Saved plans and exercises remain intact.'; return
  }
  let binding = b.data
  const materials = opts.data.materials.filter(m => !m.language || m.language === version.content.language)
  target.innerHTML = `<details><summary>Link course, actual classes and private materials to this Journey</summary><form data-journey-bindings>
    <p>These links synchronize with this student's published Journey. A past date never counts as completion. Record actual class completion and attendance in Calendar, or record objective completion below.</p>
    <label>Purchased course<select name="package"><option value="">Not associated with a purchased course</option>${opts.data.packages.map(p => `<option value="${esc(p.id)}" ${p.id === binding.package_assignment_id ? 'selected' : ''}>${esc(p.name)} · ${p.total} sessions</option>`).join('')}</select></label>
    ${version.content.objectives.map((o, i) => { const l = binding.lessons?.[o.id] || {}; return `<fieldset data-journey-objective="${esc(o.id)}"><legend>Lesson ${i + 1}: ${esc(o.title)}</legend>
      <label>Actual scheduled/completed class<select data-journey-class><option value="">No linked class</option>${opts.data.classes.map(c => `<option value="${esc(c.id)}" ${c.id === l.class_id ? 'selected' : ''}>${esc(c.title)} · ${esc(new Date(c.starts_at).toLocaleDateString())} · ${esc(c.status)}</option>`).join('')}</select></label>
      <label>Assigned materials (select one or more)<select data-journey-materials multiple size="${Math.max(2, Math.min(materials.length, 5))}">${materials.map(m => `<option value="${esc(m.id)}" ${(l.material_ids || []).includes(m.id) ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select></label></fieldset>` }).join('')}
    <button type="submit" class="btn-studio-secondary">Save Journey links</button><p role="status" data-journey-binding-status></p></form></details>`
  const form = target.querySelector('form')
  form.onsubmit = async e => {
    e.preventDefault(); const button = form.querySelector('button'); button.disabled = true
    const status = form.querySelector('[data-journey-binding-status]')
    try {
      const lessons = Object.fromEntries([...form.querySelectorAll('[data-journey-objective]')].map(f => [f.dataset.journeyObjective, { class_id: f.querySelector('[data-journey-class]').value || null, material_ids: [...f.querySelector('[data-journey-materials]').selectedOptions].map(o => o.value) }]))
      binding = await saveJourneyBinding(client, version.id, { ...binding, package_assignment_id: form.elements.package.value || null }, lessons)
      status.textContent = 'Journey links saved. Published lessons update on the student’s next refresh; earlier link revisions remain in history.'
    } catch (e) { status.textContent = e.message } finally { button.disabled = false }
  }
}
