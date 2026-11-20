# Student management release - approved and applied

The academic workflow is already LIVE at production commit
`60534bd9367e41bad3e6d3b3c92f4642993ca846` on https://veraorbis.studio/.
The existing founder teacher and Vera Test passed real authentication, private
DOCX/PPTX upload/download/extraction, twelve editable deterministic lessons,
approval, explicit publication, future-class/material links, exercise submission,
released feedback, notifications and private version history. Another existing
student's profile/Journey was denied to Vera Test. Provider calls: zero.

This release adds Manage Students. The user explicitly approved the exact package and founder administrator role. The SQL is now committed and the backend is deployed; frontend publication and browser verification follow.
It requires approval because the original request explicitly says to request
approval before applying unreviewed or destructive database changes.

## Exact SQL and order

Target: production `iopgzmvaqobigjwibual` only. Execution was separately authorized in the user approval; this document records the exact reviewed scope.
The existing migrations through 0029 must not be replayed.

| Order | File | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 1 | `supabase/migrations/0030_student_management.sql` | 15,256 | `eec9f137e381638e88a5a1d3e633f4f2dd1249b634b21b1eea655f32a33de61c` |
| 2 | `supabase/migrations/0031_student_account_deletion.sql` | 37,723 | `78e84f3c73805fd31747b7feb30315a267a81842f085ae988fc5bde05f51f097` |
| 3 | `supabase/production/bootstrap_academic_owner.sql` | 1,118 | `6ea6011e6d2f7709e0a3313ca463c5e6895affae39995ffa0978c1ea9583dfc3` |

The full 27-file code/SQL manifest is
[student-management-release-manifest.json](student-management-release-manifest.json).
Its SHA-256 is `f03e82c0055fef9bb707eb7834d9bfd1c0c9465104a2020ede643407baf642e0`.
The authoritative isolated release tree is
`.temp/student-management-release-candidate`, based on the live commit above.
Unrelated shared-workspace changes, including a sales link in teacherWorkspace,
are preserved outside this release. No existing visual styles are replaced.

0030 requires existing enrollment, attachments, versioned plans and Journey schema
(0013, 0018, 0019, 0025, 0029). It creates scoped roster state and append-only
action history, authorized contact/history reads, revision/idempotence guards,
and enrollment actions. Deactivation suspends the existing enrollment; reactivation
reuses it. Completion/archive reject unresolved active packages or future classes.
Removal clears only the current association, preserves the account/history and
revokes the former teacher's live profile/history access. New approval is required
after removal. A dedicated submitted-file read boundary retains current roster
owners' read-only review while inactive/archived; it grants no new-work rights.

0031 installs an administrator-only deletion job, retention holds, scoped Storage
and academic-write freezes, worker leases and explicit cleanup. Applying it does
not delete a user or rewrite existing academic rows. Confirmed, eligible deletion
is irreversible: private files, owned academic records, profile, then Auth are
removed in checked stages. Shared classes/exercise definitions/course definitions
remain. Accounting records, paid/unconsumed course commitments, future classes,
staff roles, unknown references, shared material references and retention holds
block deletion. New holds and current administrator membership are rechecked.
Interrupted jobs retain their stage and require explicit resume; no automatic retry.
Approved plans remain immutable outside the private, unexpired deletion lease.
The audit retains confirmation and completion as distinct events.

Production currently has **zero academy administrator memberships**. File 3
therefore requires approval to grant this privilege **only to the founder's existing,
confirmed teacher account**, already verified through the supplied login. The
operator must match the private actor-ledger SHA in the manifest and revalidate
that exact Auth UUID. Do not infer ownership from the number of teachers. This
changes administrator membership, not Auth credentials, profiles or passwords.
It must fail if another administrator appears or the approved identity changes.

## Backend and frontend deployment

Deploy only `student-management`, with `verify_jwt=true`, from the reviewed tree:

```powershell
npx.cmd --yes supabase@3.1.0 functions deploy student-management --remote=iopgzmvaqobigjwibual --use-api --workdir .temp/student-management-release-candidate --yes
```

Use the platform's built-in server credentials. Set only the new server settings
`STUDENT_MANAGEMENT_ALLOWED_ORIGINS=https://veraorbis.studio` and
`STUDENT_ACCOUNT_DELETION_ENABLED=true` after approved SQL/owner setup. The endpoint
validates the real user, confirmed email and current administrator membership;
only its worker uses the private server key. It rejects client file manifests,
foreign origins, oversized/unknown fields and ordinary teacher/student requests.
Never disable JWT verification or place a private key in frontend configuration.

After backend validation, set `VITE_STUDENT_MANAGEMENT_READY=true` and
`VITE_STUDENT_DELETION_READY=true`, and publish only the manifest's frontend changes
through the existing Pages workflow. All inference flags remain false. Vera Voice,
provider credentials and billing are unchanged. This is the existing Students
module, with its current profile editor, academic records and Journey.

New student material/submission downloads fetch bytes with the current authenticated
session instead of issuing reusable signed URLs. Already-issued links retain their
old expiry (up to one hour for materials); previously downloaded copies cannot be
recalled. No signing-key rotation, object move or existing-file rewrite is included.

## Evidence, backup and release gates

- Real production academic workflow: 13 workflow checks plus six additional
  session checks; 39 public checks; all test writes restricted to Vera Test.
- New release: 77 distinct focused Node SQL/authorization/endpoint/download/
  regression checks across passing runs, six isolated Chromium enrollment,
  administrator-preview, attachment and Journey workflows, actual Deno check,
  and a verified production artifact with inference disabled. These local tests
  do not prove hosted Auth/Storage account deletion.
- A read-only production dependency check passed 23 checks. New management tables
  are absent, required functions/schema exist, and Vera Test's approved teacher
  association is preserved. No new SQL was run against staging or production.
- Latest encrypted production backup verified 89 database/Auth tables and all 34
  private objects (33,374,099 bytes), including archive counts, authenticated
  encryption/decryption, source SHA-256 rechecks and unchanged Storage inventory.
  Archives, recovery mapping and instructions are outside Git under the user's
  protected VeraOrbis backup directory. A full platform restore is untested.

Immediately before application, verify exact target, source hashes, current
schema/role preconditions, private founder UUID and fresh backup/inventory. Stop
on drift. Apply the three SQL files in one guarded transaction and record only
successful execution and checksums in the existing migration/release tracking.
Deployment-time account/profile deletion is prohibited.

After deployment, use the existing founder login and Vera Test only. Verify search,
profile/history, deactivation/backend denial, reactivation without data loss,
completion/archive guards, remove/reapprove without duplicate enrollment, and
return Vera Test to its original approved association. Handle the synthetic future
class only on Vera Test if needed for archive validation. Test only administrator
preview/denials in production: **never confirm deletion of an existing account**.
Real hosted account deletion remains unverified unless separately authorized in
an isolated environment. No new production accounts are created.

## Rollback

Before SQL commit: roll back the transaction and record no success. After commit:
disable the server deletion setting first, disable frontend readiness flags and
redeploy the previous live source through the existing workflow. Preserve roster,
job and audit history; do not automatically drop schema, reactivate students,
restore files, recreate Auth accounts or overwrite live data. An interrupted,
already-confirmed deletion may be partially irreversible; inspect its persisted
stage and use the protected recovery procedure only under separate approval.

The unrelated missing production payment-summary view remains unresolved and is
excluded from this release. Payment history is not a claimed E2E success; no
payment records or billing configuration are changed.
