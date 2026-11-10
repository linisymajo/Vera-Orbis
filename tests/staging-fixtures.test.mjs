import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'
import { inflateSync } from 'node:zlib'
import { buildStagingFixtures, FIXTURE_PROJECT_REF, parseFixtureArguments, prepareStagingFixtures } from '../scripts/staging-fixtures.mjs'

const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0)}return(value^0xffffffff)>>>0}
const output=root=>resolve(root,'.temp','staging-fixtures',FIXTURE_PROJECT_REF)
async function temporary(work){
  const root=await mkdtemp(resolve(tmpdir(),'vera-fixture-tests-'))
  try{return await work(root)}finally{
    const absolute=resolve(root),prefix=resolve(tmpdir())+sep+'vera-fixture-tests-'
    assert.ok(absolute.startsWith(prefix)&&absolute.length>prefix.length)
    await rm(absolute,{recursive:true,force:true})
  }
}
function unzip(bytes){
  let offset=0;const entries=new Map()
  while(bytes.readUInt32LE(offset)===0x04034b50){
    assert.equal(bytes.readUInt16LE(offset+8),0)
    const size=bytes.readUInt32LE(offset+18),length=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28)
    const name=bytes.subarray(offset+30,offset+30+length).toString(),data=bytes.subarray(offset+30+length+extra,offset+30+length+extra+size)
    assert.ok(!entries.has(name)&&!name.includes('..')&&!name.startsWith('/'))
    assert.equal(crc(data),bytes.readUInt32LE(offset+14));entries.set(name,data.toString());offset+=30+length+extra+size
  }
  assert.equal(bytes.readUInt32LE(offset),0x02014b50)
  const end=bytes.length-22;assert.equal(bytes.readUInt32LE(end),0x06054b50)
  assert.equal(bytes.readUInt16LE(end+10),entries.size);assert.equal(bytes.readUInt32LE(end+16),offset)
  return entries
}

test('offline plan and verify do not create output; writes require the exact explicit staging reference',async()=>{
  assert.deepEqual(parseFixtureArguments([]),{projectRef:FIXTURE_PROJECT_REF})
  for(const args of[
    ['--write'],['--verify'],['--write','--project-ref','abcdefghijklmnopqrst'],
    ['--write','--project-ref','../escape'],['--write','--project-ref',FIXTURE_PROJECT_REF,'--output','../../elsewhere'],
    ['--write','--verify','--project-ref',FIXTURE_PROJECT_REF],['--write','--write','--project-ref',FIXTURE_PROJECT_REF],
    ['--project-ref',FIXTURE_PROJECT_REF,'--project-ref',FIXTURE_PROJECT_REF]
  ])assert.throws(()=>parseFixtureArguments(args))
  await temporary(async root=>{
    const plan=await prepareStagingFixtures({workspaceRoot:root,projectRef:FIXTURE_PROJECT_REF})
    assert.equal(plan.mode,'planned');assert.equal(plan.created,0)
    await assert.rejects(access(output(root)))
    await assert.rejects(prepareStagingFixtures({workspaceRoot:root,projectRef:'production',write:true}),/reference/)
    await assert.rejects(prepareStagingFixtures({workspaceRoot:root,projectRef:FIXTURE_PROJECT_REF,verify:true}),/incomplete/)
    assert.deepEqual(await readdir(root),[])
  })
})

test('all artifacts have deterministic exact lengths and SHA-256; Office containers include checked ZIP structures',()=>{
  const first=buildStagingFixtures(),second=buildStagingFixtures()
  assert.equal(first.manifest.project_ref,FIXTURE_PROJECT_REF);assert.equal(first.manifest.accounts_created,false)
  assert.deepEqual(first.files,second.files);assert.equal(first.files.size,10)
  const golden={
    'lesson.docx':'43776e3be40e87d1275355cadec82eecd9bddb7a4b4f94c2303a1562b133e4e1',
    'slides.pptx':'2318a52b7ed423d27ac30130fb8beaaabfd965b9186967d41920933faacb2bd3',
    'expressions.xlsx':'b5b81fdd4ba098cec3cb9621ad1877e739e18182453aa2d9011f7dab6229e0c0',
    'response-v1.pdf':'85d4d72e0a70a98381c35d680ed852e6ad86a0da5d2c2e17663f55007baf2812',
    'response-v2.pdf':'1a0d5298be1c51228046b1b8c92052d6ec0feb45934fd9534f204093c762c7d2'
  }
  for(const entry of first.manifest.files){const bytes=first.files.get(entry.name);assert.equal(entry.bytes,bytes.length);assert.equal(entry.sha256,sha(bytes));if(golden[entry.name])assert.equal(entry.sha256,golden[entry.name])}
  assert.equal(first.manifest_sha256,sha(first.files.get('manifest.json')))
  const word=unzip(first.files.get('lesson.docx'));assert.match(word.get('word/document.xml'),/SYNTHETIC STAGING LESSON/)
  const slides=unzip(first.files.get('slides.pptx'))
  for(const name of['ppt/presentation.xml','ppt/slides/slide1.xml','ppt/slideLayouts/slideLayout1.xml','ppt/slideMasters/slideMaster1.xml','ppt/theme/theme1.xml'])assert.ok(slides.has(name),name)
  assert.match(slides.get('ppt/slides/slide1.xml'),/Listen - Repeat - Personalize - Use/)
  for(const [name,text]of slides)if(name.endsWith('.rels'))assert.ok(!text.includes('TargetMode="External"'))
  const sheet=unzip(first.files.get('expressions.xlsx'));assert.match(sheet.get('xl/worksheets/sheet1.xml'),/SYNTHETIC greeting/)
})

test('PDF cross references, generated PNG chunks and PCM WAV sizes describe actual sample bytes',()=>{
  const {files}=buildStagingFixtures()
  for(const name of['response-v1.pdf','response-v2.pdf']){
    const text=files.get(name).toString('ascii'),xref=Number(/startxref\n(\d+)/.exec(text)[1])
    assert.equal(text.slice(xref,xref+4),'xref');assert.match(text,/%%EOF\n$/)
    const records=text.slice(xref).split('\n').slice(3,8)
    records.forEach((record,index)=>assert.equal(text.slice(Number(record.slice(0,10)),Number(record.slice(0,10))+7),`${index+1} 0 obj`))
  }
  const image=files.get('reference.png');assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10])
  let offset=8,raw
  while(offset<image.length){const size=image.readUInt32BE(offset),type=image.subarray(offset+4,offset+8).toString(),body=image.subarray(offset+8,offset+8+size);assert.equal(image.readUInt32BE(offset+8+size),crc(image.subarray(offset+4,offset+8+size)));if(type==='IHDR'){assert.equal(body.readUInt32BE(0),32);assert.equal(body.readUInt32BE(4),32)}if(type==='IDAT')raw=inflateSync(body);offset+=12+size}
  assert.equal(raw.length,32*(1+32*4));assert.equal(offset,image.length)
  const audio=files.get('listening.wav');assert.equal(audio.toString('ascii',0,4),'RIFF');assert.equal(audio.toString('ascii',8,16),'WAVEfmt ');assert.equal(audio.readUInt32LE(4)+8,audio.length);assert.equal(audio.readUInt32LE(24),8000);assert.equal(audio.readUInt32LE(40)+44,audio.length)
})

test('actor and academic JSON contain aliases and environment variable names without accounts, emails, credentials or fake Auth UUIDs',async()=>{
  const built=buildStagingFixtures(),actors=JSON.parse(built.files.get('actors.json')),academic=JSON.parse(built.files.get('academic-data.json'))
  assert.equal(actors.accounts_created,false);assert.deepEqual(actors.group_a,['INVITED','STUDENT_A2'])
  for(const actor of actors.actors){assert.equal(actor.auth_id,null);assert.equal(actor.email_env,`VERA_STAGING_${actor.alias}_EMAIL`);assert.equal(actor.password_env,`VERA_STAGING_${actor.alias}_PASSWORD`)}
  const body=JSON.stringify({actors,academic});assert.ok(!body.includes('@'));assert.doesNotMatch(body,/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  assert.equal(academic.ai.generation_enabled,false);assert.equal(academic.ai.provider_calls_performed,false);assert.equal(academic.manual_challenge.source,'MANUAL_SYNTHETIC_FIXTURE_NOT_AI')
  assert.equal(academic.final.criteria.reduce((sum,c)=>sum+c.max_points,0),100);assert.equal(academic.final.private_result.publish,false)
  const source=await readFile(new URL('../scripts/staging-fixtures.mjs',import.meta.url),'utf8')
  assert.ok(!source.includes('process.env'));assert.doesNotMatch(source,/from ['"](?:node:)?(?:https?|net|child_process)['"]/)
})

test('explicit writes are idempotent, verify exact persisted bytes and never replace modified files',async()=>{
  await temporary(async root=>{
    const settings={workspaceRoot:root,projectRef:FIXTURE_PROJECT_REF}
    const written=await prepareStagingFixtures({...settings,write:true});assert.equal(written.created,10)
    const again=await prepareStagingFixtures({...settings,write:true});assert.equal(again.created,0);assert.equal(again.manifest_sha256,written.manifest_sha256)
    assert.equal((await prepareStagingFixtures({...settings,verify:true})).mode,'verified')
    for(const[name,bytes]of buildStagingFixtures().files)assert.deepEqual(await readFile(resolve(output(root),name)),bytes)
    const changed=resolve(output(root),'lesson.docx');await writeFile(changed,'operator-owned different bytes')
    await assert.rejects(prepareStagingFixtures({...settings,write:true}),/Existing fixture differs/)
    assert.equal(await readFile(changed,'utf8'),'operator-owned different bytes')
  })
})

test('unknown existing files and parent file collisions stop the whole batch without overwriting anything',async()=>{
  await temporary(async root=>{
    await mkdir(output(root),{recursive:true});await writeFile(resolve(output(root),'unrelated.txt'),'preserve me')
    await assert.rejects(prepareStagingFixtures({workspaceRoot:root,projectRef:FIXTURE_PROJECT_REF,write:true}),/Unexpected/)
    assert.deepEqual(await readdir(output(root)),['unrelated.txt']);assert.equal(await readFile(resolve(output(root),'unrelated.txt'),'utf8'),'preserve me')
  })
  await temporary(async root=>{
    await writeFile(resolve(root,'.temp'),'existing operator file')
    await assert.rejects(prepareStagingFixtures({workspaceRoot:root,projectRef:FIXTURE_PROJECT_REF,write:true}),/not a directory/)
    assert.equal(await readFile(resolve(root,'.temp'),'utf8'),'existing operator file')
  })
})

test('symbolic links and Windows junctions cannot redirect fixture output or replace a fixture file',async()=>{
  await temporary(async root=>temporary(async outside=>{
    await mkdir(resolve(root,'.temp'));await writeFile(resolve(outside,'sentinel.txt'),'outside must remain unchanged')
    await symlink(outside,resolve(root,'.temp','staging-fixtures'),process.platform==='win32'?'junction':'dir')
    await assert.rejects(prepareStagingFixtures({workspaceRoot:root,projectRef:FIXTURE_PROJECT_REF,write:true}),/symbolic link or junction/)
    assert.deepEqual(await readdir(outside),['sentinel.txt']);assert.equal(await readFile(resolve(outside,'sentinel.txt'),'utf8'),'outside must remain unchanged')
    assert.equal((await lstat(resolve(root,'.temp','staging-fixtures'))).isSymbolicLink(),true)
  }))
})
