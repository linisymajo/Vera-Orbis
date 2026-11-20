import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {unifiedAcademicFixture,T,T2,S,S2} from './fixtures/unified-academic-db.mjs'

test('student management preserves records, enforces enrollment revocation and scopes reactivation/removal',async()=>{
 const f=await unifiedAcademicFixture(),{db,rpc,as}=f
 try{
  await db.exec(await readFile(new URL('../supabase/migrations/0018_student_attachments.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/0029_personal_learning_journey.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/0030_student_management.sql',import.meta.url),'utf8'))
  await db.exec('grant select,insert,update on public.class_participants to authenticated')
  const before=(await db.query('select to_jsonb(p) data from profiles p where id=$1',[S])).rows[0].data
  const exercise=(await db.query("insert into exercises(teacher_id,title,language,exercise_type,questions) values($1,'Synthetic stored practice','English','open_question','[{\"prompt\":\"Use a greeting\"}]') returning id",[T])).rows[0].id
  const assignment=(await db.query('insert into exercise_assignments(exercise_id,teacher_id,student_id) values($1,$2,$3) returning id',[exercise,T,S])).rows[0].id
  const action=(actor,name,revision,request=crypto.randomUUID(),done=false)=>rpc(actor,'manage_student_enrollment',{p_student_id:S,p_action:name,p_expected_revision:revision,p_request_id:request,p_confirm_completed:done})
  assert.equal((await rpc(T,'get_managed_students')).length,1)
  await assert.rejects(action(T2,'deactivate',0),/owner/)
  await assert.rejects(action(S,'deactivate',0),/teacher/)
  const request=crypto.randomUUID(),off=await action(T,'deactivate',0,request)
  assert.equal(off.state,'inactive');assert.equal((await action(T,'deactivate',0,request)).revision,1)
  assert.equal((await rpc(T,'get_managed_students'))[0].state,'inactive')
  assert.equal(await rpc(S,'student_has_academic_access',{p_student_id:S}),false)
  assert.equal(await rpc(S,'can_read_exercise_attachment',{p_assignment_id:assignment,p_submitted:true}),false)
  assert.equal(await rpc(T,'can_read_exercise_attachment',{p_assignment_id:assignment,p_submitted:true}),true)
  assert.equal(await rpc(T2,'can_read_exercise_attachment',{p_assignment_id:assignment,p_submitted:true}),false)
  await assert.rejects(rpc(S,'get_student_learning_journey',{p_student_id:S}),/Authorized/)
  assert.equal((await rpc(T,'get_managed_student_history',{p_student_id:S})).profile.name,before.name)
  await assert.rejects(action(T,'reactivate',0),/changed/)
  assert.equal((await action(T,'reactivate',1)).state,'active')
  assert.equal(await rpc(S,'student_has_academic_access',{p_student_id:S}),true)
  assert.deepEqual((await db.query('select to_jsonb(p) data from profiles p where id=$1',[S])).rows[0].data,before)
  const cls=(await db.query("insert into classes(teacher_id,title,starts_at) values($1,'Synthetic future class',now()+interval '1 day') returning id",[T])).rows[0].id
  await as(T,tx=>tx.query('insert into class_participants(class_id,teacher_id,student_id) values($1,$2,$3)',[cls,T,S]))
  await assert.rejects(action(T,'archive',2,crypto.randomUUID(),true),/remaining/)
  await db.query("update classes set status='cancelled' where id=$1",[cls])
  assert.equal((await action(T,'complete',2,crypto.randomUUID(),true)).state,'completed')
  await assert.rejects(as(T,tx=>tx.query('insert into class_participants(class_id,teacher_id,student_id) values($1,$2,$3)',[cls,T,S])),/assignments/)
  assert.equal((await action(T,'archive',3,crypto.randomUUID(),true)).state,'archived')
  assert.equal(await rpc(S,'student_has_academic_access',{p_student_id:S}),false)
  assert.equal((await action(T,'reactivate',4)).state,'active')
  assert.equal((await action(T,'remove',5)).state,'removed')
  assert.equal((await rpc(T,'get_managed_students')).length,0)
  await assert.rejects(rpc(T,'get_managed_student_history',{p_student_id:S}),/Assigned/)
  await assert.rejects(action(T,'reactivate',6),/owner/)
  assert.equal((await db.query('select count(*)::int n from profiles where id=$1',[S])).rows[0].n,1)
  assert.equal((await db.query('select teacher_id from enrollments where student_id=$1',[S])).rows[0].teacher_id,null)
  await db.query('insert into academic_admins(user_id) values($1)',[T2])
  await rpc(T2,'review_student_enrollment',{p_student_id:S,p_approve:true,p_teacher_id:T2})
  assert.equal((await rpc(T2,'get_managed_students')).find(s=>s.id===S).state,'active')
  assert.equal((await rpc(T,'get_managed_students')).length,0)
  await assert.rejects(rpc(T,'get_managed_student_history',{p_student_id:S}),/Assigned/)
  assert.equal((await db.query('select count(*)::int n from enrollments where student_id=$1',[S])).rows[0].n,1)
 }finally{await db.close()}
})
