import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import {
  STAGING_PROJECT_REF, StagingDevConfigurationError, validateStagingDevEnvironment,
  applyStagingDevEnvironment, parseStagingDevArguments, stagingViteOptions, createStagingDevLogger
} from './dev-staging-config.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export async function startStagingDev({ environment = process.env, args = [], root = projectRoot,
  loadVite = () => import('vite'), output = console } = {}) {
  // Validate before importing Vite, loading project config, or opening a server.
  const configuration = validateStagingDevEnvironment(environment)
  const serverOptions = parseStagingDevArguments(args)
  applyStagingDevEnvironment(environment, configuration)
  const logger = createStagingDevLogger(configuration.publishableKey, output)
  let server
  try {
    const { createServer } = await loadVite()
    server = await createServer(stagingViteOptions(root, serverOptions, logger))
    await server.listen()
    logger.info(`Local staging only: ${STAGING_PROJECT_REF}. Academic AI generation is disabled.`)
    server.printUrls()
    server.bindCLIShortcuts?.({ print: true })
    return server
  } catch {
    try { await server?.close() } catch {}
    throw new StagingDevConfigurationError('DEV_START_FAILED', 'The isolated staging dev server could not start. Check the local port and Vite configuration. No credentials are printed.')
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await startStagingDev({ args: process.argv.slice(2) })
  } catch (error) {
    console.error(`Staging dev stopped: ${error instanceof StagingDevConfigurationError ? error.message : 'Invalid staging configuration.'} Vite did not start.`)
    process.exitCode = 1
  }
}
