# Unified academic experience — production release and remaining activation

## 2026-11-19 ? authorized production database activation

Reviewed migrations 0028 and 0029 are committed in production with 255 checks
passing and existing application/Auth/Storage records preserved. A 19-check
synthetic plan-to-submission rehearsal passed against production PostgreSQL and
was rolled back. The fresh encrypted backup covers 85 tables and all 32 private
Storage objects. No provider calls, account changes, Voice changes or billing.

Frontend context/Journey activation is being released independently of document
processing. The new Edge deployment remains blocked before any secret write by
Management API HTTP 401. AI stays disabled; templates are deterministic.
Actual production teacher/student browser authentication remains unverified.
See [current activation details](unified-academic-production-activation.md).
The November 18 entries below are historical and superseded by this update.


**Live frontend verified 2026-11-18:** commit 7b305d129be1c2af2a7fb583f5e1126ba170606e; [successful existing Pages workflow](https://github.com/linisymajo/Vera-Orbis/actions/runs/44432959849). Public verification passed: current teacher/student assets, production target, preserved Voice target, legacy Architect redirect and unauthenticated access gates (34 checks, ten assets). No new production SQL or Edge deployment. VITE_ACADEMIC_CONTEXT_READY remains false. Complete hosted context/resource synchronization is still pending the exact approvals and staging credential described below.

2026-11-18. Existing site: `https://veraorbis.studio/`. Production database:
`iopgzmvaqobigjwibual`. No new domain, portal, login, provider or billing.

## Authorized frontend publication

The isolated candidate starts at the current production/main source
`1592da52e49f4353be106184aaf0f79fa9831520`. It preserves Student Platform 3D,
Language Passport, existing styles and Vera Voice configuration. Unrelated sales
changes and shared uncommitted work are excluded. The standalone Architect source
is preserved, but the build/navigation use the integrated Teacher Dashboard.

Published plans load into personal flip cards, with fresh reads on opening,
focus, manual refresh and every 30 seconds while visible. The compatible initial
release uses existing approved/published plan versions and audited teacher
completion events. It does not infer completion from dates or student self-checks.
It preserves completed objectives across copied versions, without duplicate cards.
The lesson-to-Exercise Studio handoff creates one editable teacher-prepared
activity and uses the existing publishing/assignment/submission/review system.

`VITE_ACADEMIC_CONTEXT_READY` defaults to `false` in the existing GitHub Actions
workflow. While false, new context/resource RPCs are not requested. Existing manual
planning, published Journey cards and Practice Activities remain operational.
Full context, server document extraction and explicit course/material/exercise
Journey links require the separately approved database/function activation below.
No LLM generation is enabled by this frontend flag.

## Exact production operations requiring separate approval

Manifest: [unified-academic-production-manifest.json](unified-academic-production-manifest.json),
SHA-256 `3757db9297fffa45210e3f8027047c2f3f3d804de1262b871b298c375bc4c0ab`.

Read-only production inspection confirmed 0025, 0026 and 0027 already applied.
Do not replay them. Only these two new SQL files are necessary, in this order:

| Order | File | Bytes | SHA-256 |
|---|---|---:|---|
| 1 | `supabase/migrations/0028_unified_academic_context.sql` | 24,208 | `1de5d785d4bff3cb3e1eab9552174953921314c644d5ae338c19782c78f0b262` |
| 2 | `supabase/migrations/0029_personal_learning_journey.sql` | 18,007 | `dd3e97f12efcdb74a9ff683068f71f8e6d6eab601b321d387f05f1926a446723` |

Apply in a guarded transaction with dependency/hash/target checks, recording only
success in `supabase_migrations.schema_migrations` and
`public.vera_production_release_checksums`. Preserve existing row fingerprints,
Auth and Storage. Do not apply 0024, recreate accounts, change passwords, rewrite
attendance or modify existing approved plans. Both additions preserve existing
data; 0029 adds validation triggers for subsequent linked exercise writes.

Deploy only `academic-ai` with `verify_jwt=true`, using the manifest's exact 16
source/dependency files. Configure only the four non-credential values listed in
the manifest: all three generation flags `false`, allowed origin
`https://veraorbis.studio`. Do not change Gemini keys, activate any contextual
provider, enable paid billing or modify Vera Voice.

After verified SQL/function installation, set the GitHub repository variable
`VITE_ACADEMIC_CONTEXT_READY=true` and dispatch the existing deployment workflow.
This enables authorized context reads, private local document parsing and Journey
resource links. Deterministic planning templates are labeled and saved through the
existing private draft/version/approval/publication RPCs. They are not AI output.

## Staging gates — currently incomplete

0028 revision 2 was applied to `duinvkphfnugoyvvlbbq` on this run after a verified
encrypted backup; existing rows were unchanged. Real teacher/student Auth,
private PPTX upload/download, local parser with real staging index persistence,
context review, idempotent mocked-driver generation, seven-class draft editing,
private approval, publication and preserved revision history were verified.
Mock inference ran only in the local operator test driver; no external provider
was called and no hosted mock provider exists.

The current staging management token returned HTTP 401 before secrets/deployment.
The new Edge package has not deployed. A valid staging token is necessary.
0029 has local actual PostgreSQL and Chromium verification, but is awaiting its
exact staging approval. Full hosted Journey resource-link verification and fresh
unrelated-account Auth remain unverified; no unrelated teacher fixture is currently
available for that hosted test. Local RLS denials pass. Do not activate production
until staging deployment and these relevant hosted authorization checks pass.

Local checks: 60 focused Node tests and eight distinct Chromium workflows passed
(two timing failures passed on targeted rerun with a longer local startup/assertion
budget). Actual document parsers and PostgreSQL are used. Provider responses are
explicit test doubles. Screenshots inspected on mobile and desktop. The guarded
production artifact passes the production target/key/secret/staging-reference scan.

## Backup and recovery

Fresh production backup verified outside Git: 85 database/Auth tables and all 32
private Storage objects, including encryption/decryption integrity, archive
decompression/row counts, downloaded/source hashes and unchanged Storage inventory.
Recovery instructions and encrypted manifests accompany the protected backup in
the Windows user's VeraOrbis backup directory. Preserve the DPAPI Windows profile
needed to unwrap the encryption key. No credentials are stored in release docs.
Recheck freshness and record/file changes immediately before approved SQL.

The previous public frontend bytes were captured, and source commit `1592da5` is
available for rollback through the existing Pages workflow. On a frontend failure,
revert this release's frontend changes and redeploy the prior source. On SQL failure,
roll back the transaction and do not record success. After a committed additive
migration, disable the readiness flag and generation flags, retaining all plan,
binding and provenance history; do not automatically drop schema or restore over
production. A full Supabase platform restore and rollback redeployment remain
unverified and any restore requires separate authorization.
