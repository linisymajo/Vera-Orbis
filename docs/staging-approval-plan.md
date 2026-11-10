# Staging initialization approval

## Legacy feedback compatibility supplement — approved and applied

The targeted compatibility test demonstrated that a pre-versioning released
observation could disappear from the legacy student view after a new private
review. The same test also preserves the previous 12,000-character feedback
limit. This is an additional change, outside the approved 0022 bytes:

- File: [0023_legacy_exercise_feedback.sql](../supabase/migrations/0023_legacy_exercise_feedback.sql)
- Bytes: 5,616
- SHA-256: `fee211a3060aa20422704579d445ded136a9b4e273f12d968d9113b78e02f02b`
- Target: **duinvkphfnugoyvvlbbq only**, after successfully applied 0022.

It changes only the existing feedback-save function and sanitized student view.
On a first subsequent review, it atomically retains any existing legacy feedback
as an immutable initial version before saving the new revision. It keeps the
last released feedback visible while a later revision is private, and retains
the legacy message length limit. Existing versioned histories, authorization,
idempotency, optimistic review checks, RLS, assignment scope and AI approval
requirements remain in force. Deployment does not backfill or alter existing rows.

All **20 focused correction/compatibility tests pass**, including the formerly
failing legacy case, long feedback, draft privacy and cross-account denials.
The user approved the exact file above. It applied successfully to staging only,
with successful version/name and checksum recording. All existing academic row
fingerprints and the three Auth accounts were preserved; all public tables retain
RLS. There are now 21 migration-history entries and 25 setup hashes. Live read-only
preflight recognizes 0022/0023 with no blockers, warnings or pending release files.
Actual teacher/student sessions verified a 4,951-character private feedback save,
idempotent replay and unchanged previously released student feedback.
A fresh Windows DPAPI encrypted application/catalog snapshot outside the repo
preceded application; its decrypt/hash roundtrip passed. Its single SQL
transaction rolls back on failure. Platform/full database restore remains
unverified. No resets, automatic reversal, Auth/Storage/SMTP settings, AI/provider
activation, production changes, source push or website deployment are included.

## Exercise Experience 4.0 extension — approved and applied

The original 23 approved files below remain unchanged. The new exercise request
adds **one migration**, not a reset or another baseline:

- File: [0022_exercise_experience.sql](../supabase/migrations/0022_exercise_experience.sql)
- Bytes: 42,586
- SHA-256: `65419f21e4b8ce92948611dac31a323e96bfa009a99d2b834148e768e0d062cb`
- Target: **duinvkphfnugoyvvlbbq only**
- Independent review manifest: `scripts/exercise-experience.reviewed.json`.

It adds private correction results, per-question checks, saved practice drafts
and immutable feedback versions linked to existing assignments/attempts. Existing
submission RPCs retain attachment checks, request idempotency, enrollment scope,
deadlines and attempt limits. Their private writer gains per-question response
formats. It adds deterministic correction, retry scoring/reveal controls, safe
progress/review RPCs, optimistic feedback saves and released history. New tables
have RLS with management/write privileges revoked. Published correction rules
become immutable once assigned. Legacy exercises without correction settings keep
manual behavior; historical attempts are not regraded or backfilled.

Two nullable submission-reference columns bind new AI requests/drafts to the
precise original response. Authorized AI context can include released teacher
observations. This does not activate AI, authorize paid calls, auto-publish
feedback or final grades, alter Auth/SMTP/Storage settings, create accounts,
change production, push source or deploy a website.

The existing history will receive version/name `0022 / exercise_experience`
only after SQL succeeds; the existing successful-file ledger receives this exact
file/hash. Existing 0011–0021 manifest and approved initialization hash stay frozen.
The read-only preflight now checks the independently reviewed extension hash
instead of treating 0022 as an unknown history entry.

The user approved this exact file with "Approve staging migration 0022". It
applied successfully, with 20 actual migration versions recorded and all
pre-existing public academic row fingerprints unchanged. Auth remains at three
test identities. Live read-only preflight has zero blockers/warnings. Real
teacher/student browser tests subsequently passed publication, saved progress,
objective retries/reveal, an optional PDF upload, teacher review/private drafts/
release, exact-byte Storage download and student authorization denials. AI is off.

Read-only backup captured existing public application rows, function/view/policy/
grant metadata, migration history and minimal Auth UUID/confirmation references.
It is encrypted with Windows DPAPI CurrentUser under
`%LOCALAPPDATA%\VeraOrbis\staging-backups`, outside the repository; decrypt/hash
roundtrip passed. Auth credentials, managed Auth rows and Storage bytes were not
exported. Platform restore and full database restore remain unverified.
Retain source/checksums and take a fresh encrypted snapshot immediately before
application. Run this migration as its single explicit transaction; on any error,
roll back and stop. Never reset, replay initialization, drop existing records or
automatically reverse committed changes. Any later recovery needs separate review
against the retained pre-change definitions/data.

That approval and application are complete. Production and provider activation
remain excluded; they are not authorized by the new 0023 request above.

Reviewed 2026-11-09 for **duinvkphfnugoyvvlbbq / vera-orbis-staging only**.
The user **approved the exact 22-file plan below** on 2026-11-09 with
"Approve staging initialization", then approved the additional privilege
supplement with "Approve additional staging hardening". Both approved change
sets were applied successfully to staging only. Production is excluded.

## Confirmed target state

Authenticated inspection used the pinned direct database host, verified TLS with
Supabase's official public CA, `BEGIN READ ONLY` and `ROLLBACK`. The staging API
accepts the configured publishable key. No credential values are in these reports.

- Zero public application tables, views or functions; no migration history/marker.
- Zero Auth users, Storage buckets and stored objects, confirmed by exact counts.
- Managed Auth/Storage exist. `public.get_my_enrollment()` and its enrollment
  helpers are absent SQL objects, not merely stale cache entries in staging.
- Email signup is enabled; email confirmation is required. SMTP delivery,
  callback allowlists, password recovery and real sessions remain unverified.
- Production `iopgzmvaqobigjwibual` was not contacted by these database/API checks.
  Its database migration state remains unverified.

Evidence is retained locally under ignored `.temp/staging-inspection-*.json` and
`.temp/staging-enrollment-diagnostic-*.json`. Metadata does not prove live workflows.

## Exact proposed change set

This is a **new repository-derived baseline for an empty staging project**,
not an export of production or a claim that its original schema was recovered.
The proposal contains these 22 SQL files, in this exact order:

| Order | File |
| --- | --- |
| 1 | `supabase/staging/initial_application_schema.sql` |
| 2 | `supabase/staging/initialization_tracking.sql` |
| 3 | `supabase/migrations/0002_teacher_operations.sql` |
| 4 | `supabase/migrations/0004_exercise_studio.sql` |
| 5 | `supabase/migrations/0005_materials_storage_policy.sql` |
| 6 | `supabase/migrations/0006_interface_language.sql` |
| 7 | `supabase/migrations/0007_teacher_management_enhancements.sql` |
| 8 | `supabase/migrations/0008_teacher_management_security_patch.sql` |
| 9 | `supabase/migrations/0009_academic_sync_challenges_feedback.sql` |
| 10 | `supabase/migrations/0010_inbox_messaging.sql` |
| 11 | `supabase/migrations/0011_material_office_formats.sql` |
| 12 | `supabase/migrations/0012_exercise_workflow.sql` |
| 13 | `supabase/migrations/0013_hybrid_enrollment.sql` |
| 14 | `supabase/migrations/0014_ai_drafts.sql` |
| 15 | `supabase/migrations/0015_material_owner_boundary.sql` |
| 16 | `supabase/migrations/0016_academic_teacher_scope.sql` |
| 17 | `supabase/migrations/0017_inbox_authorization.sql` |
| 18 | `supabase/migrations/0018_student_attachments.sql` |
| 19 | `supabase/migrations/0019_learning_plans.sql` |
| 20 | `supabase/migrations/0020_challenges_notifications.sql` |
| 21 | `supabase/migrations/0021_final_assessments.sql` |
| 22 | `supabase/staging/application_access.sql` |

Exact byte lengths and SHA-256 values:
[staging-initialization.reviewed.json](../scripts/staging-initialization.reviewed.json).

Plan SHA-256:
`46a4d771b5113fc284a13bea495379f0d375d29b25edc14398aa62dc078f69f0`

Release-only manifest SHA-256:
`620e52dca8d4e1f9723d3813f280ac781d7b87c2e56c23f701fae3e4bc2d2240`

The template `0001` and legacy corrective `0003` are excluded. Nineteen actual
migration versions are recorded only after their corresponding SQL succeeds;
the three new setup files have their own checksum ledger, not invented historical
versions. No account, membership, enrollment approval or AI provider is seeded.

## Security and compatibility

The initial file refuses existing non-extension application objects, migration
history/markers and target buckets before creating the five missing core tables.
Those tables begin with RLS and no client access. The final file checks all 19
exact migration names and 11 reviewed release checksums before opening scoped
application grants. Students cannot change teacher-controlled profile fields,
self-assign roles or bypass RPC-only submissions. Pending applicants can save
their own intake; teacher notes require ownership and an assigned student.

Actual hosted metadata shows Storage RLS is already enabled and `postgres` can
manage policies through Supabase's managed policy grants, while it does not own
the Storage tables. Files 0005/0015/0018 now conditionally enable RLS only when
needed, avoiding an unnecessary owner-only ALTER. They never disable RLS, change
managed ownership or grant reserved roles. Their changed SQL is covered by the
new reviewed manifests above. Hosted policy execution still needs post-approval
verification; disposable PostgreSQL is not a Supabase service test.

Local full-chain and guard tests pass, including nonowner RLS checks, pending
enrollment denial, explicit administrator approval, scoped teacher access,
private buckets, profile protection and unchanged RPC-only exercise grants.

## Backup, recovery and execution conditions

Immediately before an approved run, revalidate the exact manifests, pinned target,
empty application state and zero account/object counts. Retain the current catalog
snapshot and exact SQL/checksum files before the first write. There are currently
no academic rows, Auth users or Storage bytes to back up. Managed Auth/Storage
schemas are retained; only the reviewed trigger/policy/bucket additions affect them.

Apply the exact files with SQL errors stopping the run. Record successful files
and checksums, and stop on a partial or ambiguous result. Keep the preview's
protected workflows unavailable until the whole sequence passes. Do not replay
earlier definitions, stamp missing history, reset the project, drop failed state
or automatically reverse already committed changes. Inspect and explicitly review
any recovery action against the retained evidence first.

Supabase platform backup/restore availability has not been verified. Local
`pg_dump`, `pg_restore`, Docker and Supabase CLI are unavailable. This proposal is
limited to the verified empty staging environment; it is not a tested production
backup/restore plan. Production preparation requires its own schema comparison,
restorable backup evidence, compatibility review and separate approval.

## Additional privilege supplement: approved and applied

The final read-only pre-apply check found that hosted public-table default ACLs
grant `authenticated` management privileges including `TRUNCATE`, which bypasses
RLS. The approved activation grants alone do not remove these inherited defaults
from every legacy application table. This was discovered before any SQL ran.

The approved 22 SQL files and manifest remain byte-for-byte unchanged. Append
exactly one additional file **after** them:

`supabase/staging/client_privilege_hardening.sql` (10,462 bytes)

SHA-256: `27aed4514700e8f51c33a27723786aeaa90695bac8d27acf59329b362d530994`

It verifies the pinned staging marker, all 22 setup hashes, 19 migration names,
11 release hashes and prior activation policy/trigger. It removes only
`TRUNCATE`, `TRIGGER`, `REFERENCES` (including column grants) and, on PostgreSQL 17+,
`MAINTAIN` from `authenticated` on non-extension public application tables.
Effective rights are checked afterward; inherited rights it cannot safely remove
cause the supplement transaction to roll back. Existing CRUD/RPC permissions,
rows, ownership, role memberships, default ACLs and managed schemas are preserved.
Future application tables still require explicit privilege review.

Local full-chain tests pass **31/31**, including actual ALL defaults before and
after hardening, unchanged business permissions and fail-closed evidence checks.
The supplement was approved and applied. A guarded one-use local runner
rechecked the approved hashes, verified TLS and empty pinned target, recorded each
successful file, and completed post-apply security checks.

The approval applies **only to duinvkphfnugoyvvlbbq**. No source push, Pages
deployment, production SQL, provider activation, SMTP or Auth configuration
change is included. Platform restore remains unverified as described above.

## Applied staging evidence

The exact 23-file sequence completed without SQL errors. Post-apply queries
confirmed 19 actual migration history rows, all 23 setup-file hashes, the
zero-argument enrollment RPC, RLS on every public application table, no effective
authenticated table management privileges, and two private academic buckets.
Auth users were still zero at initialization completion. The subsequent
marker-aware read-only preflight returned `ready_for_review: true`, zero blockers,
zero warnings and zero pending release migrations. Ignored evidence:
`.temp/staging-apply-*.json` and `.temp/staging-post-apply-preflight.json`.

This confirms schema initialization and security metadata, not completed
authenticated academic workflows. Real registration/email and integration tests
follow separately; AI generation remains off.

After both approvals, verify real RPC/RLS/Storage behavior, provision the authorized
synthetic accounts using environment-only credentials, confirm actual emails and
run the teacher/student release matrix. AI remains disabled. No production release
approval will be requested until staging's critical integration checks succeed.
