import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createStagingDevLogger } from './dev-staging-config.mjs'

export const PRODUCTION_URL='https://iopgzmvaqobigjwibual.supabase.co'
const STAGING_REF='duinvkphfnugoyvvlbbq'
export function productionBuildEnvironment(env) {
  if(env.VITE_SUPABASE_URL!==PRODUCTION_URL)throw new Error('PRODUCTION_BROWSER_TARGET_REQUIRED')
  const key=env.VITE_SUPABASE_PUBLISHABLE_KEY
  if(!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key||'')) {
    try {const parts=key.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));if(parts.length!==3||claims.role!=='anon'||claims.ref!=='iopgzmvaqobigjwibual')throw new Error()}
    catch {throw new Error('PRODUCTION_PUBLIC_BROWSER_KEY_REQUIRED')}
  }
  const voice=env.VITE_VERA_VOICE_URL||''
  if(voice){let url;try{url=new URL(voice)}catch{throw new Error('VOICE_URL_INVALID')};if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('VOICE_URL_INVALID')}
  return {VITE_SUPABASE_URL:PRODUCTION_URL,VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_VERA_VOICE_URL:voice,VITE_ACADEMIC_AI_ENABLED:'false',...(env.VITE_LEARNING_ARCHITECT_ENABLED==='true'?{VITE_LEARNING_ARCHITECT_ENABLED:'true'}:{})}
}

export async function verifyProductionBuild(directory, configuration) {
  const entries=[];let target=false,key=false
  async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('PRODUCTION_ARTIFACT_SYMLINK')
    const full=join(path,entry.name)
    if(entry.isDirectory()){if(['tests','marketing-system'].includes(entry.name))throw new Error('UNAPPROVED_PUBLIC_ARTIFACT');await walk(full);continue}
    if(!entry.isFile()||/^\.env/i.test(entry.name)||entry.name.endsWith('.map'))throw new Error('UNAPPROVED_PUBLIC_ARTIFACT')
    const bytes=await readFile(full),relative=full.slice(directory.length+1).replaceAll('\\','/')
    if(/\.(?:js|css|html|json|txt)$/.test(entry.name)){
      const text=bytes.toString('utf8');if(text.includes(STAGING_REF)||/\bsb_secret_[A-Za-z0-9_-]{20,}|postgres(?:ql)?:\/\//.test(text))throw new Error('PRODUCTION_ARTIFACT_PRIVATE_OR_STAGING_VALUE')
      for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]*\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
        try{if(JSON.parse(Buffer.from(match[1],'base64url')).role==='service_role')throw new Error('PRIVILEGED_BROWSER_KEY')}catch(e){if(e.message==='PRIVILEGED_BROWSER_KEY')throw e}
      }
      target ||= text.includes(PRODUCTION_URL);key ||= text.includes(configuration.VITE_SUPABASE_PUBLISHABLE_KEY)
    }
    entries.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
  }}
  await walk(directory)
  if(!target||!key||(await readFile(join(directory,'CNAME'),'utf8')).trim()!=='veraorbis.studio')throw new Error('PRODUCTION_ARTIFACT_TARGET_UNVERIFIED')
  for(const path of ['index.html','teacher.html','platform.html','login.html','register.html','onboarding.html','reset-password.html'])if(!entries.some(e=>e.path===path))throw new Error('PRODUCTION_ROUTE_MISSING')
  return {target:'iopgzmvaqobigjwibual',domain:'veraorbis.studio',ai_enabled:false,learning_architect_enabled:configuration.VITE_LEARNING_ARCHITECT_ENABLED==='true',files:entries.sort((a,b)=>a.path.localeCompare(b.path)),hosting_deployed:false}
}

export async function buildProduction({root=fileURLToPath(new URL('../',import.meta.url)),env=process.env,outDir=resolve(root,'dist')}={}) {
  const configuration=productionBuildEnvironment(env)
  for(const key of Object.keys(process.env))if(key.startsWith('VITE_'))delete process.env[key]
  Object.assign(process.env,configuration)
  const {build}=await import('vite')
  await build({root,configFile:resolve(root,'vite.config.js'),envDir:false,envPrefix:'VITE_',mode:'production',customLogger:createStagingDevLogger(configuration.VITE_SUPABASE_PUBLISHABLE_KEY),build:{outDir,sourcemap:false},plugins:[{name:'vera-production-boundary',configResolved(c){
    const names=Object.keys(c.env).filter(k=>k.startsWith('VITE_')).sort()
    if(c.envDir!==false||c.mode!=='production'||JSON.stringify(names)!==JSON.stringify(Object.keys(configuration).sort())||names.some(k=>c.env[k]!==configuration[k]))throw new Error('PRODUCTION_BUILD_CONFIGURATION_UNSAFE')
  }}]})
  const manifest=await verifyProductionBuild(outDir,configuration)
  await writeFile(join(outDir,'production-build-manifest.json'),JSON.stringify(manifest,null,2)+'\n')
  console.log('Production artifact verified; AI disabled. No hosting deployment performed.')
  return manifest
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{if(process.argv.length!==2)throw new Error();await buildProduction()}
  catch{console.error('PRODUCTION_BUILD_STOPPED: check the pinned target, public browser key and artifact privately. No deployment was performed.');process.exitCode=1}
}
