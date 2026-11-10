import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildMigrationManifest, verifyMigrationManifest, StagingPreparationError } from './staging-core.mjs'
import { runStagingInspection } from './staging-inspect-core.mjs'

export async function main(args=process.argv.slice(2)) {
  if (args.length!==4 || args[0]!=='--project-ref' || !args[1] || args[2]!=='--manifest' || !args[3]) throw new StagingPreparationError('INSPECTION_ARGUMENTS_REQUIRED','Use staging-inspect.mjs --project-ref <explicit-approved-staging-ref> --manifest <reviewed-manifest-path>. There is no target default or apply mode.')
  const manifest=await buildMigrationManifest()
  verifyMigrationManifest(JSON.parse(await readFile(resolve(args[3]),'utf8')),manifest)
  const { Client }=await import('pg')
  const report=await runStagingInspection({env:process.env,expectedProjectRef:args[1],manifest,clientFactory:config=>new Client(config)})
  process.stdout.write(JSON.stringify(report,null,2)+'\n')
  // Inspection never signals approval or readiness to a release pipeline.
  process.exitCode=2
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main().catch(error=>{
  process.stderr.write((error instanceof StagingPreparationError ? error.code+': '+error.message : 'INSPECTION_INPUT_FAILED: Review the explicit staging inputs and manifest privately.')+'\n')
  process.exitCode=1
})
