// Offline proposal only. No database client, environment files or apply mode.
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildMigrationManifest, verifyMigrationManifest, repositoryRoot } from './staging-core.mjs'

export const initializationFiles = Object.freeze([
  'supabase/staging/initial_application_schema.sql',
  'supabase/staging/initialization_tracking.sql',
  'supabase/migrations/0002_teacher_operations.sql',
  ...Array.from({ length: 18 }, (_, index) => {
    const names = [
      'exercise_studio', 'materials_storage_policy', 'interface_language',
      'teacher_management_enhancements', 'teacher_management_security_patch',
      'academic_sync_challenges_feedback', 'inbox_messaging',
      'material_office_formats', 'exercise_workflow', 'hybrid_enrollment',
      'ai_drafts', 'material_owner_boundary', 'academic_teacher_scope',
      'inbox_authorization', 'student_attachments', 'learning_plans',
      'challenges_notifications', 'final_assessments'
    ]
    return `supabase/migrations/${String(index + 4).padStart(4, '0')}_${names[index]}.sql`
  }),
  'supabase/staging/application_access.sql'
])

export async function buildStagingInitializationPlan(root = repositoryRoot) {
  const release = await buildMigrationManifest(root)
  verifyMigrationManifest(JSON.parse(await readFile(resolve(root, 'scripts/staging-manifest.reviewed.json'), 'utf8')), release)
  const entries = []
  for (const file of initializationFiles) {
    const bytes = await readFile(resolve(root, file))
    const match = file.match(/^supabase\/migrations\/(\d{4})_(.+)\.sql$/)
    entries.push({ order: entries.length + 1, file, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      migration_version: match?.[1] || null, migration_name: match?.[2] || null })
  }
  return {
    format: 'vera-orbis-empty-staging-initialization-v1',
    target: { project_ref: 'duinvkphfnugoyvvlbbq', project_name: 'vera-orbis-staging' },
    approval_required: true, migrations_approved: false, ready_to_apply: false,
    production_compatible: 'not established; new empty-staging baseline only',
    release_manifest_sha256: release.manifest_sha256,
    plan_sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
    entries,
    exclusions: ['0001_teacher_security.template.sql', '0003_teacher_operations_corrective.sql',
      'Auth accounts or role seeding', 'production changes', 'AI provider activation'],
    recording_rule: 'Record exact SQL files only after successful execution; never stamp historical versions to bypass a refusal.'
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) {
    console.error('Offline initialization proposal has no connection, write or apply options.')
    process.exitCode = 1
  } else {
    try { console.log(JSON.stringify(await buildStagingInitializationPlan(), null, 2)) }
    catch { console.error('Initialization proposal failed; verify local SQL and the reviewed release manifest.'); process.exitCode = 1 }
  }
}
