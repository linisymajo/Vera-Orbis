import { academicAIGenerationEnabled, requestAcademicDraft, approveAcademicDraft } from '../lib/academicAI.js'

export function setupExerciseAIReview(form,client,{studentId,attemptId}) {
  const host=document.createElement('details')
  host.className='experience-ai-review'
  host.innerHTML='<summary>AI feedback draft &amp; teacher approval</summary><p data-ai-review-status role="status">AI generation is disabled. Manual teacher feedback remains available.</p><button class="teacher-secondary-button" type="button" data-generate-feedback disabled>Generate private feedback draft</button><button class="teacher-secondary-button" type="button" data-use-feedback hidden>Review this suggestion in the editor</button><button class="teacher-secondary-button" type="button" data-approve-feedback hidden>Approve the edited AI draft</button><button class="teacher-secondary-button" type="button" data-reject-feedback hidden>Reject AI suggestion</button>'
  form.querySelector('[data-feedback-history]').before(host)
  const status=host.querySelector('[data-ai-review-status]'),generate=host.querySelector('[data-generate-feedback]')
  let draft=null,busy=false
  const configured=academicAIGenerationEnabled()
  generate.disabled=!configured
  if(configured)status.textContent='Generation also requires server provider configuration, student consent and an available quota. Suggestions remain private until you approve and release them.'
  generate.onclick=async()=>{
    if(busy||!configured)return
    busy=true;generate.disabled=true
    try{
      draft=await requestAcademicDraft(client,{kind:'feedback',studentId,attemptId,brief:'Offer concise, specific language coaching for this saved response. Preserve valid alternative wording. Celebrate, improve, explain simply, encourage. Do not assign a grade.'})
      host.querySelector('[data-use-feedback]').hidden=false
      host.querySelector('[data-reject-feedback]').hidden=false
      status.textContent='A private AI suggestion is saved. Review it in the editor, then approve your edited version. Nothing has been sent.'
    }catch{status.textContent='AI feedback could not be generated. The saved response is awaiting teacher review; you can write manual feedback.'}
    finally{busy=false;generate.disabled=false}
  }
  host.querySelector('[data-use-feedback]').onclick=()=>{
    if(!draft)return
    if(form.elements.feedback.value.trim()&&!globalThis.confirm('Replace the feedback currently in this editor with the private AI suggestion? Saved feedback versions will be preserved.'))return
    form.elements.feedback.value=draft.content.feedback
    form.elements.feedback.dispatchEvent(new Event('input',{bubbles:true}))
    host.querySelector('[data-approve-feedback]').hidden=false
    status.textContent='Edit this suggestion before approval. Saving feedback still requires your explicit release action.'
  }
  host.querySelector('[data-approve-feedback]').onclick=async()=>{
    if(!draft||busy)return
    busy=true
    try{
      const saved=await approveAcademicDraft(client,{id:draft.id,kind:'feedback',content:{...draft.content,feedback:form.elements.feedback.value}})
      form.dataset.approvedAiDraft=saved.id
      status.textContent='Edited AI draft approved. Use Save feedback draft or Approve and send feedback to save this review.'
    }catch{status.textContent='AI approval was not confirmed. Keep editing or write manual feedback.'}
    finally{busy=false}
  }
  host.querySelector('[data-reject-feedback]').onclick=async()=>{
    if(!draft||busy)return
    busy=true
    try{
      const result=await client.rpc('review_academic_ai_draft',{p_draft_id:draft.id,p_content:draft.content,p_status:'rejected'})
      if(result.error||result.data?.status!=='rejected')throw new Error()
      delete form.dataset.approvedAiDraft;draft=null
      for(const selector of['[data-use-feedback]','[data-approve-feedback]','[data-reject-feedback]'])host.querySelector(selector).hidden=true
      status.textContent='AI suggestion rejected. Existing saved teacher feedback is preserved.'
    }catch{status.textContent='Rejection could not be confirmed. Nothing has been published.'}
    finally{busy=false}
  }
}
