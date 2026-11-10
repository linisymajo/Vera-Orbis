import test from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCTION_REF, productionConnection, productionQueries, inspectProduction, main } from '../scripts/production-preflight.mjs'
const secret = 'synthetic-password-never-print'
const env = () => ({VERA_PRODUCTION_DB_URL:`postgresql://postgres:${secret}@db.${PRODUCTION_REF}.supabase.co:5432/postgres?sslmode=verify-full`})

test('production connection is pinned, TLS verified and read-only with no staging or environment fallback', () => {
  const c = productionConnection(env())
  assert.equal(c.ssl.rejectUnauthorized,true)
  assert.match(c.options,/default_transaction_read_only=on/)
  for(const value of ['',`postgresql://postgres:${secret}@db.duinvkphfnugoyvvlbbq.supabase.co/postgres`,
    env().VERA_PRODUCTION_DB_URL.replace(':5432',':6543'),env().VERA_PRODUCTION_DB_URL.replace('verify-full','disable'),
    env().VERA_PRODUCTION_DB_URL+'&options=-cdefault_transaction_read_only=off',env().VERA_PRODUCTION_DB_URL+'#override']) {
    assert.throws(()=>productionConnection({VERA_PRODUCTION_DB_URL:value}))
  }
  assert.throws(()=>productionConnection({DATABASE_URL:env().VERA_PRODUCTION_DB_URL}))
  assert.throws(()=>productionConnection({...env(),VERA_PRODUCTION_CA_PEM:'invalid'}))
})

test('production CLI has no write mode and rejects implicit or foreign targets', async () => {
  for(const args of [[],['--apply'],['--read-only','--project-ref','duinvkphfnugoyvvlbbq'],['--read-only','--project-ref',PRODUCTION_REF,'--apply']]) {
    await assert.rejects(main(args,{}),e=>e.code==='EXPLICIT_TARGET_REQUIRED')
  }
})

function fixture({readOnly='on',tls=true,fail=false}={}) {
  const calls=[]
  return {calls,connection:{stream:{authorized:tls}},async connect(){calls.push('CONNECT')},async end(){calls.push('END')},async query(sql){
    calls.push(sql)
    if(fail)throw new Error('postgresql://'+secret)
    if(sql===productionQueries.session)return{rows:[{database:'postgres',read_only:readOnly}]}
    if(sql===productionQueries.historyExists)return{rows:[{present:false}]}
    if(sql===productionQueries.relations)return{rows:[{relation:'public.profiles',rls:true}]}
    if(sql.startsWith('select count(*)'))return{rows:[{rows:'4'}]}
    return{rows:[]}
  }}
}

test('production inspection exports aggregate metadata only, never repairs missing history, always rolls back', async () => {
  const client=fixture()
  const report=await inspectProduction({env:env(),clientFactory:()=>client})
  assert.equal(report.target,PRODUCTION_REF)
  assert.equal(report.history,null)
  assert.equal(report.writes_performed,false)
  assert.deepEqual(report.public_row_counts,[{relation:'public.profiles',rows:'4'}])
  assert.ok(!JSON.stringify(report).includes(secret))
  assert.deepEqual(client.calls.slice(-2),['ROLLBACK','END'])
  for(const sql of client.calls.filter(sql=>!['CONNECT','END'].includes(sql))) {
    assert.ok(/^select /i.test(sql)||['BEGIN READ ONLY','ROLLBACK',"SET LOCAL statement_timeout='5000ms'","SET LOCAL lock_timeout='1000ms'"].includes(sql))
    assert.doesNotMatch(sql,/raw_user_meta_data|encrypted_password|token_hash|select \* from auth|select \* from public/i)
  }
})

test('wrong TLS or writable sessions stop before production metadata and driver failures redact credentials', async () => {
  let constructed=false
  await assert.rejects(inspectProduction({env:{},clientFactory:()=>{constructed=true}}))
  assert.equal(constructed,false)
  for(const options of [{tls:false},{readOnly:'off'},{fail:true}]) {
    const client=fixture(options)
    await assert.rejects(inspectProduction({env:env(),clientFactory:()=>client}),e=>!e.message.includes(secret))
    assert.ok(!client.calls.includes(productionQueries.relations))
    assert.deepEqual(client.calls.slice(-2),['ROLLBACK','END'])
  }
})
