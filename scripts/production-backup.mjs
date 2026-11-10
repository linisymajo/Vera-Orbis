import {Client} from 'pg'
import {spawn} from 'node:child_process'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {resolve,join,relative} from 'node:path'
import {productionConnection,PRODUCTION_REF} from './production-preflight.mjs'
import {encryptBackup,verifyEncryptedBackup,decryptedBackup,copyCounter} from './encrypted-backup-core.mjs'
const workspace=resolve('.'),root=resolve(process.env.LOCALAPPDATA,'VeraOrbis','production-backups','production-'+Date.now()),tools=resolve(process.env.LOCALAPPDATA,'VeraOrbis','tools','postgresql-17.11','bin')
const report={target:PRODUCTION_REF,started_at:new Date().toISOString(),production_writes:false,database_verified:false,storage_verified:false,full_restore_tested:false,files:[],root}
let client,phase='validate-inputs'
const save=()=>writeFile(join(root,'verification.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600})
const options=kind=>({context:'vera-production-'+PRODUCTION_REF+'-'+kind})
function processFor(name,args){
 const child=spawn(join(tools,name+'.exe'),args,{env:pgEnv,windowsHide:true,stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',chunk=>{if(stderr.length<65536)stderr+=chunk.toString('utf8')});child.stdin.on('error',()=>{})
 const done=new Promise((res,rej)=>{child.once('error',()=>rej(new Error('BACKUP_TOOL_FAILED')));child.once('close',code=>code===0?res():rej(Object.assign(new Error('BACKUP_TOOL_FAILED'),{safeDetail:{tool:name,exit_code:code,permission_denied:/permission denied/i.test(stderr),authentication_failed:/password authentication failed|no password supplied/i.test(stderr),ssl_error:/certificate|SSL error|sslrootcert/i.test(stderr),version_mismatch:/version mismatch/i.test(stderr),missing_library:/library|DLL/i.test(stderr),error_class:stderr.match(/error: ([A-Za-z ]{1,70})(?=[:.\r\n])/i)?.[1]||'suppressed'}})))})
 done.catch(()=>{});return{child,done}
}
let pgEnv
try{
 if(!relative(workspace,root).startsWith('..'))throw new Error('OUTSIDE_WORKSPACE_REQUIRED')
 const config=productionConnection(process.env)
 await mkdir(root,{recursive:true});await save()
 const caPath=join(root,'public-database-ca.pem');if(process.env.VERA_PRODUCTION_CA_PEM)await writeFile(caPath,process.env.VERA_PRODUCTION_CA_PEM,{flag:'wx'})
 pgEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>['systemroot','windir','path','temp','tmp','userprofile','localappdata','appdata','comspec'].includes(key.toLowerCase())))
 Object.assign(pgEnv,{PGHOST:config.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGPASSWORD:config.password,PGSSLMODE:'verify-full',PGCONNECT_TIMEOUT:'10',PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000',...(config.ssl.ca?{PGSSLROOTCERT:caPath}:{})})
 phase='consistent-read-only-snapshot';client=new Client(config);await client.connect();if(!client.connection.stream.authorized)throw new Error('TLS_REQUIRED')
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
 const session=(await client.query("select current_setting('transaction_read_only') as ro,current_setting('server_version_num') as version,pg_export_snapshot() as snapshot")).rows[0]
 if(session.ro!=='on'||!session.version.startsWith('17'))throw new Error('SNAPSHOT_UNSAFE')
 const tables=(await client.query("select n.nspname as schema,c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname!~'^pg_' and n.nspname<>'information_schema' and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.refclassid='pg_extension'::regclass and d.deptype='e') order by n.nspname,c.relname")).rows
 const quote=s=>'"'+s.replaceAll('"','""')+'"',expected=[]
 for(const table of tables){const count=(await client.query('select count(*)::bigint as rows from only '+quote(table.schema)+'.'+quote(table.name))).rows[0].rows;expected.push({...table,rows:Number(count)})}
 if(!expected.some(t=>t.schema==='auth'&&t.name==='users'))throw new Error('AUTH_BACKUP_REQUIRED')
 const storage=(await client.query('select id,bucket_id,name,metadata,created_at,updated_at from storage.objects order by bucket_id,name')).rows
 const buckets=(await client.query('select * from storage.buckets order by id')).rows
 const functions=(await client.query("select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'")).rows
 const policies=(await client.query("select * from pg_policies where schemaname in('public','auth','storage')")).rows
 const catalog={target:PRODUCTION_REF,server_version:session.version,snapshot_at:new Date().toISOString(),tables:expected,storage,buckets,functions,policies,notes:['Database dump includes Auth table data; managed login-role passwords are not exported.','Project/API signing keys, provider secrets, SMTP, Edge Function deployment and external Storage bytes require separate recovery configuration.']}
 phase='encrypted-database-archive'
 let dump
 const databaseFile=join(root,'database.pgdump.enc'),databaseOptions=options('database')
 const dbMeta=await encryptBackup(()=>{dump=processFor('pg_dump',['--format=custom','--no-password','--lock-wait-timeout=5000','--snapshot='+session.snapshot]);dump.child.stdin.end();return dump.child.stdout},databaseFile,databaseOptions);await dump.done;if(dbMeta.bytes<5)throw new Error('EMPTY_DATABASE_ARCHIVE');report.files.push({name:'database.pgdump.enc',...dbMeta});await save()
 phase='encrypted-roles-archive'
 let roles
 const rolesFile=join(root,'roles.sql.enc'),rolesOptions=options('roles')
 const rolesMeta=await encryptBackup(()=>{roles=processFor('pg_dumpall',['--roles-only','--no-role-passwords','--no-password']);roles.child.stdin.end();return roles.child.stdout},rolesFile,rolesOptions);await roles.done;report.files.push({name:'roles.sql.enc',...rolesMeta});await save()
 phase='encrypted-recovery-catalog'
 const catalogFile=join(root,'catalog.json.enc'),catalogOptions=options('catalog')
 const catalogMeta=await encryptBackup(Readable.from([Buffer.from(JSON.stringify(catalog))]),catalogFile,catalogOptions);report.files.push({name:'catalog.json.enc',...catalogMeta})
 await client.query('ROLLBACK');await client.end();client=null
 phase='verify-encryption-and-archive-data'
 await verifyEncryptedBackup(databaseFile,databaseOptions,dbMeta);await verifyEncryptedBackup(rolesFile,rolesOptions,rolesMeta);await verifyEncryptedBackup(catalogFile,catalogOptions,catalogMeta)
 const decrypted=await decryptedBackup(databaseFile,databaseOptions)
 const restore=processFor('pg_restore',['--data-only','--no-owner','--no-privileges','--file=-']),counter=copyCounter()
 const parsed=(async()=>{for await(const chunk of restore.child.stdout)counter.write(chunk);return counter.finish()})()
 const [,counts]=await Promise.all([pipeline(decrypted,restore.child.stdin),parsed,restore.done])
 const missing=expected.filter(t=>!counts.has(t.schema+'.'+t.name)||counts.get(t.schema+'.'+t.name)!==t.rows)
 if(missing.length){report.count_mismatch_tables=missing.map(t=>t.schema+'.'+t.name);throw new Error('ARCHIVE_ROW_COUNTS_MISMATCH')}
 report.database_verified=true;report.verification={authenticated_encryption_roundtrip:true,archive_fully_decompressed:true,snapshot_table_counts_matched:expected.length,auth_users:expected.find(t=>t.schema==='auth'&&t.name==='users').rows,storage_objects_expected:storage.length,managed_role_passwords_exported:false}
 report.storage_verified=storage.length===0
 report.completed_at=new Date().toISOString();await save()
 await writeFile('.temp/production-backup-receipt.json',JSON.stringify(report,null,2)+'\n',{mode:0o600})
 console.log(JSON.stringify({target:PRODUCTION_REF,database_verified:report.database_verified,storage_verified:report.storage_verified,auth_included:true,table_counts_matched:expected.length,storage_objects_pending:storage.length,full_restore_tested:false,encrypted_backup_directory:root,production_writes:false}))
}catch(error){
 report.failure={phase,syscall:/^[a-zA-Z_ ]+$/.test(error?.syscall||'')?error.syscall:null,frames:error?.stack?.split('\n').slice(1,5).map(s=>s.trim()),...(error.safeDetail||{}),error_code:/^[A-Z0-9_]+$/.test(error?.code||'')?error.code:null,code:/^[A-Z0-9_]+$/.test(error?.message||'')?error.message:'REDACTED_BACKUP_FAILURE'};try{await save();await writeFile('.temp/production-backup-receipt.json',JSON.stringify(report,null,2)+'\n')}catch{}
 console.error(JSON.stringify({target:PRODUCTION_REF,database_verified:report.database_verified,...report.failure,production_writes:false}));process.exitCode=1
}finally{try{await client?.query('ROLLBACK');await client?.end()}catch{};if(pgEnv)delete pgEnv.PGPASSWORD}
