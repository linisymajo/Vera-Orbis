import { PEDAGOGICAL_OBJECTIVES, DEFAULT_PEDAGOGICAL_OBJECTIVE, isPedagogicalObjective } from '../../supabase/functions/academic-ai/pedagogy.js'
import { LANGUAGES, LEVELS } from '../../supabase/functions/academic-ai/learning-architect.js'
import { learningArchitectEnabled, loadLearningArchitectProfile, requestLearningArchitect } from '../lib/learningArchitect.js'

const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
const labels = { title: 'Session title', power_expressions: 'Power Expressions · one per line', vocabulary: 'Useful vocabulary · one per line', contextual_input: 'Listening or contextual input', guided_practice: 'Guided practice', personalization: 'Student personalization', task: 'Real-life speaking or writing task', activities: 'Suggested activities · one per line', homework: 'Homework or challenge', checkpoint: 'Review / assessment checkpoint' }
const lists = ['power_expressions', 'vocabulary', 'activities']
export function architectSessionFields(content, i) {
  const s = content.architect?.sessions[i]
  if (!s) return ''
  return `<div class="vo-plan-meta-grid">${Object.entries(labels).map(([k, label]) => `<label>${label}<textarea name="architect-${i}-${k}" maxlength="${lists.includes(k) ? 2400 : k === 'title' ? 160 : 600}" rows="2">${esc(lists.includes(k) ? s[k].join('\n') : s[k])}</textarea></label>`).join('')}</div>
    <div class="vo-plan-meta-grid">${s.minutes.map((n, j) => `<label>${['Listen', 'Repeat', 'Personalize', 'Use'][j]} minutes<input name="architect-${i}-minutes-${j}" type="number" min="1" max="120" value="${n}"></label>`).join('')}</div>
    <button type="button" class="btn-studio-secondary" data-architect-regenerate="${i}">Regenerate this session</button>
    <p class="teacher-meta">Save edits before regeneration. This replaces only this session in the saved private draft. Generic objective: ${esc(isPedagogicalObjective(content.architect.goal) ? content.architect.goal : DEFAULT_PEDAGOGICAL_OBJECTIVE)}. Saved lesson text and private goal edits are never sent.</p>`
}
export function architectOverviewFields(content) {
  const a = content.architect
  if (!a) return ''
  return `<fieldset><legend>Student overview · ${a.provisional ? 'Provisional — teacher review required' : 'Evidence-informed draft'}</legend>
    <p>Known: ${esc(a.known.join(', ') || 'Teacher-selected goals and level only')}.</p><p>Missing: ${esc(a.missing.join(', ') || 'No listed gaps')}.</p>
    ${['goal', 'needs', 'approach', 'adaptations', 'revisit'].map(k => `<label>${esc(k.replaceAll('_', ' '))}<textarea name="architect-${k}" maxlength="2000">${esc(Array.isArray(a[k]) ? a[k].join('\n') : a[k])}</textarea></label>`).join('')}
    <label>Class duration (minutes)<input type="number" min="20" max="120" name="architect-duration" value="${a.session_minutes}"></label></fieldset>`
}
export function readArchitectFields(form, content) {
  if (!content.architect) return {}
  const a = structuredClone(content.architect)
  for (const k of ['goal', 'needs', 'approach', 'adaptations', 'revisit']) a[k] = ['adaptations', 'revisit'].includes(k) ? form.elements['architect-' + k].value.split('\n').map(x => x.trim()).filter(Boolean) : form.elements['architect-' + k].value
  a.session_minutes = Number(form.elements['architect-duration'].value)
  a.sessions.forEach((s, i) => {
    for (const k of Object.keys(labels)) s[k] = lists.includes(k) ? form.elements[`architect-${i}-${k}`].value.split('\n').map(x => x.trim()).filter(Boolean) : form.elements[`architect-${i}-${k}`].value
    s.minutes = s.minutes.map((_, j) => Number(form.elements[`architect-${i}-minutes-${j}`].value))
  })
  return { architect: a }
}
export function architectSessionReadOnly(content, i) {
  const s = content.architect?.sessions[i]
  if (!s) return ''
  return `<h4>Session ${i + 1}: ${esc(s.title)}</h4><dl>${Object.entries(labels).filter(([k]) => k !== 'title').map(([k, label]) => `<dt><strong>${esc(label.split(' · ')[0])}</strong></dt><dd>${esc(lists.includes(k) ? s[k].join(' · ') : s[k])}</dd>`).join('')}</dl><p>${content.architect.session_minutes} minutes · ${s.minutes.join(' / ')} minutes across Listen, Repeat, Personalize, Use.</p>`
}
export async function regenerateArchitectSession(client, version, session) {
  const a = version.content.architect
  return requestLearningArchitect(client, { studentId: version.student_id, language: version.content.language, level: version.content.level, goal: isPedagogicalObjective(a.goal) ? a.goal : DEFAULT_PEDAGOGICAL_OBJECTIVE, classes: a.sessions.length, duration: a.session_minutes, regenerate: { versionId: version.id, revision: version.revision, session } })
}

export async function mountLearningArchitect(target, client, { studentId, onSaved, enabled = learningArchitectEnabled() }) {
  target.innerHTML = `<section class="teacher-form-card vo-plan-ai-card"><span class="vo-section-kicker">AI LEARNING ARCHITECT</span><h3>Generate a personalized study plan</h3><p>Power Expressions → Listen → Repeat → Personalize → Use. Teacher approval and publication are separate actions.</p><p role="status" data-architect-profile>Loading authorized academic profile…</p><form data-architect-generate>
    <div class="vo-plan-meta-grid"><label>Target language<select name="language" required><option value="">Choose language</option>${LANGUAGES.map(x => `<option>${x}</option>`).join('')}</select></label>
    <label>CEFR level<select name="level" required><option value="">Confirm level</option>${LEVELS.map(x => `<option>${x}</option>`).join('')}</select></label>
    <label>Number of classes<input name="classes" type="number" min="1" max="12" value="6" required></label><label>Class duration (minutes)<input name="duration" type="number" min="20" max="120" value="60" required></label></div>
    <label>Broad communicative objective<select name="goal" required>${PEDAGOGICAL_OBJECTIVES.map(x => `<option>${esc(x.value)}</option>`).join('')}</select></label><p>Gemini receives only general settings and fixed practice areas. Identity, academic records and manual edits stay in Supabase. Regeneration never sends saved lesson text.</p><button type="submit" class="btn-studio-primary" disabled>Generate Plan</button><p role="status" aria-live="polite" data-architect-status>${enabled ? '' : 'AI generation is awaiting secure provider activation. Manual plans remain available.'}</p></form></section>`
  const form = target.querySelector('form'), profileStatus = target.querySelector('[data-architect-profile]'), status = target.querySelector('[data-architect-status]'), button = form.querySelector('button')
  let profile
  try {
    profile = await loadLearningArchitectProfile(client, studentId)
    if (!target.contains(form)) return
    form.elements.language.value = LANGUAGES.includes(profile.language) ? profile.language : ''
    form.elements.level.value = LEVELS.includes(profile.level) ? profile.level : ''
    form.elements.goal.value = isPedagogicalObjective(profile.goal) ? profile.goal : DEFAULT_PEDAGOGICAL_OBJECTIVE
    profileStatus.textContent = `Academic profile: ${profile.language || 'language not recorded'} · ${profile.level || 'level not recorded'}. ${profile.ai_consent ? 'AI consent granted.' : 'Student AI consent is required.'} Last 24 hours: ${profile.request_count_24h || 0}/10 requests · ${profile.input_tokens_24h || 0} input / ${profile.output_tokens_24h || 0} output tokens. Currency cost is available in the provider project billing dashboard.`
    button.disabled = !enabled || !profile.ai_consent
  } catch { profileStatus.textContent = 'Academic profile integration is not yet ready. Manual learning plans remain available.' }
  form.onsubmit = async event => {
    event.preventDefault()
    if (!enabled || !profile?.ai_consent || button.disabled) return
    const controls = [...form.querySelectorAll('input,select,textarea,button')]
    controls.forEach(c => { c.disabled = true }); status.textContent = 'Generating and validating your private draft…'
    try {
      const version = await requestLearningArchitect(client, { studentId, language: form.elements.language.value, level: form.elements.level.value, goal: form.elements.goal.value, classes: Number(form.elements.classes.value), duration: Number(form.elements.duration.value) })
      await onSaved(version)
      if (target.contains(form)) status.textContent = 'Plan draft saved. Review every session before approval and publication.'
    } catch (error) { status.textContent = error.message + ' A new explicit generation attempt consumes another request allowance; there is no automatic retry.' }
    finally { controls.forEach(c => { c.disabled = false }); button.disabled = !enabled || !profile?.ai_consent }
  }
}
