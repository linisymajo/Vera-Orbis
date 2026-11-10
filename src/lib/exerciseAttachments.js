import { materialContentType } from './academicOperations.js'
export const SUBMISSION_BUCKET = 'academic-submissions'
export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.ogg,.mp4'
async function rpc(client,name,params) {
 const result=await client.rpc(name,params)
 if(result.error || result.data==null) throw new Error(result.error?.message || 'The academic file operation was not confirmed.')
 return result.data
}
export async function uploadExerciseAttachment(client,{assignmentId,file,requestId=crypto.randomUUID()}) {
 const mime=materialContentType(file)
 if(!mime)throw new Error('Choose a nonempty supported academic file up to 10 MiB.')
 const {data,error}=await client.auth.getUser()
 if(error||!data?.user?.id)throw new Error('Please verify your session before uploading.')
 const reserved=await rpc(client,'reserve_exercise_attachment',{p_assignment_id:assignmentId,p_file_name:file.name,p_mime_type:mime,p_size_bytes:file.size,p_request_id:requestId})
 if(reserved.id!==requestId||reserved.student_id!==data.user.id||!reserved.file_path?.startsWith(`${data.user.id}/${assignmentId}/`))throw new Error('The private upload reservation was not confirmed.')
 if(reserved.status==='uploaded'||reserved.status==='submitted')return reserved
 const upload=await client.storage.from(SUBMISSION_BUCKET).upload(reserved.file_path,file,{contentType:mime,upsert:false})
 // A transport error after upload may be ambiguous. Only Storage metadata confirmed
 // by the database can turn either response into a successful uploaded attachment.
 try {
  const confirmed=await rpc(client,'confirm_exercise_attachment',{p_attachment_id:reserved.id})
  if(confirmed.id!==reserved.id||!['uploaded','submitted'].includes(confirmed.status))throw new Error('Upload was not confirmed.')
  return confirmed
 }catch(error){throw new Error(upload.error?.message || error.message || 'The file upload was not confirmed.')}
}
export async function listExerciseAttachments(client,assignmentId) {
 const files=await rpc(client,'list_exercise_attachments',{p_assignment_id:assignmentId})
 if(!Array.isArray(files))throw new Error('Submission files could not be loaded.')
 return files
}
export async function attachmentDownloadUrl(client,{assignmentId,attachmentId}) {
 const files=await listExerciseAttachments(client,assignmentId)
 const file=files.find(item=>item.id===attachmentId)
 if(!file)throw new Error('This file is unavailable for your account.')
 const result=await client.storage.from(SUBMISSION_BUCKET).createSignedUrl(file.file_path,300)
 if(result.error||!result.data?.signedUrl)throw new Error('The private download could not be authorized.')
 return result.data.signedUrl
}
export async function reviseExerciseAttachments(client,{attemptId,attachmentIds,requestId}) {
 const result=await rpc(client,'revise_exercise_attachments',{p_attempt_id:attemptId,p_attachment_ids:attachmentIds,p_request_id:requestId})
 if(result.attempt_id!==attemptId||!Number.isInteger(result.version_number))throw new Error('The file revision was not confirmed.')
 return result
}