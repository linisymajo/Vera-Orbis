import { ATTACHMENT_ACCEPT,uploadExerciseAttachment,listExerciseAttachments,attachmentDownloadUrl,reviseExerciseAttachments } from '../lib/exerciseAttachments.js'
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
export function renderAttachmentInput(mode,{preview=false}={}) {
 if(mode==='none')return ''
 return `<label class="exercise-attachment-input">${mode==='required'?'Required attachment':'Optional attachments'}<input name="academic_files" type="file" multiple accept="${ATTACHMENT_ACCEPT}" ${mode==='required'?'required':''} ${preview?'disabled':''}></label><p>Up to five files, 10 MiB each. PDF, Office documents, images and supported audio/video.</p><p data-upload-progress role="status" aria-live="polite"></p>`
}
export function renderAttachmentReview(assignmentId,attemptId=null) {
 return `<section class="exercise-attachment-review" data-attachment-assignment="${esc(assignmentId)}" ${attemptId?`data-attachment-attempt="${esc(attemptId)}"`:''}><h4>Submitted files</h4><div data-attachment-files>Loading files...</div><p data-file-status role="status"></p></section>`
}
export function renderAttachmentRevision(item) {
 if(!item.allow_revisions||!item.latest_attempt_id||item.attachment_mode==='none')return ''
 return `<details><summary>Revise submitted files</summary><form data-attachment-revision="${esc(item.latest_attempt_id)}" data-assignment="${esc(item.assignment_id)}"><p>Selected files replace the current file set. Your previous files remain in the submission history; your answers stay unchanged.</p>${renderAttachmentInput(item.attachment_mode)}<button type="submit">Save file revision</button><p data-revision-status role="status" aria-live="polite"></p></form></details>`
}
export async function uploadFilesForForm(client,form,assignmentId) {
 const files=[...(form.elements.namedItem('academic_files')?.files||[])]
 if(files.length>5)throw new Error('Choose at most five files.')
 form._attachmentUploads ||= new Map()
 const ids=[]
 for(let i=0;i<files.length;i++){
  const file=files[i]
  let state=form._attachmentUploads.get(file)
  if(!state){state={requestId:crypto.randomUUID()};form._attachmentUploads.set(file,state)}
  const progress=form.querySelector('[data-upload-progress]');if(progress)progress.textContent=`Uploading file ${i+1} of ${files.length}: ${file.name}`
  if(!state.id){const saved=await uploadExerciseAttachment(client,{assignmentId,file,requestId:state.requestId});state.id=saved.id}
  ids.push(state.id)
 }
 const progress=form.querySelector('[data-upload-progress]');if(progress)progress.textContent=ids.length?`${ids.length} file(s) uploaded and verified.`:''
 return ids
}
export function setupAttachmentDownloads(client,root=document) {
 root.querySelectorAll('[data-attachment-assignment]').forEach(async section=>{
  if(section.dataset.loading)return
  section.dataset.loading='true'
  const host=section.querySelector('[data-attachment-files]')
  try{
   const files=await listExerciseAttachments(client,section.dataset.attachmentAssignment)
   const visible=files.filter(file=>file.attempt_id&&(!section.dataset.attachmentAttempt||file.attempt_id===section.dataset.attachmentAttempt))
   host.innerHTML=visible.length?`<ul>${visible.map(file=>`<li><button type="button" data-download-file="${esc(file.id)}">${esc(file.file_name)}</button> <small>${file.is_current?'Current files':'Earlier files'} · version ${file.version_number||1} · ${Math.ceil(Number(file.size_bytes)/1024)} KB</small></li>`).join('')}</ul>`:'<p>No submitted files.</p>'
   host.querySelectorAll('[data-download-file]').forEach(button=>button.onclick=async()=>{
    const popup=window.open('about:blank','_blank');if(popup)popup.opener=null
    button.disabled=true
    try{const url=await attachmentDownloadUrl(client,{assignmentId:section.dataset.attachmentAssignment,attachmentId:button.dataset.downloadFile});if(popup)popup.location.replace(url);else throw new Error('Allow the download window and try again.')}
    catch(error){popup?.close();section.querySelector('[data-file-status]').textContent=error.message}
    finally{button.disabled=false}
   })
  }catch(error){host.textContent=error.message||'Submission files are unavailable.'}
  finally{delete section.dataset.loading}
 })
 root.querySelectorAll('[data-attachment-revision]').forEach(form=>{
  if(form.dataset.bound)return
  form.dataset.bound='true'
  form.onsubmit=async event=>{
   event.preventDefault();const button=event.submitter;button.disabled=true
   const status=form.querySelector('[data-revision-status]')
   try{
    form.dataset.requestId ||= crypto.randomUUID()
    const ids=await uploadFilesForForm(client,form,form.dataset.assignment)
    const result=await reviseExerciseAttachments(client,{attemptId:form.dataset.attachmentRevision,attachmentIds:ids,requestId:form.dataset.requestId})
    status.textContent=`File revision ${result.version_number} saved.`
    form.reset();form._attachmentUploads=new Map();delete form.dataset.requestId
    setupAttachmentDownloads(client,root)
   }catch(error){status.textContent=error.message}
   finally{button.disabled=false}
  }
 })
}