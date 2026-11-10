import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'
import { execFileSync } from 'node:child_process'
import { buildMigrationManifest, releaseFiles, verifyMigrationManifest, validateStagingEnvironment, compatibilityColumns, inspectionQueries, assessStagingSnapshot, runStagingPreflight } from '../scripts/staging-core.mjs'

const ref = 'abcdefghijklmnopqrst'
const secret = 'test-only-never-log-this-password'
const env = () => ({ VERA_STAGING_PROJECT_REF: ref, VERA_STAGING_PROJECT_NAME: 'vera-orbis-staging', VERA_STAGING_ACK: 'read-only-preflight', VERA_STAGING_DB_URL: `postgresql://postgres:${secret}@db.${ref}.supabase.co:5432/postgres?sslmode=verify-full` })
function snapshot() {
  return {
    relations: Object.keys(compatibilityColumns).map(relation => ({ relation, rls: true, force_rls: false })),
    columns: Object.entries(compatibilityColumns).flatMap(([relation, columns]) => Object.entries(columns).map(([column_name, data_type]) => ({ relation, column_name, data_type }))),
    policies: Object.keys(compatibilityColumns).filter(relation => relation.startsWith('public.') || relation === 'storage.objects').map(relation => ({ relation, policyname: 'Scoped test policy', cmd: 'SELECT', permissive: 'PERMISSIVE', roles: ['authenticated'], qual: 'id = auth.uid()', with_check: null })),
    grants: [], column_grants: [], history: [
      ['0002', 'teacher_operations'], ['0004', 'exercise_studio'], ['0005', 'materials_storage_policy'], ['0006', 'interface_language'],
      ['0007', 'teacher_management_enhancements'], ['0008', 'teacher_management_security_patch'], ['0009', 'academic_sync_challenges_feedback'], ['0010', 'inbox_messaging']
    ].map(([version, name]) => ({ version, name })), ledger: [],
    buckets: [{ id: 'materials', public: false, file_size_limit: 10485760, allowed_mime_types: ['application/pdf'] }]
  }
}

test('offline manifest covers exactly the ordered 0011–0021 SQL bytes and rejects changed approvals', async () => {
  const manifest = await buildMigrationManifest()
  assert.deepEqual(manifest.entries.map(entry => entry.file), releaseFiles)
  assert.equal(manifest.entries.length, 11)
  for (const entry of manifest.entries) { assert.match(entry.sha256, /^[a-f0-9]{64}$/); assert.ok(entry.bytes > 0) }
  assert.equal(verifyMigrationManifest(structuredClone(manifest), manifest), true)
  const changed = structuredClone(manifest); changed.entries[0].bytes++
  assert.throws(() => verifyMigrationManifest(changed, manifest), error => error.code === 'MANIFEST_CHANGED')
})

test('manifest refuses duplicate migration IDs rather than choosing a file', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'vera-staging-'))
  try {
    await mkdir(resolve(directory, 'supabase/migrations'), { recursive: true })
    for (const file of releaseFiles) await writeFile(resolve(directory, 'supabase/migrations', file), 'select 1;')
    await writeFile(resolve(directory, 'supabase/migrations/0011_conflicting.sql'), 'select 2;')
    await assert.rejects(buildMigrationManifest(directory), error => error.code === 'MIGRATION_SET_AMBIGUOUS')
  } finally {
    const absolute = resolve(directory), allowedPrefix = resolve(tmpdir()) + sep + 'vera-staging-'
    assert.ok(absolute.startsWith(allowedPrefix))
    await rm(absolute, { recursive: true, force: true })
  }
})

test('staging guards require explicit inputs and refuse production fallbacks, pools, foreign hosts and connection overrides', () => {
  const valid = validateStagingEnvironment(env())
  assert.equal(valid.target.project_ref, ref)
  assert.equal(valid.connection.ssl.rejectUnauthorized, true)
  assert.match(valid.connection.options, /default_transaction_read_only=on/)
  assert.equal(JSON.stringify(valid.target).includes(secret), false)
  for (const change of [
    { VERA_STAGING_PROJECT_NAME: 'production' }, { VERA_STAGING_ACK: '' }, { VERA_STAGING_PROJECT_REF: '' }, { VERA_STAGING_DB_URL: '' },
    { VERA_STAGING_DENY_PROJECT_REFS: ref },
    { VERA_STAGING_CA_PEM: 'not-a-public-certificate' },
    { VERA_STAGING_DB_URL: `postgresql://postgres:${secret}@db.zyxwvutsrqponmlkjihg.supabase.co/postgres` },
    { VERA_STAGING_DB_URL: `postgresql://postgres.${ref}:${secret}@aws-0-us-east-1.pooler.supabase.com:5432/postgres` },
    { VERA_STAGING_DB_URL: `postgresql://postgres:${secret}@db.${ref}.supabase.co.evil.test/postgres` },
    { VERA_STAGING_DB_URL: `postgresql://postgres:${secret}@db.${ref}.supabase.co:6543/postgres` },
    { VERA_STAGING_DB_URL: `postgresql://postgres:${secret}@db.${ref}.supabase.co/postgres?sslmode=disable` },
    { VERA_STAGING_DB_URL: `postgresql://postgres:${secret}@db.${ref}.supabase.co/postgres?options=-cdefault_transaction_read_only=off` }
  ]) assert.throws(() => validateStagingEnvironment({ ...env(), ...change }))
  assert.throws(() => validateStagingEnvironment({ DATABASE_URL: env().VERA_STAGING_DB_URL, VITE_SUPABASE_URL: 'https://' + ref + '.supabase.co' }))
})

test('baseline assessment blocks missing schema, migration-history ambiguity, release holes, unsafe buckets and RLS gaps', async () => {
  const manifest = await buildMigrationManifest()
  assert.equal(assessStagingSnapshot(snapshot(), manifest).ready_for_review, true)
  const cases = [
    ['BASELINE_RELATION_MISSING', state => { state.relations = state.relations.filter(row => row.relation !== 'public.profiles') }],
    ['BASELINE_COLUMN_MISMATCH', state => { state.columns = state.columns.filter(row => row.column_name !== 'recipient_id') }],
    ['PRIVATE_RLS_DISABLED', state => { state.relations.find(row => row.relation === 'public.materials').rls = false }],
    ['PRIVATE_POLICY_MISSING', state => { state.policies = [] }],
    ['MIGRATION_HISTORY_MISSING', state => { state.history = null }],
    ['MIGRATION_HISTORY_AMBIGUOUS', state => { state.history.push({ version: '20261108000000', name: 'unknown_baseline' }) }],
    ['BASELINE_HISTORY_MISSING', state => { state.history = state.history.filter(row => row.version !== '0010') }],
    ['BASELINE_NAME_UNVERIFIED', state => { state.history[0].name = 'unreviewed_baseline' }],
    ['RELEASE_HISTORY_GAP', state => { state.history.push({ version: '0012' }) }],
    ['APPLIED_CHECKSUM_UNVERIFIED', state => { state.history.push({ version: '0011' }) }],
    ['MATERIAL_BUCKET_INCOMPATIBLE', state => { state.buckets[0].public = true }],
    ['PRIVATE_ANONYMOUS_GRANT', state => { state.grants.push({ relation: 'public.materials', grantee: 'anon', privilege_type: 'SELECT' }) }]
  ]
  for (const [code, change] of cases) {
    const state = snapshot(); change(state)
    assert.ok(assessStagingSnapshot(state, manifest).blockers.some(blocker => blocker.code === code), code)
  }
  const applied = snapshot(), first = manifest.entries[0]
  applied.history.push({ version: first.id, name: first.file.slice(5, -4) }); applied.ledger.push({ version: first.id, sha256: first.sha256 })
  const result = assessStagingSnapshot(applied, manifest)
  assert.equal(result.ready_for_review, true)
  assert.equal(result.pending[0].id, '0012')
  const extended = snapshot()
  extended.history.push(...manifest.entries.map(entry => ({version:entry.id,name:entry.file.slice(5,-4)})))
  extended.ledger = manifest.entries.map(entry => ({version:entry.id,sha256:entry.sha256}))
  extended.buckets.push({id:'academic-submissions',public:false,file_size_limit:10485760})
  extended.extension = {version:'0022',name:'exercise_experience',file:'supabase/migrations/0022_exercise_experience.sql',sha256:'a'.repeat(64)}
  extended.legacy_extension = {version:'0023',name:'legacy_exercise_feedback',file:'supabase/migrations/0023_legacy_exercise_feedback.sql',sha256:'b'.repeat(64)}
  extended.history.push(...[extended.extension,extended.legacy_extension].map(({version,name})=>({version,name})))
  extended.setup = [extended.extension,extended.legacy_extension].map(({file,sha256})=>({file_path:file,sha256}))
  assert.equal(assessStagingSnapshot(extended,manifest).ready_for_review,true)
  extended.setup[1].sha256='c'.repeat(64)
  assert.ok(assessStagingSnapshot(extended,manifest).blockers.some(b=>b.code==='ADDITIVE_CHECKSUM_UNVERIFIED'))
  extended.setup[1].sha256=extended.legacy_extension.sha256
  extended.history=extended.history.filter(row=>row.version!=='0022')
  assert.ok(assessStagingSnapshot(extended,manifest).blockers.some(b=>b.code==='ADDITIVE_DEPENDENCY_MISSING'))
})

function fakeClient(state = snapshot(), overrides = {}) {
  const calls = []
  const responses = new Map([
    [inspectionQueries.session, [{ database: 'postgres', server_version_num: '170000', read_only: 'on' }]],
    [inspectionQueries.markerExists, [{ present: true }]],
    [inspectionQueries.marker, [{ environment: 'staging', project_ref: ref, project_name: 'vera-orbis-staging' }]],
    [inspectionQueries.historyExists, [{ present: true }]], [inspectionQueries.ledgerExists, [{ present: true }]],
    ...['relations', 'columns', 'policies', 'grants', 'column_grants', 'history', 'ledger', 'buckets'].map(key => [inspectionQueries[key], state[key]])
  ])
  for (const [query, rows] of Object.entries(overrides)) responses.set(query, rows)
  return { calls, async connect() { calls.push('CONNECT-DOUBLE') }, async end() { calls.push('END-DOUBLE') }, async query(sql) { calls.push(sql); return { rows: responses.get(sql) || [] } } }
}

test('preflight uses only guarded read-only diagnostics and rolls back, with no credentials in reports', async () => {
  const manifest = await buildMigrationManifest(), client = fakeClient()
  const report = await runStagingPreflight({ env: env(), manifest, clientFactory: async () => client })
  assert.equal(report.ready_for_review, true)
  assert.equal(JSON.stringify(report).includes(secret), false)
  assert.equal(client.calls[1], 'BEGIN READ ONLY')
  assert.deepEqual(client.calls.slice(-2), ['ROLLBACK', 'END-DOUBLE'])
  const allowed = new Set(Object.values(inspectionQueries))
  for (const query of client.calls.filter(query => !query.endsWith('-DOUBLE'))) assert.ok(allowed.has(query) || ['BEGIN READ ONLY', 'ROLLBACK', "SET LOCAL statement_timeout='5000ms'", "SET LOCAL lock_timeout='1000ms'"].includes(query), query)
})

test('invalid target prevents even a client factory; missing/mismatched marker stops before schema inspection', async () => {
  const manifest = await buildMigrationManifest()
  let factoryCalled = false
  await assert.rejects(runStagingPreflight({ env: {}, manifest, clientFactory: () => { factoryCalled = true } }))
  assert.equal(factoryCalled, false)
  for (const overrides of [{ [inspectionQueries.markerExists]: [{ present: false }] }, { [inspectionQueries.marker]: [{ environment: 'production', project_ref: ref, project_name: 'vera-orbis-staging' }] }, { [inspectionQueries.session]: [{ database: 'postgres', read_only: 'off' }] }]) {
    const client = fakeClient(snapshot(), overrides)
    await assert.rejects(runStagingPreflight({ env: env(), manifest, clientFactory: async () => client }))
    assert.ok(!client.calls.includes(inspectionQueries.relations))
    assert.ok(client.calls.includes('ROLLBACK'))
  }
})

test('connection errors redact driver messages that may contain credentials', async () => {
  const manifest = await buildMigrationManifest()
  const client = fakeClient(); client.connect = async () => { throw new Error('Connection string contains ' + secret) }
  await assert.rejects(runStagingPreflight({ env: env(), manifest, clientFactory: async () => client }), error => error.code === 'PREFLIGHT_CONNECTION_OR_SCHEMA_FAILED' && !error.message.includes(secret))
  await assert.rejects(runStagingPreflight({ env: env(), manifest, clientFactory: async () => { throw new Error(secret) } }), error => error.code === 'PREFLIGHT_CONNECTION_OR_SCHEMA_FAILED' && !error.message.includes(secret))
})

test('offline CLI succeeds without staging credentials or network intent', () => {
  const output = execFileSync(process.execPath, ['scripts/staging-preflight.mjs'], { encoding: 'utf8', env: { PATH: process.env.PATH || '', DATABASE_URL: 'postgresql://unused-production-secret@invalid/unused' } })
  const report = JSON.parse(output)
  assert.equal(report.mode, 'offline'); assert.equal(report.database_contacted, false)
  assert.equal(report.manifest.entries.length, 11)
  assert.ok(!output.includes('unused-production-secret'))
})

test('fixed preflight SQL executes as a read-only transaction against disposable local PostgreSQL metadata', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const database = new PGlite()
  const identifier = value => '"' + value.replaceAll('"', '""') + '"'
  let ended = false
  try {
    await database.exec('create role anon; create role authenticated; create schema auth; create schema storage; create schema supabase_migrations;')
    for (const [relation, columns] of Object.entries(compatibilityColumns)) {
      const table = relation.split('.').map(identifier).join('.')
      const fields = Object.entries(columns).map(([name, type]) => identifier(name) + ' ' + (type === 'ARRAY' ? 'text[]' : type)).join(',')
      await database.exec('create table ' + table + '(' + fields + ')')
      if (relation.startsWith('public.') || relation === 'storage.objects') await database.exec('alter table ' + table + ' enable row level security; create policy scoped_test on ' + table + ' for select to authenticated using(true);')
    }
    await database.exec('create table public.vera_staging_environment(environment text,project_ref text,project_name text); create table public.vera_staging_migration_checksums(version text,sha256 text); create table supabase_migrations.schema_migrations(version text,name text);')
    await database.query("insert into public.vera_staging_environment values('staging',$1,'vera-orbis-staging')", [ref])
    for (const row of snapshot().history) await database.query('insert into supabase_migrations.schema_migrations values($1,$2)', [row.version, row.name])
    await database.exec("insert into storage.buckets(id,public,file_size_limit,allowed_mime_types) values('materials',false,10485760,array['application/pdf'])")
    const client = { connect: async () => {}, query: sql => database.query(sql), end: async () => { ended = true } }
    const report = await runStagingPreflight({ env: env(), manifest: await buildMigrationManifest(), clientFactory: async () => client })
    assert.equal(report.ready_for_review, true)
    assert.ok(report.warnings.some(warning => warning.code === 'UNCONDITIONAL_POLICY_REVIEW'))
    assert.equal(ended, true)
    assert.equal((await database.query("select current_setting('transaction_read_only') as value")).rows[0].value, 'off', 'the tool rolled back its transaction')
    await database.exec('BEGIN READ ONLY')
    try { await assert.rejects(database.exec('create table public.forbidden_write(id integer)'), /read-only/) }
    finally { await database.exec('ROLLBACK') }
    assert.equal((await database.query("select to_regclass('public.forbidden_write') as value")).rows[0].value, null)
  } finally { await database.close() }
})
