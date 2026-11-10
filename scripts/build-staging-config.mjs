import { realpath, lstat, mkdir, mkdtemp, readdir, copyFile, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative, join, sep, extname } from 'node:path'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { STAGING_PROJECT_REF, STAGING_SUPABASE_URL, applyStagingDevEnvironment, stagingViteOptions } from './dev-staging-config.mjs'

export class StagingBuildError extends Error {
  constructor(code, message) { super(message); this.name = 'StagingBuildError'; this.code = code }
}

export function applyStagingBuildEnvironment(environment, configuration) {
  applyStagingDevEnvironment(environment, configuration)
  environment.NODE_ENV = 'production'
  return environment
}

async function plainDirectory(path) {
  const stat = await lstat(path)
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new StagingBuildError('BUILD_PATH_UNSAFE', 'Staging output directories must be ordinary directories within the workspace.')
}

export async function createStagingOutput(root) {
  const workspace = await realpath(root)
  const stagingParent = resolve(workspace, '.temp', 'staging-preview')
  // Check each existing ancestor before creating children. No recursive deletion is used.
  for (const path of [join(workspace, '.temp'), stagingParent]) {
    try { await plainDirectory(path) }
    catch (error) {
      if (error?.code !== 'ENOENT') throw error
      await mkdir(path)
      await plainDirectory(path)
    }
  }
  if (await realpath(stagingParent) !== stagingParent) throw new StagingBuildError('BUILD_PATH_UNSAFE', 'Staging output must stay within the workspace staging directory.')
  return mkdtemp(join(stagingParent, 'build-'))
}

export function stagingBuildOptions(root, outDir, configuration, logger) {
  const expectedOutput = resolve(outDir)
  const stagingParent = resolve(root, '.temp', 'staging-preview')
  const child = relative(stagingParent, expectedOutput)
  if (!child || child.startsWith('..') || child.includes(sep)) throw new StagingBuildError('BUILD_PATH_UNSAFE', 'Use a dedicated staging build directory; production dist cannot be overwritten.')
  return {
    ...stagingViteOptions(root, {}, logger),
    build: { outDir: expectedOutput, emptyOutDir: false, copyPublicDir: false, sourcemap: false },
    plugins: [{
      name: 'vera-staging-build-boundary',
      configResolved(config) {
        const publicNames = Object.keys(config.env).filter(name => name.startsWith('VITE_')).sort()
        const expectedNames = Object.keys(configuration.publicEnvironment).sort()
        if (config.mode !== 'staging' || config.envDir !== false || config.env.PROD !== true
          || JSON.stringify(publicNames) !== JSON.stringify(expectedNames)
          || expectedNames.some(name => config.env[name] !== configuration.publicEnvironment[name])
          || resolve(config.build.outDir) !== expectedOutput || config.build.copyPublicDir !== false
          || config.build.emptyOutDir !== false || config.build.sourcemap !== false) {
          throw new StagingBuildError('BUILD_CONFIGURATION_UNSAFE', 'The resolved build does not match the isolated staging configuration.')
        }
      }
    }]
  }
}

async function listPlainFiles(directory, base = directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new StagingBuildError('BUILD_SYMLINK_REFUSED', 'Staging artifacts cannot include symbolic links.')
    if (entry.isDirectory()) files.push(...await listPlainFiles(path, base))
    else if (entry.isFile()) files.push({ path, relative: relative(base, path).split(sep).join('/') })
    else throw new StagingBuildError('BUILD_FILE_REFUSED', 'Staging artifacts may contain regular files only.')
  }
  return files
}

export async function copyStagingPublicFiles(root, outDir) {
  const publicDir = resolve(root, 'public')
  try { await plainDirectory(publicDir) }
  catch (error) { if (error?.code === 'ENOENT') return; throw error }
  const files = await listPlainFiles(publicDir)
  for (const file of files) {
    // Production custom-domain metadata never enters the staging artifact.
    if (file.relative.toUpperCase() === 'CNAME') continue
    if (/(?:^|\/)\.env(?:\.|$)/i.test(file.relative)) throw new StagingBuildError('BUILD_ARTIFACT_UNSAFE', 'Environment files cannot be copied into a staging artifact.')
    const destination = join(outDir, ...file.relative.split('/'))
    await mkdir(resolve(destination, '..'), { recursive: true })
    // A public file cannot replace a compiled entry or generated bundle.
    try { await copyFile(file.path, destination, constants.COPYFILE_EXCL) }
    catch { throw new StagingBuildError('BUILD_PUBLIC_COLLISION', 'A public file conflicts with the generated staging artifact.') }
  }
}

export async function verifyStagingArtifact(outDir, configuration) {
  const files = await listPlainFiles(outDir)
  const checksums = []
  let projectFound = false, browserKeyFound = false
  for (const file of files) {
    if (file.relative.toUpperCase() === 'CNAME' || /(?:^|\/)\.env(?:\.|$)/i.test(file.relative) || file.relative.endsWith('.map')) {
      throw new StagingBuildError('BUILD_ARTIFACT_UNSAFE', 'The staging artifact contains forbidden deployment metadata or environment files.')
    }
    const bytes = await readFile(file.path)
    if (['.js', '.html', '.css', '.json', '.svg', '.txt', '.xml'].includes(extname(file.path).toLowerCase())) {
      const content = bytes.toString('utf8')
      const projects = [...content.matchAll(/\b([a-z0-9-]+)\.supabase\.co\b/gi)].map(match => match[1].toLowerCase())
      if (projects.some(ref => ref !== STAGING_PROJECT_REF) || /\bsb_secret_[a-z0-9_-]+/i.test(content)) {
        throw new StagingBuildError('BUILD_ARTIFACT_UNSAFE', 'The staging artifact includes a foreign project reference or privileged key.')
      }
      if (extname(file.path) === '.js') {
        projectFound ||= content.includes(STAGING_SUPABASE_URL)
        browserKeyFound ||= content.includes(configuration.publishableKey)
      }
    }
    checksums.push({ path: file.relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  if (!projectFound || !browserKeyFound || !files.some(file => file.relative === 'index.html')) {
    throw new StagingBuildError('BUILD_ARTIFACT_UNVERIFIED', 'The staging browser configuration or main entry could not be confirmed in the artifact.')
  }
  const manifest = {
    version: 1, project_ref: STAGING_PROJECT_REF, supabase_url: STAGING_SUPABASE_URL,
    academic_ai_enabled: false, local_artifact_only: true, hosting_deployed: false,
    backend_validated: false, generated_at: new Date().toISOString(), files: checksums.sort((a, b) => a.path.localeCompare(b.path))
  }
  await writeFile(join(outDir, 'staging-preview-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
  return manifest
}
