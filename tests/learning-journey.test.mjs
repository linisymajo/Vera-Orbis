import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { unifiedAcademicFixture, T, T2, S, S2 } from './fixtures/unified-academic-db.mjs'
import { prepareRemainingPlan, prepareLessonExercise } from '../src/lib/academicPreparation.js'
import { normalizeJourney, journeyLessonState } from '../src/lib/learningJourney.js'
const settings = { language:'English',level:'B1',goal:'Practical travel conversations',total:12,completed:5,duration:60,priorities:'',excluded:[],corrections:{},confirmed:true }
test('deterministic preparation produces exactly seven editable lessons and no invented evidence', () => {
  const p=prepareRemainingPlan(settings,[])
  assert.equal(p.objectives.length,7); assert.match(p.summary,/No AI inference/); assert.equal(p.architect.provisional,true)
  assert.equal(new Set(p.objectives.map(o=>o.id)).size,7)
  assert.equal(p.architect.sessions[0].minutes.reduce((a,b)=>a+b),60)
  assert.equal(journeyLessonState({class:{starts_at:'2000-01-01',status:'scheduled'},exercises:[]}), 'upcoming')
  assert.equal(journeyLessonState({exercises:[{submitted:true}]}),'in_progress')
  assert.equal(journeyLessonState({progress:{completed:true,teacher_recorded:false}}),'upcoming')
})
test('published Journey follows actual assignments, completion and revisions with scoped RLS', async () => {
  const f=await unifiedAcademicFixture();const {db,rpc}=f
  try {
    await db.exec(await readFile(new URL('../supabase/migrations/0029_personal_learning_journey.sql',import.meta.url),'utf8'))
    let v=await rpc(T,'create_learning_plan_version',{p_student_id:S,p_request_id:crypto.randomUUID()})
    v=await rpc(T,'save_learning_plan_version',{p_version_id:v.id,p_expected_revision:v.revision,p_content:prepareRemainingPlan(settings,[])})
    const feed=actor=>rpc(actor,'get_student_learning_journey',{p_student_id:S})
    assert.equal((await feed(S)).plans.length,0)
    v=await rpc(T,'approve_learning_plan_version',{p_version_id:v.id,p_expected_revision:v.revision})
    assert.equal((await feed(S)).plans.length,0,'approved Architect stays private until publication')
    const cls=(await db.query("insert into classes(teacher_id,title,starts_at,status,notes) values($1,'Synthetic real class',now()-interval '7 days','scheduled','PRIVATE_TEACHER_NOTES_CANARY') returning id",[T])).rows[0].id
    await db.query('insert into class_participants(class_id,teacher_id,student_id) values($1,$2,$3)',[cls,T,S])
    const material=(await db.query("insert into materials(teacher_id,student_id,title,file_path,language) values($1,$2,'Permitted lesson slides',$3,'English') returning id",[T,S,T+'/private.pptx'])).rows[0].id
    const pkg=(await db.query("insert into packages(teacher_id,name,class_count) values($1,'Synthetic twelve classes',12) returning id",[T])).rows[0].id
    const course=(await db.query('insert into student_packages(teacher_id,student_id,package_id) values($1,$2,$3) returning assignment_id',[T,S,pkg])).rows[0].assignment_id
    const oid=v.content.objectives[0].id
    let binding=await rpc(T,'save_learning_journey_binding',{p_version_id:v.id,p_expected_revision:0,p_package_assignment_id:course,p_lessons:{[oid]:{class_id:cls,material_ids:[material]}}})
    assert.equal(binding.revision,1)
    await assert.rejects(rpc(T2,'get_learning_journey_binding',{p_version_id:v.id}),/Authorized/)
    await assert.rejects(feed(S2),/Authorized/);await assert.rejects(feed(T2),/Authorized/)
    await rpc(T,'publish_learning_architect_plan',{p_version_id:v.id})
    let data=normalizeJourney(await feed(S));assert.equal(data.plans[0].lessons.length,7);assert.equal(data.plans[0].lessons[0].state,'current')
    assert.equal(data.plans[0].lessons[0].materials[0].title,'Permitted lesson slides');assert.equal(data.plans[0].course.id,course)
    assert.doesNotMatch(JSON.stringify(data),/PRIVATE_TEACHER_NOTES_CANARY|private.pptx|teacher_id|source_snapshot|needs|adaptations/)
    const draft=prepareLessonExercise({...v,published_at:'now'},0,S)
    const exercise=(await f.as(T,tx=>tx.query('insert into exercises(teacher_id,title,language,exercise_type,questions,settings) values($1,$2,$3,$4,$5,$6) returning id',[T,draft.title,draft.language,draft.exercise_type,JSON.stringify(draft.questions),JSON.stringify(draft.settings)]))).rows[0].id
    await rpc(T,'publish_exercise',{p_exercise_id:exercise,p_student_ids:[S],p_due_at:null})
    await rpc(T,'publish_exercise',{p_exercise_id:exercise,p_student_ids:[S],p_due_at:null})
    const sameTeacherStudent=crypto.randomUUID()
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'synthetic-second@example.test',now())",[sameTeacherStudent])
    await db.query("insert into profiles(id,name) values($1,'Synthetic second student') on conflict(id) do nothing",[sameTeacherStudent])
    await db.query("update enrollments set teacher_id=$1,status='approved',source='self' where student_id=$2",[T,sameTeacherStudent])
    await assert.rejects(rpc(T,'publish_exercise',{p_exercise_id:exercise,p_student_ids:[sameTeacherStudent],p_due_at:null}),/different student/)
    data=normalizeJourney(await feed(S));const assignment=data.plans[0].lessons[0].exercises[0].assignment_id
    assert.equal(data.plans[0].lessons[0].exercises.length,1)
    const answer=await rpc(S,'submit_exercise',{p_assignment_id:assignment,p_answers:[{index:0,answer:'A useful travel exchange'}],p_request_id:crypto.randomUUID()})
    await rpc(T,'review_exercise_attempt',{p_attempt_id:answer.id,p_feedback:'PRIVATE_FEEDBACK_CANARY',p_release:false})
    data=normalizeJourney(await feed(S));assert.equal(data.plans[0].lessons[0].state,'in_progress');assert.doesNotMatch(JSON.stringify(data),/PRIVATE_FEEDBACK_CANARY/)
    await rpc(T,'review_exercise_attempt',{p_attempt_id:answer.id,p_feedback:'Your exchange is clear.',p_release:true})
    assert.match(JSON.stringify(await feed(S)),/Your exchange is clear/)
    await db.query("update classes set status='completed' where id=$1",[cls])
    data=normalizeJourney(await feed(S));assert.equal(data.plans[0].lessons[0].state,'in_progress','class needs verified attendance')
    await db.query("insert into class_attendance(class_id,student_id,status) values($1,$2,'present')",[cls,S])
    data=normalizeJourney(await feed(S));assert.equal(data.plans[0].lessons[0].state,'completed')
    let next=await rpc(T,'create_learning_plan_version',{p_student_id:S,p_base_version_id:v.id,p_request_id:crypto.randomUUID()})
    next.content.objectives.reverse();next.content.architect.sessions.reverse()
    next=await rpc(T,'save_learning_plan_version',{p_version_id:next.id,p_expected_revision:next.revision,p_content:next.content})
    next=await rpc(T,'approve_learning_plan_version',{p_version_id:next.id,p_expected_revision:next.revision})
    assert.equal((await feed(S)).plans[0].id,v.id,'private revision does not replace published roadmap')
    await rpc(T,'publish_learning_architect_plan',{p_version_id:next.id})
    data=normalizeJourney(await feed(S));const lessons=data.plans.flatMap(p=>p.lessons)
    assert.equal(lessons.length,7,'revision does not duplicate roadmap cards');assert.equal(lessons.find(l=>l.objective_id===oid).state,'completed')
    assert.equal(lessons.find(l=>l.objective_id===oid).exercises.length,1,'existing assignment follows stable lesson after reorder')
    const current=data.plans[0];assert.equal(current.lessons.at(-1).objective_id,oid)
    binding=await rpc(T,'get_learning_journey_binding',{p_version_id:next.id});assert.equal(binding.inherited,true)
    await assert.rejects(rpc(S,'save_learning_journey_binding',{p_version_id:next.id,p_expected_revision:0,p_package_assignment_id:course,p_lessons:{}}),/Authorized/)
    await assert.rejects(f.as(S,tx=>tx.query('select public._learning_journey_binding($1)',[next.id])),/permission/)
    assert.equal((await f.as(S,tx=>tx.query('select * from learning_journey_bindings'))).rows.length,0)
    await assert.rejects(rpc(T,'save_learning_journey_binding',{p_version_id:v.id,p_expected_revision:0,p_package_assignment_id:course,p_lessons:{}}),/changed/)
  } finally { await db.close() }
})
