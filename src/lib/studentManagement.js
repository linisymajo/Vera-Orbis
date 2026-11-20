const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
export const studentManagementEnabled = (environment = import.meta.env) => environment?.VITE_STUDENT_MANAGEMENT_READY === 'true'
export const studentDeletionEnabled = (environment = import.meta.env) => environment?.VITE_STUDENT_DELETION_READY === 'true'
async function call(client,name,params={}) {
 const r=await client.rpc(name,params)
 if(r.error)throw Error(r.error.code==='40001'?'This student changed. Reload the latest state before retrying.':r.error.code==='42501'?'Your role or enrollment does not authorize this action.':r.error.code==='22023'?'Review the action and resolve remaining course commitments before retrying.':'The operation was not confirmed. Reload the student state before retrying.')
 return r.data
}
export const listManagedStudents=client=>call(client,'get_managed_students')
export function loadManagedHistory(client,studentId){if(!uuid(studentId))throw Error('Choose a student.');return call(client,'get_managed_student_history',{p_student_id:studentId})}
export function manageStudentEnrollment(client,student,action,{requestId=crypto.randomUUID(),completed=false}={}) {
 if(!uuid(student?.id)||!uuid(requestId)||!Number.isInteger(student.revision)||!['deactivate','reactivate','complete','archive','remove'].includes(action))throw Error('Invalid student management action.')
 return call(client,'manage_student_enrollment',{p_student_id:student.id,p_action:action,p_expected_revision:student.revision,p_request_id:requestId,p_confirm_completed:completed}).then(r=>{if(r?.student_id!==student.id||!Number.isInteger(r.revision))throw Error('Student action was not confirmed. Reload before retrying.');return r})
}
export async function studentDeletionRequest(client,body){
 const {data,error}=await client.functions.invoke('student-management',{body})
 if(error){let message='Account deletion was not confirmed. Check its status before retrying.';try{const payload=await error.context?.json();if(typeof payload?.message==='string')message=payload.message}catch{}throw Error(message)}
 if(!data||(!data.preview&&!data.result))throw Error('Account deletion was not confirmed.')
 return data.preview||data.result
}
