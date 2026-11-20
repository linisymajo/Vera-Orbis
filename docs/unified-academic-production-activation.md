# Unified academic production activation — 2026-11-19

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


The founder authorized the reviewed, non-destructive production release on
2026-11-19. This supersedes the pending approval/staging prerequisites in the
historical release proposal. The reviewed manifest is unchanged:
`3757db9297fffa45210e3f8027047c2f3f3d804de1262b871b298c375bc4c0ab`.

## Applied production database changes

Target: `iopgzmvaqobigjwibual` only. Exact 0028 and 0029 from
[the reviewed manifest](unified-academic-production-manifest.json) were committed
at 2026-11-19T17:03:37Z, with successful history/checksum records. Existing
0025/0026/0027 were verified and not replayed. The original academic baseline
predates migration tracking; its required relations/functions exist.

255 checks passed: exact SQL/server hashes, dependencies, verified TLS, private
table RLS/grants, fixed function search paths, anonymous/private-helper denials,
actual assigned-teacher context reads and own-student Journey reads. All existing
application, Auth and Storage rows were fingerprinted and preserved. The new
tables have no direct authenticated write privileges. No accounts changed.

A further 19 checks passed against actual production PostgreSQL in a transaction
that was rolled back: context review, seven remaining deterministic lesson cards,
individual editing, private approval, explicit publication, course/class/material
links, one assignment after repeat publishing, student submission, private and
released feedback, attendance-backed completion and inherited version links.
These exercised authenticated database roles and existing associations; they are
not a production browser login test. Synthetic writes were rolled back and the
unchanged record counts/plan fingerprints verified.

## Independent frontend availability

The frontend separates three capabilities:

- `VITE_ACADEMIC_CONTEXT_READY=true`: reviewed SQL context, remaining-class
  templates, versioning/approval/publication and explicit Journey resource links.
- `VITE_ACADEMIC_MATERIALS_READY=false` until the new Edge package is deployed
  and verified. The original private uploads/downloads remain operational;
  document text-processing controls explain temporary unavailability.
- `VITE_ACADEMIC_AI_ENABLED=false`: no provider status/generation requests are
  sent by this production client. Templates are explicitly labeled deterministic.

The additional material readiness switch is a frontend safety improvement; it
changes no reviewed SQL or server files. It allows the authorized academic
workflow to operate while the unrelated Management API credential is invalid.
Tests inspect the actual frontend functions' outbound calls: disabled generation
and document processing make zero Edge requests. Activating material processing
does not activate generation. Existing Teacher Dashboard/Student Platform,
3D cards, Language Passport and Vera Voice are preserved.

Frontend activation is LIVE at commit
`8bd92c0bd640f5f907ab285e0f9b2f3f5898b952` through the
[successful existing Pages workflow](https://github.com/linisymajo/Vera-Orbis/actions/runs/44573920717),
based on prior live commit `7b305d129be1c2af2a7fb583f5e1126ba170606e`.
38 public-site checks passed: ten deployed assets, the actual readiness flags,
production target, preserved Voice target, legacy redirect and unauthenticated
browser gates. Actual production teacher/student browser login remains unverified.

## Edge deployment and provider status

Only the reviewed `academic-ai` package (16 exact files), `verify_jwt=true`, is
prepared for production. Management authentication returned HTTP 401 before
secret writes/deployment. No new function or provider secret was installed.
The production `academic-ai` endpoint currently returns 404. Eight further
read-only production checks passed across the actual enrolled association, five
authorized source records (including three material records), own Journey and
PostgREST cache/anonymous denials. No published plan currently exists for that
student; new plans become visible only after explicit teacher publication.

The necessary credential is a valid `SUPABASE_ACCESS_TOKEN` with Edge Functions
and Secrets read-write access to this production project. Its value belongs only
in Windows User environment variables. Staging 0028 was not replayed.

Once authenticated, the already-authorized operation sets only the reviewed
non-provider values: `ACADEMIC_AI_UNIFIED_ENABLED=false`,
`ACADEMIC_AI_ENABLED=false`, `ACADEMIC_AI_ARCHITECT_ENABLED=false`, and
`ACADEMIC_AI_ALLOWED_ORIGINS=https://veraorbis.studio`; deploys `academic-ai`;
verifies teacher authorization/local document parsing; then activates the material
frontend flag. No Gemini key, Voice secret, billing or external AI call changes.

Real LLM inference remains disabled. An eligible provider, approved processing
terms, safeguards for minors, explicit contextual-egress approval, authorized
adult-teacher eligibility, student consent and usage limits are required before
student-aware generation. Gemini Free Tier is not used for private records.
Manual planning and exercise editing do not require an LLM provider.

## Backup and recovery

Fresh encrypted production backup verified on 2026-11-19 before application:
85 database/Auth tables and all 32 private Storage objects (33,370,453 bytes).
Encryption/decryption, archive decompression/counts, object/source hashes and
unchanged Storage inventory passed. The backup, encrypted recovery mapping and
instructions are outside Git in the Windows user's VeraOrbis backup directory.
DPAPI key protection requires preserving the Windows profile. No paid backup or
PITR was required. Full platform restore remains untested.

On a frontend fault, set readiness flags false and publish the prior live source
through the existing workflow. Retain the additive schema and saved history;
do not automatically drop tables or overwrite data. Before further migrations,
capture a new backup. Any full restore needs separate approval into an isolated
target first. Provider flags stay false throughout rollback.

## Verification limits

50 focused Node tests and four Chromium workflows passed on this continuation.
They include actual PostgreSQL RLS and real document parsers; browser inference
uses explicit local test doubles only. Production PostgreSQL checks and rollback
rehearsal are distinct from browser end-to-end authentication. No production test
account credentials/session were available for a real teacher/student browser
login, so that complete login-to-publication workflow remains unverified.
