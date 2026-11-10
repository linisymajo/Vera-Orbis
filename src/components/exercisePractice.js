import { correctionSettings, checkPreviewAnswer, supportiveMessage, loadExercisePractice, checkExerciseQuestion } from '../lib/exerciseExperience.js'
import { submitExerciseAttempt } from '../lib/academicOperations.js'
import { renderAttachmentInput, uploadFilesForForm, renderAttachmentReview, renderAttachmentRevision, setupAttachmentDownloads } from './exerciseAttachments.js'
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

function questionCard(q,index,type,policy) {
  type=q.response_type || type
  const name=`answer-${index}`
  let controls
  if(['multiple_choice','true_false'].includes(type)) controls=`<div class="vo-exercise-choices-grid">${(type==='true_false'?['True','False']:q.options || []).map(choice=>`<label class="exercise-choice vo-tactile-choice"><input required type="radio" name="${name}" value="${esc(choice)}"><span>${esc(choice)}</span></label>`).join('')}</div>`
  else if(type==='matching') controls=`<div class="vo-exercise-matching-grid">${(q.left||[]).map((left,n)=>`<label class="vo-matching-row">${esc(left)}<select required data-pair name="${name}-${n}"><option value="">Choose a match</option>${(q.right||[]).map(right=>`<option value="${esc(right)}">${esc(right)}</option>`).join('')}</select></label>`).join('')}</div>`
  else if(type==='ordering') controls=`<p>Choose blocks in order, or type your answer below.</p><div class="vo-sentence-blocks">${(q.items||[]).map((word,n)=>`<button class="vo-sentence-block-btn" type="button" data-practice-block="${n}">${esc(word)}</button>`).join('')}</div><textarea name="${name}" required maxlength="12000" aria-label="Your answer to question ${index+1}"></textarea><button type="button" class="btn-studio-secondary" data-practice-reset>Reset blocks</button>`
  else controls=`<textarea name="${name}" rows="${['writing','reading'].includes(type)?5:3}" required maxlength="12000" aria-label="Your answer to question ${index+1}" placeholder="Make this one your own..."></textarea>`
  return `<fieldset class="vo-student-question-fieldset experience-question" data-practice-question="${index}"><legend>${index+1}. ${esc(q.prompt)}</legend>
    ${q.passage?`<p class="vo-question-passage">${esc(q.passage)}</p>`:''}
    ${q.image_url && /^https:\/\//i.test(q.image_url)?`<img class="vo-question-media-img" src="${esc(q.image_url)}" alt="Activity reference" loading="lazy" referrerpolicy="no-referrer">`:''}
    ${q.audio_url && /^https:\/\//i.test(q.audio_url)?`<audio class="vo-question-media-audio" src="${esc(q.audio_url)}" controls preload="none"></audio>`:''}
    ${controls}${q.hint?(type==='image_vocabulary'?`<div class="experience-vocabulary-tip"><button type="button" class="btn-studio-secondary" data-vocabulary-flip aria-expanded="false">Flip for a hint</button><div class="experience-flip-inner"><div class="experience-flip-front" data-flip-front>Your turn. Make the expression your own.</div><div class="experience-flip-back" data-flip-back aria-hidden="true">${esc(q.hint)}</div></div></div>`:`<details class="vo-question-hint-flip"><summary>A little hint</summary><p>${esc(q.hint)}</p></details>`):''}
    ${policy.timing==='immediate'?'<button type="button" class="material-button" data-check-question>Check this answer</button>':''}
    <aside class="experience-question-feedback" data-question-feedback role="status" aria-live="polite"></aside></fieldset>`
}

export function renderPracticeActivity(item,{preview=false}={}) {
  const config=correctionSettings({correction:item.correction_settings || item.settings?.correction})
  const questions=(item.questions||[]).map((q,i)=>({...q,...Object.fromEntries(Object.entries(item.question_formats?.[i]||{}).filter(([,v])=>v!=null))}))
  return `<article class="learning-access-card exercise-activity vo-student-exercise-card exercise-experience" data-practice-card>
    <div class="vo-exercise-card-top"><p class="platform-label">${esc((item.exercise_type||'Practice').replaceAll('_',' '))}</p><span class="vo-badge vo-badge--teal" data-practice-badge>${preview?'Teacher preview':'Practice activity'}</span></div>
    <h3>${esc(item.title)}</h3><p class="vo-exercise-instructions">${esc(item.instructions||'Listen, repeat, personalize, then use it.')}</p>
    ${item.objective?`<p class="experience-learning-goal"><strong>Learning goal</strong> ${esc(item.objective)}</p>`:''}
    ${item.due_at?`<p>Due ${esc(new Date(item.due_at).toLocaleString())}</p>`:''}
    <form class="student-exercise-form" data-experience="1" data-exercise-assignment="${esc(item.assignment_id||'')}" data-attachment-mode="${esc(item.attachment_mode||item.settings?.attachment_mode||'none')}" data-allow-revisions="${Boolean(item.allow_revisions||item.settings?.allow_attachment_revisions)}" ${preview?'data-preview="true"':''} novalidate>
      <div class="experience-progress"><p data-practice-position role="status" aria-live="polite">Question 1 of ${questions.length}</p><progress max="${questions.length||1}" value="0" aria-label="Answers completed"></progress><span data-completion-count>0 answered</span></div>
      ${questions.map((q,i)=>questionCard(q,i,item.exercise_type,config)).join('')}
      <nav class="experience-question-nav" aria-label="Question navigation"><button type="button" class="btn-studio-secondary" data-question-back>Back</button><button type="button" class="material-button" data-question-next>Next</button><button type="button" class="btn-studio-secondary" data-review-answers>Review all answers</button></nav>
      ${renderAttachmentInput(item.attachment_mode || item.settings?.attachment_mode || 'none',{preview})}
      <div class="vo-exercise-submit-bar"><button type="button" class="btn-studio-secondary" data-save-progress ${preview?'hidden':''}>Save progress</button><button class="material-button" type="submit">${preview?'Check preview':'Submit attempt'}</button></div>
      <p class="exercise-status" data-exercise-status role="status" aria-live="polite">${preview?'Preview only. Nothing will be saved.':'Loading saved progress...'}</p><p class="exercise-status" data-progress-status role="status" aria-live="polite"></p>
      <div data-practice-summary></div><div data-released-feedback></div>
    </form>${!preview?renderAttachmentReview(item.assignment_id):''}<div data-practice-revisions></div></article>`
}

export function practiceAnswers(form) {
  const data=new FormData(form)
  return [...form.querySelectorAll('[data-practice-question]')].map(field=>{
    const index=Number(field.dataset.practiceQuestion)
    const pairs=[...field.querySelectorAll('[data-pair]')]
    // Disabled previously-correct answers remain part of the canonical response.
    const value=pairs.length?JSON.stringify(pairs.map(input=>input.value)):String(data.get(`answer-${index}`) ?? field.querySelector('input:checked,textarea')?.value ?? '')
    return {index,answer:value.trim()}
  })
}

function renderQuestionFeedback(result) {
  return `<p><strong>${esc(result.message || supportiveMessage(result.correct))}</strong></p>${result.expected_answer!=null?`<p>A useful answer: ${esc(Array.isArray(result.expected_answer)?result.expected_answer.join(' · '):result.expected_answer)}</p>`:''}${result.explanation?`<p>${esc(result.explanation)}</p>`:''}`
}

export function renderReleasedFeedback(feedback) {
  if(!feedback) return ''
  const labels={strengths:'What went well',natural_alternative:'A natural way to say it',explanation:'Why it works',practical_tip:'Try this next',encouragement:'Keep going'}
  return `<aside class="exercise-feedback vo-student-feedback-callout"><h4>Teacher feedback</h4><p>${esc(feedback.content?.message)}</p>${Object.entries(labels).filter(([key])=>feedback.content?.[key]).map(([key,label])=>`<h5>${label}</h5><p>${esc(feedback.content[key])}</p>`).join('')}<small>Released feedback · Version ${Number(feedback.version)}</small></aside>`
}

export function setupPracticeForms(client,root,{previewDefinition=null}={}) {
  root.querySelectorAll('[data-experience="1"]').forEach(form=>{
    if(form.dataset.bound) return
    form.dataset.bound='true'
    const preview=form.dataset.preview==='true',assignment=form.dataset.exerciseAssignment
    const fields=[...form.querySelectorAll('[data-practice-question]')]
    const status=form.querySelector('[data-exercise-status]'),submit=form.querySelector('[type=submit]')
    const progressStatus=form.querySelector('[data-progress-status]')
    let state=null,position=0,ready=preview,busy=false,dirty=false,revision=0,savePromise=null,saveTimer
    const checkRequests=new Map()
    const dragId=crypto.randomUUID()
    const setPosition=(index,review=false)=>{
      position=Math.max(0,Math.min(fields.length-1,index))
      fields.forEach((field,i)=>{field.hidden=!review&&i!==position})
      form.querySelector('[data-practice-position]').textContent=review?`Review your ${fields.length} answers`:`Question ${position+1} of ${fields.length}`
      form.querySelector('[data-question-back]').disabled=!review&&position===0
      form.querySelector('[data-question-next]').disabled=review||position>=fields.length-1
    }
    const update=()=>{
      const complete=practiceAnswers(form).filter(a=>{
        const pairs=fields[a.index].querySelectorAll('[data-pair]')
        return pairs.length?[...pairs].every(p=>p.value):Boolean(a.answer)
      }).length
      form.querySelector('progress').value=complete
      form.querySelector('[data-completion-count]').textContent=`${complete} of ${fields.length} answered`
      fields.forEach(field=>field.classList.toggle('has-answer',Boolean(practiceAnswers(form)[Number(field.dataset.practiceQuestion)].answer)))
    }
    const fillAnswers=answers=>{
      for(const {index,answer} of answers||[]){
        const field=fields[index];if(!field)continue
        if(field.querySelector('[data-pair]')){let pairs=[];try{pairs=JSON.parse(answer)}catch{};field.querySelectorAll('[data-pair]').forEach((input,n)=>{input.value=pairs[n]||''})}
        else if(field.querySelector('input[type=radio]')) field.querySelectorAll('input[type=radio]').forEach(input=>{input.checked=input.value===answer})
        else if(field.querySelector('textarea')) field.querySelector('textarea').value=answer
      }
      update()
    }
    const applyState=next=>{
      state=next;revision=next.draft_revision||0;ready=true
      fillAnswers(next.answers)
      fields.forEach(field=>field.querySelectorAll('input,textarea,select,button').forEach(input=>{input.disabled=!next.can_retry&&!input.matches('[data-vocabulary-flip]')}))
      form.querySelectorAll('input[type=file]').forEach(input=>{input.disabled=!next.can_retry})
      for(const result of next.question_results||[]){
        const field=fields[result.index];if(!field)continue
        field.querySelector('[data-question-feedback]').innerHTML=renderQuestionFeedback(result)
        field.dataset.correct=String(result.correct)
        if(next.policy.retry_incorrect_only&&result.correct)field.querySelectorAll('input,textarea,select,button').forEach(input=>{input.disabled=!input.matches('[data-vocabulary-flip]')})
      }
      submit.disabled=!next.can_retry
      submit.textContent=next.can_retry?(next.attempt_count?'Submit another attempt':'Submit attempt'):'Submitted for review'
      form.querySelector('[data-save-progress]').disabled=!next.can_retry
      form.querySelector('[data-practice-summary]').innerHTML=next.attempt_count?`<p>${next.state==='objective_complete'?'Practice checked.':esc(supportiveMessage(null))} ${next.score!=null?`Score: ${Number(next.score)}%.`:''} Attempt ${Number(next.attempt_count)} of ${Number(next.attempt_limit)}.</p>`:''
      form.querySelector('[data-released-feedback]').innerHTML=renderReleasedFeedback(next.released_feedback)
      const older=(next.feedback_history||[]).filter(feedback=>feedback.attempt_id!==next.attempt_id||feedback.version!==next.released_feedback?.version)
      if(older.length)form.querySelector('[data-released-feedback]').insertAdjacentHTML('beforeend',`<details><summary>Previously released feedback (${older.length})</summary>${older.map(renderReleasedFeedback).join('')}</details>`)
      form.closest('[data-practice-card]').querySelector('[data-practice-badge]').textContent=next.attempt_count?'Response saved':'Ready to practice'
      const revisions=form.closest('[data-practice-card]').querySelector('[data-practice-revisions]')
      if(revisions&&next.attempt_id&&form.dataset.allowRevisions==='true'){
        revisions.innerHTML=renderAttachmentRevision({latest_attempt_id:next.attempt_id,assignment_id:assignment,attachment_mode:form.dataset.attachmentMode,allow_revisions:true})
        setupAttachmentDownloads(client,form.closest('[data-practice-card]'))
      }
      dirty=false
    }
    const save=async()=>{
      if(preview||!ready||!dirty) return
      if(savePromise) await savePromise
      if(!dirty) return
      const answers=practiceAnswers(form),signature=JSON.stringify(answers)
      savePromise=(async()=>{
        const {data,error}=await client.rpc('save_exercise_progress',{p_assignment_id:assignment,p_answers:answers,p_expected_revision:revision})
        if(error||data?.assignment_id!==assignment||data?.revision!==revision+1)throw new Error('Progress save was not confirmed. Keep this page open; another window may have newer progress.')
        revision=data.revision
        dirty=JSON.stringify(practiceAnswers(form))!==signature
        progressStatus.textContent='Progress saved.'
      })()
      try{await savePromise}finally{savePromise=null}
    }
    const changed=()=>{
      dirty=true;delete form.dataset.requestId;update();clearTimeout(saveTimer)
      if(!preview)saveTimer=setTimeout(()=>{save().catch(error=>{progressStatus.textContent=error.message})},800)
    }
    form.addEventListener('input',changed)
    form.addEventListener('change',changed)
    form.querySelector('[data-question-back]').onclick=()=>setPosition(position-1)
    form.querySelector('[data-question-next]').onclick=()=>setPosition(position+1)
    form.querySelector('[data-review-answers]').onclick=()=>setPosition(position,true)
    form.querySelector('[data-save-progress]').onclick=async()=>{try{await save()}catch(error){progressStatus.textContent=error.message}}
    fields.forEach(field=>{
      field.querySelectorAll('[data-practice-block]').forEach(block=>{
        block.draggable=true
        block.addEventListener('dragstart',event=>{
          if(block.disabled||busy||!ready){event.preventDefault();return}
          event.dataTransfer.setData('application/x-vera-practice',JSON.stringify({form:dragId,index:Number(field.dataset.practiceQuestion),block:block.dataset.practiceBlock}))
          event.dataTransfer.effectAllowed='copy'
        })
      })
      const output=field.querySelector('textarea')
      if(!output||!field.querySelector('[data-practice-block]'))return
      output.addEventListener('dragover',event=>{if([...event.dataTransfer.types].includes('application/x-vera-practice')){event.preventDefault();event.dataTransfer.dropEffect='copy'}})
      output.addEventListener('drop',event=>{
        let data;try{data=JSON.parse(event.dataTransfer.getData('application/x-vera-practice'))}catch{return}
        if(data.form!==dragId||data.index!==Number(field.dataset.practiceQuestion)||!/^\d+$/.test(data.block)||busy||!ready)return
        const block=field.querySelector('[data-practice-block="'+data.block+'"]')
        if(!block||block.disabled)return
        event.preventDefault();output.value=(output.value+' '+block.textContent).trim();block.disabled=true;changed()
      })
    })
    form.addEventListener('click',async event=>{
      const field=event.target.closest('[data-practice-question]')
      if(!field)return
      const index=Number(field.dataset.practiceQuestion),output=field.querySelector('textarea')
      const flip=event.target.closest('[data-vocabulary-flip]')
      if(flip){const expanded=flip.getAttribute('aria-expanded')!=='true';flip.setAttribute('aria-expanded',String(expanded));flip.textContent=expanded?'Back to practice':'Flip for a hint';const host=flip.closest('.experience-vocabulary-tip');host.classList.toggle('is-flipped',expanded);host.querySelector('[data-flip-front]').setAttribute('aria-hidden',String(expanded));host.querySelector('[data-flip-back]').setAttribute('aria-hidden',String(!expanded))}
      if(event.target.closest('[data-practice-block]')){output.value=`${output.value} ${event.target.textContent}`.trim();event.target.disabled=true;changed()}
      if(event.target.closest('[data-practice-reset]')){output.value='';field.querySelectorAll('[data-practice-block]').forEach(button=>{button.disabled=false});changed()}
      const check=event.target.closest('[data-check-question]')
      if(!check||busy||!ready)return
      const inputs=[...field.querySelectorAll('textarea,select,input')]
      if(!inputs.every(input=>input.reportValidity()))return
      const answer=practiceAnswers(form)[index].answer
      check.disabled=true
      try{
        let result
        if(preview){result=checkPreviewAnswer(previewDefinition.questions[index],answer,previewDefinition.exercise_type);result.message=supportiveMessage(result.correct)}
        else{
          const previous=checkRequests.get(index),request=previous?.answer===answer?previous:{answer,id:crypto.randomUUID()}
          checkRequests.set(index,request)
          await save()
          result=await checkExerciseQuestion(client,{assignmentId:assignment,index,answer,requestId:request.id})
        }
        if(practiceAnswers(form)[index].answer===answer)field.querySelector('[data-question-feedback]').innerHTML=renderQuestionFeedback(result)
        else status.textContent='Your answer changed. Check the new version when you are ready.'
      }catch(error){status.textContent=error.message}finally{check.disabled=false}
    })
    form.addEventListener('submit',async event=>{
      event.preventDefault()
      if(!ready||busy||submit.disabled)return
      const invalid=fields.find(field=>[...field.querySelectorAll('textarea,input,select')].some(input=>!input.checkValidity()))
      if(invalid){setPosition(Number(invalid.dataset.practiceQuestion));invalid.querySelector(':invalid')?.reportValidity();return}
      const missingFile=form.querySelector('input[type=file][required]')
      if(!preview&&missingFile&&!missingFile.checkValidity()){status.textContent='Add the required attachment before submitting.';missingFile.reportValidity();return}
      if(preview){
        fields.forEach((field,index)=>{
          const result=previewDefinition?.settings?.correction?.mode==='objective'?checkPreviewAnswer(previewDefinition.questions[index],practiceAnswers(form)[index].answer,previewDefinition.exercise_type):{correct:null}
          field.querySelector('[data-question-feedback]').innerHTML=renderQuestionFeedback(result)
        });setPosition(0,true);status.textContent='Preview complete. No response has been saved.';return
      }
      busy=true;submit.disabled=true;status.textContent='Saving your response...'
      clearTimeout(saveTimer)
      fields.forEach(field=>{field.disabled=true})
      try{
        await save()
        form.dataset.requestId ||= crypto.randomUUID()
        const requestId=form.dataset.requestId,answers=practiceAnswers(form)
        const attachments=await uploadFilesForForm(client,form,assignment)
        await submitExerciseAttempt(client,assignment,answers,requestId,attachments)
        const next=await loadExercisePractice(client,assignment)
        applyState(next);setPosition(0,true)
        status.textContent=next.state==='objective_complete'?'Attempt saved and checked.':'Attempt submitted for teacher review.'
        setupAttachmentDownloads(client,root)
      }catch(error){status.textContent=error.message;submit.disabled=false}finally{busy=false;fields.forEach(field=>{field.disabled=false})}
    })
    // Do not put unsent academic responses in persistent browser storage.
    const guard=event=>{if(form.isConnected&&dirty&&!preview){event.preventDefault();event.returnValue=''}}
    window.addEventListener('beforeunload',guard)
    setPosition(0)
    if(!preview){submit.disabled=true;fields.forEach(field=>{field.disabled=true});loadExercisePractice(client,assignment).then(next=>{if(form.isConnected){fields.forEach(field=>{field.disabled=false});applyState(next);status.textContent=next.attempt_count?'Saved response loaded.':'Your progress is ready.'}}).catch(error=>{status.textContent=error.message})}
  })
}
