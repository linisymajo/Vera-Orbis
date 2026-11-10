# Synthetic staging verification fixtures

Prepared locally on 2026-11-09. The offline file generator below is implemented;
account provisioning and remote verification remain designs awaiting approval.
No accounts, emails, records, files, roles or configuration have been created or
changed remotely by this preparation.

The only permitted remote target is staging project **`duinvkphfnugoyvvlbbq`**.
Production and every other project are excluded. Before any migration, the operator
must review the staging baseline/preflight results and obtain the user's explicit
approval of the exact pending migration plan. Provisioning accounts, sending test
confirmation email and creating fixtures wait until that gate and their authorized
configuration are satisfied. This document does not grant that approval.

Use [academic-deployment.md](academic-deployment.md) for baseline/manifest review
and [academic-ai-setup.md](academic-ai-setup.md) for the existing AI boundaries.
Existing local Chromium identities, SQL fixtures and byte transports are not
staging accounts or evidence of working Supabase Auth, email or Storage.

## Inputs supplied privately after approval

Do not discover credentials in existing projects, inspect credential stores, reuse
production keys or put values in source, chat, command arguments or committed
reports. These names are proposed operator inputs, not newly implemented tooling:

| Environment input | Purpose |
| --- | --- |
| `VERA_STAGING_PROJECT_REF` | Must equal `duinvkphfnugoyvvlbbq`; no fallback target |
| `VERA_STAGING_PROJECT_NAME` | Independently confirmed staging name; the current preflight expects `vera-orbis-staging`. Resolve any mismatch before using its guard; do not rename/stamp a project to bypass it |
| `VERA_STAGING_URL` | Exact HTTPS project API origin for this staging reference |
| `VERA_STAGING_PUBLIC_KEY` | This staging project's browser-safe public key; authenticates no privileged role by itself |
| `VERA_STAGING_APP_ORIGIN` | Reviewed HTTPS staging frontend origin, with working Auth confirmation redirects |
| `VERA_STAGING_FIXTURE_RUN_ID` | Stable unique synthetic run identifier, for example `vo-stage-20261109-<random>` |
| `VERA_STAGING_FIXTURE_LEDGER_PATH` | Restricted operator-local ledger outside published/committed artifacts |
| `VERA_STAGING_<ALIAS>_EMAIL` | An authorized, operator-controlled test mailbox for the actor aliases below; no real student addresses |
| `VERA_STAGING_<ALIAS>_PASSWORD` | A different strong test password for each actor; never a default or a public fixture constant |
| `VERA_STAGING_EMAIL_CONFIRMATION_MODE` | `manual` initially: operator opens actual confirmation messages from the controlled mailboxes |
| `VERA_STAGING_MAILBOX_API_URL`, `VERA_STAGING_MAILBOX_API_TOKEN` | Optional, only if a specific test-mail service and automated mailbox access are separately approved; otherwise absent |
| `VERA_STAGING_OPERATOR_SECRET_KEY` | Optional privileged staging-only operator credential for explicitly approved bootstrap/cleanup operations. Never supplied to the browser, AI function or normal workflow tests |
| `VERA_STAGING_DB_URL`, `VERA_STAGING_CA_PEM` | Existing preflight inputs only when required by its approved connection procedure; its read-only mode is not authorization for fixture writes |

Keep `ACADEMIC_AI_ENABLED=false` and `VITE_ACADEMIC_AI_ENABLED=false`. Do not
configure a provider key or enable generation to make a blocked workflow pass.
Normal browser tests use real user sessions and the public key, so a privileged
operator credential cannot conceal broken RLS.

Auth confirmation must be enabled in the reviewed staging configuration. Create
accounts through the real registration flow and open real delivered confirmation
links. Do not auto-confirm accounts, set `email_confirmed_at`, mint replacement
JWTs or trust editable `user_metadata` roles. A missing message/redirect is a
recorded email blocker, not a reason to bypass confirmation. Invitation creation
currently yields an application link; automated invitation email delivery has not
been implemented. Use an approved controlled handoff of that link and distinguish
it from the separate Auth confirmation email.

## Actor manifest

All names, goals and responses are synthetic. Each row uses its own mailbox and
password inputs. Actor aliases map to returned Auth UUIDs only after creation.

| Alias | Proposed setup and expected access |
| --- | --- |
| `ADMIN` | Email-confirmed synthetic administrator. Bootstrap its exact UUID into administrator membership only through the separately approved privileged step; no metadata-based elevation |
| `TEACHER_A` | Email-confirmed teacher, owning the exercise/material/plan/challenge/final fixtures |
| `TEACHER_B` | Separate confirmed teacher for cross-teacher read/write denial checks |
| `INVITED` | Initially no Auth account. Teacher A creates the invitation first; the student registers, confirms email, then accepts it. Becomes group A member 1 |
| `STUDENT_A2` | Self-registers and confirms email. Admin explicitly approves enrollment with Teacher A. Becomes group A member 2 |
| `PENDING` | Self-registers and confirms email, but stays pending throughout negative tests; no private academic access |
| `UNVERIFIED` | Registers, but its actual confirmation message remains unopened during the negative test. Do not fabricate an unverified user session if Auth correctly refuses login |
| `STUDENT_B` | Confirmed and explicitly approved under Teacher B. An unrelated student for every Teacher A resource |
| `SUSPENDED` (optional) | Separate confirmed synthetic account, suspended only by an explicitly approved fixture-state operation. Useful for rejecting an already issued user session; this does not claim a suspension administration UI exists |

Group A is exactly `[INVITED, STUDENT_A2]`; it does not mean all profiles. Teacher B
and Student B own a small independent exercise/material fixture so denial tests
can run in both directions. Admin membership does not imply access to every
teacher's private Storage folder. Never modify or adopt an existing account just
because its email resembles a fixture address. If an account is not recorded as
created by this run, stop for review instead of resetting its password or role.

## Files and academic data

Generate or verify the actual local files with:

```powershell
# Default: plan only, no file writes or connections.
node scripts/staging-fixtures.mjs
# Explicit local write into the ignored .temp/staging-fixtures/<ref> directory.
node scripts/staging-fixtures.mjs --write --project-ref duinvkphfnugoyvvlbbq
node scripts/staging-fixtures.mjs --verify --project-ref duinvkphfnugoyvvlbbq
node --test tests/staging-fixtures.test.mjs
```

The generator reads no environment values or secrets and makes no network calls.
It creates deterministic DOCX/PPTX/XLSX, two PDFs, PNG, WAV, actor aliases with
environment variable **names** only, manual academic JSON and a hash manifest.
Actor Auth IDs remain null. Identical reruns keep existing files; changed/unknown
files, alternate targets, custom output paths and symbolic links/junctions stop
the write. It never deletes files or overwrites different bytes. Its manifest
is a local artifact integrity record, not an account/migration approval receipt.

Every generated file gets its exact byte length and SHA-256 recorded **before**
upload. Store only synthetic content. Retain downloaded hashes as evidence from
the actual staging Storage API; local test doubles do not satisfy this check.

| File alias | Format and content | Verification |
| --- | --- | --- |
| `WORD` | Small DOCX OpenXML package: a personal greeting and Listen → Repeat → Personalize → Use prompts | Correct Office MIME type; exact upload/download hash |
| `SLIDES` | Small PPTX OpenXML package with a communicative first-meeting slide | Correct Office MIME type; exact upload/download hash |
| `SHEET` | XLSX with a small synthetic expressions list | Optional extra coverage for the permitted Excel MIME type |
| `RESPONSE_V1`, `RESPONSE_V2` | Two distinct valid one-page PDFs containing a synthetic student's original/revised response | Required/optional submission modes; exact bytes; immutable previous revision |
| `IMAGE` | Generated PNG containing no person or personal data | Permitted image handling |
| `LISTENING` | Generated PCM WAV with a known short tone/silence, labeled as a format fixture rather than spoken instruction | Permitted audio handling; no claim of generated speech |
| `EMPTY`, `OVERSIZE`, `UNSUPPORTED`, `MIME_MISMATCH` | Zero-byte PDF; 10 MiB + 1-byte file; harmless dummy `.exe`; mismatched extension/browser MIME | Rejection without a success state or persisted academic submission |

Pure DOCX/PPTX package generators already exist in
`tests/browser/sample-documents.mjs`. PDF/WAV/XLSX sample construction is present
in the local tests; a future provisioning script should extract the needed pure
generators rather than importing a `.spec.mjs` file, which would register tests.
These files exercise format handling and byte preservation; they do not certify
full Microsoft Office interoperability. Any video or legacy-file extension test
needs an independently reviewed synthetic file; do not rename unrelated bytes
and describe them as a valid media document.

Proposed entity aliases, each tied to this run's captured IDs:

- `MATERIAL_WORD_A` and `MATERIAL_SLIDES_A`: Teacher A → INVITED only, so unrelated
  student/teacher access can be denied. Add a separately labeled group-shared
  resource when testing both Group A members.
- `EXERCISE_A`: one communicative multiple-choice question and a personal response
  activity. Keep answer keys/explanations private. Assign only selected Group A
  students, with a reviewed future deadline and stable submission request IDs.
- `EXERCISE_OPTIONAL`, `EXERCISE_REQUIRED`, `EXERCISE_NONE`: explicit attachment
  modes. Enable file revision only on the optional fixture.
- `PLAN_A_V1`, `PLAN_A_V2`: manual learning-plan versions with a practical
  introduction objective, measurable success criterion and all four methodology
  stages. Preserve the first approved version and completion event history.
- `CHALLENGE_MANUAL_A`: clearly labeled, manually authored synthetic weekly
  challenge for downstream student/feedback/notification tests while AI is off.
  Create it through an available authorized teacher workflow or an explicitly
  approved teacher-session insert. It is not an AI recommendation and cannot
  close the blocked AI-to-publication acceptance step.
- `FEEDBACK_PRIVATE`, `FEEDBACK_RELEASED`, `INBOX_A_STUDENT_REPLY`: meaningful
  synthetic feedback and a two-way teacher/student exchange; no real recipients.
- `FINAL_A`: separate copied activity, visible criteria totaling 100 points,
  supporting material already accessible to its assignee, future deadline,
  private scored review and explicit result publication with revision history.

Do not fabricate successful provider requests or seed purported AI-generated
drafts to work around disabled generation. A provider-free static fixture must
remain labeled manual/synthetic and must not be reported as an AI result.

## Acceptance evidence for the user's 16 flows

Every row is **not remotely run** at preparation time. Record actor alias, exact
resource IDs, expected/observed response and a sanitized artifact reference. A
denial needs both the failed access and confirmation that no mutation occurred.

| # | Workflow and fixtures | Required staging evidence |
| --- | --- | --- |
| 1 | Teacher invites student: `TEACHER_A` → `INVITED` | Persisted invitation ID, expected recipient/expiry, controlled application-link handoff; no claim of automated invitation delivery |
| 2 | Invited student registers/activates: `INVITED` | Actual signup, delivered Auth message, working confirmation redirect, acceptance and approved Teacher A enrollment; replay/wrong recipient rejected |
| 3 | Self-registration stays restricted: `STUDENT_A2`, `PENDING`, `UNVERIFIED`, `ADMIN` | Pending/verification gates deny private content; admin approval explicitly chooses Teacher A; only the approved, confirmed account gains access |
| 4 | Teacher uploads PPTX/DOCX: `WORD`, `SLIDES` | Real Storage object plus persisted material row, private bucket, 10 MiB limit, assigned student retrieval and byte-identical downloads; denied unrelated readers |
| 5 | Create/publish exercise: `EXERCISE_A` | Saved draft ID, sanitized preview, selected students, atomic publication and unique assignments; failed selection does not partially publish |
| 6 | Student receives/completes/submits: Group A | Authorized student view with no answer key, complete answer validation, persisted attempt ID and idempotent retry; another student's assignment unavailable |
| 7 | Optional file submission: attachment fixtures | Actual upload reservation/Storage metadata confirmation and attached attempt; original/revised PDFs retained; required/disabled modes enforce their settings |
| 8 | Teacher sees stored response: `TEACHER_A` | Reopen saved response/snapshot/files after reload; Teacher B denied; no fabricated success state on a failed save |
| 9 | AI creates learning plan when configured | **Blocked while AI is intentionally off.** Verify disabled behavior and no successful generation/provider call; a manual plan is not evidence for this row |
| 10 | Teacher approves/saves plan: `PLAN_A_V1/V2` | Manual draft remains private, explicit approval exposes the saved version, version/history and objective completion persist; older approved content stays unchanged |
| 11 | AI proposes challenge, teacher publishes | **AI proposal blocked while AI is off.** Do not substitute a fixture for provider evidence. A separately labeled manual challenge supports downstream rows only; full reviewed-AI publication waits for separate configuration/approval |
| 12 | Student completes challenge and receives notification | `CHALLENGE_MANUAL_A` response persists; expected in-app notifications target only intended users, unread counts/read state survive reload; no claim of email notification delivery |
| 13 | Teacher approves feedback | Saved feedback draft remains private; explicit approval/release persists the intended feedback and creates only the expected notice |
| 14 | Student sees feedback and replies in Inbox | Approved student sees released feedback; actual teacher/student reply IDs and read state persist; third-party message/read actions denied |
| 15 | Final assigned and completed: `FINAL_A` | Preview/criteria/deadline/assignment → real student attempt → teacher's private grade/feedback → explicit result publication; latest private revision does not replace a prior published result |
| 16 | Supabase unauthorized access denied | Use actual public-key/user-session REST/RPC/Storage calls as anonymous, pending, unverified where Auth permits, unrelated student and Teacher B. Reject private rows/files, writes, answer keys, unpublished feedback/grades and role escalation; no privileged test client |

While generation stays off, negative AI checks include anonymous/student callers,
Teacher B requesting Teacher A's student/attempt, an unapproved student, missing
student consent and malformed/oversized input. Distinguish an authorization
rejection from an undeployed function or global disabled response: disabled
responses alone do not prove the deeper scoped branch ran. Preserve existing
local SQL authorization tests for branches not reachable remotely while disabled.
Confirm no successful AI request/draft, quota bypass, assignment or feedback
publication occurs. A future enabled test needs separate approval for provider
configuration, billing limits, consent and synthetic data; none is assumed here.

## Proposed idempotent provisioning and verification runner

The implemented `scripts/staging-fixtures.mjs` only generates/verifies offline
files. It has no account provisioning, connection or cleanup capability. A future,
separately reviewed remote runner should have `plan`, `provision`, `verify`,
`cleanup-plan` and `cleanup` operations, with **plan as the default** and no
implicit write fallback:

1. Compare the exact project reference/API/database hosts with the independently
   reviewed staging identity. Require the reviewed baseline report, explicit
   migration approval and successful receipt for the exact approved manifest.
   Refuse missing/mismatched approval or any other project.
2. Produce the actor/entity/file plan without remote mutations. Capture private
   account inputs only from the explicitly supplied environment. Require approved
   Auth redirect/email behavior before sending any message.
3. Write a restricted local ledger before each operation: run ID, target reference,
   actor alias, intended action, stable record/request UUID, and file hash/size.
   Append confirmed IDs/state after actual success. Never log keys, passwords,
   session/refresh tokens, invitation tokens or confirmation URL fragments.
4. Register the synthetic staff/admin actors and confirm their real emails. Pause
   for the separately approved membership bootstrap using only their verified
   returned UUIDs. Then drive invitation and student registration/approval in the
   order above. Never grant roles from a signup payload.
5. On rerun, use the ledger's exact UUIDs and authenticate the matching actor.
   Reuse stable request IDs for supported RPCs and reconcile returned IDs/bytes
   before retrying an ambiguous save. Refuse a conflict instead of adopting an
   unknown account or overwriting a record. Invitation creation has no stable
   request-ID parameter: an ambiguous result requires review rather than blindly
   issuing another invitation or claiming old tokens were revoked.
6. Create only the reviewed manual synthetic entities. Prefer the actual frontend
   and teacher/student RPCs, not privileged writes that skip application policy.
   Record expected denial cases as well as successful IDs and byte hashes.
7. Run the matrix with fresh user sessions, reloading between write/read phases.
   Use direct authenticated API probes for UI-hidden permission boundaries. Keep
   browser artifacts restricted and sanitized; default HAR/traces can contain
   bearer tokens and confirmation links.

## Proposed cleanup after separate approval

Generate an exact-ID/path cleanup plan from the same ledger; review it before any
deletion. It must verify this staging reference and each actor/resource belongs
to this synthetic run. Do not use `TRUNCATE`, bucket wipes, wildcard deletion,
project resets, bulk Auth deletion or a scan of all accounts. Missing ledger
ownership or an outside reference stops cleanup for review.

- Remove only recorded Storage object paths through the actual Storage API while
  their authorization metadata still exists. Submission files deliberately deny
  normal user deletion; that step needs the separately authorized staging operator
  credential. Preserve evidence hashes. Database row deletion alone does not
  remove file bytes. Do not delete by folder prefix: ordinary app paths use actor
  UUIDs/random IDs rather than the run name.
- Remove exact run-owned rows in foreign-key order: final results; attachment
  versions/attachments; final metadata; exercise attempts/assignments/exercises;
  challenge responses/challenges/publications; learning objective events/progress
  and plan versions from newest to oldest; synthetic Inbox messages/notices and
  any additional approved fixture rows. Resolve real dependencies explicitly; do
  not introduce a broad cascading delete to bypass a failure.
- Revoke recorded unused invitations only through a separately reviewed supported
  operation; the current UI does not implement invitation revocation. Do not claim
  cleanup revoked a token when it merely removed a local link.
- Remove fixture enrollments/profiles and exact synthetic teacher/admin membership
  only after their dependents are gone. Delete Auth accounts through the authorized
  Auth admin operation only when the ledger proves this run created them. Preserve
  any supplied/reused operator account. Confirm byte objects and intended rows are
  absent, other fixture/control records remain unchanged, then expire sessions and
  discard private test passwords/tokens in the operator environment.

Provisioning, matrix execution and cleanup remain pending the reviewed staging
baseline, explicit approval, authorized mailbox/account inputs and staging access.
