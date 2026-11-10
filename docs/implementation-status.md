# Vera Orbis implementation status

Production release preparation updated 2026-11-10. Read-only verified-TLS inspection confirmed the missing enrollment RPC and actual production schema. The encrypted database/Auth backup and all 14 private Storage files are verified, outside the repository; full platform restore remains untested. The isolated application candidate passed 354 Node tests and production artifact checks. Exact 15-file SQL hashes, compatibility changes, deployment and recovery limits are in [production-release-plan.md](production-release-plan.md). New production supplements were rehearsed locally against actual schema DDL, not yet on hosted staging. No production SQL, account/configuration changes, push or deployment occurred. Explicit approval is still required. Unrelated revenue work and migration 0024 are excluded.

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
