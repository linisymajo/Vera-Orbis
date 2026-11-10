# Academic workflow release and staging verification

On **2026-11-09**, direct authenticated inspection with verified TLS confirmed
`duinvkphfnugoyvvlbbq` (`vera-orbis-staging`) was initially empty: zero public application
tables/functions, Auth users, Storage buckets/objects and migration history.
`public.get_my_enrollment()` was absent SQL. Managed Auth/Storage are present;
email signup is enabled and email confirmation is required.

The user approved the exact **22-file** empty-staging initialization plan:
`46a4d771b5113fc284a13bea495379f0d375d29b25edc14398aa62dc078f69f0`.
The user separately approved `supabase/staging/client_privilege_hardening.sql`.
All **23/23 SQL files applied successfully**. Post-apply evidence confirms 19
migration-history entries, 23 file hashes, the enrollment RPC, RLS on all public
tables, zero unsafe authenticated `TRUNCATE`/`TRIGGER`/`REFERENCES` table privileges
and two private academic buckets. The supplement addresses hosted default ALL
privileges that RLS alone does not constrain. Live marker-aware preflight returned
`ready_for_review:true`, no blockers/warnings and zero pending release migrations.
Subsequently, separately approved 0022/0023 applied successfully: 21 migration
versions and 25 setup hashes, unchanged existing academic row fingerprints and
RLS on all public tables. Fresh encrypted application/catalog backups passed
decrypt/hash roundtrips before application; platform restore remains unverified.
Three synthetic Auth accounts exist; teacher and invited student are confirmed.
The user confirmed teacher signup email delivery and staging callback. Actual
exercise Auth/REST/Storage and recipient notifications were verified; the complete
release matrix below remains open. AI remains off; production is excluded.
Do not deploy the new frontend before its backend migrations: enrollment and
exercise writes deliberately fail closed if their RPCs are unavailable.

## Local development target and enrollment RPC

The current local `.env.local` selects production project
`iopgzmvaqobigjwibual`; the same reference is embedded in the public
`veraorbis.studio` platform/teacher assets. That file has not been rewritten.
Use the guarded development launcher so local staging work cannot inherit it:

```powershell
npm.cmd run dev:staging
```

`npm.cmd run dev` uses the same guard. Stop an older dev server and restart it
after configuring `VERA_STAGING_PUBLISHABLE_KEY` in the terminal environment.
Obtain the browser publishable key (or legacy **anon**, never `service_role` or
secret key) from project `duinvkphfnugoyvvlbbq` only. Windows User environment
variables require a fresh terminal/editor process before the launcher sees them.
Do not paste keys in chat, commands, source, or repository `.env` files.

The launcher derives the staging URL, refuses a mismatched explicit reference or
URL, disables env-file loading and inherited `VITE_*` settings, and keeps academic
AI disabled. It stops before starting Vite when the dedicated browser key is
missing or invalid. A modern opaque publishable key's project binding is verified
by Supabase when used; the launcher cannot establish that binding locally. A
legacy anon JWT must contain the matching project reference. The browser key is
separate from the private database credential used by read-only inspection.
Avoid raw `vite`/`npx vite` commands, which bypass this launcher. GitHub Pages main
and manual workflows still target production; public `CNAME` is
`veraorbis.studio`. Neither is an isolated staging hosting target.

The reported PGRST202 concerns `public.get_my_enrollment()`, defined in
`0013_hybrid_enrollment.sql`. Its zero-argument frontend call is correct. Follow
[enrollment-rpc-deployment.md](enrollment-rpc-deployment.md) and the read-only
`supabase/tests/enrollment-rpc-verification.sql` to distinguish absent SQL,
incompatible signatures/security, API exposure and a stale cache. The staging
catalog initially confirmed absent SQL; the approved initialization now installed
the RPC. Real teacher/student staging sessions now execute it successfully;
production's database/cache state remains unverified. Do not replace the installed authorization logic
with a standalone always-approved function or replay the initialization chain.

## Local preview, routes and recovery

The latest verified isolated build is `.temp/staging-preview/build-DiStof`.
The guarded development preview is `http://127.0.0.1:5173`; authenticated exercise
workflows were checked there against actual staging, separately from local
fixture tests. The build contains staging browser configuration with AI disabled
and excludes the production CNAME. It has not been deployed to hosting.

Route names are defined by `src/lib/academicRoutes.js`; authorization remains in
the existing entry handlers. Teacher tools use `/teacher.html?module=<module>`
and student views use `/platform.html#<view>`. For example:

| Tool | Teacher | Student |
| --- | --- | --- |
| Materials | `/teacher.html?module=materials-studio` | `/platform.html#materials` |
| Exercises | `/teacher.html?module=exercise-studio` | `/platform.html#exercises` |
| Plans | `/teacher.html?module=learning-plans` | `/platform.html#learning-plans` |
| Challenges | `/teacher.html?module=challenges` | `/platform.html#challenges` |
| Finals | `/teacher.html?module=finals` | `/platform.html#finals` |
| Inbox | `/teacher.html?module=inbox` | `/platform.html#inbox` |

Login now includes a reset request form. `/reset-password.html` requires an SDK
recovery event and a matching server-verified user, updates the password once,
scrubs callback credentials and signs out locally. Normal/expired callbacks and
late fragment navigation remain blocked. Confirm the exact current-origin
`/reset-password.html` and `/onboarding.html` callbacks, including the invitation
variant, in the staging Auth configuration. The user confirmed teacher signup
email receipt and the staging callback; reset email delivery and authenticated
recovery remain unverified.

## Offline preparation tools

```powershell
node scripts/staging-manifest.mjs
node scripts/staging-manifest.mjs --verify scripts/staging-manifest.reviewed.json
node scripts/staging-preflight.mjs
node --test tests/staging-preparation.test.mjs
```

These commands inspect local SQL only. They do not read `.env`, frontend settings,
database URLs, linked CLI project state or credentials. The manifest records exact
byte lengths and SHA-256 for migrations 0011–0021, plus an ordered manifest digest.
Writing a manifest refuses to overwrite an existing file. Changed SQL or line
endings require review and a deliberately replaced manifest, not silent regeneration.
The default preflight prints this manifest and its fixed inspection queries offline.
These inspection tools have **no apply, repair, reset, backup or restore command**.
The approved 22-file initialization manifest is
`scripts/staging-initialization.reviewed.json`; its stored planning flags remain
fail-closed and do not replace the user's separately recorded approval. Do not
rewrite either approved manifest. Current target evidence and the exact plan are recorded
in [staging-approval-plan.md](staging-approval-plan.md).

## New staging identity and baseline

Independently compare the supplied staging project's Dashboard reference/name
with `duinvkphfnugoyvvlbbq` and its direct PostgreSQL host. Use a reviewed
schema-only baseline and synthetic data. Do not connect to or clone the existing
production project under this task. Physical project restoration copies Auth data
and can immediately activate database jobs/extensions with external effects;
Storage, Auth configuration and Edge Functions need separate attention. See
[Supabase project restoration](https://supabase.com/docs/guides/platform/clone-project).

The approved staging baseline is newly derived from this repository for the
verified empty project. It is not a production export or a recovered original
schema. Start with the exact 22-file list in
[staging-approval-plan.md](staging-approval-plan.md), not at 0011. The plan selects
0002 and excludes corrective 0003 and the comment-only 0001 template. Do not invent
prior migration history or apply this empty-project baseline to production.

Initial inspection read metadata without creating a marker. Marker and checksum
setup now belong only to the exact approved setup files; do not substitute inline
SQL or create a marker to bypass a refusal.

Never stamp a staging marker into an existing project to bypass a refusal. It is
an operator-established guard, not independent proof that any arbitrary project
is staging. A missing/mismatched marker stops inspection before schema queries.

## Read-only connection inputs

Inject these values through a private operator environment. In Windows, use
**Edit environment variables for your account > User variables > New** so secrets
do not enter command history or repository files. The named Windows User variables
can be loaded privately into the inspection process without printing values;
there is no need to paste them into chat. Do not read the existing `.env.local`.

| Variable | Value |
| --- | --- |
| `VERA_STAGING_PROJECT_NAME` | `vera-orbis-staging` |
| `VERA_STAGING_PROJECT_REF` | `duinvkphfnugoyvvlbbq` |
| `VERA_STAGING_ACK` | `read-only-preflight` |
| `VERA_STAGING_DB_URL` | Direct `postgresql://postgres:<percent-encoded-password>@db.<STAGING_REF>.supabase.co:5432/postgres`, optionally `?sslmode=verify-full` |
| `VERA_STAGING_CA_PEM` | Optional downloaded public Supabase CA certificate in PEM form when required by its certificate chain |
| `VERA_STAGING_DENY_PROJECT_REFS` | Comma-separated existing/production references to exclude |

Obtain the Direct connection URI from this staging project's **Connect** panel.
Use only its database password; URL-encode the password when necessary. The host
must remain `db.duinvkphfnugoyvvlbbq.supabase.co:5432` and database `postgres`.
An environment-ready reply authorizes no migration. Both AI switches stay off.
The direct verified-TLS inspection has now completed. The public CA PEM and
connection inputs are configured privately in Windows User variables; no values
belong in reports or repository files.

Before approval, use the separate pinned read-only inspection mode described in
`docs/staging-approval-plan.md`. It can inspect an absent marker and never returns
migration authorization. The older preflight below remains for the explicitly
approved baseline/guard setup; do not create its marker beforehand.

```powershell
node scripts/staging-inspect.mjs --project-ref duinvkphfnugoyvvlbbq --manifest scripts/staging-manifest.reviewed.json
```

Completed inspection exits 2 and reports `migrations_approved:false` and
`ready_to_apply:false`; refusal/failure exits 1. It reads fixed catalog metadata
without function bodies, column defaults, academic rows or Auth account values.
Review exact data-impact counts separately if existing legacy rows are present.

```powershell
# After explicit baseline/guard-setup approval only.
node scripts/staging-preflight.mjs --read-only-connect --manifest scripts/staging-manifest.reviewed.json
```

The host must contain the exact explicit project reference. Other hosts, poolers,
ports/databases, arbitrary connection options and disabled certificate verification
are refused. The driver verifies TLS and hostnames; supply the downloaded public
CA when necessary. Supabase recommends direct sessions for migrations/backups and
documents certificate verification in [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
and [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).
If the direct endpoint is unreachable, stop and review connectivity; there is no
automatic pooler or project fallback.

The driver defaults to read-only, starts `BEGIN READ ONLY`, confirms that setting,
uses statement/lock timeouts and ends with `ROLLBACK`. It reads schema metadata,
policy fingerprints, table/column grants, bucket settings and migration IDs/names/
checksums. It does not inspect academic rows, Auth account values, secrets, SMTP
settings, Storage object names or bytes. Raw driver errors/connection URLs are
suppressed. Exit 0 means ready for **human metadata review**; exit 2 reports
compatibility blockers and exit 1 rejects inputs/inspection failure. Neither means
authenticated workflows have passed.

Missing baseline objects, incompatible columns, disabled RLS, missing policies,
anonymous private grants, unsafe buckets, unknown/duplicate migration versions,
unverified baseline names, release-history holes and missing/mismatched applied
checksums block the plan. Only the reviewed four-digit repository version/name
mapping is supported. A timestamp-based or manually applied baseline needs a
separately reviewed export/mapping and explicit tooling change; it is not guessed.

## Reviewed release inputs

The approved initialization bundle contains three setup files and the selected
0002/0004-0021 chain, 22 SQL files in total. The release-only list below is not the
complete empty-project plan. That bundle and its separately approved privilege
supplement are now applied. Retain both approvals and exact hashes; the live
preflight confirms all 0011-0021 release files are recorded with zero pending.
No future file inherits these approvals.

The exact new migration files, in order, are:

1. `supabase/migrations/0011_material_office_formats.sql`
2. `supabase/migrations/0012_exercise_workflow.sql`
3. `supabase/migrations/0013_hybrid_enrollment.sql`
4. `supabase/migrations/0014_ai_drafts.sql`
5. `supabase/migrations/0015_material_owner_boundary.sql`
6. `supabase/migrations/0016_academic_teacher_scope.sql`
7. `supabase/migrations/0017_inbox_authorization.sql`
8. `supabase/migrations/0018_student_attachments.sql`
9. `supabase/migrations/0019_learning_plans.sql`
10. `supabase/migrations/0020_challenges_notifications.sql`
11. `supabase/migrations/0021_final_assessments.sql`

The approved plan discloses the verified empty target: there are no existing
application rows, Auth users or Storage bytes to back up. Retain restricted catalog
snapshots and exact SQL/checksum inputs before the first write. Local restore
tools are unavailable and Supabase platform restore capability is unverified;
there is no tested rollback/restore claim. A populated target or production needs
its own restorable backup evidence. Database backups do not contain Storage file
bytes. See [Supabase database backups](https://supabase.com/docs/guides/platform/backups).

The completed run applied only the approved ordered files and retained their
successful history/checksum evidence. Do not rerun it. Any later migration needs
its own reviewed pending-file plan; failed files must never be marked applied.
The checksum ledger supplements actual migration history rather than replacing it.
Supabase explains history tracking in [database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

Do not run older migrations again after newer ones: 0013 replaces 0012's
transitional access helpers with enrollment-aware checks. Review production
application separately against the confirmed target, backup and migration history.
0018 also renames the original submission implementation to the private
`_submit_exercise_answers` helper and installs attachment-aware submission handling.
Never replay 0012 after 0018; it would bypass or break the newer file workflow.
These replay prohibitions remain in effect after the successful staging run.
Inspection/preflight tools themselves do not apply migrations or record history.

On failure, stop further application and keep the frontend offline. Preserve the
failed-step report and inspect actual transaction/commit state. Review a forward
correction or restore the tested staging backup into a separate disposable target;
restore test Storage bytes separately and reconfigure external services as needed.
There are no generated down migrations or automated destructive rollback. Migration
repair changes tracking records, not SQL/schema/data, as documented in the
[CLI reference](https://supabase.com/docs/reference/cli/supabase-migration-repair).
Never repair history merely to silence a failed preflight. Any production release
requires separate authorization, target review and recovery proof; these tools
have no production mode.

## Auth and enrollment configuration

- Read-only checks confirmed email signup is enabled and confirmation is required.
  Review callbacks for the actual app origin, including onboarding invitations and
  `/reset-password.html`. Real mailbox delivery remains unverified; no SMTP
  configuration change has been authorized. Public registration never grants
  approved enrollment.
- Bootstrap an administrator with a reviewed privileged SQL change only:
  `insert into public.academic_admins(user_id) values ('<verified-auth-user-uuid>');`
  User metadata and profile fields cannot grant staff roles.
- Existing profiles are explicitly backfilled as approved legacy enrollments;
  their progress and records remain unchanged. Email verification is still
  required. Review legacy unverified accounts before releasing this change.
- Existing legacy teacher access is retained; new invitation/self-registration
  enrollments are scoped to their assigned teacher. The admin interface reviews
  pending requests and requires an assigned verified teacher before approval.
- Teachers create persisted invitation links and share them with the intended
  student. An email-bound token expires after seven days and is stored as a
  digest. No invitation email is claimed to be sent by this code. The student's
  normal Supabase confirmation email verifies account activation.
- Role changes, course-specific enrollment, suspension administration, invitation
  resend/revocation management and automatic invitation email remain unfinished.

Set Site URL to the staging frontend and allow only required callbacks, including
the invitation query variant of onboarding. Verify that the email template preserves
the requested redirect. See [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
Keep auto-confirm disabled: [Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)
explains that disabling confirmation implicitly confirms email in the database.
Use staging-only SMTP or an approved email test setup; the built-in sender has
recipient/rate restrictions, so saved signup data is not proof of email delivery.
Test actual receipt, confirmation and expired/mismatched links with disposable
addresses. See [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and
[hosted email testing](https://supabase.com/docs/guides/auth/testing-auth-flows).
SMTP credentials, provider keys and service-role keys remain server-side.

Provision only synthetic staging identities after migrations. Create confirmed
Auth accounts through the configured staging signup/email flow; then a privileged
operator provisions teacher/admin membership using the reviewed baseline's
required columns. Never promote accounts through editable user metadata. Record
test UUIDs in a restricted test log and keep passwords, mailbox access and tokens
in environment variables or the approved secret manager, never this document.

| Account | Setup and expected access |
| --- | --- |
| Teacher A | Verified teacher; owns the test resources and assigned students |
| Teacher B | Verified unrelated teacher; cannot read A's private work/files |
| Administrator | Verified Auth user with an explicit academic_admins row |
| Invited student | Registers the invited email, confirms it and accepts A's link |
| Pending student | Self-registers and confirms; remains blocked until admin approval |
| Unrelated student | Approved under B; cannot access A's individual assignments |
| Unverified student | Confirmation unfinished; cannot use restricted academics |

Test before and after administrator approval rather than pre-approving every
student. Keep a second pending account for denial checks. The notification system
persists in-app events only. Academic notification/invitation email delivery is
not implemented; Supabase Auth SMTP sends account verification emails only.

The guarded launcher consumes `VERA_STAGING_PUBLISHABLE_KEY` and optional
`VERA_STAGING_SUPABASE_URL`, then supplies only the staging `VITE_*` values in
memory. Use that dedicated environment for preview; do not reuse `.env.local`.
These public project identifiers grant no staff role. Verify the URL's project
reference before launching, clear old browser sessions, and keep production and
staging origins separate. AI/SMTP/database/service-role secrets must never enter
frontend variables or browser bundles. See `docs/academic-ai-setup.md` for the
server-only provider configuration and its independent enablement gate.

## Local verification commands

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
```

The Node tests include actual PostgreSQL execution through PGlite with isolated
roles and data. Browser tests use Chromium, a local test API and the same actual
exercise SQL. Fixture session identities are local test identities, not live
Supabase Auth sessions. Install the test browser with
`npx.cmd playwright install chromium` when required. The browser harness is in
`tests/browser/` and is not part of the production Vite build.
Latest full Node run: **357/357 passed**; final focused correction/workflow run:
**23/23 passed**. Browser evidence covers **33 unique cases**: 31 passed the full
run, then all **7 affected exercise/attachment cases passed** after fixing the
autosave/status race and using reliable native drag pointer movement. Five overlap
earlier passes; there has not been one complete clean 33-case run. Fixture tests
do not establish live Auth/email/Storage. Separate actual staging evidence now
verifies teacher/student enrollment and exercise creation, preview, publication,
saved progress, objective retries, optional private upload/exact-byte download,
review/release/history, recipient notifications and student authorization denials.
Post-0023 teacher/student sessions confirm long private feedback, idempotency and
preserved released feedback. Evidence: local .temp/exercise-experience/. AI,
recovery emails, Voice and the remaining live release matrix are unverified.

## Authenticated staging release gate

Use authorized disposable teacher, administrator, student and unrelated student
accounts; never test by changing real student submissions. Verify:

1. Teacher logs in; ordinary users cannot impersonate staff or approve enrollment.
2. Create an invitation link. Register its intended email, confirm the email and
   accept; mismatched, expired and reused-for-another-account tokens fail.
3. A separate self-registration stays pending. Direct queries to academic tables,
   owner-executed student views and private Storage downloads are denied.
4. Administrator approves the verified account with its teacher. Academic access
   then works; another teacher cannot inspect its academic profile or assign it.
5. Upload realistic Word, PowerPoint, Excel, PDF and permitted media files. Verify
   bytes downloaded from Storage and authorized signed URLs, MIME types, 10 MiB
   limit and denied unrelated-student/teacher access. Inspect actual remote
   storage policies: older policies allowing every teacher broad material reads
   must be reviewed rather than assuming local tests validate the live project.
6. Create, save, reopen and preview an exercise. Publish to selected students and
   confirm assignment records and student visibility. Test revoked/unpublished,
   future availability, deadline, invalid-content and unauthorized assignment paths.
7. Submit as the assigned student, including a retry after an interrupted response.
   Check one saved response, original question snapshot, attempt limit, completed
   assignment and unrelated-student denial. Inspect the actual response as teacher.
8. Save feedback draft, verify student cannot see it, explicitly release it, then
   verify the student can read it. No grades are released automatically.
9. Configure AI only using `docs/academic-ai-setup.md`. Verify default-disabled,
   absent/revoked consent, unrelated teacher denial, quotas and provider failure
   before making one authorized test request. Teacher edits/approves a draft;
   only an approved exercise can be opened in Studio for explicit publication.
10. Verify disabled/optional/required attachment modes, upload confirmation,
    submitted byte downloads and teacher review. An allowed revision must keep
    earlier files; an interrupted retry must create neither duplicate responses
    nor duplicate file sets. Deny pending/unrelated accounts and raw-table writes.
11. Generate a real learning recommendation only with configured authorized AI.
    Import it, edit objectives, save, approve and reopen the student-specific plan.
    Create a successor and confirm the old approved content and completion history
    survive. With AI absent, generation controls must stay disabled.
12. Generate/review/approve a challenge, publish once to selected students, verify
    delivery and recipient-only notification, submit a student response, save
    private feedback and explicitly release it. Repeated publication requests
    must not create duplicate assignments. Confirm Inbox reply persists.
13. Create and preview a final with a 100-point rubric and shared supporting
    materials, assign it and submit as the student. Save a private evaluation,
    confirm grade/feedback remain hidden, publish results and verify the result
    notification. A new private revision must preserve the prior published result.

Review frontend build and these staging results before requesting production
approval. AI function deployment, provider configuration, email delivery and
Supabase authenticated browser verification remain external release steps.
## Compatibility and ownership review

0015 retains assigned/global student access to legacy unowned files, but staff
review of unowned metadata requires administrator membership. Teacher-owned
material paths must start with the owner teacher UUID; mismatched legacy paths
need reviewed correction. No object or academic row is deleted by these policies.
0016 closes broad teacher feedback/challenge permissions while preserving legacy
null-owner feedback through the prior approved teacher/student scope. New records
require explicit ownership; students cannot forge a reviewed challenge response.
0017 restricts Inbox access to participants and the authorized teacher of a student
self-thread. Student self-threads remain compatible; direct messages to a teacher
also require that teacher to have a profile under the existing recipient FK.

After all migrations, test both Inbox directions, unrelated-teacher/student denial,
message spoofing denial, and verified read status. In-app saved messages are not
email-delivery receipts.

0018 adds a separate private `academic-submissions` bucket. Test actual optional/
required uploads, metadata confirmation, revisions, signed downloads and ownership
denials; a local Storage double does not establish remote byte persistence. Verify
both private buckets and their 10 MiB limits using authorized staging accounts.
0019 requires approved immutable learning-plan versions and conflict-safe objective
updates. 0020 requires reviewed AI challenge content, actual selected-student
assignments, duplicate-safe responses and explicit feedback release. Verify
recipient-only persisted notifications for assignments, calendar changes, Inbox and
released feedback; no academic email is implied. 0021 requires private grading
revisions and explicit final-result publication before students receive grades or
result notifications. Test all of these with synthetic teacher A, unrelated teacher
B, admin, assigned/group students, unrelated student, pending and unverified users.
Only a reviewed privileged staging operation may provision teacher/admin rows.

## Explicit staging approval inputs

The user approved the exact 22-file initialization digest above and separately
approved its default-privilege supplement for `duinvkphfnugoyvvlbbq`. All 23 files
are applied and the live preflight is clean. Preserve the
approved plan's empty-state and recovery limitations; do not infer authorization
to reset a project, change SMTP, copy production data, enable AI, send academic
emails or deploy production. Production remains blocked pending separate review
and explicit approval.

AI has separate client and server switches. `VITE_ACADEMIC_AI_ENABLED` defaults off;
set it to `true` for the staging frontend only after the server provider is
configured and its authorized test behavior has been verified. The server's
`ACADEMIC_AI_ENABLED` switch is independent and also needs explicit staging setup.
No provider/admin/SMTP secret may use a `VITE_` variable. Keep both AI switches off
until consent, quotas, provider failures and the real test-account release gate
have been reviewed according to `docs/academic-ai-setup.md`.

## Production release gate ? 2026-11-10

Use [production-release-plan.md](production-release-plan.md) and its checksum manifest, not the empty-staging initialization. Production database/Auth and all 14 Storage objects have verified encrypted backups outside the repository. DPAPI recovery requires the originating Windows profile; full platform restore remains untested. No paid Supabase plan is required. Production SQL, application publication and any recovery action require the explicit scope described in that plan. VERA_PRODUCTION_CA_PEM expects certificate contents, not a file path. Keep database/service-role credentials exclusively in environment variables and never in VITE_* values.
