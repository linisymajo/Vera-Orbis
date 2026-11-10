import { X509Certificate } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inspectionQueries } from './staging-core.mjs'
import { supplementalInspectionQueries } from './staging-inspect-core.mjs'

export const PRODUCTION_REF = 'iopgzmvaqobigjwibual'
export class ProductionPreflightError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const refuse = (code, message) => { throw new ProductionPreflightError(code, message) }

// Independent production boundary: staging guards and manifests remain unchanged.
// This tool has no apply, repair, role bootstrap, cache reload or backup operation.
export function productionConnection(env) {
  let url
  try { url = new URL(env.VERA_PRODUCTION_DB_URL) }
  catch { refuse('PRODUCTION_DB_URL_REQUIRED', 'Configure VERA_PRODUCTION_DB_URL privately in the process environment.') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== `db.${PRODUCTION_REF}.supabase.co`
    || (url.port && url.port !== '5432') || url.pathname !== '/postgres' || url.username !== 'postgres'
    || !url.password || url.hash || [...url.searchParams].some(([key, value]) => key !== 'sslmode' || value !== 'verify-full')
    || url.searchParams.getAll('sslmode').length > 1) {
    refuse('PRODUCTION_TARGET_UNSAFE', 'Only the pinned production direct host, postgres database/account and verified TLS are accepted; poolers and overrides are refused.')
  }
  let password
  try { password = decodeURIComponent(url.password) } catch { refuse('PRODUCTION_TARGET_UNSAFE', 'Use valid URL percent encoding.') }
  const ca = env.VERA_PRODUCTION_CA_PEM
  if (ca != null) {
    try { if (typeof ca !== 'string' || ca.length > 65536) throw new Error(); new X509Certificate(ca) }
    catch { refuse('PRODUCTION_CA_INVALID', 'Configure a valid public PEM certificate or use the verified system trust store.') }
  }
  return { host: url.hostname, port: 5432, database: 'postgres', user: 'postgres', password,
    ssl: { rejectUnauthorized: true, servername: url.hostname, ...(ca ? { ca } : {}) },
    connectionTimeoutMillis: 7000, query_timeout: 12000,
    options: '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000' }
}

export const productionQueries = Object.freeze({
  session: inspectionQueries.session,
  relations: inspectionQueries.relations,
  columns: inspectionQueries.columns,
  grants: inspectionQueries.grants,
  column_grants: inspectionQueries.column_grants,
  historyExists: inspectionQueries.historyExists,
  history: inspectionQueries.history,
  policies: `select schemaname||'.'||tablename as relation,policyname,cmd,roles,permissive,
    md5(coalesce(qual,'')||'|'||coalesce(with_check,'')) as expression_fingerprint,
    coalesce(qual in('true','(true)'),false) or coalesce(with_check in('true','(true)'),false) as unconditional
    from pg_policies where schemaname in('public','storage') order by schemaname,tablename,policyname`,
  functions: `select p.oid::regprocedure::text as signature,p.proname as name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,pg_get_function_result(p.oid) as result_type,
    p.prosecdef as security_definer,array(select v from unnest(p.proconfig) v where v like 'search_path=%') as search_path,
    md5(pg_get_functiondef(p.oid)) as definition_fingerprint,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and not exists(select 1 from pg_depend d
    where d.classid='pg_proc'::regclass and d.objid=p.oid and d.refclassid='pg_extension'::regclass and d.deptype='e')
    order by p.oid::regprocedure::text`,
  auth: `select count(*)::int as users,count(*) filter(where email_confirmed_at is not null)::int as confirmed_users from auth.users`,
  buckets: `select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id`,
  storage: `select bucket_id,count(*)::int as objects from storage.objects group by bucket_id order by bucket_id`,
  roles: `select rolname,rolsuper,rolbypassrls,rolcanlogin from pg_roles
    where rolname in('postgres','anon','authenticated','service_role','supabase_auth_admin','supabase_storage_admin') order by rolname`,
  constraints: supplementalInspectionQueries.constraints,
  indexes: supplementalInspectionQueries.indexes,
  schemas: supplementalInspectionQueries.schemas,
  views: supplementalInspectionQueries.views
})

export async function inspectProduction({ env, clientFactory }) {
  const connection = productionConnection(env)
  let client, connected = false
  try {
    client = await clientFactory(connection)
    await client.connect(); connected = true
    if (client.connection?.stream?.authorized !== true) refuse('VERIFIED_TLS_REQUIRED', 'Production TLS verification did not succeed.')
    await client.query('BEGIN READ ONLY')
    await client.query("SET LOCAL statement_timeout='5000ms'")
    await client.query("SET LOCAL lock_timeout='1000ms'")
    const session = (await client.query(productionQueries.session)).rows[0]
    if (session?.database !== 'postgres' || session.read_only !== 'on') refuse('READ_ONLY_REQUIRED', 'The transaction did not confirm read-only postgres access.')
    const report = { target: PRODUCTION_REF, mode: 'read-only-production-preflight', writes_performed: false,
      captured_at: new Date().toISOString(), session }
    for (const key of ['relations', 'columns', 'grants', 'column_grants', 'policies', 'functions', 'auth', 'buckets', 'storage', 'roles', 'constraints', 'indexes', 'schemas', 'views']) {
      report[key] = (await client.query(productionQueries[key])).rows
      if (report[key].length > 10000) refuse('METADATA_LIMIT', 'Metadata exceeded the bounded inspection limit.')
    }
    report.history = (await client.query(productionQueries.historyExists)).rows[0]?.present
      ? (await client.query(productionQueries.history)).rows : null
    report.public_row_counts = []
    const tables = report.relations.filter(row => row.relation.startsWith('public.'))
    if (tables.length > 200) refuse('TABLE_COUNT_LIMIT', 'Review the public table set before exact aggregate counts.')
    for (const { relation } of tables) {
      const identifier = relation.slice('public.'.length).replaceAll('"', '""')
      const count = (await client.query('select count(*)::bigint as rows from public."' + identifier + '"')).rows[0]?.rows
      report.public_row_counts.push({ relation, rows: count })
    }
    if (['status', 'source', 'teacher_id'].every(name => report.columns.some(c => c.relation === 'public.enrollments' && c.column_name === name))) {
      report.enrollment_counts = (await client.query(`select status,source,(teacher_id is not null) as teacher_assigned,count(*)::int as students
        from public.enrollments group by status,source,(teacher_id is not null) order by status,source,teacher_assigned`)).rows
    }
    report.enrollment_rpc = report.functions.filter(row => row.name === 'get_my_enrollment')
    report.limitations = ['No credentials, Auth identities, student responses, invitation tokens or Storage object names/bytes are exported.',
      'Metadata and aggregate counts do not prove account login, RLS execution, backup restoration, Auth redirect configuration or PostgREST cache availability.',
      'Missing or conflicting migration history requires compatibility review; no migration is selected or approved automatically.']
    return report
  } catch (error) {
    if (error instanceof ProductionPreflightError) throw error
    refuse('PRODUCTION_INSPECTION_FAILED', 'Production read-only inspection failed; sensitive driver details suppressed. No apply step exists.')
  } finally {
    if (connected) { try { await client.query('ROLLBACK') } catch {} }
    try { await client?.end() } catch {}
  }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  if (JSON.stringify(args) !== JSON.stringify(['--read-only', '--project-ref', PRODUCTION_REF])) {
    refuse('EXPLICIT_TARGET_REQUIRED', `Use only --read-only --project-ref ${PRODUCTION_REF}. There is no write mode.`)
  }
  const { Client } = await import('pg')
  const report = await inspectProduction({ env, clientFactory: config => new Client(config) })
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => {
  process.stderr.write((error instanceof ProductionPreflightError ? error.code + ': ' + error.message : 'PRODUCTION_INPUT_FAILED: Review inputs privately.') + '\n')
  process.exitCode = 1
})
