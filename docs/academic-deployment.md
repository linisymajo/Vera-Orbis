# Academic workflow release and staging verification

## 2026-11-21 - Compact Students directory production redesign

The focused frontend redesign replaces oversized cards with compact rows/mobile cards, contextual actions and a seven-section student profile. Existing enrollment permissions, confirmation services and academic modules are preserved. A read-only production source check separates manual profile counters, attendance evidence, package allowance/consumption and enrollment teacher links; no real records are reconciled or changed. See docs/student-directory-redesign.md and its exact source manifest. Production deployment and final real-browser verification are pending until the release receipts confirm success.

## 2026-11-20 ? production backend deployed

The updated token passed production Edge Functions and Secrets read/write checks.
`academic-ai` version 1 is ACTIVE with JWT verification enabled. All 16 reviewed
files are unchanged; a function-local Deno map resolves only the three already
reviewed parser dependencies. All three generation flags are false; unrelated
secret digests and Vera Voice were preserved. No SQL was replayed and no provider
call, billing change or account change occurred.

Verification: 13 hosted HTTP/management checks, 22 focused Node tests and four
actual Deno synthetic parser checks passed. A fresh encrypted backup covers 89
database/Auth tables and all 32 private Storage objects. Full restore remains
untested. Positive hosted teacher extraction and authenticated production browser
E2E remain unverified because no authorized test login was available.

The existing frontend material readiness switch is being activated through the
existing Pages workflow; generation stays disabled. Confirm final workflow and
public flag verification in the release receipt.
See [backend activation](unified-academic-backend-production.md). Earlier entries
below are historical and superseded by this update.


## 2026-11-19 ? LIVE production academic activation

Production commit `8bd92c0bd640f5f907ab285e0f9b2f3f5898b952` is LIVE through
[the successful existing Pages workflow](https://github.com/linisymajo/Vera-Orbis/actions/runs/44573920717).
The deployed assets confirm context readiness true, document processing false
and AI inference false. 38 public-site/browser access-gate checks passed.
Reviewed migrations 0028 and 0029 are committed with 255 checks and preservation
of existing application/Auth/Storage rows. Eight further production read checks
passed, including actual scoped academic/material records and anonymous RPC
denials through PostgREST. A 19-check synthetic production SQL workflow passed
and rolled back all fixture writes. 50 focused Node tests and four Chromium
workflows passed locally. Full production teacher/student browser login remains
unverified; no authorized test session was available.

The verified encrypted backup contains 85 pre-migration database/Auth tables and
all 32 private Storage objects. `academic-ai` currently returns 404; deploying
the reviewed package is blocked before any secrets write by Management API HTTP
401. The UI disables document processing without blocking academic review,
manual/deterministic planning, approvals, publication or Journey links. No
provider calls, account changes, Voice changes, staging replay or billing changes.
See [current activation details](unified-academic-production-activation.md).
Earlier entries below are historical and superseded by this result.


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

## 2026-11-18 ? integrated academic frontend release

The existing Teacher Dashboard now integrates student context, versioned plans and
lesson-to-Exercise Studio handoff. The Student Platform adds published lesson
Journey flip cards without replacing Language Passport or existing 3D navigation.
The compatible production frontend keeps VITE_ACADEMIC_CONTEXT_READY=false until
the exact new SQL/function release is approved and verified; manual planning and
published Journey cards use existing RLS-protected data. No contextual inference
or paid billing is activated.

Verified this run: 60 focused Node tests; eight distinct Chromium workflows
(two initial local timing failures passed on targeted rerun); guarded production
build; real staging teacher/student Auth, private PPTX upload/download, actual
local extraction saved in staging, seven-class private draft editing/approval/
publication/versioning; ten additional real staging Journey fallback checks,
including preservation of audited teacher completion after a student self-toggle.
Mocks exist only in the local test driver; no external provider calls occurred.

Staging 0028 was applied with its approved hash and existing rows preserved.
Its Edge package deployment stopped before execution on management HTTP 401.
0029 is tested locally and awaits exact staging approval. New hosted Journey
resource-link workflows and fresh unrelated-account authorization checks remain
unverified: no suitable unrelated hosted fixture is available. Production already
has 0025/0026/0027; only 0028 and 0029 are proposed, not applied.

Fresh encrypted production backup verified outside Git: 85 database/Auth tables
and all 32 private Storage objects, source hashes and unchanged inventory. A full
platform restore remains untested. The frontend candidate is based on current
main 1592da5 and uses only the existing Pages workflow.

Exact remaining release: [unified-academic-production-release.md](unified-academic-production-release.md).
Staging supplement: [personal-journey-staging-plan.md](personal-journey-staging-plan.md).

---

Earlier status/verification history follows.

Final local validation: **109 focused Node tests and seven distinct Chromium
workflows passed** (three new Unified Academic scenarios plus four Architect/exercise
regressions). New contextual inference uses explicit mocks only; document parsers,
PostgreSQL/RLS, persistence and browser interactions are real local implementations.
Deno checking and the guarded staging build passed. No hosted 0028/runtime or live
contextual provider verification is claimed.

2026-11-14 **Unified Academic AI 5.0 implemented locally in the existing Teacher Dashboard.**
Learning Plans, Exercise Studio and student dossiers share authorized academic context
review, source exclusions/annotations and provider-disabled states. Actual parsers
extract PDF/DOCX/PPTX/XLSX/text locally; scanned PDFs report OCR required. Changed
material/source fingerprints require reprocessing/review. The 12-total/5-completed
fixture persists seven editable lessons with reordering, private approval and
explicit publication. Actual submitted responses and released historical feedback
are included; private feedback drafts are excluded. Exercise suggestions become
existing Studio cards with accepted variants, explanations and persisted sources.
Gemini is preserved; an alternative provider adapter is implemented but NOT live
verified or enabled. Mock inference is confined to tests, never a production mode.

Hosted verification requires the pending revision-2 staging approval for 0028 and
academic-ai; no SQL or deployment has run. The fresh encrypted staging DB/Auth
backup passed archive/table-count verification for 87 tables outside Git; external
Storage bytes are separate and full platform restore remains untested. Existing
production, Vera Voice, accounts and billing were not changed. Production activation
still requires provider eligibility/processing/minor/consent/spending approval and
a new exact production release. See [implementation and evidence](unified-academic-ai.md)
and [current staging approval plan](unified-academic-staging-plan.md).


2026-11-12 **Privacy-minimized Gemini revision 4 verified in staging.** Server-only
allowlisting sends fixed generic pedagogy only; no identity, records, private text
or saved lesson content reaches Gemini, including regeneration. Adult teacher
eligibility requires administrator registry + verified Auth/teacher membership.
Staging remains restricted to synthetic fixtures. A real 12-class English B1 draft
and single-lesson replacement passed 20 hosted workflow checks; five additional
hosted denial checks, nine actual Dashboard/Platform Chromium checks, two local
Chromium tests and 56 focused Node tests pass. Existing plans/history preserved.
Fresh encrypted production database/Auth backup and all 21 private Storage objects
verified outside Git through read-only operations; full platform restore untested.
**Production activation remains blocked:** the founder confirmed students under 18
are admitted; adult teacher controls do not resolve Google's API Client restriction.
No production application/schema/secret changes, Vera Voice or billing changes.
Exact twenty-file release proposal, backup and rollback:
[learning-architect-production-activation.md](learning-architect-production-activation.md).
This entry supersedes earlier synthetic-only implementation/release summaries.


2026-11-12 Architect update: staging 0025 and 0026 are applied with matching
checksums. academic-ai with the official Gemini SDK is deployed to staging and
passed real twelve-class English B1 generation, single-lesson regeneration,
editing/save/version/approval/publication and real Dashboard/student rendering.
20 live workflow and 9 browser checks passed; 54 focused tests passed. Production
was checked read-only and lacks 0025/0026. Production files are prepared but no
production AI changes or billing changes were performed; real-record Free Tier
privacy must be resolved before activation. See the exact scope and evidence in
[learning-architect-production-activation.md](learning-architect-production-activation.md).

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

The three production supplements passed the separately authorized hosted staging rehearsal on 2026-11-10. All eight checks passed; the transaction was rolled back and before/after fingerprints matched. This grants no production or publication authorization. The frozen candidate commit remains d6f8e4b4e9e82372313c159e15df8b75f61d39c5; its embedded preparation documents predate this rehearsal, so the shared workspace release plan records the latest approval evidence.

### Approved production release completed ? 2026-11-10

The exact 15 SQL files committed atomically after 92 checks and a fresh verified database/Auth/14-object encrypted backup. Existing rows, Auth users and Storage objects were preserved. Commit d6f8e4b4e9e82372313c159e15df8b75f61d39c5 deployed successfully through existing Pages run 42865365816 to https://veraorbis.studio/. Live checks: 121 passed, 54 file hashes verified, 12 unauthenticated desktop/mobile browser views passed. Enrollment RPC exists in PostgREST and anonymous callers are denied; PGRST202 is resolved. AI remains disabled. Full signed-in production workflows, email delivery/redirects and full platform restore remain unverified. No SMTP or account changes were made. See the release plan for recovery limitations and scope.

## Learning Architect proposal ? not activated

See [learning-architect-activation.md](learning-architect-activation.md) for the exact 0025 staging SQL/hash, independent architect flags, server-only provider configuration and outstanding key/budget/deployment gates. The live production release is unchanged and AI remains off. New architect approval stays private until an explicit publication RPC; manual plan behavior is preserved. Do not replay staging initialization or unrelated 0024.

## Approved 0025 staging result and Gemini transition

The exact 0025 hash 9380a2298d40628a6e4800e236cd124eab7894973cf4fd3380823693955d0930 committed only in duinvkphfnugoyvvlbbq after an encrypted archive verification matching 85 table counts; 102 migration checks and 18 actual staging Auth/RPC workflow checks passed. Provider transport was explicitly mocked through the official Google SDK; zero real Gemini calls. Existing data/manual plans/history were preserved; consent restored. No 0024, production, billing, hosted deployment or provider activation. Current provider/configuration and privacy gates: [learning-architect-activation.md](learning-architect-activation.md).

Final Gemini local validation: 368 Node tests passed; four official-SDK focused tests passed; five unique Chromium workflows have passing evidence across the combined run and the targeted manual-plan rerun after font-load isolation. Updated local staging artifact verified. This does not constitute a real Google response or a hosted Edge deployment.

## 2026-11-20 - Approved student management production release

The user approved manifest f03e82c0055fef9bb707eb7834d9bfd1c0c9465104a2020ede643407baf642e0, SQL 0030/0031 and the exact founder administrator bootstrap. All three files committed in one guarded production transaction after 243 target, dependency, backup, RLS, authorization and preservation checks. Only the privately verified existing founder teacher received administrator membership. Existing academic, Auth and Storage rows were preserved; no account deletion was executed.

A fresh encrypted manual backup verified 89 database/Auth tables and 34 private objects (33,374,099 bytes), including decrypt/hash, archive counts and source rechecks. Full platform restore remains untested. student-management version 1 is ACTIVE with JWT validation. Nine hosted checks passed for administrator preview, future-class/retention blocks, student denial and foreign-origin denial. All existing academic-ai application modules and its transpiled entrypoint matched the approved hosted code after a metadata comparison warning; unrelated secret digests and disabled generation flags were preserved.

Eighteen focused Node checks passed in this release run. The two explicit frontend readiness variables are enabled only after successful SQL/backend verification. Manage Students is being published through the existing Pages workflow from the isolated approved tree. Hosted roster state/browser regression results must be checked in the final release receipt; real hosted permanent account deletion is deliberately untested. AI inference, Vera Voice and billing remain unchanged. The unrelated payment-summary view remains unresolved and excluded.

## 2026-11-21 - Live roster verification and profile renderer correction

Manage Students is live from f4d140a1b5746baaea3980c5f7354a041125ad3f (Pages run 44839975208). Real founder/Vera Test checks passed for contact/history, deactivation with Journey and private Storage denial, same-enrollment reactivation, completion/archive guards, completed/archive history preservation, removal and explicit same-teacher approval without duplicate enrollment, hosted administrator preview and student denial. Vera Test is restored to active/approved and its synthetic class is scheduled; other students received no test writes. Six expected roster events are preserved. Forty-seven public checks passed.

A read-only browser regression found a pre-existing ReferenceError in the profile Inbox renderer: formatDate was undefined when a student had stored messages, leaving the dossier loading. The frontend correction defines bounded date formatting with a safe missing-date fallback and escapes its output. The actual renderer now passes valid/legacy message cases, and all 17 focused routing/renderer tests pass. No SQL, provider, Voice, account or billing changes accompany this correction. Hosted profile and final mobile/editor checks follow publication.
