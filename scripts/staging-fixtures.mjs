// Offline synthetic files only. No environment/credential lookup, network, Auth,
// database, email, role change or migration operation exists in this generator.
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'

export const FIXTURE_PROJECT_REF='duinvkphfnugoyvvlbbq'
const repositoryRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n')
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')
const crc32=bytes=>{
  let crc=0xffffffff
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  return(crc^0xffffffff)>>>0
}
function zip(entries){
  let offset=0;const local=[],directory=[]
  for(const[name,content]of entries){
    const filename=Buffer.from(name),bytes=Buffer.from(content),crc=crc32(bytes),header=Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26)
    local.push(header,filename,bytes)
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(bytes.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42)
    directory.push(central,filename);offset+=header.length+filename.length+bytes.length
  }
  const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16)
  return Buffer.concat([...local,central,end])
}
const relationshipNS='http://schemas.openxmlformats.org/package/2006/relationships'
const officeNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const rels=entries=>`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${relationshipNS}">${entries.map(([id,type,target])=>`<Relationship Id="${id}" Type="${officeNS}/${type}" Target="${target}"/>`).join('')}</Relationships>`
function officePackage(main,parts){
  const contentTypes=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${parts.filter(([,type])=>type).map(([name,type])=>`<Override PartName="/${name}" ContentType="${type}"/>`).join('')}</Types>`
  return zip([['[Content_Types].xml',contentTypes],['_rels/.rels',rels([['rId1','officeDocument',main]])],...parts.map(([name,,content])=>[name,content])])
}
function docx(){
  const document='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>SYNTHETIC STAGING LESSON: First meetings</w:t></w:r></w:p><w:p><w:r><w:t>Listen to a greeting. Repeat it. Personalize it with an invented name. Use it to welcome a fictional colleague.</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>'
  return officePackage('word/document.xml',[['word/document.xml','application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',document]])
}
function pptx(){
  const ns='xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="'+officeNS+'"'
  const group='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
  const colorMap='<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
  const shape='<p:sp><p:nvSpPr><p:cNvPr id="2" name="Synthetic communicative prompt"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="2743200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2400"/><a:t>SYNTHETIC: Listen - Repeat - Personalize - Use. Welcome a fictional colleague.</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>'
  const colors=[['dk1','182024'],['lt1','FFFFFF'],['dk2','243C42'],['lt2','F5F1E8'],['accent1','BCA678'],['accent2','567D74'],['accent3','52768E'],['accent4','A27785'],['accent5','8A8560'],['accent6','735E82'],['hlink','0563C1'],['folHlink','954F72']].map(([name,value])=>`<a:${name}><a:srgbClr val="${value}"/></a:${name}>`).join('')
  const fill='<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'
  const line=[9525,25400,38100].map(w=>`<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr">${fill}<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`).join('')
  const theme=`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Synthetic staging"><a:themeElements><a:clrScheme name="Synthetic">${colors}</a:clrScheme><a:fontScheme name="Synthetic"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Synthetic"><a:fillStyleLst>${fill.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${line}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fill.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`
  return officePackage('ppt/presentation.xml',[
    ['ppt/presentation.xml','application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',`<p:presentation ${ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`],
    ['ppt/_rels/presentation.xml.rels',null,rels([['rId1','slideMaster','slideMasters/slideMaster1.xml'],['rId2','slide','slides/slide1.xml']])],
    ['ppt/slides/slide1.xml','application/vnd.openxmlformats-officedocument.presentationml.slide+xml',`<p:sld ${ns}><p:cSld><p:spTree>${group}${shape}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`],
    ['ppt/slides/_rels/slide1.xml.rels',null,rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml']])],
    ['ppt/slideLayouts/slideLayout1.xml','application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',`<p:sldLayout ${ns} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`],
    ['ppt/slideLayouts/_rels/slideLayout1.xml.rels',null,rels([['rId1','slideMaster','../slideMasters/slideMaster1.xml']])],
    ['ppt/slideMasters/slideMaster1.xml','application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',`<p:sldMaster ${ns}><p:cSld><p:spTree>${group}</p:spTree></p:cSld>${colorMap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`],
    ['ppt/slideMasters/_rels/slideMaster1.xml.rels',null,rels([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']])],
    ['ppt/theme/theme1.xml','application/vnd.openxmlformats-officedocument.theme+xml',theme]
  ])
}
function xlsx(){
  return officePackage('xl/workbook.xml',[
    ['xl/workbook.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${officeNS}"><sheets><sheet name="Synthetic expressions" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',null,rels([['rId1','worksheet','worksheets/sheet1.xml']])],
    ['xl/worksheets/sheet1.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>SYNTHETIC greeting</t></is></c><c r="B1" t="inlineStr"><is><t>Bonjour, je suis Camille.</t></is></c></row></sheetData></worksheet>']
  ])
}
function pdf(message){
  const stream=`BT /F1 14 Tf 24 230 Td (${message}) Tj ET`,objects=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>','<</Type/Page/Parent 2 0 R/MediaBox[0 0 360 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',`<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`,'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>']
  let output='%PDF-1.4\n';const offsets=[0]
  objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(output));output+=`${i+1} 0 obj\n${object}\nendobj\n`})
  const xref=Buffer.byteLength(output);output+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset=>{output+=`${String(offset).padStart(10,'0')} 00000 n \n`})
  return Buffer.from(output+`trailer\n<</Root 1 0 R/Size ${offsets.length}>>\nstartxref\n${xref}\n%%EOF\n`)
}
function png(){
  const chunk=(type,bytes)=>{const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([name,bytes])));return Buffer.concat([size,name,bytes,crc])}
  const header=Buffer.alloc(13);header.writeUInt32BE(32,0);header.writeUInt32BE(32,4);header[8]=8;header[9]=6
  const rows=Buffer.alloc(32*(1+32*4));for(let y=0;y<32;y++)for(let x=0;x<32;x++){const p=y*129+1+x*4;rows[p]=188;rows[p+1]=166;rows[p+2]=120;rows[p+3]=255}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))])
}
function wav(){
  const samples=1600,output=Buffer.alloc(44+samples*2);output.write('RIFF');output.writeUInt32LE(output.length-8,4);output.write('WAVEfmt ',8);output.writeUInt32LE(16,16);output.writeUInt16LE(1,20);output.writeUInt16LE(1,22);output.writeUInt32LE(8000,24);output.writeUInt32LE(16000,28);output.writeUInt16LE(2,32);output.writeUInt16LE(16,34);output.write('data',36);output.writeUInt32LE(samples*2,40)
  for(let i=0;i<samples;i++)output.writeInt16LE(Math.round(4000*Math.sin(2*Math.PI*440*i/8000)),44+i*2)
  return output
}
function actors(){
  const roles={ADMIN:'admin',TEACHER_A:'teacher',TEACHER_B:'teacher',INVITED:'student',STUDENT_A2:'student',PENDING:'student',UNVERIFIED:'student',STUDENT_B:'student'}
  return{synthetic:true,project_ref:FIXTURE_PROJECT_REF,accounts_created:false,actors:Object.entries(roles).map(([alias,intended_role])=>({alias,intended_role,email_env:`VERA_STAGING_${alias}_EMAIL`,password_env:`VERA_STAGING_${alias}_PASSWORD`,auth_id:null})),group_a:['INVITED','STUDENT_A2'],teacher_a:['INVITED','STUDENT_A2'],teacher_b:['STUDENT_B'],confirmation:'real-email-required-no-auto-confirm',role_bootstrap:'separate-explicit-approval-after-real-email-confirmation'}
}
function academicData(){
  const steps=['Listen','Repeat','Personalize','Use'].map(stage=>({stage,activity:stage+' a greeting in a fictional first meeting.'}))
  return{synthetic:true,project_ref:FIXTURE_PROJECT_REF,remote_actions_performed:false,ai:{generation_enabled:false,provider_calls_performed:false,challenge_recommendation_source:'MANUAL_SYNTHETIC_FIXTURE_NOT_AI'},
    lesson:{title:'SYNTHETIC: A first meeting',language:'French',level:'A1',objective:'Greet and introduce yourself to a fictional colleague.',steps},
    exercise:{teacher_alias:'TEACHER_A',student_aliases:['INVITED','STUDENT_A2'],title:'SYNTHETIC: Welcome a colleague',language:'French',exercise_type:'multiple_choice',instructions:'Listen, repeat, personalize and use a greeting.',questions:[{prompt:'Choose a greeting for your colleague.',options:['Bonjour','Au revoir'],answer:'Bonjour',explanation:'PRIVATE SYNTHETIC TEACHER KEY'}],settings:{max_attempts:1,attachment_mode:'optional',allow_attachment_revisions:true},due_at:null,due_at_note:'Choose a reviewed future deadline at provisioning time.'},
    manual_learning_plan:{teacher_alias:'TEACHER_A',student_alias:'INVITED',status:'draft',content:{title:'SYNTHETIC: Practical first meetings',language:'French',level:'A1',summary:'Use a greeting, invented name and one fictional personal detail.',objectives:[{objective_alias:'INTRODUCTION_OBJECTIVE',title:'Introduce yourself in a fictional first meeting',success_criteria:'A greeting, invented name and one follow-up question in context.',steps}]}},
    manual_challenge:{source:'MANUAL_SYNTHETIC_FIXTURE_NOT_AI',teacher_alias:'TEACHER_A',student_alias:'INVITED',title:'SYNTHETIC: A practical invitation',description:'Practice an invented invitation with a fictional colleague.',instructions:steps.map(step=>`${step.stage}: ${step.activity}`).join('\n'),points:10,status:'active'},
    final:{teacher_alias:'TEACHER_A',student_aliases:['INVITED'],title:'SYNTHETIC: Final first meeting',instructions:'Introduce yourself and ask a fictional colleague a practical question.',criteria:[{label:'Communication and meaning',max_points:40},{label:'Personalization',max_points:30},{label:'Use in context',max_points:30}],private_result:{scores:[35,25,25],feedback:'SYNTHETIC PRIVATE DRAFT: Add one personal follow-up question.',publish:false}},
    inbox:{sender_alias:'TEACHER_A',recipient_alias:'INVITED',subject:'SYNTHETIC: Your next practice',body:'Try your greeting in a fictional first meeting.',reply:'SYNTHETIC: I added a follow-up question.'}}
}

export function buildStagingFixtures(){
  const items=[['lesson.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',docx()],['slides.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation',pptx()],['expressions.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xlsx()],['response-v1.pdf','application/pdf',pdf('SYNTHETIC V1: Bonjour, je suis Camille.')],['response-v2.pdf','application/pdf',pdf('SYNTHETIC V2: Bonjour, je suis Camille. Et vous?')],['reference.png','image/png',png()],['listening.wav','audio/wav',wav()],['actors.json','application/json',json(actors())],['academic-data.json','application/json',json(academicData())]]
  items.sort(([a],[b])=>a<b?-1:a>b?1:0)
  const manifest={schema_version:1,synthetic:true,project_ref:FIXTURE_PROJECT_REF,remote_actions_performed:false,accounts_created:false,ai_generation_enabled:false,files:items.map(([name,mime,bytes])=>({name,mime,bytes:bytes.length,sha256:sha256(bytes)}))}
  const files=new Map(items.map(([name,,bytes])=>[name,bytes]));files.set('manifest.json',json(manifest))
  return{manifest,files,manifest_sha256:sha256(files.get('manifest.json'))}
}

async function inspectPath(path){
  try{const stat=await lstat(path);if(stat.isSymbolicLink())throw new Error('Fixture path contains a symbolic link or junction.');return stat}
  catch(error){if(error.code==='ENOENT')return null;throw error}
}
async function assertDirectories(root,output){
  const rel=relative(root,output)
  if(!rel||rel.startsWith('..')||rel.split(sep).length!==3)throw new Error('Unsafe fixture output path.')
  let current=root
  for(const segment of['',...rel.split(sep)]){if(segment)current=resolve(current,segment);const stat=await inspectPath(current);if(stat&&!stat.isDirectory())throw new Error('Fixture parent path is not a directory.')}
}
export async function prepareStagingFixtures({projectRef,write=false,verify=false,workspaceRoot=repositoryRoot}={}){
  if(projectRef!==FIXTURE_PROJECT_REF)throw new Error('Only the explicitly selected staging project reference is permitted.')
  if(write&&verify)throw new Error('Choose either write or verify mode.')
  const root=resolve(workspaceRoot),output=resolve(root,'.temp','staging-fixtures',FIXTURE_PROJECT_REF)
  await assertDirectories(root,output)
  const built=buildStagingFixtures()
  const exists=await inspectPath(output),entries=exists?await readdir(output):[]
  if(entries.some(name=>!built.files.has(name)))throw new Error('Unexpected fixture output entry; existing files were left unchanged.')
  for(const name of entries){const path=resolve(output,name),stat=await inspectPath(path);if(!stat?.isFile()||!(await readFile(path)).equals(built.files.get(name)))throw new Error('Existing fixture differs: '+name+'. Existing files were left unchanged.')}
  if(verify&&entries.length!==built.files.size)throw new Error('Fixture output is incomplete; verification made no changes.')
  let created=0
  if(write){
    await mkdir(output,{recursive:true});await assertDirectories(root,output)
    for(const[name,bytes]of built.files){
      if(entries.includes(name))continue
      await writeFile(resolve(output,name),bytes,{flag:'wx'});created++
    }
  }
  return{mode:write?'written':verify?'verified':'planned',project_ref:FIXTURE_PROJECT_REF,output:relative(root,output),file_count:built.files.size,created,manifest_sha256:built.manifest_sha256,remote_actions_performed:false}
}
export function parseFixtureArguments(args){
  if(args.length===0)return{projectRef:FIXTURE_PROJECT_REF}
  let projectRef,write=false,verify=false
  for(let i=0;i<args.length;i++){
    const arg=args[i]
    if(arg==='--write'&&!write){write=true;continue}
    if(arg==='--verify'&&!verify){verify=true;continue}
    if(arg==='--project-ref'&&projectRef===undefined&&typeof args[i+1]==='string'){projectRef=args[++i];continue}
    throw new Error('Use staging-fixtures.mjs [--write | --verify] --project-ref duinvkphfnugoyvvlbbq. Custom output paths are not supported.')
  }
  if(projectRef!==FIXTURE_PROJECT_REF||write&&verify)throw new Error('Explicit matching staging reference and one operation are required.')
  return{projectRef,write,verify}
}
export async function main(args=process.argv.slice(2)){
  const result=await prepareStagingFixtures(parseFixtureArguments(args))
  process.stdout.write(JSON.stringify(result,null,2)+'\n')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{process.stderr.write('OFFLINE_FIXTURE_REFUSED: '+error.message+'\n');process.exitCode=1})
