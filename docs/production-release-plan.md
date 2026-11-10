# Production release approval plan

Prepared 2026-11-10. **Pending explicit approval. No production changes or deployment performed.**
Target: Supabase iopgzmvaqobigjwibual; existing https://veraorbis.studio/ and GitHub Pages workflow only.

## Confirmed inspection and user impact

Verified TLS and read-only inspection confirm PostgreSQL 17.11, 22 existing public tables with RLS, 17 Auth users, 15 profiles, 13 materials and 14 private Storage objects. No authoritative migration history exists. The enrollment RPC is absent: PGRST202 is caused by unapplied enrollment SQL, not simply a stale cache. The frontend correctly calls public.get_my_enrollment() without parameters.

Preserve existing identities, passwords, rows and files. Migration 0013 backfills legacy enrollment from existing profiles; one unconfirmed profile remains blocked until its real email confirmation. No automatic confirmation, account import, password reset or enrollment bypass is authorized.

Production-specific compatibility preserves profiles.progress as bigint and converts weekly_challenges.end_date from date to timestamptz using UTC midnight (two non-null existing dates). This prevents timed challenge publication failing its snapshot trigger. Hardening removes client management privileges that RLS cannot protect; ordinary academic permissions remain.

## Exact SQL proposal

Plan SHA-256: `5e84b4268969a225ace5dbec7a6a7b4db2ed61bf335ee003fc23659cb387ec70`.
Machine-readable lengths/checksums: [production-release.reviewed.json](../scripts/production-release.reviewed.json).
Apply in the following order only, recording successful file checksums and actual migration versions. Do not fabricate legacy history.

| Order | File | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 1 | supabase/production/release_tracking.sql | 1153 | `afae929e8222e6766d8f0cd81892963ca57cc955db586bd5062f05baec9e6dcc` |
| 2 | supabase/production/academic_compatibility.sql | 1101 | `701f6067b013db40dbd56462c09046178b2d142ec0885560755679cc71a4ddaa` |
| 3 | supabase/migrations/0012_exercise_workflow.sql | 16343 | `2948fda844f726bc612c651762e8ed7e9b4e3be56513624b8a2db3181bcc7f10` |
| 4 | supabase/migrations/0013_hybrid_enrollment.sql | 19359 | `88b37326445127eee2d5d11954390d000122df4a799e5c0b8606f54efa9a21fc` |
| 5 | supabase/migrations/0014_ai_drafts.sql | 20116 | `9c134d44d7bb3a405552e236ee0a20a1303c80e4c4c50f0a385255e06f582e62` |
| 6 | supabase/migrations/0015_material_owner_boundary.sql | 5627 | `d3979ac3d9219d700523ba824df4e3f2dee0f8eaf6a2e8567c8571e85866f787` |
| 7 | supabase/migrations/0016_academic_teacher_scope.sql | 7690 | `ae8117c3fb8497db50c8781853dc56ddf2407978a0d1771671dd14124811f5a6` |
| 8 | supabase/migrations/0017_inbox_authorization.sql | 5112 | `22103240cc8f7bb09ae373db1e8e13a7d3a7785083e639c57977edf41ff01692` |
| 9 | supabase/migrations/0018_student_attachments.sql | 22251 | `04bcd4c8970d1f02f6278d2f8391a9d45ec1bc95e62cede595f3de2da7cb185b` |
| 10 | supabase/migrations/0019_learning_plans.sql | 22697 | `a89cc573f9f34c8d8cb1fc9e6265b264cd50a9559f9e20a3fdde73cd1a148024` |
| 11 | supabase/migrations/0020_challenges_notifications.sql | 23250 | `806949a4b1e14c96d992ca33f83eab6ca4d87667b976367af72df8586959b61d` |
| 12 | supabase/migrations/0021_final_assessments.sql | 16367 | `a57d743088ed1545ade4fef89ed9c917bbcfcbfb4dc303552b894d6e6f6a91b7` |
| 13 | supabase/migrations/0022_exercise_experience.sql | 42586 | `65419f21e4b8ce92948611dac31a323e96bfa009a99d2b834148e768e0d062cb` |
| 14 | supabase/migrations/0023_legacy_exercise_feedback.sql | 5616 | `fee211a3060aa20422704579d445ded136a9b4e273f12d968d9113b78e02f02b` |
| 15 | supabase/production/client_privilege_hardening.sql | 1304 | `f4514b51383db4d2fbb13ab5f5cfdae039bbcdd96de195b24b179d075a351091` |

Do not replay 0001?0010, staging initialization or account fixtures. Skip 0011: the existing private materials bucket has a null MIME allowlist, already permits Office files, and that SQL would preserve null. Exclude 0024 and all revenue-engine/backend work. Existing migrations 0012?0023 are unchanged. New private academic-submissions bucket policies and its 10 MiB academic upload restrictions come from 0018; existing materials files remain intact.

## Backup and recovery

**Verified:** encrypted full database archive, Auth records/password hashes, role definitions without managed role passwords, catalog metadata and all 14 private Storage objects (13,028,502 bytes). Archive extraction and 61 snapshot table counts matched. Every Storage file passed authenticated decryption/hash verification and an independent source download hash recheck; inventory stayed unchanged.

Stored outside the repository under Windows LocalAppData/VeraOrbis/production-backups/production-1794292215126. Recovery instructions and aggregate verification are beside the backup. AES-256-GCM keys are wrapped by Windows DPAPI CurrentUser: recovery requires this Windows profile/master keys. No credentials are in this document or source.

**Not verified:** a full Supabase platform restore. Database metadata alone does not restore Storage bytes or external Auth/SMTP/provider configuration. Restoration to any destination requires separate approval; never blindly replay managed-role/ACL definitions. A later restore can lose writes made after the snapshot. Refresh the verified backup before execution if the source has changed.

The prior application from deployed commit 079a74fa166b246848268010079f15a1e5376083 was rebuilt with matching live bundle hashes. Its 52-file rollback artifact retains the new password-recovery route, is saved beside the encrypted backup, and has manifest SHA-256 f7d3cc13a214e7842b331041d433f8f5e38883e32f10b280a5f17727149e0158. It has not been redeployed or tested against an upgraded production backend. Frontend rollback does not undo SQL; prefer a separately reviewed forward repair over database restoration.

## Application and validation

The isolated release branch release/academic-go-live-20261110 starts from deployed remote main, preserving approved visual and academic changes while excluding unrelated revenue files. Shared uncommitted work is untouched. The release adds reset-password.html, currently missing on the live site, and keeps the existing domain, Voice endpoint, 3D interactions and Language Passport.

Candidate Node suite: **354/354 passing**. Production-specific compatibility was rehearsed locally against the actual production public-schema DDL with synthetic records: UTC dates and bigint values preserved, timed challenges publish, private tracking and hardened grants pass. These new production supplements have **not** been applied to hosted staging. Existing academic migrations have previous hosted staging integration evidence. Production artifact validation passed for 58 files, production project targeting, AI disabled, route presence and credential exclusions. Private credential scan passed.

A push of the frozen candidate to main triggers the existing .github/workflows/deploy.yml, npm ci, guarded npm run build and Pages publication. No marketing cron, service-role browser key, AI activation, SMTP change or new hosting service is included. Existing Actions secret values are unreadable through the API; the build fails closed if its URL/key targets another project. Preserve existing Auth/SMTP settings. Auth site/redirect configuration and real production account workflows remain unverified. Existing HTTPS works; Pages reports https_enforced:false, which this release does not change.

## Execution gate and stop conditions

Before any production SQL, recheck target, manifest hashes, schema drift and verified backup freshness. If anything differs, stop and present the revised plan. Use verified TLS, target guards and a transaction for SQL plus successful history/checksum recording; rollback on error. Validate RLS, grants, enrollment RPC and row preservation before application deployment. Do not deploy a frontend against failed migrations.

Explicit approval must cover these 15 SQL files and the separately frozen application commit through the existing Pages workflow. A hosted-staging rehearsal of the three new production supplements remains a prerequisite before production application, using synthetic data only and no production rows. If that rehearsal requires new staging SQL approval, obtain it before running. No production approval is implied by this document.

After authorized deployment, verify live artifact hashes, routes and read-only schema/RPC authorization. Authenticated teacher/student writes, invitations and submissions require approved synthetic production accounts; never use real student records for smoke tests. Complete account workflows and a full platform recovery rehearsal remain unverified, and must not be reported as complete.
