import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {unifiedAcademicFixture,T,T2,S,S2} from './fixtures/unified-academic-db.mjs'
import {prepareRemainingPlan} from '../src/lib/academicPreparation.js'
async function fixture(){
 const f=await unifiedAcademicFixture()
 await f.db.exec("create role service_role bypassrls;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema public to service_role")
 for(const name of ['0018_student_attachments.sql','0021_final_assessments.sql','0029_personal_learning_journey.sql','0030_student_management.sql','0031_student_account_deletion.sql'])await f.db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
 await f.db.query('insert into academic_admins(user_id) values($1)',[T2])
 const worker=(name,params)=>f.db.transaction(async tx=>{await tx.exec('set local role service_role');return(await tx.query('select public.'+name+'('+Object.keys(params).map((k,i)=>k+'=> $'+(i+1)).join(',')+') data',Object.values(params))).rows[0].data})
 return{...f,worker}
}
test('permanent deletion requires verified administrator, exact identity, retention checks and an unexpired server lease',async()=>{
 const {db,rpc,as,worker}=await fixture()
 try{
  const preview=actor=>rpc(actor,'preview_student_deletion',{p_student_id:S,p_request_id:crypto.randomUUID()})
  await assert.rejects(preview(T),/administrator/);await assert.rejects(preview(S),/administrator/)
  const staff=await rpc(T2,'preview_student_deletion',{p_student_id:T,p_request_id:crypto.randomUUID()});assert.equal(staff.eligible,false);assert.ok(staff.blockers.includes('account_has_staff_role'))
  let p=await preview(T2);assert.equal(p.eligible,true)
  const confirm=(text,retention=true,shared=true)=>rpc(T2,'confirm_student_deletion',{p_job_id:p.job_id,p_confirmation:text,p_retention_reviewed:retention,p_shared_reviewed:shared})
  await assert.rejects(confirm('DELETE wrong@example.test'),/exact/);await assert.rejects(confirm('DELETE synthetic@example.test',false),/review/)
  await assert.rejects(as(S,tx=>tx.query('select * from public.student_deletion_jobs')),/permission/)
  await assert.rejects(rpc(T2,'claim_student_deletion',{p_job_id:p.job_id,p_actor_id:T2}),/permission/)
  await rpc(T2,'set_student_retention_hold',{p_student_id:S,p_reason:'Synthetic legal hold',p_active:true})
  await assert.rejects(confirm('DELETE synthetic@example.test'),/changed/)
  const hold=(await db.query('select id from student_retention_holds where student_id=$1',[S])).rows[0].id
  await rpc(T2,'set_student_retention_hold',{p_student_id:S,p_reason:'Reviewed',p_active:false,p_hold_id:hold})
  p=await preview(T2);assert.equal(p.eligible,true)
  await confirm('DELETE synthetic@example.test');assert.equal(await rpc(S,'student_has_academic_access',{p_student_id:S}),false)
  await assert.rejects(rpc(T,'manage_student_enrollment',{p_student_id:S,p_action:'reactivate',p_expected_revision:0,p_request_id:crypto.randomUUID()}),/deletion/)
  await assert.rejects(db.query("update profiles set name='Changed' where id=$1",[S]),/freezes/)
  await assert.rejects(db.query('insert into teachers(id) values($1)',[S]),/freezes/)
  const job=await worker('claim_student_deletion',{p_job_id:p.job_id,p_actor_id:T2});assert.equal(job.stage,'files');assert.ok(job.lease)
  await assert.rejects(worker('claim_student_deletion',{p_job_id:p.job_id,p_actor_id:T2}),/processing/)
  await worker('record_student_deletion_files',{p_job_id:p.job_id,p_lease:job.lease})
  await worker('cleanup_student_deletion_data',{p_job_id:p.job_id,p_lease:job.lease})
  assert.equal((await db.query('select count(*)::int n from profiles where id=$1',[S])).rows[0].n,0)
  assert.equal((await db.query('select count(*)::int n from profiles where id=$1',[S2])).rows[0].n,1)
  await assert.rejects(worker('finish_student_deletion',{p_job_id:p.job_id,p_lease:job.lease}),/not complete/)
  // Simulate only the Auth Admin API's final user deletion in isolated PostgreSQL.
  await db.query('delete from auth.users where id=$1',[S])
  assert.equal((await worker('finish_student_deletion',{p_job_id:p.job_id,p_lease:job.lease})).stage,'complete')
  assert.equal((await db.query("select count(*)::int n from student_management_events where student_id=$1 and action in('delete_confirmed','delete_completed')",[S])).rows[0].n,2)
 }finally{await db.close()}
})

test('deletion checks file identity, preserves other students and shared teaching resources, and cleans approved plan dependencies',async()=>{
 const {db,rpc,worker}=await fixture()
 try{
  const settings={language:'English',level:'B1',goal:'Synthetic speaking practice',total:2,completed:0,duration:60,priorities:'',excluded:[],corrections:{},confirmed:true}
  let v=await rpc(T,'create_learning_plan_version',{p_student_id:S,p_request_id:crypto.randomUUID()});v=await rpc(T,'save_learning_plan_version',{p_version_id:v.id,p_expected_revision:v.revision,p_content:prepareRemainingPlan(settings,[])});v=await rpc(T,'approve_learning_plan_version',{p_version_id:v.id,p_expected_revision:v.revision});await rpc(T,'publish_learning_architect_plan',{p_version_id:v.id})
  await assert.rejects(db.query('delete from learning_plan_versions where id=$1',[v.id]),/immutable/)
  const path=T+'/synthetic.docx';await db.query("insert into materials(teacher_id,student_id,audience,title,file_path) values($1,$2,'student','Synthetic file',$3)",[T,S,path]);await db.query("insert into storage.objects(bucket_id,name,metadata) values('materials',$1,'{\"size\":40}')",[path])
  const cls=(await db.query("insert into classes(teacher_id,title,starts_at,status) values($1,'Shared history',now()-interval '2 days','completed') returning id",[T])).rows[0].id;await db.query('insert into class_participants(class_id,teacher_id,student_id) values($1,$2,$3)',[cls,T,S])
  const p=await rpc(T2,'preview_student_deletion',{p_student_id:S,p_request_id:crypto.randomUUID()});assert.equal(p.eligible,true);assert.equal(p.private_files,1)
  await rpc(T2,'confirm_student_deletion',{p_job_id:p.job_id,p_confirmation:'DELETE synthetic@example.test',p_retention_reviewed:true,p_shared_reviewed:true})
  const j=await worker('claim_student_deletion',{p_job_id:p.job_id,p_actor_id:T2})
  await assert.rejects(worker('record_student_deletion_files',{p_job_id:p.job_id,p_lease:j.lease}),/incomplete/)
  let file=await worker('validate_student_deletion_file',{p_job_id:p.job_id,p_lease:j.lease,p_index:0});assert.equal(file.exists,true)
  await db.query("update storage.objects set metadata='{\"size\":41}' where name=$1",[path]);await assert.rejects(worker('validate_student_deletion_file',{p_job_id:p.job_id,p_lease:j.lease,p_index:0}),/changed/)
  await db.query('delete from storage.objects where name=$1',[path]);file=await worker('validate_student_deletion_file',{p_job_id:p.job_id,p_lease:j.lease,p_index:0});assert.equal(file.exists,false)
  await worker('record_student_deletion_files',{p_job_id:p.job_id,p_lease:j.lease});await worker('cleanup_student_deletion_data',{p_job_id:p.job_id,p_lease:j.lease})
  assert.equal((await db.query('select count(*)::int n from classes where id=$1',[cls])).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from learning_plan_versions where student_id=$1',[S])).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from auth.users where id=$1',[S2])).rows[0].n,1)
 }finally{await db.close()}
})

test('accounting, unreviewed references and newly added retention holds stop permanent deletion',async()=>{
 const {db,rpc,worker}=await fixture()
 try{
  const preview=()=>rpc(T2,'preview_student_deletion',{p_student_id:S,p_request_id:crypto.randomUUID()})
  await db.query("insert into payments(teacher_id,student_id,amount,method) values($1,$2,10,'cash')",[T,S]);let p=await preview();assert.equal(p.eligible,false);assert.ok(p.blockers.includes('accounting_records_require_retention'))
  await db.query('delete from payments where student_id=$1',[S])
  await db.exec('create table new_unreviewed_student_reference(student_id uuid references profiles(id))');await db.query('insert into new_unreviewed_student_reference values($1)',[S]);p=await preview();assert.equal(p.eligible,false);assert.ok(p.blockers.includes('unreviewed_reference:new_unreviewed_student_reference'));await db.exec('drop table new_unreviewed_student_reference')
  p=await preview();await rpc(T2,'confirm_student_deletion',{p_job_id:p.job_id,p_confirmation:'DELETE synthetic@example.test',p_retention_reviewed:true,p_shared_reviewed:true});const j=await worker('claim_student_deletion',{p_job_id:p.job_id,p_actor_id:T2})
  await rpc(T2,'set_student_retention_hold',{p_student_id:S,p_reason:'Urgent synthetic retention decision',p_active:true})
  await assert.rejects(worker('record_student_deletion_files',{p_job_id:p.job_id,p_lease:j.lease}),/Retention/)
  assert.equal((await db.query('select count(*)::int n from auth.users where id=$1',[S])).rows[0].n,1)
 }finally{await db.close()}
})

test('owner bootstrap requires the exact approved context and changes only verified administrator membership',async()=>{
 const {db}=await fixture()
 try{
  await db.exec('delete from academic_admins')
  const sql=await readFile(new URL('../supabase/production/bootstrap_academic_owner.sql',import.meta.url),'utf8')
  await assert.rejects(db.exec(sql),/Explicit approved/);await db.exec('rollback')
  await db.query("select set_config('app.vera_release_target','iopgzmvaqobigjwibual',false),set_config('app.vera_owner_bootstrap_user',$1,false)",[S])
  await assert.rejects(db.exec(sql),/founder teacher/);await db.exec('rollback')
  const auth=(await db.query('select to_jsonb(u) data from auth.users u where id=$1',[T])).rows[0].data
  await db.query("select set_config('app.vera_owner_bootstrap_user',$1,false)",[T]);await db.exec(sql);await db.exec(sql)
  assert.deepEqual((await db.query('select user_id from academic_admins')).rows,[{user_id:T}]);assert.deepEqual((await db.query('select to_jsonb(u) data from auth.users u where id=$1',[T])).rows[0].data,auth)
 }finally{await db.close()}
})
