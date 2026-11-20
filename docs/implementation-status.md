# Vera Orbis implementation status

## 2026-11-20 - Authenticated production academic workflow verified

The existing founder teacher and existing Vera Test student passed real Supabase
password authentication and real browser login at https://veraorbis.studio/.
Vera Test is approved and associated with that teacher. No accounts were created,
passwords changed, or other students used for test writes.

Thirteen production workflow checks passed without browser response mocks:
private DOCX/PPTX upload and student download, hosted text extraction, authorized
context review, twelve editable deterministic lessons, draft save/reload,
private approval and explicit publication, future scheduled class and material
links, lesson-to-Exercise Studio handoff, one assignment, stored student response,
teacher-approved feedback and synchronized student Journey. Student access to
teacher context and another student's Journey was denied. Eleven future lessons
remain upcoming; submission records progress without inventing class completion.
Mobile and desktop Journey screenshots were inspected.

All inference remains disabled. No provider calls, billing changes, Vera Voice
changes, or SQL applications occurred in this verification. Templates are labeled
deterministic. Sixty-three focused Node tests pass. The frontend correction uses
the real package assignment columns through compatible aliases; a browser-global
guard also fixes the existing workspace dispatch regression test. The missing
production payment-summary view is a separate, unresolved finance integration;
payment history is not included in the successful academic E2E claim.

New student-management migrations 0030 and 0031 remain local, unapplied proposals.
No account deletion was run. Earlier entries reporting unavailable production
test sessions are historical and superseded by this verification.

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


2026-11-12 scope research: the minimum proposed adult-only authoring boundary,
ready-to-send Google clarification and conditional Claude API alternative are in
[learning-architect-adult-service-proposal.md](learning-architect-adult-service-proposal.md).
Isolation is proposed, not deployed or established as compliant. Existing Gemini
and plan functionality are preserved; production remains disabled. No new tests
or technical audits were repeated for this documentation-only investigation.


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


2026-11-12 **Gemini Learning Architect works in staging with real provider responses**.
0025 and 0026 applied/checksums confirmed; canonical token and secured Gemini key
work. Fixed the reproduced Google 400 schema rejection by removing grammar-heavy
array bounds and explicitly requesting the complete course; JS/PostgreSQL limits
remain strict. Deployed academic-ai source revision 3 only to staging, JWT enabled.
Real **12-class English B1** plan generated/saved (HTTP 201; 787 input/4,692 output
tokens), then one lesson regenerated while preserving the other eleven. **20 live
workflow checks + 9 real-browser Dashboard/Platform checks + 54 focused automated
tests passed**; Deno check passed. Editing, saving, versioning, private approval,
explicit publication, mobile student rendering and old manual/history preservation
verified. Original synthetic consent restored; no real student/provider processing.
Production was inspected read-only for necessary differences: 0025/0026 are missing.
Exact seventeen-file preparation manifest/workflow patch are ready; privacy for
real records and separate production approval remain required. No production
changes, billing activation or Vera Voice changes in this AI task. Full evidence:
[learning-architect-production-activation.md](learning-architect-production-activation.md).
Earlier failed staging attempts below are superseded by this verified success.

2026-11-12 production invited-student incident **resolved after explicit approval**.
Applied the exact reviewed one-case repair only to iopgzmvaqobigjwibual: one existing
enrollment approved/assigned to the inviting teacher and its existing invitation
marked redeemed by the matching confirmed student. Verified encrypted before-images
and unchanged SQL hash before execution. **60 checks passed in the transaction**,
including preserved fingerprints across **46 tables** and unchanged fields outside
the approved update; **five independent read-only postcommit checks passed**.
Teacher Dashboard profile query now returns the student under real RLS and the
Student Platform enrollment check grants her own access. Auth/password/profile,
unrelated records, policies and deployed code were unchanged. Sixteen local tests
passed, including another teacher's exclusion (no other non-admin production
teacher was available to check). Refresh Dashboard to reload its student cache;
student retains existing credentials and still needs to complete normal initial
goals. No signed-in real-student browser verification is claimed. Evidence:
[production-invited-student-incident.md](production-invited-student-incident.md).
The approval-pending incident note below is historical.

2026-11-12 production onboarding incident takes priority over AI/visual work.
Read-only diagnosis found the sole invited account exists with confirmed email,
password and profile, but its valid invitation is unredeemed. Enrollment is
pending/self with no teacher; production RLS and get_my_enrollment reproduce the
visibility/access block. The inviting teacher is not an administrator; pending
requests are admin-only in both dashboard and RPC. Four live frontend entry assets
were inspected. Exact token-loss/redemption failure in the student's browser is
not established. Six production read-only checks and 16 local tests passed. A
minimal two-existing-row repair is prepared; encrypted before-images are verified
outside Git. **No production write has occurred; approval pending.** See
[production-invited-student-incident.md](production-invited-student-incident.md).

2026-11-11 final approved revision-2 attempt: all eleven root/staged source hashes
matched manifest 02b8eebbf839ecfe54da33772c94eed0c3742efa07251b25c89ea62236168250.
Deployed academic-ai source revision 2 to staging only (platform code version 3,
ACTIVE, verify_jwt=true); no SQL applied. Existing synthetic-only provider
configuration verified; only Architect activation flag enabled. The one additional
authorized twelve-class generation failed **502 provider_unavailable**, with no
saved result. Upstream cause remains unconfirmed. Per the explicit stop condition,
**generation disabled again and preview stopped; no retries or further deployment**.
Five hosted security checks passed afterward. Failed run has no result version;
all three pre-existing plan rows still match the encrypted backup; original test
consent restored and temporary sessions signed out. No successful live
generation/edit/approval/publication workflow is claimed. Production, Vera Voice,
billing and real student records untouched. See the latest result in
[revision 2](learning-architect-staging-revision-2.md). Older proposal/status notes
below are historical. No additional setup or approval request was issued.

2026-11-11 latest hosted result: new scoped-token access succeeded. Deployed
**academic-ai v1 ACTIVE with verify_jwt=true**, exclusively to staging
duinvkphfnugoyvvlbbq, with server-side Gemini secrets and synthetic-only allowlist.
The **one authorized real generation returned 422 invalid_architect**; no plan
was saved or published. The failed request has no result version; all three
existing plan rows match the encrypted backup and synthetic consent was restored.
Generation was explicitly **disabled after failure**. Five hosted Auth/gateway/
CORS/disabled-provider checks passed; production, billing and Vera Voice unchanged.
No successful live twelve-class generation/edit/approval workflow is claimed.
Local schema repair is prepared, **not deployed**: exact class count, language,
level, ordered stages and minute tuples, bounded lists and safe field diagnostics.
371 Node tests passed; final focused tests 17/17; clean Chromium rerun 2/2;
Deno check passed. Two deployed auxiliary files had only CRLF differences from
approved root hashes; the next package verifies all eleven staged files byte for
byte. No new SQL is proposed. A changed-source deployment and one additional
synthetic generation need new approval because the previous single attempt is
consumed. Full evidence and exact manifest:
[learning-architect-staging-revision-2.md](learning-architect-staging-revision-2.md).
Older token-blocker and activation notes below are historical.

2026-11-11 hosted activation attempt: Windows User token was found under
SUPA_BASE_ACCESS_TOKEN and privately mapped into the child process's standard
SUPABASE_ACCESS_TOKEN. Authenticated management GET confirmed the exact staging
project/name; all eleven approved manifest entries matched and no existing
functions/Academic AI secrets conflicted. The authorized secret upload returned
HTTP 403: **edge_functions_secrets_write missing**. The explicitly targeted CLI
3.1.0 deployment returned HTTP 403: **edge_functions_write missing**. Independent
management GET afterward confirmed **no academic-ai function and no Academic AI
or Gemini secrets persisted**. No real Gemini requests occurred. Synthetic-account
identity was verified with real staging Auth and its temporary session signed out.
0026 remains applied/verified from the previous step; no SQL rerun, production
connection, billing change, Vera Voice change or real-student provider processing
occurred. Required access correction: replace the token with a staging-scoped PAT
retaining existing read permissions plus Edge Functions and Edge Function Secrets
Read-write. Existing deployment approval remains valid. Local receipt:
`.temp/gemini-staging-activation-result.json`.

2026-11-11 approved staging activation progress: user approved the exact manifest,
0026, secret configuration, Edge deployment and one synthetic twelve-class Gemini
request, and confirmed IA Architecture has no linked billing. All eleven manifest
entries match. Fresh encrypted staging backup verified by decrypt/hash and full
archive extraction with **87 matching table counts**; outside Git under
LocalAppData/VeraOrbis/staging-backups/pre-0026-1794410018754. Full platform restore
remains untested; Storage bytes are excluded and unaffected by this migration.
**0026 applied only to duinvkphfnugoyvvlbbq**, exact approved SHA-256, with execution
and checksum committed atomically after **112 checks**. Existing public rows,
Auth and Storage metadata were preserved. Hosted PostgreSQL accepted twelve
classes, rejected duplicate IDs, invalid final-lesson durations, thirteen classes
and manual plans over ten objectives; validators remain private. Independent
read-only postcommit verification confirmed history/hash, preserved prior validator
and exclusion of 0024. Supabase CLI 3.1.0 is available. Deployment and real Gemini
generation remain pending solely on unavailable **SUPABASE_ACCESS_TOKEN** (neither
Windows User nor process contains it). No secret upload, function deployment,
provider generation, production connection or Vera Voice change occurred.

2026-11-11 Gemini activation preparation: privately verified the Windows User key
with Google Models GET; gemini-3.1-flash-lite accepts generateContent. No generation
or billing change occurred. Twelve-class Architect support is implemented locally;
manual plans retain their previous limit. Proposed 0026 remains unapplied and 0025
retains its approved hash. Isolated full Node regression: **370/370 passed**;
focused SDK/PostgreSQL: **16/16 passed**; Chromium: **2/2 passed**, including the
twelve-class teacher-to-student workflow with an explicitly mocked provider and
mobile screenshot inspection. No live Gemini generation or hosted Edge test is
claimed. Exact staging deployment/secret configuration and SQL approval proposal:
[learning-architect-staging-deployment.md](learning-architect-staging-deployment.md).
Supabase management access and confirmation of no linked Google billing remain
necessary. Vera Voice, production, historical records and existing visual work
were not modified by this preparation.

Gemini Learning Architect updated 2026-11-10. Reuses existing teacher/student/version flows with official Google GenAI SDK 3.0.0 and gemini-3.1-flash-lite; GEMINI_API_KEY only, server-side. Approved 0025 applied solely to staging with exact hash after a verified encrypted backup (85 table counts). Migration plus success tracking passed 102 checks and preserved existing rows/Auth/Storage metadata. Real staging Auth/REST/RLS workflow passed 18 checks with the official SDK using explicit mocked HTTP; zero real Gemini requests. Final isolated Node regression: 368 passing; focused SDK checks: four passing, including deadline/quotas/structured output/privacy gates. Guarded local staging build verified. Five unique Chromium workflows have passing evidence (four in the combined run, manual-plan navigation passed on targeted rerun after external-font isolation). Production, provider activation, billing and deployments remain unchanged. A synthetic-only allowlist/host privacy gate rejects all real production records. See [learning-architect-activation.md](learning-architect-activation.md).

Production SQL release approved and applied 2026-11-10. All 15 exact SQL files committed atomically after 92 checks; original public rows, 17 Auth users and 14 private Storage objects were preserved. Fresh encrypted database/Auth/Storage backup is verified outside the repository. Twelve actual migration versions and 15 checksums are recorded. The enrollment RPC now exists in PostgREST; PGRST202 is resolved and anonymous execution is denied. Ten API checks passed. Approved commit d6f8e4b4e9e82372313c159e15df8b75f61d39c5 is published at https://veraorbis.studio/ through successful Pages run 42865365816. Live verification passed 121 checks and 54 file hashes; Chromium passed 12 public/unauthenticated desktop/mobile route checks with no JavaScript exceptions or horizontal overflow. No signed-in production workflow is claimed. Candidate Node tests: 354 passing; hosted supplement rehearsal: eight checks with rollback; latest focused compatibility run: five passing. Full authenticated production workflows and full platform restore remain unverified. AI, SMTP and account changes remain excluded. See [production-release-plan.md](production-release-plan.md).

Updated 2026-11-10. The only authorized staging target is
`duinvkphfnugoyvvlbbq` (`vera-orbis-staging`). Direct authenticated inspection with
verified TLS first confirmed zero public application tables/functions, Auth users,
Storage buckets/objects and migration history. Email signup is enabled and email
confirmation is required.

The user approved the exact 22-file empty-staging initialization plan with SHA-256
`46a4d771b5113fc284a13bea495379f0d375d29b25edc14398aa62dc078f69f0`.
The user separately approved the hosted-privilege supplement. All **23/23 SQL
files applied successfully**. Post-apply checks confirm 19 migration-history
entries, 23 file hashes, present enrollment RPC, RLS on all public tables, zero
unsafe authenticated `TRUNCATE`/`TRIGGER`/`REFERENCES` table privileges and two
private academic buckets. Live marker-aware preflight returned
`ready_for_review:true`, no blockers/warnings and zero pending release files.
The separately approved migrations 0022 and 0023 have also applied successfully:
21 migration-history entries and 25 setup hashes. Pre-migration encrypted backup
roundtrips passed; academic row fingerprints were unchanged and all public tables
retain RLS. Three synthetic Auth accounts now exist; the teacher and invited
student are confirmed. The user confirmed receipt of the teacher signup email
and its staging callback. Real signed-in exercise workflows and private Storage
were verified as detailed below. AI is off. Production remains unchanged and
requires its own review and explicit approval.

## Implemented locally

- Enrollment RPC recovery: confirmed that local `.env.local` and the public
  production site's assets select `iopgzmvaqobigjwibual`, distinct from authorized
  staging `duinvkphfnugoyvvlbbq`. `get_my_enrollment()` is the zero-argument,
  authenticated `public`/`jsonb` function in migration 0013; the frontend's
  zero-argument call matches. The Supabase client now selects `public` explicitly.
  Default development startup requires a staging browser key and ignores `.env`
  files/inherited `VITE_*` values, keeping AI off. Existing running dev servers
  must be restarted with the guarded command.
- Enrollment failure handling: verified-session checks coalesce concurrent RPCs;
  PGRST202 failures have a 60-second per-project session cooldown. No successful
  access decision is cached. Login, student, teacher and onboarding entry points
  show an accessible service error with support code, explicit retry and sign-out;
  academic queries/invitation writes wait for a valid enrollment response. Auth
  event storms cannot continually restart a failed student-platform load.
  Account changes between Auth/enrollment reads stop downstream queries instead
  of mixing identities. Unverified staff see confirmation/resend controls before
  teacher/admin redirects, avoiding a sign-in/access-denied loop.
  The initial read-only catalog diagnostic confirmed missing staging SQL; the
  approved initialization installed it. Real teacher/student sessions now execute
  enrollment successfully on staging. Production's SQL/cache state remains unverified.
- Password recovery: a login request form calls Supabase Auth with a fixed
  same-origin `/reset-password.html` callback. The recovery page requires the SDK
  recovery event and a server-verified matching identity before updating a
  password, removes callback credentials, handles late fragment navigation,
  sanitizes failures and signs out locally after confirmed success. Real reset
  email delivery and live recovery remain unverified.
- Student attachments: disabled/optional/required settings; supported Office, PDF,
  image and audio/video files; five-file/10 MiB-per-file limits; private reservations
  and actual object-metadata confirmation; atomic answer/file submission; confirmed
  retries; teacher downloads/review. Allowed revisions preserve original bytes and
  immutable file-set history. The original submit RPC cannot bypass required files.
- Learning Plans: student-specific persistent drafts, editable objectives with
  Listen -> Repeat -> Personalize -> Use, explicit approval, immutable approved
  history, successor versions, optimistic revision checks, student approved views,
  audited completion and explicit saved-AI-draft import. Connected to the teacher
  workspace, student profiles and student platform.
- AI Challenges: persisted recommendation review/edit/approval, individual/group
  publication, duplicate-safe assignment/submission, safe student response views,
  teacher review and private/released feedback. Student writes use scoped RPCs.
- Notifications: recipient-only saved exercise/challenge assignments/submissions,
  calendar changes, released feedback, Inbox and final-result events; confirmed
  read receipts/counts. Final notifications open Finals; teacher responses open
  their review module. Student views refresh persisted data on opening. Academic
  notification and invitation email delivery remain unimplemented.
- Finals: communicative activity templates, 100-point rubrics, shared supporting
  materials, saved definitions, preview, selected-student assignment/deadlines,
  answer/attachment submissions, review, private grade revisions and explicit
  results publication. New private revisions retain the previous published result;
  assigned definitions are immutable. Finals are separate from ordinary exercises.
- Materials Studio: accessible keyboard selection/drag-and-drop batches, searchable
  recipients/library, per-file titles/statuses/retries, confirmed private uploads
  and metadata, stable IDs, exact-byte reconciliation after interrupted responses,
  private downloads and browser-session recovery. Ambiguous saves preserve bytes.
- Dashboard/navigation: six primary teacher tools with additional tools grouped;
  searchable student selector and optional card browser; secondary student views
  under More. Five-step Exercise Studio and colorful interactive exercise cards
  remain connected. New controls adapt to mobile, expose labeled controls/status
  messages and support keyboard navigation. Reduced motion uses internal student
  views. Language Passport and existing visual assets remain intact.
  Existing modules have explicit URLs from `src/lib/academicRoutes.js`: teacher
  tools use `/teacher.html?module=<module>`; student views use
  `/platform.html#<view>`. URL handling never replaces enrollment/role checks.
  Route navigation and Voice URL/session guards were tested locally; no live
  signed-in Voice or academic workflow is claimed.
- Existing enrollment, consent, scoped academic AI foundation, exercise snapshots,
  private answer keys, ownership policies, Inbox messages/read receipts, progress,
  finance and culture functionality remain in place.
- AI generation controls default off via VITE_ACADEMIC_AI_ENABLED. Server enablement,
  a configured provider, verified authorization, consent and quotas are independently
  required. Manual plans and saved-draft review work without a provider. No simulated
  production AI result is generated.

## Exercise Experience 4.0

- Shared student/teacher-preview renderer with per-question formats, accessible
  question navigation, saved progress, contextual hints/media, vocabulary flips
  and keyboard/click/drag sentence blocks. The existing 3D platform, navigation
  and Language Passport implementations were preserved.
- Teacher activity cards and five-step authoring include duplicate/reorder,
  accepted alternatives, private solutions, correction/retry/reveal/scoring
  controls and archive. Publication remains atomic and requires backend capability.
- PostgreSQL validates objective answers and attempts; correct-only retries,
  first/best/penalized scoring and release thresholds are enforced on the server.
  Open responses wait for review. Private versioned coaching has explicit release,
  stale-edit protection, idempotency and immutable previously approved history.
  Legacy feedback survives later private revisions and retains its 12,000-character
  bound. AI draft controls remain disabled until provider/consent setup is complete.
- Real staging exercise evidence: teacher creation/shared preview/publication;
  student receipt, saved progress/reload, incorrect submission and accepted-variant
  retry; delayed explanation release and first-score preservation; open-response
  submission with optional private PDF; teacher review/private draft/explicit
  release; later private revision preserving released feedback; exact-byte teacher
  Storage download; student denial of raw keys, private versions, teacher review
  and grade mutation. In-app notifications were readable by their recipient.
- Post-0023 live compatibility: a 4,951-character private revision persisted once
  under repeated requests; released history and student-visible feedback remained
  unchanged. The pre-versioning import case is verified in local PostgreSQL, not
  fabricated on staging. Teacher and student desktop/mobile screenshots were
  visually inspected. Evidence and screenshots are local under
  .temp/exercise-experience/; backups are encrypted outside the repository.

## Verification evidence

- `npm.cmd test`: latest full checkpoint passed **357/357** tests, including
  recovery, routes/Voice guards, enrollment failures, isolated staging tooling and
  actual PostgreSQL execution.
- Actual migration SQL executes in disposable PGlite PostgreSQL with isolated roles:
  required-file bypass denial, Storage metadata/RLS, immutable file revisions,
  plan history/concurrency, authorization, challenge idempotency, transactional
  notifications, private final assessments and explicit release. Existing legacy
  data-preservation and policy-replay checks remain covered.
- Chromium: **33 unique cases** have passing evidence: the full 33-case run
  passed 31 and exposed an autosave/status race plus inconsistent native drag
  simulation. After correction, **7/7 affected exercise/attachment cases passed**
  (five overlap earlier passes). This is not a claim of one clean 33-case run.
  The required-file regression delays a real SQL autosave response and proves
  submission errors remain visible; native dragging uses two pointer moves.
  An additional **23/23 focused Node checks** passed after the final UI changes.
  The academic workflows cover
  existing exercise/matching; optional/required/disabled files and teacher byte
  downloads/revisions; plan versions/objective history; final assessment creation,
  assignment, submission/private grading/release; challenge publication, feedback
  and notifications; DOCX/PPTX Materials Studio batches/search/downloads.
  The production navigation regression executes the actual student navigation and
  challenge submit handlers: internal/floating academic mounts, notification Open,
  visible-form selection with duplicate IDs, and refreshed persisted responses.
- The 15 enrollment Chromium cases execute actual login/student/teacher/onboarding
  HTML and entry handlers with isolated synthetic Auth/REST transport. They verify
  missing-RPC recovery, Auth-event storms, reload/navigation cooldown, explicit
  retry, pending/unverified denial, server-approved recovery, project separation,
  sign-out, account-switch races before/after invitations, all teacher/admin
  confirmation-gate combinations and pending/unverified invitation preservation.
  Every nonlocal/nonfixture origin is aborted; no real Supabase request is used.
- Four recovery Chromium cases use the installed Supabase SDK and intercepted
  synthetic Auth endpoints: conditional reset requests, verified callback/update/
  local sign-out, unconfirmed-update denial, and expired/ordinary/late callback
  cleanup. Those results do not establish live email delivery or real sessions.
- Browser identities are local fixtures, not Supabase Auth sessions. Local adapters
  transport sample bytes and signed-download tokens. Separate live exercise
  evidence above verifies actual private Storage for the authorized synthetic
  teacher/student accounts. Test challenge recommendations are explicitly seeded
  fixtures, never claimed as AI output. No real student academic data were used.
- Latest verified isolated staging build: `.temp/staging-preview/build-DiStof`.
  Guarded development preview: `http://127.0.0.1:5173`; actual staging exercise
  sessions were verified there separately. AI is disabled; no hosting deployment
  occurred. The artifact verifier checks browser configuration and files, not
  backend integration; live checks are recorded independently above.
  GitHub Pages main/manual deployment paths still target production and public
  `CNAME` is `veraorbis.studio`; no isolated hosted preview exists yet.
- Staging dev startup without `VERA_STAGING_PUBLISHABLE_KEY` was checked directly:
  it refused before starting Vite despite the existing production env file. The
  exact reviewed migration manifest still verifies; no migration SQL was changed
  by the enrollment repair.
- 2026-11-09 staging preparation: 24 targeted tests passed (9 existing preflight,
  8 new pinned marker-free inspection, 7 deterministic fixture generation). Actual
  local PostgreSQL proves read-only metadata inspection, owner/FK/unique/function/
  view checks, secret exclusion and unchanged post-setup marker guards. The new
  inspector itself never grants migration approval. Subsequent root-operated
  read-only staging inspection confirmed the originally empty target before the
  approved application; the final live preflight now has no pending files.
- Ten synthetic fixture artifacts were generated and hash-verified under ignored
  `.temp/staging-fixtures/duinvkphfnugoyvvlbbq`: Office documents, two response PDFs,
  image/audio format samples, manual academic data, actor aliases and manifest.
  The account manifest contains environment-variable names, not passwords/emails
  or invented Auth identities. No staging account or academic record was created.
  Windows User variables now contain the eight synthetic actor email/password
  pairs, project/public-key inputs, `VERA_STAGING_TEST_RUN_ID`, app origin and
  public CA PEM. Their values are private. No Auth accounts, roles, academic
  records or emails have been created; the user must open real confirmation emails.

## Reviewed migrations

The approved 22-file plan and separately approved privilege supplement are now
applied, 23 files in total. The plan is a new repository-derived baseline for this
initially empty staging project, not a recovered production
schema. Its ordered setup and checksum manifest are recorded in
`scripts/staging-initialization.reviewed.json` and
[staging-approval-plan.md](staging-approval-plan.md). Its planning flags remain
fail-closed; the user's approval is a separate recorded decision. The table below
describes the 0011-0021 release portion only.

| Migration | Purpose/dependency |
| --- | --- |
| 0011 | Extend existing materials MIME types; requires 0005 bucket |
| 0012 | Exercise transactions/snapshots/feedback; 0004 and original Auth/profile/teacher schema |
| 0013 | Enrollment/invitations and restrictive access; replaces 0012 transitional helpers, requires academic/calendar/Inbox baseline |
| 0014 | Consent/context/quotas/private AI drafts; 0013 plus academic tables |
| 0015 | Material row/folder ownership and enrollment; 0005/0013 |
| 0016 | Feedback/challenge/submission ownership; 0009/0013 |
| 0017 | Inbox participant scope/read receipts; 0010/0013 |
| 0018 | Private submission files, atomic submission/revisions; 0012/0013 |
| 0019 | Versioned learning plans/objective history/current-plan AI context; 0014 |
| 0020 | Challenge publication/review and transactional notifications; 0014/0016/0017 and calendar tables |
| 0021 | Final definitions/private result revisions/publication; 0012/0013/0018, with 0020 notifications |

Apply only reviewed pending files in order. Never replay older definitions over
newer ones: 0013 replaces access helpers, 0018 makes the old answer validator
private, and 0019 updates AI retrieval. The reviewed SHA-256 manifest is
scripts/staging-manifest.reviewed.json. Changed SQL needs a reviewed replacement.
The applied `supabase/staging/client_privilege_hardening.sql` supplement closes
the hosted default-ACL privileges that RLS alone does not protect. No reset or
automatic rollback is authorized. Local restore tools are unavailable and platform restore
capability remains unverified, as disclosed in the approved empty-staging plan.

## Staging gate and remaining work

1. Retain the original empty-target inspection, both approvals, exact file hashes,
   23-file application receipt and clean live preflight. Do not replay the chain.
2. Provision only the authorized synthetic accounts, confirm actual emails and
   bootstrap exact verified staff UUIDs before testing user-session permissions.
3. Use the authorized controlled mailboxes and require actual user confirmation
   of delivered emails. Verify signup, resend, password recovery and callback
   redirects. No SMTP configuration change has been authorized.
4. Run the authenticated staging release gate: Office bytes, exercises/files,
   teacher review, real AI only when configured/consented, plan approval/history,
   challenge delivery/notifications, released feedback and Inbox reply, finals and
   results, plus direct API and cross-account authorization denials.
5. AI function deployment/provider activation and academic email need their own
   configured, authorized setup. Production remains a separate explicit approval
   after staging evidence. This work does not authorize production deployment.

Runbook and exact inputs: [academic-deployment.md](academic-deployment.md).
Candidate migration list/approval status: [staging-approval-plan.md](staging-approval-plan.md).
Synthetic accounts/data and acceptance matrix: [staging-test-fixtures.md](staging-test-fixtures.md).
Storage limits/evidence: [storage-deployment.md](storage-deployment.md).
AI secrets/consent/setup: [academic-ai-setup.md](academic-ai-setup.md).
Enrollment contract, target evidence and conditional deployment actions:
[enrollment-rpc-deployment.md](enrollment-rpc-deployment.md).

Outside this increment: invitation resend/revoke management, course enrollment and
suspension administration, automatic invitation/academic email, Inbox attachments
and full message threading. Real AI generation, academic email, password-recovery
mail delivery, platform restore and the complete cross-account staging acceptance
matrix remain unverified. Live exercise Auth/Storage and teacher confirmation
email have the narrower verified evidence recorded above.
