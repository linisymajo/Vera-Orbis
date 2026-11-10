import { correctionSettings, DEFAULT_CORRECTION } from '../lib/exerciseExperience.js'
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderCorrectionControls() {
  return `<fieldset class="experience-correction-controls"><legend>Correction &amp; Feedback</legend>
    <label>Correction mode<select name="correction_mode"><option value="teacher_only">Teacher Only — review and release</option><option value="objective">Objective Auto-Check</option><option value="ai_draft">AI draft + teacher approval — manual review while AI is off</option><option value="ai_auto" disabled>AI automatic — unavailable until provider and safeguards are authorized</option></select></label>
    <p>Open responses are never marked wrong for using different wording. AI is currently disabled; your teacher reviews open work.</p>
    <div class="vo-form-grid-2"><label>Feedback timing<select name="correction_timing"><option value="after_submission">After submission</option><option value="immediate">Check each objective question</option></select></label>
    <label>Maximum attempts<input name="max_attempts" type="number" min="1" max="99" value="1"></label>
    <label>Retry scoring<select name="correction_scoring"><option value="first">Keep first-attempt score</option><option value="best">Best score</option><option value="penalized">Deduct points for retries</option></select></label>
    <label>Points deducted per retry<input name="retry_penalty" type="number" min="0" max="100" value="10"></label>
    <label>Reveal answers after attempt<input name="reveal_after_attempt" type="number" min="1" max="99" value="99"></label></div>
    <label class="vo-checkbox-row"><input name="retry_incorrect_only" type="checkbox">Retry incorrect questions only</label>
    <label class="vo-checkbox-row"><input name="hide_solutions_until_complete" type="checkbox" checked>Keep solutions private until the last allowed attempt</label>
    <label class="vo-checkbox-row"><input name="show_score" type="checkbox">Show objective score to students</label>
    <p>Question-specific explanations appear only when the solution may be revealed. Final grades always require teacher review.</p>
  </fieldset>`
}
export function setCorrectionControls(form,settings={}) {
  const config=correctionSettings(settings)
  for(const key of['mode','timing','scoring'])form.elements[`correction_${key}`].value=config[key]
  for(const key of['reveal_after_attempt','retry_penalty'])form.elements[key].value=config[key]
  for(const key of['retry_incorrect_only','hide_solutions_until_complete','show_score'])form.elements[key].checked=config[key]
  form.elements.max_attempts.value=settings.max_attempts||1
}
export function readCorrectionControls(form) {
  const config={...DEFAULT_CORRECTION}
  for(const key of['mode','timing','scoring'])config[key]=form.elements[`correction_${key}`].value
  for(const key of['reveal_after_attempt','retry_penalty'])config[key]=Number(form.elements[key].value)
  for(const key of['retry_incorrect_only','hide_solutions_until_complete','show_score'])config[key]=form.elements[key].checked
  return {correction:correctionSettings({correction:config}),max_attempts:Number(form.elements.max_attempts.value)}
}
export function renderQuestionExtras(question={}) {
  return `<details class="experience-question-details"><summary>Hints, explanations &amp; media</summary><label>Hint (optional)<input data-field="hint" maxlength="1000" value="${esc(question.hint)}"></label><label>Explanation after answer reveal<textarea data-field="explanation" maxlength="2000">${esc(question.explanation)}</textarea></label><label>Accepted alternatives (one per line)<textarea data-field="accepted_answers">${esc((question.accepted_answers||[]).join('\n'))}</textarea></label><label>Image HTTPS link (optional)<input data-field="image_url" type="url" value="${esc(question.image_url)}"></label></details>
    <div class="teacher-inline-actions" role="group" aria-label="Question controls"><button type="button" class="teacher-secondary-button" data-duplicate-question>Duplicate question</button><button type="button" class="teacher-secondary-button" data-question-up>Move up</button><button type="button" class="teacher-secondary-button" data-question-down>Move down</button></div>`
}
