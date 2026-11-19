import { loadStudentAcademicContext, saveStudentContextReview, academicContextProviderStatus, academicContextCapabilities, processAcademicMaterial, requestStudentAwareAcademic, exerciseStudioDraftFromAI, loadAcademicProvenance } from '../lib/studentAcademicContext.js'
import { remainingLessons } from '../../supabase/functions/academic-ai/academic-context.js'
import { savePreparedPlan } from '../lib/academicPreparation.js'
import { prepareLessonExercise } from '../lib/academicPreparation.js'
import { listLearningPlanVersions } from '../lib/learningPlans.js'
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const formats = { multiple_choice: 'Multiple choice / cultural scenarios', matching: 'Matching expressions', fill_blank: 'Fill in the blanks', image_vocabulary: 'Vocabulary / Power Expressions', ordering: 'Sentence building', reading: 'Reading / storytelling', listening: 'Listening with source media', open_question: 'Open response', writing: 'Writing', conversation: 'Speaking / practical challenge', pronunciation: 'Listen and repeat', true_false: 'True or false' }
export async function mountStudentAcademicAI(target, client, { studentId = null, kind = 'learning_plan', onSaved, onUseExercise, lesson = null } = {}) {
  const initial = document.createElement('section'); initial.className = 'teacher-form-card'; initial.innerHTML = '<h3>Student Academic AI</h3><p role="status">Loading authorized academic context…</p>'; target.replaceChildren(initial)
  if (!studentId) {
    const students = await client.from('profiles').select('id,name,language').order('name').limit(1000)
    if (!target.contains(initial)) return
    if (students.error) { initial.innerHTML = '<p role="alert">Authorized students unavailable.</p>'; return }
    initial.innerHTML = `<label>Find student<input type="search" data-context-search></label><label>Student<select data-context-student><option value="">Choose a student</option>${(students.data || []).map(s => `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.language)}</option>`).join('')}</select></label><div data-selected-context></div>`
    const select = initial.querySelector('select')
    initial.querySelector('input').oninput = e => { for (const o of select.options) if (o.value) o.hidden = !o.text.toLowerCase().includes(e.target.value.toLowerCase()) }
    select.onchange = () => { const host = initial.querySelector('[data-selected-context]'); if (select.value) mountStudentAcademicAI(host, client, { studentId: select.value, kind, onSaved, onUseExercise, lesson }); else host.replaceChildren() }
    return
  }
  let context
  try { context = await loadStudentAcademicContext(client, studentId) }
  catch (e) { if (target.contains(initial)) initial.innerHTML = `<h3>Student Academic AI</h3><p role="status">${esc(e.message)}</p>`; return }
  if (!target.contains(initial)) return
  const p = context.profile, r = context.review?.settings, onePackage = context.packages.length === 1 ? context.packages[0] : null
  let reviewRevision = context.review?.revision || 0, dirty = !r || context.sources.some(source => context.review?.source_snapshot?.[source.ref] !== source.fingerprint), provider = { enabled: false, message: 'Checking provider availability…' }, pending = false
  const s = r || { language: p.language, level: p.level, goal: p.goal || '', total: onePackage?.class_count ?? p.recorded_total ?? '', completed: context.verified_completed ?? '', duration: onePackage?.duration_minutes || 60, priorities: '', excluded: [], corrections: {}, confirmed: false }
  const plans = context.sources.filter(s => s.kind === 'plan')
  const materialProcessing = academicContextCapabilities().materials
  initial.innerHTML = `<span class="vo-section-kicker">STUDENT-AWARE ACADEMIC ASSISTANT</span><h3>${kind === 'exercise' ? 'Generate Exercises with AI' : 'Generate Personalized Learning Plan'}</h3>
    <p>Review the student's evidence and confirm the remaining course. Generated suggestions stay private until your explicit review and publication.</p>
    <p>Recorded sessions completed: ${esc(p.recorded_completed ?? 'unknown')}. Completed with attendance verified: ${esc(context.verified_completed)}. Purchased packages: ${context.packages.map(p => `${esc(p.name)} (${p.class_count} sessions; ${p.classes_consumed} consumed)`).join(', ') || 'not recorded'}.</p>
    <p>Purchased/recorded counters and attendance are different records. A scheduled class does not prove completion. A missing response is unknown evidence.</p>
    <form data-academic-review><div class="vo-plan-meta-grid">
    <label>Language<select name="language">${['English', 'French', 'Mandarin'].map(x => `<option ${x === s.language ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label>Confirmed CEFR level<select name="level">${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(x => `<option ${x === s.level ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label>Total course sessions<input name="total" type="number" min="1" max="120" value="${esc(s.total)}" required></label>
    <label>Sessions already completed<input name="completed" type="number" min="0" max="120" value="${esc(s.completed)}" required></label>
    <label>Session duration (minutes)<input name="duration" type="number" min="20" max="120" value="${esc(s.duration)}" required></label></div>
    <p>Remaining sessions: <output data-context-remaining></output></p>
    <label>Final communicative objective<textarea name="goal" maxlength="1000" required>${esc(s.goal)}</textarea></label>
    <label>Special priorities<textarea name="priorities" maxlength="2000">${esc(s.priorities)}</textarea></label>
    <details data-review-ai-context><summary>Review AI Context (${context.sources.length} sources)</summary>
    <p>These are source records, not AI analysis. Corrections are saved as your annotations; original records are preserved. Reinforcement recommendations require a configured provider and supporting evidence.</p>
    ${context.sources.map((source, i) => `<fieldset data-context-source="${esc(source.ref)}"><legend>${esc(source.title)} · ${esc(source.kind)}</legend>
      <p>${esc(source.evidence_state)}${source.recorded_at ? ' · ' + esc(new Date(source.recorded_at).toLocaleDateString()) : ''}</p>
      <label><input type="checkbox" data-include-source="${i}" ${s.excluded.includes(source.ref) || (r && !Object.hasOwn(context.review.source_snapshot || {}, source.ref)) ? '' : 'checked'}>Include this source</label>
      <details><summary>Read source evidence</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(source.payload, null, 2))}</pre></details>
      <label>Correction / teacher annotation<textarea data-source-correction="${i}" maxlength="2000">${esc(s.corrections[source.ref] || '')}</textarea></label>
      ${source.kind === 'material' ? `<button type="button" data-process-material="${esc(source.payload.material_id)}">${source.evidence_state === 'ready' ? 'Reprocess document' : 'Extract document text'}</button><p>${source.evidence_state === 'ocr_required' ? 'Scanned PDF: OCR is required; no text was invented.' : source.evidence_state === 'unsupported' ? 'Unsupported format or no readable text.' : 'Extraction stays on the server. Private file bytes are not sent to AI.'}</p>` : ''}
    </fieldset>`).join('')}</details>
    <label><input type="checkbox" name="confirmed" ${s.confirmed ? 'checked' : ''} required>I reviewed the sources and confirm these course counts and settings.</label>
    <button type="submit" class="btn-studio-secondary">Save reviewed context</button></form>
    ${kind === 'exercise' ? `<label>Activity format<select data-context-exercise-type>${Object.entries(formats).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label>Saved plan lesson<select data-context-lesson><option value="">Use reviewed sources and objective</option>${plans.flatMap(p => p.payload.objectives.map((o, i) => `<option value="${esc(p.ref.slice(5))}|${i}">${esc(p.title)} · ${i + 1}: ${esc(o.title)}</option>`)).join('')}</select></label>` : ''}
    <p role="status" data-context-provider>${esc(provider.message)}</p><button type="button" class="btn-studio-primary" data-generate-student-aware disabled>${kind === 'exercise' ? 'Generate editable exercise cards' : 'Generate remaining lesson plan'}</button>
    ${kind === 'learning_plan' ? '<button type="button" class="btn-studio-secondary" data-prepare-manual>Prepare remaining lesson cards without AI</button><p>Deterministic planning template: uses confirmed lesson counts and goals, without analyzing student performance or inferring document content. Review and complete every lesson before approval.</p>' : ''}
    <p role="status" aria-live="polite" data-context-status></p><div data-context-result></div><section data-context-saved-exercises></section>`
  const form = initial.querySelector('form'), status = initial.querySelector('[data-context-status]'), generate = initial.querySelector('[data-generate-student-aware]')
  const settings = () => ({ language: form.elements.language.value, level: form.elements.level.value, goal: form.elements.goal.value.trim(), total: Number(form.elements.total.value), completed: Number(form.elements.completed.value), duration: Number(form.elements.duration.value), priorities: form.elements.priorities.value.trim(), confirmed: form.elements.confirmed.checked,
    excluded: context.sources.filter((_, i) => !form.querySelector(`[data-include-source="${i}"]`).checked).map(s => s.ref), corrections: Object.fromEntries(context.sources.map((s, i) => [s.ref, form.querySelector(`[data-source-correction="${i}"]`).value.trim()]).filter(([, v]) => v)) })
  const update = () => {
    const n = remainingLessons(settings()); initial.querySelector('[data-context-remaining]').textContent = Number.isInteger(n) && n >= 0 ? n : 'confirm counts'
    generate.disabled = pending || dirty || !provider.enabled || !context.ai_consent || n < 1 || n > 12
    const prepare = initial.querySelector('[data-prepare-manual]'); if (prepare) prepare.disabled = pending || dirty || n < 1 || n > 12
  }
  form.oninput = () => { dirty = true; update() }
  let preparationRequest = crypto.randomUUID()
  initial.querySelector('[data-prepare-manual]')?.addEventListener('click', async () => {
    pending = true; update()
    try {
      const result = await savePreparedPlan(client, studentId, settings(), context.sources, preparationRequest)
      if (onSaved) await onSaved(result)
      else { const a = document.createElement('a'); a.href = `/teacher.html?module=learning-plans&academic_student=${encodeURIComponent(studentId)}&academic_version=${encodeURIComponent(result.id)}`; a.textContent = 'Edit prepared lesson cards'; initial.querySelector('[data-context-result]').replaceChildren(a) }
      preparationRequest = crypto.randomUUID(); status.textContent = 'Deterministic template saved privately. No AI call was made. Review and personalize the lesson cards.'
    } catch (e) { status.textContent = e.message } finally { pending = false; if (target.contains(initial)) update() }
  })
  form.onsubmit = async e => {
    e.preventDefault(); const btn = form.querySelector('[type=submit]'); btn.disabled = true
    try { const saved = await saveStudentContextReview(client, studentId, reviewRevision, settings(), context.sources); reviewRevision = saved.revision; dirty = false; status.textContent = 'Reviewed context saved. Original academic records were preserved.'; update() }
    catch (e) { status.textContent = e.message } finally { btn.disabled = false }
  }
  initial.querySelectorAll('[data-process-material]').forEach(btn => {
    if (!materialProcessing) { btn.disabled = true; const note = document.createElement('p'); note.textContent = 'Document text processing is temporarily unavailable. Open the original file in Materials; academic review and manual planning remain available.'; btn.after(note); return }
    btn.onclick = async () => {
    if (dirty) { status.textContent = 'Save your context changes before processing a document.'; return }
    btn.disabled = true; status.textContent = 'Extracting authorized document text locally on the server…'
    try { const indexed = await processAcademicMaterial(client, studentId, btn.dataset.processMaterial); await mountStudentAcademicAI(target, client, { studentId, kind, onSaved, onUseExercise, lesson }); const newStatus = target.querySelector('[data-context-status]'); if (newStatus) newStatus.textContent = `Document status: ${indexed.status}. Review the refreshed source before generation.` }
    catch (e) { status.textContent = e.message; btn.disabled = false }
    }
  })
  generate.onclick = async () => {
    if (generate.disabled) return
    pending = true; update(); status.textContent = 'Generating a private, source-grounded draft…'
    const choice = initial.querySelector('[data-context-lesson]')?.value
    const selectedLesson = choice ? { versionId: choice.split('|')[0], session: Number(choice.split('|')[1]) } : lesson
    try {
      const data = await requestStudentAwareAcademic(client, { studentId, kind, reviewRevision, exerciseType: initial.querySelector('[data-context-exercise-type]')?.value || null, lesson: selectedLesson })
      if (!target.contains(initial)) return
      const host = initial.querySelector('[data-context-result]'); host.innerHTML = `<p>Private draft saved. Sources supporting the suggestions:</p>${renderAcademicSources(data.sources)}`
      if (kind === 'exercise') {
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Review and edit cards in Exercise Studio'; btn.onclick = async () => {
          const draft = exerciseStudioDraftFromAI(data.result.content, data.requestId, data.sources)
          if (selectedLesson) {
            try { const version = (await listLearningPlanVersions(client, studentId)).find(v => v.id === selectedLesson.versionId); const prepared = prepareLessonExercise(version, selectedLesson.session, studentId); draft.settings.learning_journey = prepared.settings.learning_journey }
            catch (e) { status.textContent = e.message; return }
          }
          onUseExercise?.(draft, selectedLesson, studentId)
        }; host.append(btn)
      } else if (onSaved) await onSaved(data.result)
      else { const link = document.createElement('a'); link.href = `/teacher.html?module=learning-plans&academic_student=${encodeURIComponent(studentId)}&academic_version=${encodeURIComponent(data.result.id)}`; link.textContent = 'Open and edit this saved lesson plan'; host.append(link) }
      status.textContent = 'Draft saved. Review and publish explicitly; nothing was assigned automatically.'
    } catch (e) { status.textContent = e.message + ' No automatic retry was made.' }
    finally { pending = false; if (target.contains(initial)) update() }
  }
  provider = await academicContextProviderStatus(client)
  if (!target.contains(initial)) return
  initial.querySelector('[data-context-provider]').textContent = provider.message + (!context.ai_consent ? ' Student AI consent is not currently granted.' : '')
  update()
  if (kind === 'exercise') {
    const drafts = await client.from('ai_academic_drafts').select('id,request_id,status,content').eq('student_id', studentId).eq('kind', 'exercise').order('created_at', { ascending: false }).limit(20)
    if (!target.contains(initial)) return
    const host = initial.querySelector('[data-context-saved-exercises]')
    if (drafts.error) { host.innerHTML = '<p>Saved exercise recommendations could not be loaded. Your records are preserved.</p>'; return }
    host.innerHTML = `<h4>Saved exercise recommendations</h4>${(drafts.data || []).map((d, i) => `<button type="button" data-reopen-academic-exercise="${i}">${esc(d.content.title)} · ${esc(d.status)}</button>`).join('') || '<p>No saved recommendations for this student.</p>'}`
    host.querySelectorAll('[data-reopen-academic-exercise]').forEach(btn => btn.onclick = async () => {
      const draft = drafts.data[Number(btn.dataset.reopenAcademicExercise)]; btn.disabled = true
      try { const p = await loadAcademicProvenance(client, draft.id); onUseExercise?.(exerciseStudioDraftFromAI(draft.content, p?.request_id || draft.request_id, p?.citations || [])) }
      catch (e) { status.textContent = e.message; btn.disabled = false }
    })
  }
}
export function renderAcademicSources(sources = []) {
  return `<ul>${sources.map(s => `<li>${esc(s.title || s.handle || s.source)}${s.locator ? ' · ' + esc(s.locator) : ''} <span>(Source state: ${esc(s.evidence_state || 'recorded reference')})</span>${s.teacher_correction ? '<p>Reviewed teacher annotation: ' + esc(s.teacher_correction) + '</p>' : ''}${s.reason ? '<p>AI rationale — teacher review required: ' + esc(s.reason) + '</p>' : ''}</li>`).join('')}</ul>`
}
const sourceLoads = new WeakMap()
export async function mountAcademicSourceHistory(target, client, resultId) {
  const load = {}; sourceLoads.set(target, load)
  try { const p = await loadAcademicProvenance(client, resultId); if (target.isConnected && sourceLoads.get(target) === load && p) target.innerHTML = `<details><summary>Review sources used (generation snapshot)</summary>${renderAcademicSources(p.citations || p.sources)}</details>` } catch { /* Older manual versions have no AI provenance. */ }
}
