import { createHash, X509Certificate } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
export const releaseFiles = [
  '0011_material_office_formats.sql', '0012_exercise_workflow.sql', '0013_hybrid_enrollment.sql',
  '0014_ai_drafts.sql', '0015_material_owner_boundary.sql', '0016_academic_teacher_scope.sql',
  '0017_inbox_authorization.sql', '0018_student_attachments.sql', '0019_learning_plans.sql',
  '0020_challenges_notifications.sql', '0021_final_assessments.sql'
]
const hash = value => createHash('sha256').update(value).digest('hex')
export class StagingPreparationError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const refuse = (code, message) => { throw new StagingPreparationError(code, message) }

export async function buildMigrationManifest(root = repositoryRoot) {
  const directory = resolve(root, 'supabase/migrations')
  const names = await readdir(directory)
  const entries = []
  for (const file of releaseFiles) {
    const id = file.slice(0, 4)
    if (names.filter(name => name.startsWith(id + '_') && name.endsWith('.sql')).length !== 1 || !names.includes(file)) {
      refuse('MIGRATION_SET_AMBIGUOUS', 'Each reviewed migration ID must have exactly its expected SQL file.')
    }
    const bytes = await readFile(resolve(directory, file))
    entries.push({ id, file, bytes: bytes.length, sha256: hash(bytes) })
  }
  return { format: 'vera-orbis-staging-manifest-v1', range: '0011-0021', entries, manifest_sha256: hash(JSON.stringify(entries)) }
}

export function verifyMigrationManifest(saved, current) {
  if (saved?.format !== current.format || saved.range !== current.range || saved.manifest_sha256 !== current.manifest_sha256 || JSON.stringify(saved.entries) !== JSON.stringify(current.entries)) {
    refuse('MANIFEST_CHANGED', 'The reviewed offline manifest differs from the current SQL files. Review and regenerate it before connecting.')
  }
  return true
}

// This deliberately does not read .env files, VITE_*, DATABASE_URL, linked CLI
// projects, local Supabase settings, or a default project. Only these named inputs.
export function validateStagingEnvironment(env) {
  const ref = env.VERA_STAGING_PROJECT_REF
  if (env.VERA_STAGING_PROJECT_NAME !== 'vera-orbis-staging' || env.VERA_STAGING_ACK !== 'read-only-preflight') {
    refuse('STAGING_INTENT_REQUIRED', 'Set the dedicated staging project name and explicit read-only preflight acknowledgement.')
  }
  if (!/^[a-z0-9]{20}$/.test(ref || '')) refuse('STAGING_REF_REQUIRED', 'Set the exact dedicated staging project reference.')
  const denied = String(env.VERA_STAGING_DENY_PROJECT_REFS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (denied.includes(ref)) refuse('PROJECT_DENIED', 'The selected project is explicitly excluded from staging use.')
  let url
  try { url = new URL(env.VERA_STAGING_DB_URL) } catch { refuse('STAGING_URL_REQUIRED', 'A dedicated staging PostgreSQL URL is required.') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== `db.${ref}.supabase.co` || (url.port && url.port !== '5432') || url.pathname !== '/postgres') {
    refuse('PROJECT_HOST_MISMATCH', 'Use the direct PostgreSQL host for the explicit staging project reference, port 5432 and postgres database. Poolers and fallback hosts are refused.')
  }
  if (url.username !== 'postgres' || !url.password || url.hash || [...url.searchParams].some(([key, value]) => key !== 'sslmode' || value !== 'verify-full') || url.searchParams.getAll('sslmode').length > 1) {
    refuse('STAGING_CONNECTION_UNSAFE', 'Use the direct postgres account, a nonempty password and only optional sslmode=verify-full. Connection overrides are refused.')
  }
  let password
  try { password = decodeURIComponent(url.password) } catch { refuse('STAGING_CONNECTION_UNSAFE', 'The staging connection URL must use valid percent encoding.') }
  const ca = env.VERA_STAGING_CA_PEM
  if (ca != null) {
    try { if (typeof ca !== 'string' || ca.length > 65536) throw new Error(); new X509Certificate(ca) }
    catch { refuse('STAGING_CA_INVALID', 'Provide the downloaded staging CA as a valid public PEM certificate, or use the verified system trust store.') }
  }
  return {
    target: { project_ref: ref, project_name: 'vera-orbis-staging', host: url.hostname, database: 'postgres', mode: 'read-only' },
    connection: { host: url.hostname, port: 5432, database: 'postgres', user: 'postgres', password,
      ssl: { rejectUnauthorized: true, servername: url.hostname, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 5000, query_timeout: 10000,
      options: '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000' }
  }
}

export const compatibilityColumns = {
  'auth.users': { id: 'uuid', email_confirmed_at: 'timestamp with time zone', raw_user_meta_data: 'jsonb' },
  'public.teachers': { id: 'uuid' },
  'public.profiles': { id: 'uuid', name: 'text', language: 'text', level: 'text', progress: 'integer', interface_language: 'text' },
  'public.onboarding_responses': { student_id: 'uuid' },
  'public.materials': { id: 'uuid', teacher_id: 'uuid', student_id: 'uuid', file_path: 'text', audience: 'text' },
  'public.classes': { id: 'uuid', teacher_id: 'uuid', starts_at: 'timestamp with time zone' },
  'public.class_participants': { class_id: 'uuid', teacher_id: 'uuid', student_id: 'uuid' },
  'public.exercises': { id: 'uuid', teacher_id: 'uuid', questions: 'jsonb', settings: 'jsonb', status: 'text' },
  'public.exercise_assignments': { id: 'uuid', exercise_id: 'uuid', teacher_id: 'uuid', student_id: 'uuid', due_at: 'timestamp with time zone' },
  'public.exercise_attempts': { id: 'uuid', assignment_id: 'uuid', student_id: 'uuid', answers: 'jsonb' },
  'public.weekly_challenges': { id: 'uuid', teacher_id: 'uuid', student_id: 'uuid', instructions: 'text', audience: 'text', end_date: 'timestamp with time zone' },
  'public.challenge_submissions': { id: 'uuid', challenge_id: 'uuid', student_id: 'uuid', response: 'text', teacher_feedback: 'text' },
  'public.feedback': { id: 'uuid', teacher_id: 'uuid', student_id: 'uuid', message: 'text' },
  'public.inbox_messages': { id: 'uuid', sender_id: 'uuid', recipient_id: 'uuid', sender_role: 'text', recipient_role: 'text', is_read: 'boolean' },
  'storage.buckets': { id: 'text', public: 'boolean', file_size_limit: 'bigint', allowed_mime_types: 'ARRAY' },
  'storage.objects': { id: 'uuid', bucket_id: 'text', name: 'text', metadata: 'jsonb' }
}

export const inspectionQueries = Object.freeze({
  session: "select current_database() as database, current_setting('server_version_num') as server_version_num, current_setting('transaction_read_only') as read_only",
  markerExists: "select to_regclass('public.vera_staging_environment') is not null as present",
  marker: 'select environment,project_ref,project_name from public.vera_staging_environment',
  relations: "select n.nspname||'.'||c.relname as relation,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','auth','storage') and c.relkind in('r','p')",
  columns: "select table_schema||'.'||table_name as relation,column_name,data_type from information_schema.columns where table_schema in('public','auth','storage','supabase_migrations')",
  policies: "select schemaname||'.'||tablename as relation,policyname,cmd,permissive,roles,qual,with_check from pg_policies where schemaname in('public','storage')",
  grants: "select table_schema||'.'||table_name as relation,grantee,privilege_type from information_schema.role_table_grants where table_schema in('public','storage') and grantee in('anon','authenticated','PUBLIC')",
  column_grants: "select table_schema||'.'||table_name as relation,column_name,grantee,privilege_type from information_schema.column_privileges where table_schema in('public','storage') and grantee in('anon','authenticated','PUBLIC')",
  historyExists: "select to_regclass('supabase_migrations.schema_migrations') is not null as present",
  history: 'select version,name from supabase_migrations.schema_migrations order by version',
  ledgerExists: "select to_regclass('public.vera_staging_migration_checksums') is not null as present",
  ledger: 'select version,sha256 from public.vera_staging_migration_checksums order by version',
  buckets: "select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in('materials','academic-submissions') order by id"
})

export function assessStagingSnapshot(snapshot, manifest) {
  const blockers = [], warnings = []
  const add = (code, detail) => blockers.push({ code, detail })
  const relationMap = new Map(snapshot.relations.map(row => [row.relation, row]))
  const columns = new Map(snapshot.columns.map(row => [row.relation + ':' + row.column_name, row.data_type]))
  for (const [relation, fields] of Object.entries(compatibilityColumns)) {
    if (!relationMap.has(relation)) { add('BASELINE_RELATION_MISSING', relation); continue }
    for (const [column, type] of Object.entries(fields)) if (columns.get(relation + ':' + column) !== type) add('BASELINE_COLUMN_MISMATCH', relation + '.' + column)
    if ((relation.startsWith('public.') || relation === 'storage.objects') && !relationMap.get(relation).rls) add('PRIVATE_RLS_DISABLED', relation)
  }
  const materialBucket = snapshot.buckets.find(bucket => bucket.id === 'materials')
  if (!materialBucket || materialBucket.public !== false || Number(materialBucket.file_size_limit) !== 10485760) add('MATERIAL_BUCKET_INCOMPATIBLE', 'The existing materials bucket must be private with the reviewed 10 MiB limit.')
  if (materialBucket && materialBucket.allowed_mime_types == null) warnings.push({ code: 'UNRESTRICTED_BUCKET_MIME', detail: '0011 deliberately retains a null MIME allowlist; review Storage restrictions explicitly.' })
  if (!snapshot.history) add('MIGRATION_HISTORY_MISSING', 'No authoritative migration history; schema shape alone cannot prove applied migrations.')
  const history = snapshot.history || [], versions = history.map(row => row.version)
  const baselineNames = { '0002': 'teacher_operations', '0003': 'teacher_operations_corrective', '0004': 'exercise_studio', '0005': 'materials_storage_policy', '0006': 'interface_language', '0007': 'teacher_management_enhancements', '0008': 'teacher_management_security_patch', '0009': 'academic_sync_challenges_feedback', '0010': 'inbox_messaging' }
  const extension = snapshot.extension
  const legacyExtension = snapshot.legacy_extension
  if (new Set(versions).size !== versions.length || history.some(row => !/^\d{4}$/.test(row.version) || Number(row.version) < 2 || (Number(row.version) > 21 && !(row.version === '0022' && extension?.version === '0022') && !(row.version === '0023' && legacyExtension?.version === '0023')))) add('MIGRATION_HISTORY_AMBIGUOUS', 'Unknown, duplicate or timestamp-mapped history requires manual baseline review; nothing will be repaired automatically.')
  if (versions.includes('0022')) {
    if (extension?.version !== '0022' || history.find(row => row.version === '0022')?.name !== extension.name ||
      !snapshot.setup?.some(row => row.file_path === extension.file && row.sha256 === extension.sha256)) add('ADDITIVE_CHECKSUM_UNVERIFIED', '0022 requires its independently reviewed SQL hash and successful-file ledger.')
    if (manifest.entries.some(entry => !versions.includes(entry.id))) add('ADDITIVE_DEPENDENCY_MISSING', '0022 requires all reviewed 0011-0021 migrations.')
  }
  if (versions.includes('0023')) {
    if (legacyExtension?.version !== '0023' || history.find(row => row.version === '0023')?.name !== legacyExtension.name ||
      !snapshot.setup?.some(row => row.file_path === legacyExtension.file && row.sha256 === legacyExtension.sha256)) add('ADDITIVE_CHECKSUM_UNVERIFIED', '0023 requires its independently reviewed SQL hash and successful-file ledger.')
    if (!versions.includes('0022')) add('ADDITIVE_DEPENDENCY_MISSING', '0023 requires 0022.')
  }
  if (!versions.includes('0002') && !versions.includes('0003')) add('BASELINE_HISTORY_MISSING', 'A reviewed 0002 or 0003 baseline is required.')
  for (let id = 4; id <= 10; id++) if (!versions.includes(String(id).padStart(4, '0'))) add('BASELINE_HISTORY_MISSING', String(id).padStart(4, '0'))
  for (const row of history.filter(row => Object.hasOwn(baselineNames, row.version))) if (row.name !== baselineNames[row.version]) add('BASELINE_NAME_UNVERIFIED', row.version)
  const applied = manifest.entries.filter(entry => versions.includes(entry.id))
  if (applied.some((entry, index) => entry.id !== manifest.entries[index].id)) add('RELEASE_HISTORY_GAP', 'Applied release migrations must be an uninterrupted prefix starting at 0011.')
  for (const entry of applied) {
    const historyName = history.find(row => row.version === entry.id)?.name
    if (historyName != null && historyName !== entry.file.slice(5, -4)) add('MIGRATION_NAME_MISMATCH', entry.id)
    const ledger = (snapshot.ledger || []).filter(row => row.version === entry.id)
    if (ledger.length !== 1 || ledger[0].sha256 !== entry.sha256) add('APPLIED_CHECKSUM_UNVERIFIED', entry.id)
  }
  const policies = snapshot.policies.map(policy => ({ relation: policy.relation, name: policy.policyname, command: policy.cmd, mode: policy.permissive, roles: policy.roles,
    expression_sha256: hash(JSON.stringify([policy.qual, policy.with_check])), unconditional: [policy.qual, policy.with_check].some(value => /^\(?true\)?$/i.test(String(value || '').trim())) }))
  for (const relation of Object.keys(compatibilityColumns).filter(name => name.startsWith('public.') || name === 'storage.objects')) {
    if (relationMap.has(relation) && !policies.some(policy => policy.relation === relation)) add('PRIVATE_POLICY_MISSING', relation)
  }
  for (const policy of policies.filter(policy => policy.unconditional)) warnings.push({ code: 'UNCONDITIONAL_POLICY_REVIEW', detail: policy.relation + ': ' + policy.name })
  for (const grant of snapshot.grants.filter(grant => ['anon', 'PUBLIC'].includes(grant.grantee) && Object.hasOwn(compatibilityColumns, grant.relation) && grant.relation.startsWith('public.'))) add('PRIVATE_ANONYMOUS_GRANT', grant.relation + ':' + grant.privilege_type)
  for (const grant of (snapshot.column_grants || []).filter(grant => ['anon', 'PUBLIC'].includes(grant.grantee) && Object.hasOwn(compatibilityColumns, grant.relation) && grant.relation.startsWith('public.'))) add('PRIVATE_ANONYMOUS_COLUMN_GRANT', grant.relation + '.' + grant.column_name + ':' + grant.privilege_type)
  const submissionsBucket = snapshot.buckets.find(bucket => bucket.id === 'academic-submissions')
  if (versions.includes('0018') && (!submissionsBucket || submissionsBucket.public !== false || Number(submissionsBucket.file_size_limit) !== 10485760)) add('SUBMISSION_BUCKET_INCOMPATIBLE', '0018 requires the reviewed private academic-submissions bucket.')
  return { ready_for_review: blockers.length === 0, blockers, warnings, applied_release: applied.map(entry => entry.id), pending: manifest.entries.filter(entry => !versions.includes(entry.id)),
    applied_extensions: [extension, legacyExtension].filter(entry => entry && versions.includes(entry.version)),
    diagnostics: { relation_count: snapshot.relations.length, policies, grants: snapshot.grants, column_grants: snapshot.column_grants || [], buckets: snapshot.buckets, history },
    limitations: ['Metadata inspection does not prove RLS execution, Auth/SMTP configuration, Storage bytes or browser workflows.', 'No migration, backup, restore, Auth setting, Storage object or migration-history record is changed.'] }
}

export async function runStagingPreflight({ env, manifest, clientFactory }) {
  const config = validateStagingEnvironment(env)
  let client
  let connected = false
  try {
    client = await clientFactory(config.connection)
    await client.connect(); connected = true
    await client.query('BEGIN READ ONLY')
    await client.query("SET LOCAL statement_timeout='5000ms'")
    await client.query("SET LOCAL lock_timeout='1000ms'")
    const session = (await client.query(inspectionQueries.session)).rows[0]
    if (session?.read_only !== 'on' || session.database !== 'postgres') refuse('READ_ONLY_NOT_ENFORCED', 'The database session did not confirm a read-only transaction on postgres.')
    const markerExists = (await client.query(inspectionQueries.markerExists)).rows[0]?.present
    if (!markerExists) refuse('STAGING_MARKER_REQUIRED', 'The independently created staging marker is missing. No schema inspection will continue.')
    const markers = (await client.query(inspectionQueries.marker)).rows
    if (markers.length !== 1 || markers[0].environment !== 'staging' || markers[0].project_ref !== config.target.project_ref || markers[0].project_name !== config.target.project_name) refuse('STAGING_MARKER_MISMATCH', 'The database staging marker does not match the explicit dedicated target.')
    const snapshot = {}
    for (const key of ['relations', 'columns', 'policies', 'grants', 'column_grants']) snapshot[key] = (await client.query(inspectionQueries[key])).rows
    snapshot.history = (await client.query(inspectionQueries.historyExists)).rows[0]?.present
      ? (await client.query(inspectionQueries.history)).rows : null
    if (snapshot.history?.some(row => row.version === '0022')) {
      const reviewed = JSON.parse(await readFile(resolve(repositoryRoot, 'scripts/exercise-experience.reviewed.json'), 'utf8'))
      const entry = reviewed.entry
      if (reviewed.format !== 'vera-orbis-additive-migration-v1' || reviewed.target !== config.target.project_ref ||
        entry?.version !== '0022' || entry.name !== 'exercise_experience' || entry.file !== 'supabase/migrations/0022_exercise_experience.sql') refuse('ADDITIVE_MANIFEST_INVALID', 'Review the independent 0022 migration manifest.')
      const bytes = await readFile(resolve(repositoryRoot, entry.file))
      if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) refuse('ADDITIVE_MANIFEST_CHANGED', 'The reviewed additive SQL bytes changed.')
      snapshot.extension = entry
      const setupExists = (await client.query("select to_regclass('public.vera_staging_setup_checksums') is not null as present")).rows[0]?.present
      snapshot.setup = setupExists ? (await client.query('select file_path,sha256 from public.vera_staging_setup_checksums')).rows : []
    }
    if (snapshot.history?.some(row => row.version === '0023')) {
      const reviewed = JSON.parse(await readFile(resolve(repositoryRoot, 'scripts/legacy-feedback.reviewed.json'), 'utf8'))
      const entry = reviewed.entry
      if (reviewed.format !== 'vera-orbis-additive-migration-v1' || reviewed.target !== config.target.project_ref ||
        entry?.version !== '0023' || entry.name !== 'legacy_exercise_feedback' || entry.file !== 'supabase/migrations/0023_legacy_exercise_feedback.sql') refuse('ADDITIVE_MANIFEST_INVALID', 'Review the independent 0023 migration manifest.')
      const bytes = await readFile(resolve(repositoryRoot, entry.file))
      if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) refuse('ADDITIVE_MANIFEST_CHANGED', 'The reviewed additive SQL bytes changed.')
      snapshot.legacy_extension = entry
    }
    snapshot.ledger = (await client.query(inspectionQueries.ledgerExists)).rows[0]?.present
      ? (await client.query(inspectionQueries.ledger)).rows : []
    snapshot.buckets = (await client.query(inspectionQueries.buckets)).rows
    return { mode: 'read-only-preflight', target: config.target, database_contacted: true, manifest_sha256: manifest.manifest_sha256, ...assessStagingSnapshot(snapshot, manifest) }
  } catch (error) {
    if (error instanceof StagingPreparationError) throw error
    // pg errors can contain connection strings or server-supplied details. Never
    // print them, even in verbose mode; use restricted operator diagnostics.
    refuse('PREFLIGHT_CONNECTION_OR_SCHEMA_FAILED', 'Staging connection or read-only inspection failed. No apply step ran; inspect target access privately.')
  } finally {
    if (connected) { try { await client.query('ROLLBACK') } catch {} }
    try { await client?.end() } catch {}
  }
}
