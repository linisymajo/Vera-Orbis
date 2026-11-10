import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { STAGING_PROJECT_REF, StagingDevConfigurationError, validateStagingDevEnvironment, createStagingDevLogger } from './dev-staging-config.mjs'
import { StagingBuildError, applyStagingBuildEnvironment, createStagingOutput, stagingBuildOptions, copyStagingPublicFiles, verifyStagingArtifact } from './build-staging-config.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export async function buildStagingPreview({ environment = process.env, args = [], root = projectRoot, loadVite = () => import('vite'), output = console } = {}) {
  // Validate before Vite import, workspace writes or config resolution. No .env files are loaded.
  const configuration = validateStagingDevEnvironment(environment)
  if (args.length) throw new StagingBuildError('BUILD_ARGUMENTS', 'Staging builds accept no environment, output, mode or deployment overrides.')
  applyStagingBuildEnvironment(environment, configuration)
  const logger = createStagingDevLogger(configuration.publishableKey, output)
  try {
    const outDir = await createStagingOutput(root)
    const { build } = await loadVite()
    await build(stagingBuildOptions(root, outDir, configuration, logger))
    await copyStagingPublicFiles(root, outDir)
    const manifest = await verifyStagingArtifact(outDir, configuration)
    logger.info(`Local staging artifact verified for ${STAGING_PROJECT_REF}: ${outDir}`)
    logger.info('Academic AI is disabled. Production CNAME is excluded. No hosting deployment or backend validation was performed.')
    return { outDir, manifest }
  } catch (error) {
    if (error instanceof StagingBuildError) throw error
    throw new StagingBuildError('BUILD_FAILED', 'The isolated staging build could not be verified. No deployment was performed; credentials are not printed.')
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await buildStagingPreview({ args: process.argv.slice(2) }) }
  catch (error) {
    console.error(`Staging build stopped: ${error instanceof StagingBuildError || error instanceof StagingDevConfigurationError ? error.message : 'Invalid staging configuration.'}`)
    process.exitCode = 1
  }
}
