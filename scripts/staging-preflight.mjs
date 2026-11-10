import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildMigrationManifest, inspectionQueries, runStagingPreflight, verifyMigrationManifest, StagingPreparationError } from './staging-core.mjs'

export async function main(args = process.argv.slice(2)) {
  const manifest = await buildMigrationManifest()
  if (!args.length) {
    process.stdout.write(JSON.stringify({ mode: 'offline', database_contacted: false, manifest, inspection_queries: inspectionQueries,
      next: 'Create and independently verify a NEW vera-orbis-staging project. Review the baseline and backup procedure in docs/academic-deployment.md. Only then use --read-only-connect --manifest PATH with explicit staging environment variables.' }, null, 2) + '\n')
    return
  }
  if (args.length !== 3 || args[0] !== '--read-only-connect' || args[1] !== '--manifest') throw new StagingPreparationError('CLI_ARGUMENTS', 'Only offline output or --read-only-connect --manifest PATH is supported. There is no apply command.')
  verifyMigrationManifest(JSON.parse(await readFile(resolve(args[2]), 'utf8')), manifest)
  const { Client } = await import('pg')
  const report = await runStagingPreflight({ env: process.env, manifest, clientFactory: config => new Client(config) })
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  if (!report.ready_for_review) process.exitCode = 2
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  process.stderr.write((error instanceof StagingPreparationError ? error.code + ': ' + error.message : 'PREFLIGHT_INPUT_FAILED: Review the manifest and explicit staging inputs privately.') + '\n'); process.exitCode = 1
})
