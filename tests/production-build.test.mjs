import test from 'node:test'
import assert from 'node:assert/strict'
import { productionBuildEnvironment,PRODUCTION_URL,verifyProductionBuild } from '../scripts/build-production.mjs'
import { mkdtemp,writeFile,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve,sep } from 'node:path'
test('production browser build accepts only the pinned target and a public key while keeping AI off',()=>{
  const key='sb_publishable_synthetic_production_fixture_0123456789'
  const env={VITE_SUPABASE_URL:PRODUCTION_URL,VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_ACADEMIC_AI_ENABLED:'true',VITE_OTHER_SECRET:'must-not-be-copied'}
  const actual=productionBuildEnvironment(env)
  assert.equal(actual.VITE_ACADEMIC_AI_ENABLED,'false');assert.equal(actual.VITE_OTHER_SECRET,undefined)
  for(const change of [{VITE_SUPABASE_URL:'https://duinvkphfnugoyvvlbbq.supabase.co'},{VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_do_not_publish'},{VITE_VERA_VOICE_URL:'http://localhost:3000'}])assert.throws(()=>productionBuildEnvironment({...env,...change}))
  const jwt=role=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role,ref:'iopgzmvaqobigjwibual'})).toString('base64url')+'.synthetic_signature'
  assert.throws(()=>productionBuildEnvironment({...env,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}))
  assert.equal(productionBuildEnvironment({...env,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).VITE_SUPABASE_PUBLISHABLE_KEY,jwt('anon'))
})
test('production artifact scan distinguishes an SDK key-type marker from an actual secret and refuses staging assets',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'vera-production-build-'))
  const key='sb_publishable_synthetic_artifact_fixture_0123456789'
  try {
    for(const name of ['index','teacher','platform','login','register','onboarding','reset-password'])await writeFile(resolve(directory,name+'.html'),'<html>Fixture</html>')
    await writeFile(resolve(directory,'CNAME'),'veraorbis.studio\n')
    const content=JSON.stringify({url:PRODUCTION_URL,key,SDK_key_type_marker:'sb_secret_'})
    await writeFile(resolve(directory,'bundle.js'),content)
    assert.equal((await verifyProductionBuild(directory,{VITE_SUPABASE_PUBLISHABLE_KEY:key})).ai_enabled,false)
    await writeFile(resolve(directory,'bundle.js'),content+';"sb_secret_synthetic_actual_secret_0123456789"')
    await assert.rejects(verifyProductionBuild(directory,{VITE_SUPABASE_PUBLISHABLE_KEY:key}),/PRIVATE_OR_STAGING/)
    await writeFile(resolve(directory,'bundle.js'),content+';"duinvkphfnugoyvvlbbq"')
    await assert.rejects(verifyProductionBuild(directory,{VITE_SUPABASE_PUBLISHABLE_KEY:key}),/PRIVATE_OR_STAGING/)
  } finally {
    assert.ok(directory.startsWith(resolve(tmpdir())+sep+'vera-production-build-'))
    await rm(directory,{recursive:true,force:true})
  }
})
