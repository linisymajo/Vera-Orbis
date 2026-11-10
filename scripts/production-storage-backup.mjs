import{readFile,writeFile}from'node:fs/promises';import{join}from'node:path';import{Readable}from'node:stream';import{createHash}from'node:crypto';import{Client}from'pg';import{productionConnection}from'./production-preflight.mjs';import{decryptedBackup,encryptBackup,verifyEncryptedBackup}from'./encrypted-backup-core.mjs';
const ref='iopgzmvaqobigjwibual',origin='https://'+ref+'.supabase.co',r=JSON.parse(await readFile('.temp/production-backup-receipt.json','utf8'));let phase='validate-read-only-credential',client
try{
 if(r.target!==ref)throw new Error('BACKUP_TARGET_MISMATCH')
 const key=process.env.VERA_PRODUCTION_SERVICE_ROLE_KEY;if(!key)throw new Error('STORAGE_SERVER_KEY_REQUIRED')
 if(!key.startsWith('sb_secret_')){let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'))}catch{throw new Error('STORAGE_SERVER_KEY_INVALID')};if(claims.role!=='service_role'||claims.ref!==ref)throw new Error('STORAGE_SERVER_KEY_TARGET_INVALID')}
 const parts=[];for await(const c of await decryptedBackup(join(r.root,'catalog.json.enc'),{context:'vera-production-'+ref+'-catalog'}))parts.push(c);const catalog=JSON.parse(Buffer.concat(parts).toString('utf8'));parts.length=0
 const objects=[];let index=0
 for(const object of catalog.storage){
  phase='read-encrypt-verify-storage-'+(++index)
  if(!/^[a-zA-Z0-9_.-]+$/.test(object.bucket_id)||object.name.split('/').some(p=>p==='..'||p==='.'||p===''))throw new Error('STORAGE_OBJECT_PATH_INVALID')
  const path=object.bucket_id+'/'+object.name.split('/').map(encodeURIComponent).join('/'),url=origin+'/storage/v1/object/'+path
  const get=()=>fetch(url,{method:'GET',headers:{apikey:key,Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(90000)})
  const response=await get();if(!response.ok)throw new Error('PRIVATE_STORAGE_READ_FAILED')
  const file='object-'+String(index).padStart(6,'0')+'.bin.enc',context='vera-production-'+ref+'-object-'+object.id
  const metadata=await encryptBackup(Readable.fromWeb(response.body),join(r.root,file),{context})
  const expected=Number(object.metadata?.size)
  if(Number.isFinite(expected)&&expected!==metadata.bytes)throw new Error('STORAGE_SIZE_CHANGED')
  await verifyEncryptedBackup(join(r.root,file),{context},metadata)
  const repeat=await get();if(!repeat.ok)throw new Error('STORAGE_RECHECK_FAILED')
  const hash=createHash('sha256');let size=0;for await(const chunk of Readable.fromWeb(repeat.body)){size+=chunk.length;hash.update(chunk)}
  if(size!==metadata.bytes||hash.digest('hex')!==metadata.plaintext_sha256)throw new Error('STORAGE_SOURCE_HASH_CHANGED')
  objects.push({object,file,context,...metadata,source_recheck_matches:true});console.log('Encrypted and verified private object '+index+' of '+catalog.storage.length+'.')
 }
 phase='verify-storage-inventory-still-matches'
 client=new Client(productionConnection(process.env));await client.connect();if(!client.connection.stream.authorized)throw new Error('TLS_REQUIRED');await client.query('BEGIN READ ONLY')
 const current=(await client.query('select id,bucket_id,name,metadata,created_at,updated_at from storage.objects order by bucket_id,name')).rows
 if(JSON.stringify(current)!==JSON.stringify(catalog.storage))throw new Error('STORAGE_INVENTORY_CHANGED')
 await client.query('ROLLBACK');await client.end();client=null
 const recovery={target:ref,captured_at:new Date().toISOString(),objects,buckets:catalog.buckets,recovery:'Decrypt and verify each object before an independently approved restore; preserve original bucket, object path, content type and metadata. Do not overwrite live files.'}
 const mapping=await encryptBackup(Readable.from([Buffer.from(JSON.stringify(recovery))]),join(r.root,'storage-recovery.json.enc'),{context:'vera-production-'+ref+'-storage-recovery'});await verifyEncryptedBackup(join(r.root,'storage-recovery.json.enc'),{context:'vera-production-'+ref+'-storage-recovery'},mapping)
 r.storage_verified=true;r.storage_verification={objects:objects.length,bytes:objects.reduce((n,o)=>n+o.bytes,0),encrypted_roundtrips:true,source_sha256_rechecks:true,unchanged_database_inventory:true};r.files.push(...objects.map(({file,bytes,plaintext_sha256,encrypted_bytes})=>({name:file,bytes,plaintext_sha256,encrypted_bytes})),{name:'storage-recovery.json.enc',...mapping});r.completed_at=new Date().toISOString();delete r.storage_failure
 await writeFile(join(r.root,'verification.json'),JSON.stringify(r,null,2)+'\n');await writeFile('.temp/production-backup-receipt.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({database_verified:r.database_verified,storage_verified:true,objects:objects.length,production_writes:false}))
}catch(e){r.storage_failure={phase,code:/^[A-Z0-9_]+$/.test(e.message||'')?e.message:'REDACTED_STORAGE_FAILURE'};await writeFile(join(r.root,'verification.json'),JSON.stringify(r,null,2)+'\n');await writeFile('.temp/production-backup-receipt.json',JSON.stringify(r,null,2)+'\n');console.error(JSON.stringify({storage_verified:false,...r.storage_failure,production_writes:false}));process.exitCode=1}finally{try{await client?.query('ROLLBACK');await client?.end()}catch{}}
