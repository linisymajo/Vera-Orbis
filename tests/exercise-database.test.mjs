import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const T='10000000-0000-4000-8000-000000000001', OTHER_T='10000000-0000-4000-8000-000000000002'
const S='20000000-0000-4000-8000-000000000001', OTHER_S='20000000-0000-4000-8000-000000000002'
const E='30000000-0000-4000-8000-000000000001'
const request='40000000-0000-4000-8000-000000000001'
const q=[{prompt:'Greet your colleague',options:['Bonjour','Au revoir'],answer:'Bonjour',explanation:'Private explanation',secret:'Private extra field'}]

test('actual PostgreSQL exercise workflow: atomic publish, private keys, retries, authorization and released feedback',async t=>{
  const db=new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated,anon;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text);
      grant select on public.teachers,public.profiles to authenticated;`)
    for(const id of [T,OTHER_T,S,OTHER_S])await db.query('insert into auth.users values($1,now())',[id])
    await db.query('insert into teachers values($1),($2)',[T,OTHER_T])
    await db.query("insert into profiles values($1,'Student'),($2,'Other student')",[S,OTHER_S])
    for(const migration of ['0004_exercise_studio.sql','0012_exercise_workflow.sql'])await db.exec(readFileSync(new URL(`../supabase/migrations/${migration}`,import.meta.url),'utf8'))
    async function as(user,work){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await work()}finally{await db.exec('reset role')}}
    await as(T,()=>db.query(`insert into exercises(id,teacher_id,title,language,exercise_type,questions) values($1,$2,'Greetings','French','multiple_choice',$3)`,[E,T,JSON.stringify(q)]))
    await t.test('unauthorized teacher cannot publish, failed assignment batch rolls back status',async()=>{
      await assert.rejects(as(OTHER_T,()=>db.query('select publish_exercise($1,$2,null)',[E,[S]])),/unavailable/)
      await assert.rejects(as(T,()=>db.query('select publish_exercise($1,$2,null)',[E,[S,'20000000-0000-4000-8000-000000000099']])),/access denied/)
      assert.equal((await db.query('select status from exercises where id=$1',[E])).rows[0].status,'draft')
      assert.equal((await db.query('select count(*)::int n from exercise_assignments')).rows[0].n,0)
    })
    await t.test('publish persists unique assignments, keys and unknown fields never reach students',async()=>{
      await as(T,()=>db.query('select publish_exercise($1,$2,null)',[E,[S]]))
      await as(T,()=>db.query('select publish_exercise($1,$2,null)',[E,[S,S]]))
      assert.equal((await db.query('select count(*)::int n from exercise_assignments')).rows[0].n,1)
      const view=await as(S,()=>db.query('select * from student_exercises'))
      assert.equal(view.rows.length,1)
      assert.deepEqual(view.rows[0].questions,[{prompt:q[0].prompt,options:q[0].options}])
      assert.equal((await as(OTHER_S,()=>db.query('select * from student_exercises'))).rows.length,0)
      assert.equal((await as(S,()=>db.query('select * from exercises'))).rows.length,0)
    })
    await t.test('direct assignment changes cannot bypass atomic publication authorization',async()=>{
      await assert.rejects(as(T,()=>db.query('insert into exercise_assignments(exercise_id,teacher_id,student_id) values($1,$2,$3)',[E,T,OTHER_S])),/permission denied/)
      await assert.rejects(as(T,()=>db.query("update exercise_assignments set status='revoked' where exercise_id=$1",[E])),/permission denied/)
      await assert.rejects(as(T,()=>db.query('delete from exercise_assignments where exercise_id=$1',[E])),/permission denied/)
      assert.equal((await db.query("select count(*)::int n from exercise_assignments where status='assigned'")).rows[0].n,1)
    })
    const assignment=(await db.query('select id from exercise_assignments')).rows[0].id
    const answers=[{index:0,answer:'Bonjour'}]
    let attempt
    await t.test('invalid, cross-student and direct-table attempts fail; retry is idempotent',async()=>{
      await assert.rejects(as(OTHER_S,()=>db.query('select submit_exercise($1,$2,$3)',[assignment,JSON.stringify(answers),request])),/unavailable/)
      await assert.rejects(as(S,()=>db.query('select submit_exercise($1,$2,$3)',[assignment,'[]',request])),/every question/)
      await assert.rejects(as(S,()=>db.query('insert into exercise_attempts(assignment_id,student_id,answers) values($1,$2,$3)',[assignment,S,JSON.stringify(answers)])),/permission denied/)
      attempt=(await as(S,()=>db.query('select submit_exercise($1,$2,$3) result',[assignment,JSON.stringify(answers),request]))).rows[0].result.id
      const retry=await as(S,()=>db.query('select submit_exercise($1,$2,$3) result',[assignment,JSON.stringify(answers),request]))
      assert.equal(retry.rows[0].result.id,attempt)
      assert.equal((await db.query('select count(*)::int n from exercise_attempts')).rows[0].n,1)
      assert.equal((await db.query('select status from exercise_assignments')).rows[0].status,'completed')
      await assert.rejects(as(S,()=>db.query('select submit_exercise($1,$2,$3)',[assignment,JSON.stringify([{index:0,answer:'Au revoir'}]),request])),/different answers/)
      await assert.rejects(as(S,()=>db.query('select submit_exercise($1,$2,gen_random_uuid())',[assignment,JSON.stringify(answers)])),/Maximum attempts/)
    })
    await t.test('teacher receives actual response, draft feedback stays private until released',async()=>{
      assert.equal((await as(T,()=>db.query('select answers from exercise_attempts'))).rows[0].answers[0].answer,'Bonjour')
      assert.equal((await as(OTHER_T,()=>db.query('select * from exercise_attempts'))).rows.length,0)
      await as(T,()=>db.query('select review_exercise_attempt($1,$2,false)',[attempt,'Try personalizing your greeting.']))
      assert.equal((await as(S,()=>db.query('select feedback from student_exercises'))).rows[0].feedback,null)
      await assert.rejects(as(OTHER_T,()=>db.query('select review_exercise_attempt($1,$2,true)',[attempt,'Spoofed'])),/denied/)
      await as(T,()=>db.query('select review_exercise_attempt($1,$2,true)',[attempt,'Try personalizing your greeting.']))
      assert.equal((await as(S,()=>db.query('select feedback from student_exercises'))).rows[0].feedback,'Try personalizing your greeting.')
      assert.equal((await as(S,()=>db.query('select * from exercise_attempts'))).rows.length,0)
    })
    await t.test('malformed matching and ordering lists are rejected before publication',async()=>{
      const invalidMatching=[
        {left:['one'],right:['uno']},
        {left:['one','two'],right:['uno']},
        {left:['one','two'],right:['uno',null]},
        {left:['one','two'],right:['uno',{}]},
        {left:['one',' '],right:['uno','dos']},
        {left:['one','two'],right:['uno','x'.repeat(4001)]},
        {left:Array(101).fill('one'),right:Array(101).fill('uno')}
      ]
      for(const fields of invalidMatching){
        await assert.rejects(db.query('select validate_exercise_questions($1,$2)', ['matching',JSON.stringify([{prompt:'Match the expressions',...fields}])]),/Matching|matching/)
      }
      for(const items of [[],['one'],['one',null],['one',{}],['one',' '],['one','x'.repeat(4001)],Array(101).fill('one')]){
        await assert.rejects(db.query('select validate_exercise_questions($1,$2)', ['ordering',JSON.stringify([{prompt:'Build a sentence',items}])]),/blocks|strings/)
      }
    })
    await t.test('matching submissions validate every choice and preserve delimiter-containing labels',async()=>{
      const matchingId='30000000-0000-4000-8000-000000000002'
      const questions=[{prompt:'Match each expression',left:['First','Second'],right:['one | uno','two']}]
      await as(T,()=>db.query("insert into exercises(id,teacher_id,title,language,exercise_type,questions) values($1,$2,'Match expressions','English','matching',$3)",[matchingId,T,JSON.stringify(questions)]))
      await as(T,()=>db.query('select publish_exercise($1,$2,null)',[matchingId,[OTHER_S]]))
      const matchingAssignment=(await db.query('select id from exercise_assignments where exercise_id=$1',[matchingId])).rows[0].id
      const badAnswers=['one | uno','null','{}','"one"','[]',JSON.stringify(['one | uno']),JSON.stringify(['one | uno','']),JSON.stringify(['one | uno',null]),JSON.stringify(['one | uno',{}]),JSON.stringify(['one | uno','unknown'])]
      for(const answer of badAnswers){
        await assert.rejects(as(OTHER_S,()=>db.query('select submit_exercise($1,$2,gen_random_uuid())',[matchingAssignment,JSON.stringify([{index:0,answer}])])),/Matching|matching|available option/)
      }
      assert.equal((await db.query('select count(*)::int n from exercise_attempts where assignment_id=$1',[matchingAssignment])).rows[0].n,0)
      const validAnswer=JSON.stringify(['one | uno','two'])
      const saved=await as(OTHER_S,()=>db.query('select submit_exercise($1,$2,gen_random_uuid()) result',[matchingAssignment,JSON.stringify([{index:0,answer:validAnswer}])]))
      assert.ok(saved.rows[0].result.id)
      assert.equal((await db.query('select answers from exercise_attempts where id=$1',[saved.rows[0].result.id])).rows[0].answers[0].answer,validAnswer)
    })
    await t.test('invalid published exercises rejected and unpublish removes student visibility',async()=>{
      await assert.rejects(as(T,()=>db.query("update exercises set questions='[]' where id=$1",[E])),/1 and 100/)
      await as(T,()=>db.query("update exercises set status='draft' where id=$1",[E]))
      assert.equal((await as(S,()=>db.query('select * from student_exercises'))).rows.length,0)
      await assert.rejects(as(S,()=>db.query('select submit_exercise($1,$2,gen_random_uuid())',[assignment,JSON.stringify(answers)])),/unavailable/)
    })
    await t.test('submission snapshots preserve original questions after later edits and republication',async()=>{
      const snapshot=(await as(T,()=>db.query('select exercise_snapshot from exercise_attempts where id=$1',[attempt]))).rows[0].exercise_snapshot
      assert.equal(snapshot.title,'Greetings')
      assert.deepEqual(snapshot.questions,q)
      const edited=[{prompt:'Choose a farewell',options:['Au revoir','Salut'],answer:'Au revoir'}]
      await as(T,()=>db.query("update exercises set title='Farewell expressions',questions=$1 where id=$2",[JSON.stringify(edited),E]))
      await as(T,()=>db.query('select publish_exercise($1,$2,null)',[E,[S]]))
      assert.equal((await as(S,()=>db.query('select title from student_exercises where exercise_id=$1',[E]))).rows[0].title,'Farewell expressions')
      const retained=(await as(T,()=>db.query('select exercise_snapshot from exercise_attempts where id=$1',[attempt]))).rows[0].exercise_snapshot
      assert.deepEqual(retained,snapshot)
      assert.equal((await as(S,()=>db.query('select exercise_snapshot from exercise_attempts where id=$1',[attempt]))).rows.length,0)
    })
  }finally{await db.close()}
})