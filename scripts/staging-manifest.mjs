import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildMigrationManifest, verifyMigrationManifest, StagingPreparationError } from './staging-core.mjs'

export async function main(args = process.argv.slice(2)) {
  const current = await buildMigrationManifest()
  if (args.length === 0) { process.stdout.write(JSON.stringify(current, null, 2) + '\n'); return }
  if (args.length !== 2 || !['--write', '--verify'].includes(args[0])) throw new StagingPreparationError('CLI_ARGUMENTS', 'Use staging-manifest.mjs [--write PATH | --verify PATH].')
  const file = resolve(args[1])
  if (args[0] === '--write') { await writeFile(file, JSON.stringify(current, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' }); process.stdout.write('Offline migration manifest created. No database connection was made.\n') }
  else { verifyMigrationManifest(JSON.parse(await readFile(file, 'utf8')), current); process.stdout.write('Offline migration manifest matches all reviewed SQL bytes.\n') }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  process.stderr.write((error instanceof StagingPreparationError ? error.code + ': ' + error.message : 'MANIFEST_IO_FAILED: Manifest could not be read or created; existing files are never overwritten.') + '\n'); process.exitCode = 1
})
