import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
const T='10000000-0000-4000-8000-000000000001',S='20000000-0000-4000-8000-000000000001',O='20000000-0000-4000-8000-000000000002'
const E='30000000-0000-4000-8000-000000000001',F='40000000-0000-4000-8000-000000000001',R='50000000-0000-4000-8000-000000000001'
const answers=[{index:0,answer:'Bonjour, my name is Vera.'}]
const sql=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')
test('actual PostgreSQL attachment lifecycle: required modes, verified private uploads, submission and immutable revisions',async t=>{
 const db=new PGlite()
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn()}finally{await db.exec('reset role')}}
 let assignment,filePath,attempt
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
   create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth,storage to authenticated,anon;
   create table teachers(id uuid primary key references auth.users(id));create table profiles(id uuid primary key references auth.users(id),name text);
   grant select on teachers,profiles to authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),name text,bucket_id text,metadata jsonb,unique(bucket_id,name));
   alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;`)
  for(const id of[T,S,O])await db.query('insert into auth.users values($1,now())',[id])
  await db.query('insert into teachers values($1)',[T]);await db.query("insert into profiles values($1,'Student'),($2,'Other')",[S,O])
  for(const name of['0004_exercise_studio.sql','0012_exercise_workflow.sql','0018_student_attachments.sql'])await db.exec(sql(name))
  await db.exec(sql('0018_student_attachments.sql'))
  await as(T,()=>db.query("insert into exercises(id,teacher_id,title,language,exercise_type,questions,settings) values($1,$2,'Introduce yourself','French','writing',$3,$4)",[E,T,JSON.stringify([{prompt:'Greet a colleague and introduce yourself.'}]),JSON.stringify({attachment_mode:'required',allow_attachment_revisions:true})]))
  await as(T,()=>db.query('select publish_exercise($1,$2,null)',[E,[S]]))
  assignment=(await db.query('select id from exercise_assignments')).rows[0].id
  await t.test('required files cannot be bypassed by old submit RPC or raw table writes',async()=>{
   await assert.rejects(as(S,()=>db.query('select submit_exercise($1,$2,$3)',[assignment,JSON.stringify(answers),R])),/requires an attachment/)
   await assert.rejects(as(S,()=>db.query('select _submit_exercise_answers($1,$2,$3)',[assignment,JSON.stringify(answers),R])),/permission denied/)
   assert.equal((await db.query('select count(*)::int n from exercise_attempts')).rows[0].n,0)
  })
  await t.test('file reservation binds identity, type, size, assignment and confirmed Storage metadata',async()=>{
   await assert.rejects(as(O,()=>db.query("select reserve_exercise_attachment($1,'work.pdf','application/pdf',20,$2)",[assignment,F])),/unavailable/)
   await assert.rejects(as(S,()=>db.query("select reserve_exercise_attachment($1,'work.exe','application/pdf',20,$2)",[assignment,F])),/Unsupported/)
   await assert.rejects(as(S,()=>db.query("select reserve_exercise_attachment($1,'work.pdf','application/pdf',10485761,$2)",[assignment,F])),/10 MiB/)
   const file=(await as(S,()=>db.query("select reserve_exercise_attachment($1,'work.pdf','application/pdf',20,$2) data",[assignment,F]))).rows[0].data
   filePath=file.file_path;assert.ok(filePath.startsWith(`${S}/${assignment}/`))
   await assert.rejects(as(S,()=>db.query('select confirm_exercise_attachment($1)',[F])),/not confirmed/)
   await as(S,()=>db.query("insert into storage.objects(name,bucket_id,metadata) values($1,'academic-submissions',$2)",[filePath,JSON.stringify({size:19,mimetype:'application/pdf'})]))
   await assert.rejects(as(S,()=>db.query('select confirm_exercise_attachment($1)',[F])),/does not match/)
   await db.query("update storage.objects set metadata=$2 where name=$1",[filePath,JSON.stringify({size:20,mimetype:'application/pdf'})])
   assert.equal((await as(S,()=>db.query('select confirm_exercise_attachment($1) data',[F]))).rows[0].data.status,'uploaded')
   assert.equal((await as(T,()=>db.query('select * from list_exercise_attachments($1)',[assignment]))).rows.length,0,'Unsubmitted work remains private')
  })
  await t.test('submission attaches verified files atomically, retry is idempotent, teacher can review',async()=>{
   const result=(await as(S,()=>db.query('select submit_exercise_with_attachments($1,$2,$3,$4) data',[assignment,JSON.stringify(answers),R,[F]]))).rows[0].data
   attempt=result.id
   const retry=(await as(S,()=>db.query('select submit_exercise_with_attachments($1,$2,$3,$4) data',[assignment,JSON.stringify(answers),R,[F]]))).rows[0].data
   assert.equal(retry.id,attempt)
   assert.equal((await db.query('select count(*)::int n from exercise_attempts')).rows[0].n,1)
   const files=(await as(T,()=>db.query('select * from list_exercise_attachments($1)',[assignment]))).rows
   assert.equal(files[0].file_name,'work.pdf');assert.equal(files[0].is_current,true)
   assert.equal((await as(S,()=>db.query("select * from storage.objects where name=$1",[filePath]))).rows.length,1)
   assert.equal((await as(T,()=>db.query("select * from storage.objects where name=$1",[filePath]))).rows.length,1)
   assert.equal((await as(O,()=>db.query("select * from storage.objects where name=$1",[filePath]))).rows.length,0)
  })
  await t.test('permitted replacement creates history and cannot replace or delete existing file bytes',async()=>{
   const second=crypto.randomUUID(),revision=crypto.randomUUID()
   const file=(await as(S,()=>db.query("select reserve_exercise_attachment($1,'revised.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',30,$2) data",[assignment,second]))).rows[0].data
   await as(S,()=>db.query("insert into storage.objects(name,bucket_id,metadata) values($1,'academic-submissions',$2)",[file.file_path,JSON.stringify({size:30,mimetype:file.mime_type})]))
   await as(S,()=>db.query('select confirm_exercise_attachment($1)',[second]))
   const updated=(await as(S,()=>db.query('select revise_exercise_attachments($1,$2,$3) data',[attempt,[second],revision]))).rows[0].data
   assert.equal(updated.version_number,2)
   assert.equal((await as(S,()=>db.query('select revise_exercise_attachments($1,$2,$3) data',[attempt,[second],revision]))).rows[0].data.version_number,2)
   const files=(await as(T,()=>db.query('select * from list_exercise_attachments($1)',[assignment]))).rows
   assert.equal(files.length,2);assert.equal(files.find(f=>f.id===F).is_current,false)
   await as(S,()=>db.query("delete from storage.objects where name=$1",[filePath]))
   await as(S,()=>db.query("update storage.objects set metadata='{}' where name=$1",[filePath]))
   assert.equal((await db.query('select metadata from storage.objects where name=$1',[filePath])).rows[0].metadata.size,20)
   await as(T,()=>db.query("update exercises set settings=settings||'{\"allow_attachment_revisions\":false}'::jsonb where id=$1",[E]))
   await assert.rejects(as(S,()=>db.query('select revise_exercise_attachments($1,$2,gen_random_uuid())',[attempt,[F]])),/disabled/)
  })
  await t.test('disabled mode rejects upload and the safe student view exposes no raw settings',async()=>{
   const row=(await as(S,()=>db.query('select * from student_exercises'))).rows[0]
   assert.equal(row.attachment_mode,'required');assert.equal(row.latest_attempt_id,attempt);assert.equal(row.settings,undefined)
   await as(T,()=>db.query("update exercises set settings=settings||'{\"attachment_mode\":\"none\"}'::jsonb where id=$1",[E]))
   await assert.rejects(as(S,()=>db.query("select reserve_exercise_attachment($1,'work.pdf','application/pdf',20,gen_random_uuid())",[assignment])),/disabled/)
  })
 }finally{await db.close()}
})