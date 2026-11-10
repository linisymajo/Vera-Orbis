import { validateStagingEnvironment, assessStagingSnapshot, inspectionQueries, StagingPreparationError } from './staging-core.mjs'

// The user named this project on 2026-11-09. It is an allowlist, never a default:
// the CLI must also provide the same explicit reference and matching environment.
export const approvedInspectionProjectRef = 'duinvkphfnugoyvvlbbq'
const refuse = (code, message) => { throw new StagingPreparationError(code, message) }

export const supplementalInspectionQueries = Object.freeze({
  capabilities: `select to_regprocedure('auth.uid()') is not null as auth_uid,
    to_regprocedure('storage.foldername(text)') is not null as storage_foldername,
    to_regprocedure('pg_catalog.gen_random_uuid()') is not null as random_uuid,
    to_regprocedure('pg_catalog.sha256(bytea)') is not null as sha256`,
  owners: `select n.nspname||'.'||c.relname as relation,pg_get_userbyid(c.relowner) as owner,
    pg_has_role(current_user,c.relowner,'USAGE') as current_role_inherits_owner,c.reltuples::bigint as estimated_rows
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in('public','auth','storage') and c.relkind in('r','p','v','m')`,
  roles: `select rolname as role,rolsuper as superuser,rolbypassrls as bypass_rls,rolinherit as inherits_roles
    from pg_roles where rolname in(current_user,'anon','authenticated','service_role','supabase_admin','supabase_auth_admin','supabase_storage_admin')
    or oid in(select c.relowner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','auth','storage'))`,
  constraints: `select ns.nspname||'.'||t.relname as relation,c.conname as name,c.contype as type,c.convalidated as validated,
    c.condeferrable as deferrable,c.condeferred as initially_deferred,
    case when c.confrelid<>0 then rns.nspname||'.'||rt.relname else null end as referenced_relation,
    array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,ord)
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.ord) as columns,
    array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,ord)
      join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.ord) as referenced_columns
    from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace
    left join pg_class rt on rt.oid=c.confrelid left join pg_namespace rns on rns.oid=rt.relnamespace
    where ns.nspname in('public','auth','storage')`,
  indexes: `select ns.nspname||'.'||t.relname as relation,idx.relname as name,i.indisunique as unique_index,
    i.indisprimary as primary_index,i.indisvalid as valid,i.indisready as ready,i.indpred is not null as partial,
    array(select coalesce(a.attname::text,'<expression>') from unnest(i.indkey::smallint[]) with ordinality k(attnum,ord)
      left join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum where k.ord<=i.indnkeyatts order by k.ord) as columns
    from pg_index i join pg_class t on t.oid=i.indrelid join pg_class idx on idx.oid=i.indexrelid
    join pg_namespace ns on ns.oid=t.relnamespace where ns.nspname in('public','auth','storage')`,
  functions: `select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_userbyid(p.proowner) as owner,p.prosecdef as security_definer,
    case when cfg.value is null then 'unset' when cfg.value in('search_path=','search_path=""') then 'empty'
      when cfg.value='search_path=public' then 'public' when cfg.value='search_path=pg_catalog' then 'pg_catalog' else 'other-hashed' end as search_path_mode,
    case when cfg.value is null then null else md5(cfg.value) end as search_path_fingerprint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    left join lateral(select value from unnest(coalesce(p.proconfig,'{}'::text[])) value where value like 'search_path=%' limit 1) cfg on true
    where n.nspname in('public','auth','storage')`,
  function_grants: `select routine_schema as schema,routine_name as name,specific_name,grantee,privilege_type
    from information_schema.routine_privileges where routine_schema in('public','auth','storage') and grantee in('PUBLIC','anon','authenticated')`,
  views: `select n.nspname||'.'||c.relname as relation,pg_get_userbyid(c.relowner) as owner,
    coalesce(c.reloptions @> array['security_invoker=true'],false) as security_invoker,
    coalesce(c.reloptions @> array['security_barrier=true'],false) as security_barrier
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','auth','storage') and c.relkind='v'`,
  schemas: `select n.nspname as schema,pg_get_userbyid(n.nspowner) as owner,
    case when to_regrole('anon') is null then null else has_schema_privilege('anon',n.oid,'CREATE') end as anon_create,
    case when to_regrole('authenticated') is null then null else has_schema_privilege('authenticated',n.oid,'CREATE') end as authenticated_create
    from pg_namespace n where n.nspname in('public','auth','storage')`
})

const caps = Object.freeze({ relations: 1000, columns: 6000, policies: 2000, grants: 3000, column_grants: 6000,
  history: 1000, ledger: 1000, buckets: 10, capabilities: 10, owners: 1000, roles: 200, constraints: 2000, indexes: 2000, functions: 2000, function_grants: 4000, views: 500, schemas: 10 })

const releaseIndicators = {
  '0012': { columns: ['public.exercise_attempts:request_id','public.exercise_attempts:exercise_snapshot','public.exercise_attempts:feedback_status'], functions: ['publish_exercise','submit_exercise','review_exercise_attempt'] },
  '0013': { tables: ['public.academic_admins','public.enrollments','public.enrollment_invitations'], functions: ['get_my_enrollment','create_pending_enrollment'] },
  '0014': { tables: ['public.academic_ai_consents','public.academic_ai_requests','public.ai_academic_drafts'] },
  '0015': { policies: ['material owner read boundary','material storage owner read boundary'] },
  '0016': { policies: ['academic feedback select scope','academic challenge select scope'] },
  '0017': { policies: ['inbox participant read boundary','inbox authorized insert boundary'] },
  '0018': { tables: ['public.exercise_attachments','public.exercise_attachment_versions'], functions: ['_submit_exercise_answers','reserve_exercise_attachment'], buckets: ['academic-submissions'] },
  '0019': { tables: ['public.learning_plan_versions','public.learning_plan_objective_progress','public.learning_plan_objective_events'] },
  '0020': { tables: ['public.challenge_publications','public.academic_notifications'], columns: ['public.weekly_challenges:publication_id'] },
  '0021': { tables: ['public.final_assessments','public.final_results'] }
}

export function inspectMetadataFindings(snapshot, supplemental) {
  const findings = [], versions = new Set((snapshot.history || []).map(row => row.version))
  const observed = {
    tables: new Set(snapshot.relations.map(row => row.relation)),
    columns: new Set(snapshot.columns.map(row => row.relation+':'+row.column_name)),
    functions: new Set(supplemental.functions.filter(row => row.schema==='public').map(row => row.name)),
    policies: new Set(snapshot.policies.map(row => row.policyname)), buckets: new Set(snapshot.buckets.map(row => row.id))
  }
  for (const [version, indicators] of Object.entries(releaseIndicators)) {
    const present = Object.entries(indicators).flatMap(([kind, values]) => values.filter(value => observed[kind].has(value)).map(value => kind+':'+value))
    if (present.length && !versions.has(version)) findings.push({ code: 'RELEASE_OBJECT_WITHOUT_HISTORY', version, objects: present })
  }
  const uniqueAssignment = supplemental.indexes.some(index => index.relation==='public.exercise_assignments' && index.unique_index && index.valid && index.ready && !index.partial && Array.isArray(index.columns) && index.columns.length===2 && index.columns.includes('exercise_id') && index.columns.includes('student_id'))
  if (observed.tables.has('public.exercise_assignments') && !uniqueAssignment) findings.push({ code: 'ASSIGNMENT_UNIQUE_KEY_MISSING', detail: '0012 ON CONFLICT requires a valid nonpartial unique key on exercise_id and student_id.' })
  const exerciseOwnership = supplemental.constraints.some(constraint => constraint.relation==='public.exercise_assignments' && constraint.type==='f' && constraint.validated && constraint.referenced_relation==='public.exercises' && JSON.stringify(constraint.columns)===JSON.stringify(['exercise_id','teacher_id']) && JSON.stringify(constraint.referenced_columns)===JSON.stringify(['id','teacher_id']))
  if (observed.tables.has('public.exercise_assignments') && !exerciseOwnership) findings.push({ code: 'EXERCISE_OWNERSHIP_FOREIGN_KEY_MISSING', detail: 'Review the composite exercise/teacher ownership relationship before 0012.' })
  for (const schema of supplemental.schemas.filter(row => row.anon_create || row.authenticated_create)) findings.push({ code: 'CLIENT_SCHEMA_CREATE_PRIVILEGE', schema: schema.schema, anon: schema.anon_create, authenticated: schema.authenticated_create })
  for (const [key,enabled] of Object.entries(supplemental.capabilities[0] || {})) if (enabled!==true) findings.push({code:'BASELINE_FUNCTION_MISSING',function_capability:key})
  const materialBucket = snapshot.buckets.find(row => row.id==='materials')
  const office = ['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  if (!versions.has('0011') && materialBucket?.allowed_mime_types && office.every(mime => materialBucket.allowed_mime_types.includes(mime))) findings.push({ code: 'MIME_STATE_REQUIRES_HISTORY_REVIEW', version: '0011', detail: 'Office MIME support already exists. Configuration alone cannot prove whether 0011 ran.' })
  return findings
}

export async function runStagingInspection({ env, expectedProjectRef, manifest, clientFactory }) {
  if (!expectedProjectRef || expectedProjectRef!==approvedInspectionProjectRef) refuse('INSPECTION_TARGET_NOT_APPROVED', 'Explicit --project-ref must identify the staging project named by the user for this inspection.')
  const config = validateStagingEnvironment(env)
  if (config.target.project_ref!==expectedProjectRef) refuse('INSPECTION_PIN_MISMATCH', 'The explicit inspection reference must match the staging environment and direct database host.')
  let client, connected = false
  const findings = []
  async function collect(name, query) {
    const limit=caps[name]
    const rows=(await client.query('select * from ('+query+') staging_metadata limit '+(limit+1))).rows
    if (rows.length>limit) findings.push({ code: 'METADATA_LIMIT_REACHED', collection: name, limit })
    return rows.slice(0,limit)
  }
  try {
    client=await clientFactory(config.connection); await client.connect(); connected=true
    await client.query('BEGIN READ ONLY')
    await client.query("SET LOCAL statement_timeout='5000ms'")
    await client.query("SET LOCAL lock_timeout='1000ms'")
    const session=(await client.query(inspectionQueries.session)).rows[0]
    if (session?.read_only!=='on' || session.database!=='postgres') refuse('READ_ONLY_NOT_ENFORCED', 'The server did not confirm a read-only postgres inspection transaction.')
    const markerPresent=(await client.query(inspectionQueries.markerExists)).rows[0]?.present===true
    if (markerPresent) {
      const markers=(await client.query(inspectionQueries.marker)).rows
      if (markers.length!==1 || markers[0].environment!=='staging' || markers[0].project_ref!==expectedProjectRef || markers[0].project_name!==config.target.project_name) refuse('STAGING_MARKER_MISMATCH', 'An existing staging marker conflicts with the explicitly approved inspection target.')
    }
    const snapshot={}
    for (const name of ['relations','columns','policies','grants','column_grants']) snapshot[name]=await collect(name,inspectionQueries[name])
    const historyPresent=(await client.query(inspectionQueries.historyExists)).rows[0]?.present===true
    if (historyPresent) {
      const historyColumns=snapshot.columns.filter(row => row.relation==='supabase_migrations.schema_migrations').map(row => row.column_name)
      if (!historyColumns.includes('version')) { snapshot.history=null; findings.push({ code:'MIGRATION_HISTORY_SHAPE_UNKNOWN' }) }
      else {
        if (!historyColumns.includes('name')) findings.push({ code:'MIGRATION_HISTORY_NAME_MISSING' })
        snapshot.history=await collect('history',historyColumns.includes('name') ? inspectionQueries.history : 'select version,null::text as name from supabase_migrations.schema_migrations order by version')
      }
    } else snapshot.history=null
    const ledgerPresent=(await client.query(inspectionQueries.ledgerExists)).rows[0]?.present===true
    snapshot.ledger=ledgerPresent ? await collect('ledger',inspectionQueries.ledger) : []
    snapshot.buckets=snapshot.relations.some(row => row.relation==='storage.buckets') ? await collect('buckets',inspectionQueries.buckets) : []
    const supplemental={}
    for (const [name,query] of Object.entries(supplementalInspectionQueries)) supplemental[name]=await collect(name,query)
    findings.push(...inspectMetadataFindings(snapshot,supplemental))
    if (Number(session.server_version_num)<150000) findings.push({ code:'POSTGRES_VIEW_OPTIONS_UNSUPPORTED', detail:'The release uses PostgreSQL 15+ view security options.' })
    const assessment=assessStagingSnapshot(snapshot,manifest)
    const releasePlan=manifest.entries.map(entry => ({...entry,recorded_applied:snapshot.history==null?'unknown':snapshot.history.some(row => row.version===entry.id),checksum_verified:snapshot.ledger.some(row => row.version===entry.id && row.sha256===entry.sha256)}))
    const publicTables=snapshot.relations.filter(row=>row.relation.startsWith('public.')).map(row=>row.relation)
    const applicationState=findings.some(row=>row.code==='RELEASE_OBJECT_WITHOUT_HISTORY')?'release_objects_without_recorded_history'
      : publicTables.length===0?'no_public_application_tables_detected':'application_schema_present_requires_review'
    return {
      mode:'pinned-read-only-staging-inspection',target:config.target,database_contacted:true,
      migrations_approved:false,ready_to_apply:false,manifest_sha256:manifest.manifest_sha256,
      identity:{explicit_project_pin:expectedProjectRef,host_matches_pin:true,marker_present:markerPresent,marker_matches:markerPresent,
        name_evidence:markerPresent?'matching existing marker and user-supplied target':'user-supplied target; verify project name in Dashboard'},
      baseline:{metadata_ready_for_human_review:assessment.ready_for_review && findings.length===0,blockers:assessment.blockers,warnings:assessment.warnings,findings,
        application_state:applicationState,application_tables_detected:publicTables,
        exact_data_impact_counts_checked:false,data_review:'No academic/Auth rows were read. Review exact legacy enrollment and feedback impact counts separately before approving mutations.'},
      observed:assessment.diagnostics,supplemental,release_plan:releasePlan,
      next:'Review baseline provenance, exact release files/checksums, data effects and backup/recovery evidence. Obtain explicit user approval before any marker/baseline/migration/history/Auth/Storage write.',
      limitations:assessment.limitations
    }
  } catch(error) {
    if (error instanceof StagingPreparationError) throw error
    refuse('INSPECTION_CONNECTION_OR_METADATA_FAILED','Read-only staging inspection failed. No mutation ran; inspect connectivity and metadata access privately.')
  } finally {
    if (connected) { try { await client.query('ROLLBACK') } catch {} }
    try { await client?.end() } catch {}
  }
}
