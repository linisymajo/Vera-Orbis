import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, realpath, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { STAGING_PROJECT_REF, STAGING_SUPABASE_URL, validateStagingDevEnvironment } from '../scripts/dev-staging-config.mjs'
import { StagingBuildError, applyStagingBuildEnvironment, createStagingOutput, stagingBuildOptions, copyStagingPublicFiles, verifyStagingArtifact } from '../scripts/build-staging-config.mjs'
import { buildStagingPreview } from '../scripts/build-staging.mjs'

const browserKey = 'sb_publishable_synthetic_build_fixture_only_0123456789'
const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
const env = () => ({ VERA_STAGING_PUBLISHABLE_KEY: browserKey, VITE_SUPABASE_URL: 'https://foreign-production.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'must-not-be-used', VITE_ACADEMIC_AI_ENABLED: 'true', VITE_OTHER_SECRET: 'unrelated-private-input', DEBUG: 'vite:*' })
const sink = () => { const messages = []; return { messages, info: value => messages.push(value), warn: value => messages.push(value), error: value => messages.push(value), log: value => messages.push(value) } }
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'vera-staging-build-test-'))
  t.after(async () => {
    const target = await realpath(root)
    assert.equal(dirname(target), await realpath(tmpdir()))
    assert.ok(basename(target).startsWith('vera-staging-build-test-'))
    await rm(target, { recursive: true, force: true })
  })
  await mkdir(join(root, 'public'))
  await writeFile(join(root, 'public', 'CNAME'), 'production.example.invalid\n')
  await writeFile(join(root, 'public', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  return root
}
async function bundle(outDir, content = '') {
  await writeFile(join(outDir, 'index.html'), '<html><script type="module" src="/app.js"></script></html>')
  await writeFile(join(outDir, 'app.js'), `window.fixture = ${JSON.stringify({ url: STAGING_SUPABASE_URL, key: browserKey })};${content}`)
}

test('staging build environment is a strict public allowlist, production build semantics, and AI disabled', () => {
  const environment = env()
  const configuration = validateStagingDevEnvironment(environment)
  applyStagingBuildEnvironment(environment, configuration)
  assert.equal(environment.NODE_ENV, 'production')
  assert.equal(environment.DEBUG, undefined)
  assert.deepEqual(Object.fromEntries(Object.entries(environment).filter(([name]) => name.startsWith('VITE_'))), configuration.publicEnvironment)
  assert.equal(environment.VITE_ACADEMIC_AI_ENABLED, 'false')
  assert.equal(JSON.stringify(environment).includes('unrelated-private-input'), false)
})

test('staging output uses fresh directories only and leaves existing production artifacts untouched', async t => {
  const root = await fixture(t)
  await mkdir(join(root, 'dist'))
  await writeFile(join(root, 'dist', 'production.txt'), 'preserve production artifact')
  const first = await createStagingOutput(root), second = await createStagingOutput(root)
  assert.notEqual(first, second)
  assert.equal(dirname(first), join(await realpath(root), '.temp', 'staging-preview'))
  assert.equal(await readFile(join(root, 'dist', 'production.txt'), 'utf8'), 'preserve production artifact')
  assert.deepEqual(await readdir(first), [])
  assert.throws(() => stagingBuildOptions(root, join(root, 'dist'), validateStagingDevEnvironment(env()), sink()), error => error.code === 'BUILD_PATH_UNSAFE')
})

test('build refuses symlink output ancestors instead of writing outside its staging directory', async t => {
  const root = await fixture(t), outside = join(root, 'unrelated-directory')
  await mkdir(outside)
  try { await symlink(outside, join(root, '.temp'), process.platform === 'win32' ? 'junction' : 'dir') }
  catch (error) { if (['EPERM', 'ENOTSUP'].includes(error.code)) { t.skip('Symbolic links are unavailable.'); return } throw error }
  await assert.rejects(createStagingOutput(root), error => error.code === 'BUILD_PATH_UNSAFE')
  assert.deepEqual(await readdir(outside), [])
})

test('public copy excludes production CNAME and refuses collisions with compiled output', async t => {
  const root = await fixture(t), outDir = await createStagingOutput(root)
  await bundle(outDir)
  await copyStagingPublicFiles(root, outDir)
  assert.equal((await readdir(outDir)).includes('CNAME'), false)
  assert.equal(await readFile(join(root, 'public', 'CNAME'), 'utf8'), 'production.example.invalid\n')
  assert.match(await readFile(join(outDir, 'logo.svg'), 'utf8'), /<svg/)
  await writeFile(join(root, 'public', 'app.js'), 'do not replace the generated bundle')
  await assert.rejects(copyStagingPublicFiles(root, outDir), error => error.code === 'BUILD_PUBLIC_COLLISION')
  assert.match(await readFile(join(outDir, 'app.js'), 'utf8'), /duinvkphfnugoyvvlbbq/)
})

test('public environment files are refused before being copied or included in a review manifest', async t => {
  const root = await fixture(t), outDir = await createStagingOutput(root)
  await writeFile(join(root, 'public', '.env.local'), 'synthetic-file-must-not-be-copied')
  await assert.rejects(copyStagingPublicFiles(root, outDir), error => error.code === 'BUILD_ARTIFACT_UNSAFE')
  assert.equal((await readdir(outDir)).includes('.env.local'), false)
})

test('artifact verification requires actual staging browser values, refuses foreign projects, and writes hashes without keys', async t => {
  const root = await fixture(t), configuration = validateStagingDevEnvironment(env())
  for (const [contents, code] of [
    [`window.foreign='https://iopgzmvaqobigjwibual.supabase.co'`, 'BUILD_ARTIFACT_UNSAFE'],
    [`window.secret='sb_secret_synthetic_never_allowed'`, 'BUILD_ARTIFACT_UNSAFE']
  ]) {
    const outDir = await createStagingOutput(root)
    await bundle(outDir, contents)
    await assert.rejects(verifyStagingArtifact(outDir, configuration), error => error.code === code)
    assert.equal((await readdir(outDir)).includes('staging-preview-manifest.json'), false)
  }
  const unverified = await createStagingOutput(root)
  await writeFile(join(unverified, 'index.html'), '<html>no verified browser bundle</html>')
  await assert.rejects(verifyStagingArtifact(unverified, configuration), error => error.code === 'BUILD_ARTIFACT_UNVERIFIED')
  const valid = await createStagingOutput(root)
  await bundle(valid)
  const manifest = await verifyStagingArtifact(valid, configuration)
  assert.equal(manifest.project_ref, STAGING_PROJECT_REF)
  assert.equal(manifest.academic_ai_enabled, false)
  assert.equal(manifest.hosting_deployed, false)
  assert.equal(manifest.backend_validated, false)
  assert.ok(manifest.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)))
  assert.equal(JSON.stringify(manifest).includes(browserKey), false)
  assert.equal(JSON.parse(await readFile(join(valid, 'staging-preview-manifest.json'), 'utf8')).local_artifact_only, true)
})

test('resolved config boundary preserves project entries and refuses foreign build environment overrides', async t => {
  const root = await fixture(t), outDir = await createStagingOutput(root), configuration = validateStagingDevEnvironment(env())
  const options = stagingBuildOptions(root, outDir, configuration, sink())
  assert.equal(options.configFile, join(root, 'vite.config.js'))
  assert.equal(options.envDir, false)
  assert.equal(options.mode, 'staging')
  assert.equal(options.build.copyPublicDir, false)
  assert.equal(options.build.emptyOutDir, false)
  assert.equal(options.build.sourcemap, false)
  assert.equal(options.build.rollupOptions, undefined, 'the existing Vite config retains every HTML entry')
  const resolved = { mode: 'staging', envDir: false, env: { ...configuration.publicEnvironment, PROD: true }, build: options.build }
  assert.doesNotThrow(() => options.plugins[0].configResolved(resolved))
  assert.throws(() => options.plugins[0].configResolved({ ...resolved, env: { ...resolved.env, VITE_AUTH_REDIRECT_URL: 'https://production.example.invalid' } }), error => error.code === 'BUILD_CONFIGURATION_UNSAFE')
})

test('builder validates before Vite import or writes and keeps thrown driver errors redacted', async t => {
  const root = await fixture(t), output = sink()
  let imported = false
  const loadVite = async () => { imported = true; throw new Error(browserKey) }
  await assert.rejects(buildStagingPreview({ environment: {}, root, output, loadVite }), error => error.code === 'STAGING_KEY_REQUIRED')
  await assert.rejects(buildStagingPreview({ environment: env(), args: ['--outDir', 'dist'], root, output, loadVite }), error => error.code === 'BUILD_ARGUMENTS')
  assert.equal(imported, false)
  assert.equal((await readdir(root)).includes('.temp'), false)
  await assert.rejects(buildStagingPreview({ environment: env(), root, output, loadVite }), error => error instanceof StagingBuildError && error.code === 'BUILD_FAILED' && !error.message.includes(browserKey))
  assert.equal(output.messages.join('\n').includes(browserKey), false)
})

test('builder returns a verified local artifact and safe output without touching provider APIs', async t => {
  const root = await fixture(t), environment = env(), output = sink()
  const { outDir, manifest } = await buildStagingPreview({ environment, root, output, loadVite: async () => ({ build: async options => {
    assert.equal(environment.VITE_SUPABASE_URL, STAGING_SUPABASE_URL)
    assert.equal(environment.VITE_ACADEMIC_AI_ENABLED, 'false')
    options.customLogger.info('redact ' + browserKey)
    await bundle(options.build.outDir)
  } }) })
  assert.equal(manifest.project_ref, STAGING_PROJECT_REF)
  assert.equal((await readdir(outDir)).includes('CNAME'), false)
  assert.match(output.messages.join('\n'), /No hosting deployment or backend validation/)
  assert.equal(output.messages.join('\n').includes(browserKey), false)
})

test('CLI refuses missing dedicated staging key even if production VITE values exist', () => {
  const childEnv = { ...process.env, VITE_SUPABASE_URL: 'https://foreign-production.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'private-do-not-print' }
  delete childEnv.VERA_STAGING_PUBLISHABLE_KEY
  delete childEnv.VERA_STAGING_PROJECT_REF
  delete childEnv.VERA_STAGING_SUPABASE_URL
  let failure
  try { execFileSync(process.execPath, ['scripts/build-staging.mjs'], { cwd: sourceRoot, env: childEnv, encoding: 'utf8', stdio: 'pipe', timeout: 10000 }) }
  catch (error) { failure = error }
  assert.equal(failure?.status, 1)
  const messages = String(failure.stdout) + String(failure.stderr)
  assert.match(messages, /VERA_STAGING_PUBLISHABLE_KEY/)
  assert.equal(messages.includes('private-do-not-print'), false)
})

test('actual installed Vite builds an isolated fixture, ignores synthetic env files and excludes production CNAME', async t => {
  const root = await fixture(t), output = sink()
  await mkdir(join(root, 'src'))
  await writeFile(join(root, 'vite.config.js'), `import {fileURLToPath} from 'node:url'; export default {build:{rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url))}}}};`)
  await writeFile(join(root, 'index.html'), '<html><body><script type="module" src="/src/main.js"></script></body></html>')
  await writeFile(join(root, 'src', 'main.js'), 'document.body.dataset.url=import.meta.env.VITE_SUPABASE_URL;document.body.dataset.key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;document.body.dataset.ai=import.meta.env.VITE_ACADEMIC_AI_ENABLED;document.body.dataset.extra=String(import.meta.env.VITE_OTHER_SECRET);')
  // This file is a synthetic tripwire. The staging builder must never load it.
  await writeFile(join(root, '.env.local'), 'VITE_SUPABASE_URL=https://foreign-production.supabase.co\nVITE_OTHER_SECRET=env-file-tripwire-must-not-appear\n')
  const saved = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.startsWith('VITE_') || name.startsWith('VERA_STAGING_') || ['DEBUG', 'NODE_ENV'].includes(name)))
  try {
    Object.assign(process.env, env())
    const result = await buildStagingPreview({ environment: process.env, root, output })
    assert.equal(relative(root, result.outDir).split(/[\\/]/).slice(0, 2).join('/'), '.temp/staging-preview')
    const javascript = result.manifest.files.filter(file => file.path.endsWith('.js'))
    const bundleText = (await Promise.all(javascript.map(file => readFile(resolve(result.outDir, file.path), 'utf8')))).join('\n')
    assert.match(bundleText, /duinvkphfnugoyvvlbbq/)
    assert.ok(bundleText.includes(browserKey))
    assert.ok(bundleText.includes('false'))
    assert.doesNotMatch(bundleText, /foreign-production|env-file-tripwire|unrelated-private-input/)
    assert.equal((await readdir(result.outDir)).includes('CNAME'), false)
    assert.equal(output.messages.join('\n').includes(browserKey), false)
  } finally {
    for (const name of Object.keys(process.env)) if (name.startsWith('VITE_') || name.startsWith('VERA_STAGING_') || ['DEBUG', 'NODE_ENV'].includes(name)) delete process.env[name]
    Object.assign(process.env, saved)
  }
})
