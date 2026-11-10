import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { buildMigrationManifest, compatibilityColumns, inspectionQueries } from '../scripts/staging-core.mjs'
import { approvedInspectionProjectRef, runStagingInspection, inspectMetadataFindings, supplementalInspectionQueries } from '../scripts/staging-inspect-core.mjs'

const ref='duinvkphfnugoyvvlbbq', secret='synthetic-inspection-password-do-not-log'
const env=()=>({VERA_STAGING_PROJECT_REF:ref,VERA_STAGING_PROJECT_NAME:'vera-orbis-staging',VERA_STAGING_ACK:'read-only-preflight',VERA_STAGING_DB_URL:`postgresql://postgres:${secret}@db.${ref}.supabase.co:5432/postgres?sslmode=verify-full`})
function snapshot(){return {
  relations:Object.keys(compatibilityColumns).map(relation=>({relation,rls:true,force_rls:false})),
  columns:[...Object.entries(compatibilityColumns).flatMap(([relation,fields])=>Object.entries(fields).map(([column_name,data_type])=>({relation,column_name,data_type}))),
    {relation:'supabase_migrations.schema_migrations',column_name:'version',data_type:'text'},{relation:'supabase_migrations.schema_migrations',column_name:'name',data_type:'text'}],
  policies:Object.keys(compatibilityColumns).filter(relation=>relation.startsWith('public.')||relation==='storage.objects').map(relation=>({relation,policyname:'test scoped policy',cmd:'SELECT',permissive:'PERMISSIVE',roles:['authenticated'],qual:'id=auth.uid()',with_check:null})),
  grants:[],column_grants:[],history:[['0002','teacher_operations'],['0004','exercise_studio'],['0005','materials_storage_policy'],['0006','interface_language'],['0007','teacher_management_enhancements'],['0008','teacher_management_security_patch'],['0009','academic_sync_challenges_feedback'],['0010','inbox_messaging']].map(([version,name])=>({version,name})),
  ledger:[],buckets:[{id:'materials',public:false,file_size_limit:10485760,allowed_mime_types:['application/pdf']}]
}}
function supplemental(){return {capabilities:[{auth_uid:true,storage_foldername:true,random_uuid:true,sha256:true}],owners:[],roles:[{role:'postgres',superuser:false,bypass_rls:true,inherits_roles:true}],
  constraints:[{relation:'public.exercise_assignments',name:'exercise_owner_fk',type:'f',validated:true,columns:['exercise_id','teacher_id'],referenced_relation:'public.exercises',referenced_columns:['id','teacher_id']}],
  indexes:[{relation:'public.exercise_assignments',name:'assignment_unique',unique_index:true,valid:true,ready:true,partial:false,columns:['exercise_id','student_id']}],functions:[],function_grants:[],views:[],schemas:[{schema:'public',owner:'postgres',anon_create:false,authenticated_create:false}]}}
function clientDouble({state=snapshot(),extra=supplemental(),marker=false,history=true,markerRows=null,session={database:'postgres',server_version_num:'170000',read_only:'on'}}={}){
  const calls=[],data=new Map([
    [inspectionQueries.session,[session]],[inspectionQueries.markerExists,[{present:marker}]],
    [inspectionQueries.marker,markerRows||[{environment:'staging',project_ref:ref,project_name:'vera-orbis-staging'}]],
    [inspectionQueries.historyExists,[{present:history}]],[inspectionQueries.ledgerExists,[{present:false}]],
    ...Object.entries(state).map(([key,value])=>[inspectionQueries[key],value]),...Object.entries(extra).map(([key,value])=>[supplementalInspectionQueries[key],value])
  ])
  return {calls,connect:async()=>{calls.push('CONNECT-DOUBLE')},end:async()=>{calls.push('END-DOUBLE')},query:async sql=>{
    calls.push(sql)
    const wrapped=sql.match(/^select \* from \(([\s\S]+)\) staging_metadata limit \d+$/)
    return {rows:data.get(wrapped?wrapped[1]:sql)||[]}
  }}
}

test('inspection requires an explicit user-approved pin and matching env before creating a client',async()=>{
  const manifest=await buildMigrationManifest();let constructed=false
  for(const [expectedProjectRef,environment] of [[undefined,env()],['abcdefghijklmnopqrst',env()],[ref,{}],[ref,{...env(),VERA_STAGING_PROJECT_REF:'abcdefghijklmnopqrst'}],[ref,{...env(),VERA_STAGING_DB_URL:`postgresql://postgres:${secret}@db.abcdefghijklmnopqrst.supabase.co/postgres`}]] ){
    await assert.rejects(runStagingInspection({env:environment,expectedProjectRef,manifest,clientFactory:()=>{constructed=true}}))
    assert.equal(constructed,false)
  }
  assert.equal(approvedInspectionProjectRef,ref)
})

test('missing marker is informational during pinned inspection; no write or approval is produced',async()=>{
  const client=clientDouble(),manifest=await buildMigrationManifest()
  const report=await runStagingInspection({env:env(),expectedProjectRef:ref,manifest,clientFactory:async()=>client})
  assert.equal(report.migrations_approved,false);assert.equal(report.ready_to_apply,false)
  assert.equal(report.identity.marker_present,false)
  assert.equal(report.baseline.metadata_ready_for_human_review,true)
  assert.equal(report.baseline.exact_data_impact_counts_checked,false)
  assert.equal(report.release_plan.length,11)
  assert.equal(JSON.stringify(report).includes(secret),false)
  assert.deepEqual(client.calls.slice(-2),['ROLLBACK','END-DOUBLE'])
  assert.ok(client.calls.includes('BEGIN READ ONLY'))
  for(const sql of client.calls.filter(sql=>!sql.endsWith('-DOUBLE'))){
    assert.ok(/^select /i.test(sql)||['BEGIN READ ONLY','ROLLBACK',"SET LOCAL statement_timeout='5000ms'","SET LOCAL lock_timeout='1000ms'"].includes(sql),sql)
    assert.doesNotMatch(sql,/pg_get_functiondef|\bprosrc\b|column_default|pg_attrdef|pg_get_viewdef|auth\.users\s+(?:where|limit)|password/i)
  }
})

test('conflicting existing marker or writable transaction stops before schema collection',async()=>{
  const manifest=await buildMigrationManifest()
  for(const options of [{marker:true,markerRows:[{environment:'production',project_ref:ref,project_name:'vera-orbis-staging'}]},{session:{database:'postgres',server_version_num:'170000',read_only:'off'}}]){
    const client=clientDouble(options)
    await assert.rejects(runStagingInspection({env:env(),expectedProjectRef:ref,manifest,clientFactory:async()=>client}))
    assert.ok(!client.calls.some(sql=>sql.includes(inspectionQueries.relations)))
    assert.ok(client.calls.includes('ROLLBACK'))
  }
})

test('managed-only schema stays blocked without fabricating a baseline or history',async()=>{
  const state=snapshot();state.relations=state.relations.filter(row=>!row.relation.startsWith('public.'));state.columns=state.columns.filter(row=>!row.relation.startsWith('public.'));state.policies=[];state.buckets=[]
  const client=clientDouble({state,history:false,extra:{...supplemental(),constraints:[],indexes:[]}})
  const report=await runStagingInspection({env:env(),expectedProjectRef:ref,manifest:await buildMigrationManifest(),clientFactory:async()=>client})
  assert.equal(report.baseline.application_state,'no_public_application_tables_detected')
  assert.ok(report.baseline.blockers.some(row=>row.code==='MIGRATION_HISTORY_MISSING'))
  assert.ok(report.baseline.blockers.some(row=>row.code==='BASELINE_RELATION_MISSING'))
  assert.ok(report.release_plan.every(row=>row.recorded_applied==='unknown'))
  assert.equal(report.ready_to_apply,false)
})

test('partial releases without history, missing ownership/unique keys and writable schemas are flagged',()=>{
  const state=snapshot(),extra=supplemental()
  state.relations.push({relation:'public.enrollments',rls:true},{relation:'public.exercise_attachments',rls:true},{relation:'public.final_results',rls:true})
  state.columns.push({relation:'public.exercise_attempts',column_name:'exercise_snapshot',data_type:'jsonb'})
  extra.indexes=[];extra.constraints=[];extra.schemas[0].authenticated_create=true
  const found=inspectMetadataFindings(state,extra)
  for(const version of ['0012','0013','0018','0021'])assert.ok(found.some(row=>row.code==='RELEASE_OBJECT_WITHOUT_HISTORY'&&row.version===version),version)
  for(const code of ['ASSIGNMENT_UNIQUE_KEY_MISSING','EXERCISE_OWNERSHIP_FOREIGN_KEY_MISSING','CLIENT_SCHEMA_CREATE_PRIVILEGE'])assert.ok(found.some(row=>row.code===code),code)
})

test('connection and metadata failures never expose driver/server secrets',async()=>{
  const manifest=await buildMigrationManifest(),client=clientDouble()
  client.connect=async()=>{throw new Error(secret)}
  await assert.rejects(runStagingInspection({env:env(),expectedProjectRef:ref,manifest,clientFactory:async()=>client}),error=>error.code==='INSPECTION_CONNECTION_OR_METADATA_FAILED'&&!error.message.includes(secret))
  await assert.rejects(runStagingInspection({env:env(),expectedProjectRef:ref,manifest,clientFactory:async()=>{throw new Error(secret)}}),error=>error.code==='INSPECTION_CONNECTION_OR_METADATA_FAILED'&&!error.message.includes(secret))
})

test('CLI has no default target or implicit connection command',()=>{
  assert.throws(()=>execFileSync(process.execPath,['scripts/staging-inspect.mjs'],{encoding:'utf8',stdio:'pipe',env:{PATH:process.env.PATH||''}}),error=>error.status===1&&error.stderr.includes('INSPECTION_ARGUMENTS_REQUIRED')&&!error.stderr.includes(secret))
})

test('actual local PostgreSQL inspects markerless staging metadata, ownership, unique/FK relationships and function/view security',async()=>{
  const {PGlite}=await import('@electric-sql/pglite'),database=new PGlite()
  const ident=value=>'"'+value.replaceAll('"','""')+'"'
  let ended=false
  try{
    await database.exec('create role anon;create role authenticated;create schema auth;create schema storage;create schema supabase_migrations;')
    for(const [relation,columns] of Object.entries(compatibilityColumns)){
      const table=relation.split('.').map(ident).join('.')
      const fields=Object.entries(columns).map(([column,type])=>ident(column)+' '+(type==='ARRAY'?'text[]':type)).join(',')
      await database.exec('create table '+table+'('+fields+')')
      if(relation.startsWith('public.')||relation==='storage.objects')await database.exec('alter table '+table+' enable row level security;create policy scoped_test on '+table+' for select to authenticated using(true);')
    }
    await database.exec(`create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:1]$$;
      alter table public.exercises add unique(id,teacher_id);
      alter table public.exercise_assignments add unique(exercise_id,student_id);
      alter table public.exercise_assignments add foreign key(exercise_id,teacher_id) references public.exercises(id,teacher_id);
      create table supabase_migrations.schema_migrations(version text,name text);
      create function public.inspection_fixture() returns integer language sql security definer set search_path='' as $$select 1$$;
      create function public.inspection_secret_fixture(p_value text default 'DEFAULT_SENTINEL_DO_NOT_READ') returns text language sql as $$select 'BODY_SENTINEL_DO_NOT_READ'::text$$;
      create view public.inspection_fixture_view with(security_invoker=true,security_barrier=true) as select 1 as id;
      revoke create on schema public from public;
      insert into storage.buckets(id,public,file_size_limit,allowed_mime_types) values('materials',false,10485760,array['application/pdf']);`)
    for(const row of snapshot().history)await database.query('insert into supabase_migrations.schema_migrations values($1,$2)',[row.version,row.name])
    const client={connect:async()=>{},query:sql=>database.query(sql),end:async()=>{ended=true}}
    const report=await runStagingInspection({env:env(),expectedProjectRef:ref,manifest:await buildMigrationManifest(),clientFactory:async()=>client})
    assert.equal(report.identity.marker_present,false);assert.equal(report.migrations_approved,false);assert.equal(report.ready_to_apply,false)
    assert.ok(!report.baseline.findings.some(row=>row.code==='ASSIGNMENT_UNIQUE_KEY_MISSING'||row.code==='EXERCISE_OWNERSHIP_FOREIGN_KEY_MISSING'))
    const fn=report.supplemental.functions.find(row=>row.name==='inspection_fixture')
    assert.equal(fn.security_definer,true);assert.equal(fn.search_path_mode,'empty');assert.ok(!Object.hasOwn(fn,'body'))
    const view=report.supplemental.views.find(row=>row.relation==='public.inspection_fixture_view')
    assert.equal(view.security_invoker,true);assert.equal(view.security_barrier,true)
    assert.ok(report.supplemental.roles.some(row=>Object.hasOwn(row,'bypass_rls')))
    assert.equal(JSON.stringify(report).includes('DEFAULT_SENTINEL_DO_NOT_READ'),false)
    assert.equal(JSON.stringify(report).includes('BODY_SENTINEL_DO_NOT_READ'),false)
    assert.equal((await database.query("select current_setting('transaction_read_only') as value")).rows[0].value,'off')
    assert.equal(ended,true)
  }finally{await database.close()}
})
