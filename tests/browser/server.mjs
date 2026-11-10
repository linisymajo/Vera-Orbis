// Isolated API: real PostgreSQL migrations/RLS, fixture identities and in-memory
// bytes. This is not Supabase Auth or the Supabase Storage service.
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { PGlite } from '@electric-sql/pglite'
const db=new PGlite()
const actors={teacher:'10000000-0000-4000-8000-000000000001',teacher2:'10000000-0000-4000-8000-000000000002',student:'20000000-0000-4000-8000-000000000001',student2:'20000000-0000-4000-8000-000000000002'}
const {teacher,teacher2,student,student2}=actors
const objectBytes=new Map(),downloadTokens=new Map()
await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth,storage to authenticated,anon;
create table teachers(id uuid primary key references auth.users(id));
create table profiles(id uuid primary key references auth.users(id),name text,language text,level text,level_name text,progress int,lessons_completed int,current_module text,next_step text,interface_language text);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
alter table storage.objects enable row level security;
grant select,insert on storage.objects to authenticated;
grant select on storage.buckets,teachers,profiles to authenticated;`)
for(const id of Object.values(actors))await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@example.test'])
await db.query('insert into teachers values($1),($2)',[teacher,teacher2])
await db.query("insert into profiles(id,name,language) values($1,'Safe Test Student','French'),($2,'Unassigned Test Student','French')",[student,student2])
for(const name of ['0008_teacher_management_security_patch.sql','0004_exercise_studio.sql','0005_materials_storage_policy.sql','0009_academic_sync_challenges_feedback.sql','0010_inbox_messaging.sql','0011_material_office_formats.sql','0012_exercise_workflow.sql','0013_hybrid_enrollment.sql','0014_ai_drafts.sql','0015_material_owner_boundary.sql','0016_academic_teacher_scope.sql','0017_inbox_authorization.sql','0018_student_attachments.sql','0019_learning_plans.sql','0020_challenges_notifications.sql','0021_final_assessments.sql'])await db.exec(readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'))
await db.exec(readFileSync(new URL('../../supabase/migrations/0022_exercise_experience.sql',import.meta.url),'utf8'))
await db.exec(readFileSync(new URL('../../supabase/migrations/0023_legacy_exercise_feedback.sql',import.meta.url),'utf8'))
await db.exec('grant select,insert,update,delete on public.materials,public.classes,public.class_participants to authenticated')
const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'mpa'})
const rpcNames=new Set(['publish_exercise','submit_exercise','review_exercise_attempt','reserve_exercise_attachment','confirm_exercise_attachment','submit_exercise_with_attachments','revise_exercise_attachments','list_exercise_attachments','create_learning_plan_version','save_learning_plan_version','approve_learning_plan_version','set_learning_objective_completion','save_final_draft','publish_final_assessment','save_final_result','publish_final_result','review_academic_ai_draft','publish_academic_challenge','submit_academic_challenge','review_challenge_submission','mark_academic_notification_read'])
const tables=new Set(['exercises','profiles','exercise_assignments','exercise_attempts','student_exercises','materials','learning_plan_versions','learning_plan_objective_progress','learning_plan_objective_events','final_assessments','final_results','student_finals','weekly_challenges','challenge_submissions','student_challenge_submissions','challenge_publications','ai_academic_drafts','academic_notifications'])
const fieldNames=new Set(['id','teacher_id','status','exercise_id','student_id','version_id','objective_id','kind','recipient_id','read_at','created_at','updated_at','submitted_at','revision','version_number','name','title','assigned_at'])
for (const name of ['exercise_experience_capabilities','save_exercise_progress','get_exercise_practice_state','check_exercise_question','save_exercise_feedback','get_exercise_teacher_review']) rpcNames.add(name)
const json=(res,value)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))}
const server=http.createServer(async(req,res)=>{
  if(req.url?.startsWith('/__academic_test_file/')){
    const token=downloadTokens.get(req.url.slice('/__academic_test_file/'.length))
    const file=token&&token.expires>Date.now()?objectBytes.get(token.key):null
    if(!file){res.writeHead(404);res.end('Test file unavailable');return}
    res.setHeader('Content-Type',file.contentType)
    res.setHeader('Content-Disposition',`attachment; filename="${token.fileName.replace(/[^a-zA-Z0-9._-]/g,'_')}"`)
    res.end(file.bytes);return
  }
  if(req.url!=='/__academic_test'){vite.middlewares(req,res,()=>{res.writeHead(404);res.end()});return}
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16*1024*1024)throw Error('Test request too large')}
    const input=JSON.parse(body)
    if(input.reset===true){await db.exec('truncate public.exercises,public.learning_plan_versions,public.academic_ai_requests,public.academic_notifications,public.inbox_messages,public.classes,public.materials cascade;truncate storage.objects');objectBytes.clear();downloadTokens.clear();json(res,{data:{reset:true}});return}
    if(input.seedChallenge===true){
      // A static local draft tests review/publication without invoking an AI provider.
      const content={title:'A practical invitation',objective:'Use a personalized expression to invite a colleague.',language:'French',level:'A2',steps:['Listen','Repeat','Personalize','Use'].map(stage=>({stage,activity:stage+' an expression in a practical invitation.'})),exercise_type:null,questions:[],feedback:null}
      const request=(await db.query("insert into academic_ai_requests(teacher_id,student_id,kind,status) values($1,$2,'challenge','succeeded') returning id",[teacher,student])).rows[0].id
      const draft=(await db.query("insert into ai_academic_drafts(request_id,teacher_id,student_id,kind,content) values($1,$2,$3,'challenge',$4) returning id",[request,teacher,student,JSON.stringify(content)])).rows[0]
      json(res,{data:{id:draft.id}});return
    }
    const actor=actors[input.actor]
    if(!actor)throw Error('Test identity unavailable')
    let byteWrite=null
    const result=await db.transaction(async tx=>{
      await tx.exec('set local role authenticated')
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor])
      if(input.storage){
        if(!['academic-submissions','materials'].includes(input.bucket)||typeof input.path!=='string')throw Error('Test bucket unavailable')
        const key=input.bucket+'/'+input.path
        if(input.storage==='upload'){
          const bytes=Buffer.from(input.base64||'','base64')
          const bucket=(await tx.query('select * from storage.buckets where id=$1',[input.bucket])).rows[0]
          if(!bucket||bucket.public!==false||bytes.length<1||bytes.length>Number(bucket.file_size_limit)||!bucket.allowed_mime_types.includes(input.contentType))throw Error('Test Storage bucket rejected file metadata')
          await tx.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[input.bucket,input.path,JSON.stringify({size:bytes.length,mimetype:input.contentType})])
          byteWrite={key,bytes,contentType:input.contentType};return{data:{path:input.path}}
        }
        if(input.storage==='signedUrl'){
          const row=(await tx.query('select name from storage.objects where bucket_id=$1 and name=$2',[input.bucket,input.path])).rows[0]
          if(!row||!objectBytes.has(key))throw Error('Test download access denied')
          const file=input.bucket==='academic-submissions'?(await tx.query('select file_name from public.exercise_attachments where file_path=$1',[input.path])).rows[0]:null
          const token=crypto.randomUUID();downloadTokens.set(token,{key,fileName:file?.file_name||'attachment',expires:Date.now()+300000})
          // Materials UI requires HTTPS. Browser tests intercept this .invalid
          // sentinel and forward only its token to the isolated local byte API.
          const origin=input.bucket==='materials'?'https://academic-fixture.invalid':'http://127.0.0.1:5197'
          return{data:{signedUrl:`${origin}/__academic_test_file/${token}`}}
        }
        if(input.storage==='download'){
          const row=(await tx.query('select name from storage.objects where bucket_id=$1 and name=$2',[input.bucket,input.path])).rows[0]
          if(!row||!objectBytes.has(key))return{error:{message:'Test file not found or access denied',status:404}}
          const file=objectBytes.get(key);return{data:{base64:file.bytes.toString('base64'),contentType:file.contentType}}
        }
        throw Error('Test Storage operation unavailable')
      }
      if(input.rpc){
        if(!rpcNames.has(input.rpc))throw Error('Test RPC unsupported')
        const args=Object.entries(input.params || {}).map(([key,value])=>['p_answers','p_draft','p_criteria','p_scores','p_content'].includes(key)?JSON.stringify(value):value)
        const placeholders=args.map((_,i)=>`$${i+1}`).join(',')
        if(input.rpc==='list_exercise_attachments')return{data:(await tx.query(`select * from public.${input.rpc}(${placeholders})`,args)).rows}
        return{data:(await tx.query(`select public.${input.rpc}(${placeholders}) result`,args)).rows[0].result}
      }
      if(!tables.has(input.table))return{error:{message:'Test table unavailable'}}
      const args=[],where=[]
      for(const [key,value,operator='eq']of input.filters||[]){
        if(!fieldNames.has(key))throw Error('Test filter unsupported')
        if(operator==='is'&&value===null){where.push(`${key} is null`);continue}
        if(!['eq','in'].includes(operator))throw Error('Test filter operator unsupported')
        args.push(value);where.push(operator==='in'?`${key}=any($${args.length})`:`${key}=$${args.length}`)
      }
      const suffix=where.length?` where ${where.join(' and ')}`:''
      let sql
      if(input.mode==='insert'||input.mode==='update'){
        if(!['exercises','materials'].includes(input.table))throw Error('Test write unsupported')
        const keys=Object.keys(input.payload)
        const allowed=input.table==='materials'?['id','teacher_id','student_id','audience','title','type','description','language','level','file_path']:['id','title','teacher_id','language','level','objective','instructions','exercise_type','questions','settings','status']
        if(keys.some(k=>!allowed.includes(k)))throw Error('Test field unsupported')
        const placeholders=keys.map(k=>{args.push(['questions','settings'].includes(k)?JSON.stringify(input.payload[k]):input.payload[k]);return `$${args.length}`})
        sql=input.mode==='insert'?`insert into ${input.table}(${keys.join(',')}) values(${placeholders.join(',')}) returning *`:`update ${input.table} set ${keys.map((k,i)=>`${k}=${placeholders[i]}`).join(',')}${suffix} returning *`
      }else if(input.table==='exercise_attempts')sql='select t.*,to_jsonb(a) exercise_assignments from exercise_attempts t join exercise_assignments a on a.id=t.assignment_id order by t.submitted_at desc'
      else{
        const orders=(input.orders||[]).map(([key,ascending])=>{if(!fieldNames.has(key))throw Error('Test order unsupported');return`${key} ${ascending?'asc':'desc'}`})
        sql=`select * from ${input.table}${suffix}${orders.length?' order by '+orders.join(','):''}${Number.isInteger(input.limit)?' limit '+Math.min(2000,Math.max(1,input.limit)):''}`
      }
      const rows=(await tx.query(sql,args)).rows
      if(input.head)return{data:null,count:rows.length}
      if(input.single&&rows.length!==1)return{error:{message:'Expected one persisted row'}}
      if(input.maybeSingle)return rows.length>1?{error:{message:'Expected at most one persisted row'}}:{data:rows[0]||null}
      return{data:input.single?rows[0]:rows}
    })
    if(byteWrite)objectBytes.set(byteWrite.key,byteWrite)
    json(res,result)
  }catch(error){json(res,{error:{message:error.message}})}
})
server.listen(5197,'127.0.0.1',()=>console.log('Isolated browser fixture: http://127.0.0.1:5197/tests/browser/fixture.html'))
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await vite.close();await db.close();process.exit(0)})
