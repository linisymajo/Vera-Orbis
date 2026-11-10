import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  STAGING_PROJECT_REF, STAGING_SUPABASE_URL, validateStagingDevEnvironment,
  applyStagingDevEnvironment, parseStagingDevArguments, stagingViteOptions, createStagingDevLogger
} from '../scripts/dev-staging-config.mjs'
import { startStagingDev } from '../scripts/dev-staging.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const browserKey = 'sb_publishable_synthetic_local_test_only_0123456789'
const productionKey = 'production-key-must-never-be-reused'
const productionUrl = 'https://iopgzmvaqobigjwibual.supabase.co'
const environment = () => ({
  VERA_STAGING_PUBLISHABLE_KEY: browserKey,
  VITE_SUPABASE_URL: productionUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: productionKey,
  VITE_ACADEMIC_AI_ENABLED: 'true',
  VITE_AUTH_REDIRECT_URL: 'https://veraorbis.studio',
  VITE_OTHER_SECRET: 'must-not-be-exposed',
  NODE_ENV: 'production', DEBUG: 'vite:*'
})
const jwt = (claims = {}, header = {}) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', ...header })).toString('base64url'),
  Buffer.from(JSON.stringify({ iss: 'supabase', ref: STAGING_PROJECT_REF, role: 'anon', ...claims })).toString('base64url'),
  Buffer.from('synthetic-signature-not-authenticated').toString('base64url')
].join('.')
const sink = () => {
  const messages = []
  return { messages, log: message => messages.push(message), info: message => messages.push(message), warn: message => messages.push(message), error: message => messages.push(message) }
}

test('staging dev derives only the isolated URL and never reuses inherited VITE credentials', () => {
  const source = environment(), before = structuredClone(source)
  const config = validateStagingDevEnvironment(source)
  assert.equal(config.projectRef, STAGING_PROJECT_REF)
  assert.equal(config.supabaseUrl, STAGING_SUPABASE_URL)
  assert.equal(config.publishableKey, browserKey)
  assert.deepEqual(source, before)
  assert.equal(JSON.stringify(config).includes(productionKey), false)
  assert.equal(JSON.stringify(config).includes(productionUrl), false)
  assert.deepEqual(validateStagingDevEnvironment({ VERA_STAGING_PUBLISHABLE_KEY: browserKey, VERA_STAGING_SUPABASE_URL: STAGING_SUPABASE_URL + '/' }).publicEnvironment, config.publicEnvironment)
})

test('missing dedicated browser key stops even when production VITE credentials exist', () => {
  const source = environment(); delete source.VERA_STAGING_PUBLISHABLE_KEY
  assert.throws(() => validateStagingDevEnvironment(source), error => error.code === 'STAGING_KEY_REQUIRED' && !error.message.includes(productionKey))
  assert.throws(() => validateStagingDevEnvironment({}), error => error.code === 'STAGING_KEY_REQUIRED')
})

test('staging dev refuses foreign projects and URL redirects or overrides without echoing inputs', () => {
  const urls = [productionUrl, 'http://' + STAGING_PROJECT_REF + '.supabase.co', STAGING_SUPABASE_URL + ':444', STAGING_SUPABASE_URL + '/rest/v1', STAGING_SUPABASE_URL + '?apikey=private-input', STAGING_SUPABASE_URL + '#private-input', 'https://user:private-input@' + STAGING_PROJECT_REF + '.supabase.co', STAGING_SUPABASE_URL + '.evil.test', 'not-a-url']
  for (const url of urls) assert.throws(() => validateStagingDevEnvironment({ ...environment(), VERA_STAGING_SUPABASE_URL: url }), error => error.code === 'STAGING_URL_MISMATCH' && !error.message.includes('private-input'))
  assert.throws(() => validateStagingDevEnvironment({ ...environment(), VERA_STAGING_PROJECT_REF: 'iopgzmvaqobigjwibual' }), error => error.code === 'STAGING_PROJECT_MISMATCH')
})

test('only publishable keys or structurally valid matching-project anon JWTs are accepted', () => {
  const anon = jwt()
  assert.equal(validateStagingDevEnvironment({ VERA_STAGING_PUBLISHABLE_KEY: anon }).publishableKey, anon)
  for (const key of ['sb_secret_do_not_log_me', 'sb_unknown_do_not_log_me', 'unknown-key-do-not-log-me', 'sb_publishable_', jwt({ role: 'service_role' }), jwt({ role: 'authenticated' }), jwt({ iss: 'foreign' }), jwt({}, { alg: 'none' }), 'e30.e30.signature', 'x.y.z']) {
    assert.throws(() => validateStagingDevEnvironment({ VERA_STAGING_PUBLISHABLE_KEY: key }), error => error.code === 'STAGING_KEY_TYPE' && !error.message.includes(key))
  }
  for (const claims of [{ ref: 'iopgzmvaqobigjwibual' }, { ref: undefined }]) assert.throws(() => validateStagingDevEnvironment({ VERA_STAGING_PUBLISHABLE_KEY: jwt(claims) }), error => error.code === 'STAGING_KEY_PROJECT')
})

test('the browser environment is an explicit staging allowlist with AI disabled', () => {
  const source = environment(), config = validateStagingDevEnvironment(source)
  applyStagingDevEnvironment(source, config)
  assert.deepEqual(Object.fromEntries(Object.entries(source).filter(([name]) => name.startsWith('VITE_'))), config.publicEnvironment)
  assert.equal(source.VITE_ACADEMIC_AI_ENABLED, 'false')
  assert.equal(source.NODE_ENV, 'development')
  assert.equal(source.DEBUG, undefined)
  assert.equal(JSON.stringify(source).includes(productionKey), false)
})

test('Vite retains project config and host defaults while env files and mode overrides are disabled', () => {
  const defaults = stagingViteOptions(root)
  assert.equal(defaults.mode, 'staging')
  assert.equal(defaults.envDir, false)
  assert.equal(defaults.envPrefix, 'VITE_')
  assert.equal(defaults.configFile, fileURLToPath(new URL('../vite.config.js', import.meta.url)))
  assert.equal(defaults.server, undefined)
  assert.equal(defaults.plugins, undefined)
  assert.deepEqual(parseStagingDevArguments(['--host', '127.0.0.1', '--port=5197', '--strictPort']), { host: '127.0.0.1', port: 5197, strictPort: true })
  assert.deepEqual(parseStagingDevArguments(['--host']), { host: true })
  for (const args of [['--mode', 'production'], ['--config', 'foreign.js'], ['--debug'], ['--port'], ['--port', '0'], ['--port=65536'], ['--host=bad\nvalue']]) assert.throws(() => parseStagingDevArguments(args), error => error.code === 'DEV_ARGUMENTS')
})

test('launcher validates before Vite import, config loading, or listening', async () => {
  let imported = false
  const output = sink()
  await assert.rejects(startStagingDev({ environment: { VITE_SUPABASE_URL: productionUrl, VITE_SUPABASE_PUBLISHABLE_KEY: productionKey }, loadVite: async () => { imported = true }, output }), error => error.code === 'STAGING_KEY_REQUIRED')
  assert.equal(imported, false)
  assert.deepEqual(output.messages, [])
})

test('launcher supplies only guarded configuration and sanitizes startup failure output', async () => {
  const source = environment(), output = sink(), calls = []
  const server = { async listen() { calls.push('listen') }, printUrls() { calls.push('urls') }, bindCLIShortcuts() { calls.push('shortcuts') }, async close() { calls.push('close') } }
  const returned = await startStagingDev({ environment: source, root, args: ['--port', '5197'], output, loadVite: async () => ({ createServer: async options => {
    assert.equal(options.envDir, false)
    assert.equal(options.mode, 'staging')
    assert.equal(options.server.port, 5197)
    assert.equal(source.VITE_SUPABASE_URL, STAGING_SUPABASE_URL)
    assert.equal(source.VITE_ACADEMIC_AI_ENABLED, 'false')
    options.customLogger.info('Do not log ' + browserKey)
    return server
  } }) })
  assert.equal(returned, server)
  assert.deepEqual(calls, ['listen', 'urls', 'shortcuts'])
  assert.equal(output.messages.join('\n').includes(browserKey), false)
  assert.match(output.messages.join('\n'), /duinvkphfnugoyvvlbbq/)
  await assert.rejects(startStagingDev({ environment: environment(), output, loadVite: async () => { throw new Error(browserKey) } }), error => error.code === 'DEV_START_FAILED' && !error.message.includes(browserKey))
})

test('logger removes browser keys, legacy JWTs and secret-key text from all log levels', () => {
  const output = sink(), logger = createStagingDevLogger(browserKey, output), anon = jwt(), error = new Error('test')
  for (const method of ['info', 'warn', 'warnOnce', 'error']) logger[method](`${browserKey} ${anon} sb_secret_private_value`, { error })
  assert.equal(logger.hasWarned, true)
  assert.equal(logger.hasErrorLogged(error), true)
  assert.equal(output.messages.join('\n').includes(browserKey), false)
  assert.equal(output.messages.join('\n').includes(anon), false)
  assert.equal(output.messages.join('\n').includes('sb_secret_private_value'), false)
})

test('CLI exits clearly before starting when the dedicated staging key is missing', () => {
  const childEnv = { ...process.env, VITE_SUPABASE_URL: productionUrl, VITE_SUPABASE_PUBLISHABLE_KEY: productionKey }
  delete childEnv.VERA_STAGING_PUBLISHABLE_KEY
  delete childEnv.VERA_STAGING_PROJECT_REF
  delete childEnv.VERA_STAGING_SUPABASE_URL
  let failure
  try { execFileSync(process.execPath, ['scripts/dev-staging.mjs'], { cwd: root, env: childEnv, encoding: 'utf8', stdio: 'pipe', timeout: 10000 }) } catch (error) { failure = error }
  assert.equal(failure?.status, 1)
  const output = String(failure.stdout) + String(failure.stderr)
  assert.match(output, /VERA_STAGING_PUBLISHABLE_KEY/)
  assert.match(output, /Vite did not start/)
  assert.equal(output.includes(productionKey), false)
  assert.equal(output.includes(productionUrl), false)
})

test('installed Vite resolves the existing project config with only staging browser values and no env-file loading', async () => {
  const names = Object.keys(process.env).filter(name => name.startsWith('VITE_') || name === 'DEBUG' || name === 'NODE_ENV')
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]])), output = sink()
  try {
    const config = validateStagingDevEnvironment(environment())
    applyStagingDevEnvironment(process.env, config)
    const { resolveConfig } = await import('vite')
    const resolved = await resolveConfig(stagingViteOptions(root, {}, createStagingDevLogger(browserKey, output)), 'serve')
    assert.equal(resolved.envDir, false)
    assert.equal(resolved.env.MODE, 'staging')
    assert.equal(resolved.env.VITE_SUPABASE_URL, STAGING_SUPABASE_URL)
    assert.equal(resolved.env.VITE_SUPABASE_PUBLISHABLE_KEY, browserKey)
    assert.equal(resolved.env.VITE_ACADEMIC_AI_ENABLED, 'false')
    assert.deepEqual(Object.keys(resolved.env).filter(name => name.startsWith('VITE_')).sort(), Object.keys(config.publicEnvironment).sort())
    assert.ok(resolved.build.rollupOptions.input.teacher.endsWith('teacher.html'))
    assert.equal(output.messages.join('\n').includes(browserKey), false)
  } finally {
    for (const name of Object.keys(process.env)) if (name.startsWith('VITE_') || name === 'DEBUG' || name === 'NODE_ENV') delete process.env[name]
    Object.assign(process.env, saved)
  }
})
