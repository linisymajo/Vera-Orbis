import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {unifiedAcademicFixture,T,T2,S,S2} from './fixtures/unified-academic-db.mjs'
const sql=name=>readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
test('adult admission enforces signup, verified enrollment, invitations, RLS and preserves existing records',async()=>{
 const f=await unifiedAcademicFixture(),{db,rpc,as}=f
 try{
  await db.exec("create role service_role bypassrls;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema public to service_role")
  for(const name of ['0018_student_attachments.sql','0021_final_assessments.sql','0029_personal_learning_journey.sql','0030_student_management.sql','0031_student_account_deletion.sql'])await db.exec(await sql(name))
  await db.query('insert into academic_admins(user_id) values($1)',[T])
  const original=(await db.query('select jsonb_agg(to_jsonb(p)) value from profiles p')).rows[0].value
  await db.exec(await sql('0032_adult_only_admission.sql'))
  assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(p)) value from profiles p')).rows[0].value,original)
  assert.equal((await rpc(S,'get_my_enrollment')).adult_admitted,true)
  assert.equal((await rpc(T,'get_my_enrollment')).academic_access,true)
  const N='30000000-0000-4000-8000-000000000099'
  for(const meta of [{},{adult_18_plus:false,service_region_eligible:true},{adult_18_plus:true,service_region_eligible:false}])await assert.rejects(db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'new@example.test',now(),$2)",[N,meta]),/adult/i)
  await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'new@example.test',now(),$2)",[N,{adult_18_plus:true,service_region_eligible:true}])
  assert.equal((await rpc(N,'get_my_enrollment')).academic_access,false)
  await assert.rejects(as(N,tx=>tx.query("update adult_admissions set verified_at=now(),method='teacher_verified' where user_id=$1",[N])),/permission/)
  await assert.rejects(db.query("update enrollments set status='approved' where student_id=$1",[N]),/adult admission/i)
  await assert.rejects(rpc(T,'review_student_enrollment',{p_student_id:N,p_approve:true,p_teacher_id:T,p_adult_verified:false}),/18\+/i)
  await assert.rejects(rpc(S,'create_student_invitation',{p_email:'new@example.test',p_adult_verified:true}),/teacher/i)
  await assert.rejects(rpc(T,'create_student_invitation',{p_email:'new@example.test'}),/adult/i)
  const invitation=await rpc(T,'create_student_invitation',{p_email:'new@example.test',p_adult_verified:true})
  const accepted=await rpc(N,'accept_student_invitation',{p_token:invitation.token})
  assert.equal(accepted.academic_access,true);assert.equal(accepted.adult_admitted,true)
  assert.equal((await rpc(N,'accept_student_invitation',{p_token:invitation.token})).academic_access,true)
  assert.equal((await db.query('select count(*)::int n from enrollments where student_id=$1',[N])).rows[0].n,1)
  assert.equal((await as(S,tx=>tx.query('select * from adult_admissions'))).rows.length,1)
  for(const name of ['_adult_previous_get_enrollment','_adult_previous_create_invitation','_adult_previous_accept_invitation','_adult_previous_review_enrollment']){
    const permitted=(await db.query("select has_function_privilege('authenticated',p.oid,'execute') ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1",[name])).rows[0]
    assert.equal(permitted.ok,false)
  }
  await db.query('update adult_admissions set verified_at=null,verified_by=null,method=\'pending\' where user_id=$1',[N])
  assert.equal((await rpc(N,'get_my_enrollment')).academic_access,false)
  await assert.rejects(rpc(N,'get_student_learning_journey',{p_student_id:N}),e=>e.code==='42501')
  assert.equal((await rpc(S2,'get_my_enrollment')).academic_access,true)
 }finally{await db.close()}
})
