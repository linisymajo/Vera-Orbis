import { STAGES } from '../../supabase/functions/academic-ai/core.js'
import { requestAcademicDraft } from './academicAI.js'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const identifier=(value,label)=>{if(typeof value!=='string'||!UUID.test(value))throw new Error('Choose a valid '+label+'.');return value.toLowerCase()}
const object=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value))
function fields(value,keys,label){if(!object(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(key=>!keys.includes(key)))throw new Error('Invalid '+label+' fields.')}
function text(value,label,max,required){if(typeof value!=='string'||value.length>max||/<[^>]+>/.test(value)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)||(required&&!value.trim()))throw new Error(label+' must be plain text'+(required?' and complete.':'.'));return value.trim()}
const revision=(value,zero=false)=>{if(!Number.isInteger(value)||value<(zero?0:1))throw new Error('Reload the latest saved revision.');return value}
export function newLearningObjective(){return {id:crypto.randomUUID(),title:'',success_criteria:'',steps:STAGES.map(stage=>({stage,activity:''}))}}

export function validateLearningPlan(content,{complete=false}={}){
  fields(content,['title','language','level','summary','objectives'],'learning plan')
  if(!Array.isArray(content.objectives)||content.objectives.length>10||(complete&&!content.objectives.length))throw new Error('Add between one and ten objectives before approval.')
  const ids=new Set()
  const result={
    title:text(content.title,'Plan title',160,complete),
    language:text(content.language,'Language',80,complete),
    level:text(content.level,'Level',40,complete),
    summary:text(content.summary,'Plan summary',3000,false),
    objectives:content.objectives.map(objective=>{
      fields(objective,['id','title','success_criteria','steps'],'objective')
      const id=identifier(objective.id,'objective ID')
      if(ids.has(id))throw new Error('Each objective needs a distinct ID.')
      ids.add(id)
      if(!Array.isArray(objective.steps)||objective.steps.length!==4)throw new Error('Include all four learning stages.')
      return {id,title:text(objective.title,'Objective',300,complete),success_criteria:text(objective.success_criteria,'Success criteria',1000,complete),
        steps:objective.steps.map((step,index)=>{
          fields(step,['stage','activity'],'learning stage')
          if(step.stage!==STAGES[index])throw new Error('Follow Listen, Repeat, Personalize, Use in order.')
          return {stage:step.stage,activity:text(step.activity,step.stage+' activity',2000,complete)}
        })}
    }),
  }
  if(new TextEncoder().encode(JSON.stringify(result)).length>48000)throw new Error('This learning plan exceeds the size limit.')
  return result
}

async function call(client,name,params){
  const {data,error}=await client.rpc(name,params)
  if(error)throw new Error(error.message||'Learning plan operation failed.')
  if(!data)throw new Error('The saved learning plan record could not be confirmed.')
  return data
}
export async function listLearningPlanVersions(client,studentId){
  const id=identifier(studentId,'student')
  const {data,error}=await client.from('learning_plan_versions')
    .select('id,teacher_id,student_id,version_number,revision,status,content,base_version_id,prior_approved_version_id,source_ai_draft_id,approved_at,created_at,updated_at')
    .eq('student_id',id).order('version_number',{ascending:false}).limit(100)
  if(error)throw new Error(error.message)
  const versions=data||[]
  if(!versions.length)return []
  const progress=await client.from('learning_plan_objective_progress').select('version_id,objective_id,completed,revision,updated_by,updated_at').in('version_id',versions.map(v=>v.id))
  if(progress.error)throw new Error(progress.error.message)
  return versions.map(version=>({...version,progress:(progress.data||[]).filter(row=>row.version_id===version.id)}))
}
export async function listLearningObjectiveEvents(client,versionId){
  const {data,error}=await client.from('learning_plan_objective_events').select('objective_id,completed,revision,actor_id,created_at')
    .eq('version_id',identifier(versionId,'plan version')).order('created_at',{ascending:false}).limit(100)
  if(error)throw new Error(error.message)
  return data||[]
}
export async function createLearningPlanVersion(client,{studentId,baseVersionId=null,sourceAIDraftId=null,requestId=crypto.randomUUID()}){
  const id=identifier(studentId,'student')
  if(baseVersionId&&sourceAIDraftId)throw new Error('Choose one source for the new version.')
  const row=await call(client,'create_learning_plan_version',{p_student_id:id,p_base_version_id:baseVersionId?identifier(baseVersionId,'source version'):null,
    p_source_ai_draft_id:sourceAIDraftId?identifier(sourceAIDraftId,'AI draft'):null,p_request_id:identifier(requestId,'request ID')})
  // A retry can return an already approved version; it must never reopen it.
  if(!UUID.test(row.id)||row.student_id!==id||!['draft','approved'].includes(row.status)||!Number.isInteger(row.version_number))throw new Error('Plan creation could not be confirmed.')
  return row
}
export async function saveLearningPlanVersion(client,{id,revision:expected,content}){
  const versionId=identifier(id,'plan version')
  const row=await call(client,'save_learning_plan_version',{p_version_id:versionId,p_expected_revision:revision(expected),p_content:validateLearningPlan(content)})
  if(row.id!==versionId||row.status!=='draft'||row.revision!==expected+1)throw new Error('Plan save could not be confirmed.')
  return row
}
export async function approveLearningPlanVersion(client,{id,revision:expected}){
  const versionId=identifier(id,'plan version')
  const row=await call(client,'approve_learning_plan_version',{p_version_id:versionId,p_expected_revision:revision(expected)})
  if(row.id!==versionId||row.status!=='approved'||row.revision!==expected+1||!row.approved_at)throw new Error('Plan approval could not be confirmed.')
  return row
}
export async function setLearningObjectiveCompletion(client,{versionId,objectiveId,revision:expected,completed,requestId=crypto.randomUUID()}){
  if(typeof completed!=='boolean')throw new Error('Choose a completion state.')
  const id=identifier(versionId,'plan version'),objective=identifier(objectiveId,'objective')
  const row=await call(client,'set_learning_objective_completion',{p_version_id:id,p_objective_id:objective,p_expected_revision:revision(expected,true),p_completed:completed,p_request_id:identifier(requestId,'request ID')})
  if(row.version_id!==id||row.objective_id!==objective||row.completed!==completed||row.revision!==expected+1)throw new Error('Objective completion could not be confirmed.')
  return row
}
export function generateLearningPlanDraft(client,{studentId,brief}){
  return requestAcademicDraft(client,{kind:'learning_plan',studentId:identifier(studentId,'student'),brief})
}
