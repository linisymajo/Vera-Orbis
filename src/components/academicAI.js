import { requestAcademicDraft, listAcademicDrafts, saveAcademicDraft, approveAcademicDraft, academicAIGenerationEnabled } from '../lib/academicAI.js'
const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
const names={learning_plan:'Learning Architect',exercise:'Exercise Creator',challenge:'Challenge Manager',feedback:'Feedback Assistant'}

export async function mountAcademicAI(panel,client,{exerciseOnly=false,onUseExercise}={}) {
  const [students,submissions]=await Promise.all([
    client.from('profiles').select('id,name,language,level').order('name').limit(1000),
    client.from('exercise_attempts').select('id,submitted_at,exercise_assignments!inner(student_id)').order('submitted_at',{ascending:false}).limit(100)
  ])
  if(students.error){panel.innerHTML='<p role="alert">Authorized students could not be loaded.</p>';return}
  panel.innerHTML=`<section class="teacher-form-card"><h3>${exerciseOnly?'Generate an exercise with AI':'AI academic assistants'}</h3><p>Listen → Repeat → Personalize → Use. Suggestions remain editable drafts until you review them. Student consent and a configured server provider are required.</p><form data-ai-request><label>Find student<input type="search" data-ai-student-search placeholder="Search name or language"></label><label>Student<select name="studentId" required><option value="">Choose a student</option>${(students.data||[]).map(s=>`<option value="${esc(s.id)}" data-search="${esc(`${s.name} ${s.language||''}`.toLowerCase())}">${esc(s.name)} · ${esc(s.language||'Unknown language')}</option>`).join('')}</select></label><label>Assistant<select name="kind">${Object.entries(names).filter(([kind])=>!exerciseOnly||kind==='exercise').map(([kind,name])=>`<option value="${kind}">${name}</option>`).join('')}</select></label><label data-ai-attempt-label hidden>Saved exercise submission<select name="attemptId"><option value="">Choose submission</option></select></label><label>Learning goal, topic, activity type, level and any requirements<textarea name="brief" rows="4" maxlength="2000" required placeholder="Prepare practical expressions for a first meeting. State unknown information as unknown."></textarea></label><button type="submit">Generate editable draft</button><p data-ai-status role="status" aria-live="polite"></p></form></section><section data-ai-drafts></section>`
  const request=panel.querySelector('[data-ai-request]')
  if (!academicAIGenerationEnabled()) {
    request.querySelector('[type="submit"]').disabled = true
    request.querySelector('[data-ai-status]').textContent = 'AI generation is disabled. A configured and verified provider is required.'
  }
  function filterAttempts(){
    const items=(submissions.error?[]:submissions.data||[]).filter(s=>s.exercise_assignments?.student_id===request.elements.studentId.value)
    request.elements.attemptId.innerHTML='<option value="">Choose submission</option>'+items.map(s=>`<option value="${esc(s.id)}">${esc(new Date(s.submitted_at).toLocaleString())}</option>`).join('')
    request.querySelector('[data-ai-attempt-label]').hidden=request.elements.kind.value!=='feedback'
  }
  request.elements.kind.onchange=filterAttempts
  request.elements.studentId.onchange=filterAttempts
  request.querySelector('[data-ai-student-search]').oninput=event=>{
    for(const option of request.elements.studentId.options)if(option.value)option.hidden=!option.dataset.search.includes(event.target.value.toLowerCase())
  }
  let drafts=[]
  async function refresh(){
    try{drafts=await listAcademicDrafts(client);renderDrafts()}
    catch(error){panel.querySelector('[data-ai-drafts]').innerHTML=`<p role="status">AI drafts unavailable: ${esc(error.message)}</p>`}
  }
  function renderDrafts(){
    panel.querySelector('[data-ai-drafts]').innerHTML=drafts.filter(d=>!exerciseOnly||d.kind==='exercise').map(d=>`<form class="teacher-form-card" data-ai-draft="${esc(d.id)}"><p>${esc(names[d.kind])} · ${esc(d.status)}</p><label>Title<input name="title" value="${esc(d.content.title)}" required maxlength="160"></label><label>Objective<textarea name="objective" required>${esc(d.content.objective)}</textarea></label><label>Language<input name="language" value="${esc(d.content.language)}" required></label><label>Level<input name="level" value="${esc(d.content.level)}" required></label>${(d.content.steps||[]).map((step,i)=>`<label>${esc(step.stage)}<textarea name="stage-${i}" required>${esc(step.activity)}</textarea></label>`).join('')}${(d.content.questions||[]).map((q,i)=>`<fieldset><legend>Question ${i+1}</legend><label>Prompt<textarea name="prompt-${i}" required>${esc(q.prompt)}</textarea></label>${q.options?.length?`<label>Options (one per line)<textarea name="options-${i}">${esc(q.options.join('\n'))}</textarea></label>`:''}${q.answer!=null?`<label>Private answer<input name="answer-${i}" value="${esc(q.answer)}"></label>`:''}</fieldset>`).join('')}${d.content.feedback!=null?`<label>Suggested feedback<textarea name="feedback" rows="5">${esc(d.content.feedback)}</textarea></label>`:''}<button type="submit" value="save">Save edited draft</button><button type="submit" value="approve">Approve reviewed draft</button>${d.kind==='exercise'&&d.status==='approved'&&onUseExercise?'<button type="button" data-use-approved-exercise>Open approved exercise in Studio</button>':''}<p data-ai-review-status role="status"></p></form>`).join('')||'<p>No saved AI drafts yet.</p>'
    panel.querySelectorAll('[data-ai-draft]').forEach(form=>{
      form.onsubmit=async event=>{
        event.preventDefault();const button=event.submitter;button.disabled=true
        const d=drafts.find(d=>d.id===form.dataset.aiDraft)
        const content=structuredClone(d.content)
        for(const key of ['title','objective','language','level','feedback'])if(form.elements[key])content[key]=form.elements[key].value.trim()
        content.steps.forEach((step,i)=>{step.activity=form.elements[`stage-${i}`].value.trim()})
        content.questions.forEach((q,i)=>{q.prompt=form.elements[`prompt-${i}`].value.trim();if(form.elements[`options-${i}`])q.options=form.elements[`options-${i}`].value.split('\n').map(s=>s.trim()).filter(Boolean);if(form.elements[`answer-${i}`])q.answer=form.elements[`answer-${i}`].value.trim()})
        try{const fn=button.value==='approve'?approveAcademicDraft:saveAcademicDraft;await fn(client,{id:d.id,content,kind:d.kind});await refresh()}
        catch(error){form.querySelector('[data-ai-review-status]').textContent=error.message}finally{button.disabled=false}
      }
      form.querySelector('[data-use-approved-exercise]')?.addEventListener('click',()=>{
        const d=drafts.find(d=>d.id===form.dataset.aiDraft)
        // Use persisted approved content. Unsaved edits must be reviewed again.
        onUseExercise({title:d.content.title,language:d.content.language,level:d.content.level,objective:d.content.objective,instructions:d.content.steps.map(s=>`${s.stage}: ${s.activity}`).join('\n'),exercise_type:d.content.exercise_type,questions:d.content.questions,settings:{max_attempts:1}})
      })
    })
  }
  request.onsubmit=async event=>{
    event.preventDefault();if(!academicAIGenerationEnabled())return;const button=event.submitter;button.disabled=true
    const status=request.querySelector('[data-ai-status]');status.textContent='Preparing an authorized academic draft...'
    try{await requestAcademicDraft(client,{kind:request.elements.kind.value,studentId:request.elements.studentId.value,brief:request.elements.brief.value,attemptId:request.elements.kind.value==='feedback'?request.elements.attemptId.value:null});status.textContent='Draft saved for review.';await refresh()}
    catch(error){status.textContent=error.message}finally{button.disabled=false}
  }
  await refresh()
}
