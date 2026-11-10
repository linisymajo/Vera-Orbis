# Diagnose `get_my_enrollment` / PGRST202

The frontend calls the zero-argument database RPC `public.get_my_enrollment()`.
It is defined by the repository's exact
`supabase/migrations/0013_hybrid_enrollment.sql`; it is not an Edge Function.

The current investigation has confirmed a target mismatch: the local frontend's
configured API host and the Supabase project reference embedded in the public
`https://veraorbis.studio/platform.html` and `teacher.html` assets identify
**`iopgzmvaqobigjwibual`**. The separately authorized isolated staging target is
**`duinvkphfnugoyvvlbbq`**. The public HTML/assets returned HTTP 200 during the
root agent's read-only check; no production database/API or SQL call was made.
The user-reported PGRST202 is confirmed as an observed error, but production's
SQL definition, grants, migration history and live PostgREST cache remain
**unverified**. Staging access was subsequently configured through environment
variables. Guarded inspection confirmed missing SQL there; the approved baseline
and migrations through 0023 are now applied on isolated staging. Real confirmed
teacher/student sessions execute enrollment successfully. This does not establish
production SQL/cache state or authorize production changes.

PGRST202 is an HTTP 404 indicating an unresolved/stale function signature, or
that the function does not exist. It does not prove which condition applies.
[Supabase's error reference](https://supabase.com/docs/guides/api/rest/postgrest-error-codes)
and [PostgREST's error reference](https://docs.postgrest.org/en/stable/references/errors.html)
describe this distinction. Repointing a local frontend at staging also does not
create its missing backend or establish that its baseline is ready.

## Local correction and recovery behavior

`npm.cmd run dev` and `npm.cmd run dev:staging` now require the isolated project's
`VERA_STAGING_PUBLISHABLE_KEY` environment variable. They derive the staging URL,
ignore repository env files and inherited `VITE_*` values, refuse privileged keys
or a mismatched target, and keep AI disabled. Restart any previously running raw
Vite server. The existing `.env.local` and production build configuration are
unchanged. See [academic-deployment.md](academic-deployment.md) for setup.

The frontend explicitly selects the public database schema. It verifies Auth
before each access check, shares concurrent requests for the same verified
identity/project, and saves only PGRST202 service failures for a 60-second
per-project session cooldown. It never caches an approved access decision. An
explicit **Check availability** action makes one new check without reloading;
sign-out remains available. Login, student, teacher and onboarding pages show a
safe service message and support code instead of continuing academic queries or
repeating failed initialization on Auth events. Pending and unverified responses
still take their normal restricted enrollment paths after the service recovers.
An account switch between the page's Auth read and enrollment verification stops
the load before downstream profile/teacher queries or invitation acceptance.
Unverified teacher/admin accounts reach the confirmation/resend gate before any
role redirect, preventing a sign-in/access-denied loop.
Student invitation tokens are captured privately before the confirmation gate
and retained until confirmed acceptance, including the unverified-email path.

Local verification on 2026-11-09: 264 automated Node tests passed; the subsequent
targeted access/enrollment suite passed 79 tests after the caller corrections.
The complete Chromium suite passed 24 tests, and the final focused invitation
retention test passed separately (25 unique browser cases, 15 for enrollment).
The final build, whitespace check and unchanged migration manifest passed.
These are local fixtures/disposable PostgreSQL results, not live Auth/PostgREST
or staging migration evidence.

## Exact repository contract

| Property | Required by 0013/client |
| --- | --- |
| Schema and identity | `public.get_my_enrollment()` |
| Input arguments | Zero; no `student_id`, JWT parameter or JSON payload parameter |
| Return type | One `jsonb` value; not a set/table |
| Execution | PL/pgSQL, `STABLE`, `SECURITY DEFINER`, explicit empty `search_path` |
| Caller | An authenticated user session; the function derives identity from `auth.uid()` |
| Schema access | The API role needs `USAGE` on `public` and the API must expose the selected schema |
| Function grant | `EXECUTE` to `authenticated`; `PUBLIC` and `anon` grants revoked |
| Result keys | `student_id`, `role`, `status`, `email_verified`, `academic_access` |

The client validates those fields and fails closed. User metadata is not an
enrollment approval or teacher/admin membership source. Pending and unverified
students must remain blocked. Do not add an always-approved fallback function,
grant anonymous execution, pass another student's ID, disable the gate, create
placeholder tables or use a privileged browser key to suppress the error.

Only functions in an exposed schema that the active role may execute are RPC
endpoints. POST object keys become named function arguments.
[PostgREST RPC documentation](https://docs.postgrest.org/en/stable/references/api/functions.html)
For a controlled authenticated check after staging approval, use the existing
staging client with the explicit schema and no arguments:

```js
const { data, error } = await stagingClient.schema('public').rpc('get_my_enrollment')
```

Do not paste its access token into source or diagnostic output. If multiple
schemas are exposed, the default is the first schema; explicit schema selection
avoids a wrong default. An unexposed requested schema can instead produce
PGRST106. [Supabase schema troubleshooting](https://supabase.com/kb/troubleshooting/postgrest-not-recognizing-objects-in-schema)

## Read-only diagnostic sequence

1. Independently verify the frontend's actual Network request host and selected
   schema, showing only the project reference/path. Check the intended Dashboard
   project identity. Do not log request headers, keys or session values. The current
   staging-only authorization does not authorize production SQL/API inspection.
2. After authorized staging connectivity is available, review and run
   `supabase/tests/enrollment-rpc-verification.sql` against that confirmed target.
   It starts `BEGIN READ ONLY`, applies local timeouts and ends with `ROLLBACK`.
   It reads catalogs and narrowly selected migration metadata, not Auth/application
   rows, function bodies or secrets; it never invokes the enrollment RPC.
3. Review all result sections. `rpc_contract` separates a missing SQL function,
   wrong schema/signature/return type, incorrect execution shape and missing or
   overbroad grants. `function_candidates` lists overloads across schemas so a
   one-argument copy cannot be mistaken for the expected zero-argument function.
4. Review baseline relation/column/helper presence and migration-history status.
   A missing history table does not prove that SQL was never applied manually.
   An `0013` history row does not prove that the current definition is correct.
   The optional history read emits only version/name metadata in a notice.
5. If SQL is correct, review Data API availability/exposed schemas and the actual
   request profile in the Dashboard/client. Catalog/session `pgrst.db_schemas`
   values are partial evidence: server environment/pre-config settings and live
   cache state cannot be established from this SQL session. The diagnostic reads
   only the schema/search-path allowlist, never full role settings or JWT secrets.
   [PostgREST configuration](https://docs.postgrest.org/en/stable/references/configuration.html)

| Diagnostic finding | Next reviewed action |
| --- | --- |
| `SQL_FUNCTION_MISSING` | Review the actual baseline and pending migration plan. A cache reload cannot create SQL |
| `FUNCTION_IN_OTHER_SCHEMA` / `SQL_SIGNATURE_MISMATCH` | Review the unexpected definition/schema/arguments/return type against 0013 and the request; no automatic replacement or overload removal |
| `SQL_SECURITY_CONTRACT_MISMATCH` | Review the function owner/body/execution configuration in a restricted schema export; do not treat a matching name as a safe implementation |
| `AUTHENTICATED_SCHEMA_USAGE_MISSING` / `AUTHENTICATED_EXECUTE_MISSING` | Review exact role/schema/function grants as part of an approved correction; no broad `GRANT ALL` |
| `UNEXPECTED_ANONYMOUS_EXECUTE` | Review and remove unintended exposure only through approved security deployment; do not test using that grant |
| `SQL_CONTRACT_PRESENT_API_STATE_UNVERIFIED` | Database signature and inspected grants fit; exposed-schema/request/cache behavior still needs the authenticated staging check |

## Migration prerequisites and deployment boundary

Do not paste only the function into an unknown database to make login succeed.
The full 0013 migration installs enrollment/admin/invitation tables and verified
access helpers, initializes enrollment records, installs an Auth insertion trigger,
changes teacher grants/RLS, adds restrictive academic/Storage boundaries and
updates existing student views/message authorization together.

Its reviewed baseline must include managed Auth (`auth.users`, `auth.uid()`),
the existing `public.teachers` and `public.profiles` schema and grants, Storage's
managed `storage.objects`, roles `anon`/`authenticated`, and the real Inbox schema
expected from prior migrations. Profile initialization uses `name`, `language`,
`level`, `level_name`, `progress`, `lessons_completed`, `current_module` and
`next_step`; Auth logic uses `email`, `email_confirmed_at` and
`raw_user_meta_data`. The Inbox mutation expects `recipient_id`, `is_read`,
`read_at` and `updated_at`. Review actual types, ownership, foreign keys, grants,
policies, Auth triggers and migration provenance; column presence alone is not
baseline approval. Do not fabricate missing baseline/history to pass the report.

Review the migration chain through 0012 before planning 0013. Later migrations
extend its enforcement. In particular, never replay 0012 after 0018, which wraps
the submission validator for files. Preserve the exact reviewed 0011–0021
manifest; this diagnostic adds no replacement migration or altered function.
Use [academic-deployment.md](academic-deployment.md) for the staging baseline,
backup, exact manifest and explicit pre-migration approval gate. No migration,
grant, Auth/Storage or production change is authorized by this diagnostic.

## Conditional schema-cache refresh

Only if the intended, reviewed SQL function already exists with the correct
zero-argument/jsonb contract, the authenticated grants and schema exposure are
correct, and an authenticated staging request still reports stale lookup, an
authorized operator can consider the following separate server action:

```sql
NOTIFY pgrst, 'reload schema';
```

This statement is intentionally absent from the read-only diagnostic. It does
not create the function, apply its prerequisites or repair grants. It is the
documented cache-refresh operation; its delivery does not prove a successful
reload or working RPC. Inspect the resulting authenticated staging request and
API logs, keeping tokens private. 0013 already ends with this notification before
commit. [Supabase cache refresh](https://supabase.com/kb/troubleshooting/refresh-postgrest-schema),
[PostgREST cache documentation](https://docs.postgrest.org/en/stable/references/schema_cache.html)

Any production refresh, configuration/grant correction or migration requires
separate explicit user approval after the staging result and target-specific
review. None has been performed here.
