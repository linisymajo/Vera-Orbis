Execution update 2026-11-18: the exact 0028 below was applied after a fresh verified encrypted backup; all prior rows were preserved. The new function package has NOT deployed: management authentication returned HTTP 401. Contextual inference remains unactivated. See docs/unified-academic-production-release.md for live/local verification distinctions and the separate 0029 staging proposal. The original proposal follows as historical scope.

# Unified Academic AI 5.0 � staging-only verification proposal

2026-11-14, America/Bogota. Revision 2; no production changes or external provider activation.

The original package manifest omitted the two existing shared correction/exercise
validators imported by the server. Revision 2 pins those exact files and validates
unsupported request formats before any context retrieval/provider call. It also
preserves reviewed annotations/priorities in private generation provenance.
The SQL hash is unchanged. The first deployment proposal is superseded; do not
execute it based on the earlier package manifest. No SQL/deployment has run.

## Exact proposed staging operations

Target exclusively `duinvkphfnugoyvvlbbq`. Review the exact source/checksums in
[unified-academic-staging-revision-2-manifest.json](unified-academic-staging-revision-2-manifest.json),
SHA-256 `1802918c4e352eacc33dbfcd175e6e9385e0d2b057aa35ae138e17132757aa42`.

1. Reconfirm the pinned staging marker, current 0025/0026 history and TLS. Verify
   a fresh encrypted staging application backup before any SQL. Store it outside
   Git using existing backup tooling; do not print credentials or private records.
2. Apply only `supabase/migrations/0028_unified_academic_context.sql` (24,208 bytes;
   SHA-256 `1de5d785d4bff3cb3e1eab9552174953921314c644d5ae338c19782c78f0b262`),
   plus successful migration/checksum recording. Exclude 0024 and unreviewed 0027.
   Dependencies are existing teacher/calendar/materials/enrollment/AI/plan/exercise
   schemas through 0026. It does not depend on the standalone architect registry.
3. Deploy only the manifest's `academic-ai` function package to staging, retaining
   `verify_jwt=true`. Isolate the reviewed source from unrelated shared work:

   ```powershell
   npx.cmd --yes supabase@3.1.0 functions deploy academic-ai --remote=duinvkphfnugoyvvlbbq --use-api --workdir <reviewed-staging-candidate> --yes
   ```

4. Explicitly keep `ACADEMIC_AI_UNIFIED_ENABLED=false` and existing unrelated AI
   agents disabled. Do not set an alternative key or enable billing. Preserve the
   reviewed Gemini integration; never route private academic context through it.
5. Use only existing authorized synthetic staging accounts and synthetic academic
   files/evidence to verify Auth, scoped context, private Storage download and
   extraction, reviewed source snapshots, persistence, RLS and publishing. Inject
   mocked inference only in the local test driver calling real staging RPCs. No
   deployed mock provider or simulated live LLM success. Preserve all pre-existing
   manual/approved versions and academic records; record added fixture IDs privately.
6. Build and inspect a local Dashboard preview; no hosting or production deployment.

## SQL effects and recovery

Adds private teacher-scoped context reviews, versioned material text, and generation
provenance linked to existing AI requests/plan drafts. Does not create parallel
academic records. Reviews keep source fingerprints, explicit source exclusions and
teacher annotations without rewriting the source records. New material sources
are not silently sent after review; changed reviewed sources require a new review.

Adds scoped retrieval/index/review/reservation/completion/provenance RPCs with
fixed search paths, restricted grants and verified teacher/student membership.
Existing consent, quotas and separate approval/publication remain mandatory.
Private draft feedback is excluded; released historical feedback remains usable.

A backward-compatible wrapper extends the existing private AI question validator
with optional accepted answer variants, retaining validation of every prior field.
No data rewrite, account/password change, destructive table/column operation or
RLS weakening. Derived material text follows an explicitly deleted original
material through ON DELETE CASCADE; generation-time source/hash metadata remains
in private run provenance. Existing material deletion semantics are preserved.

On migration failure, roll back the transaction and record no success. If the
function revision fails, disable unified generation and restore the previous
reviewed staging function source. Keep manual features working. Do not reverse
schema or delete plans/history automatically. A full platform restore is not
verified and any restore requires separate approval.

## Already verified locally / still pending

Actual local PostgreSQL validates the 5-of-12 => seven-lesson draft workflow,
exclusions/corrections, file-version invalidation, approval/publication, history,
student/unrelated-teacher denials and released-response feedback. Office and PDF
extraction use real parsers and real synthetic document bytes; scanned PDFs report
OCR required. Chromium verifies the integrated plan editor, reordering, publication,
material-grounded editable Exercise Studio cards and provider-disabled manual work.
Provider responses in the new workflow tests are explicit mocks, not real AI.

Hosted verification of migration 0028 and this function revision is PENDING exact
staging approval. Contextual inference with real students remains DISABLED until
provider eligibility, processing terms, minor safeguards, disclosure/consent and
any spending receive explicit authorization. Production remains untouched.
