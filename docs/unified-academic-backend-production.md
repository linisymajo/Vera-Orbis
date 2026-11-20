# Academic backend production activation — 2026-11-20

Target: `iopgzmvaqobigjwibual` only. The updated Windows User access token was
validated without displaying it. Edge Functions read/write and Secrets read/write
were confirmed by the successful authorized operations. No SQL was replayed.

## Deployed backend

`academic-ai` version 1 is ACTIVE with `verify_jwt=true`. All 16 reviewed source
and dependency files still match the production manifest
`3757db9297fffa45210e3f8027047c2f3f3d804de1262b871b298c375bc4c0ab`.

The first cloud bundle rejected the parser's bare npm imports. A function-local
`deno.json` resolves only `fflate@0.8.3`, `fast-xml-parser@5.12.1`, and
`unpdf@2.2.0`, the exact dependencies already declared in the reviewed package.
The map changes no functional code, authorization, provider configuration or SQL.
Map SHA-256: `84f92e3d594d990d0ef492245459af94534e6df956dce6705a558e37c20fe325`.
See [Supabase dependency configuration](https://supabase.com/docs/guides/functions/dependencies).

Only these approved non-provider settings were written and verified:

- `ACADEMIC_AI_UNIFIED_ENABLED=false`
- `ACADEMIC_AI_ENABLED=false`
- `ACADEMIC_AI_ARCHITECT_ENABLED=false`
- `ACADEMIC_AI_ALLOWED_ORIGINS=https://veraorbis.studio`

All unrelated secret digests were compared before/after and preserved. No Gemini,
Vera Voice or other provider credential was installed or changed. No billing or
external provider request occurred.

## Verification

13 hosted HTTP/management checks passed: active deployment/JWT enforcement,
three generation flags false, actual handler boot, trusted CORS, rejected foreign
origin, rejected unsupported method, and rejected missing JWT. A server key could
not impersonate a teacher. No private file was read by these negative probes.

22 focused Node tests passed, including actual Office/PDF parsing, bounded
untrusted files, consent/RLS/persistence, and HTTP teacher-role checks. New HTTP
tests use explicit local Auth/client doubles: real parser output and byte hashes,
rejection of student/unverified/non-member callers before file access, and all
generation routes blocked before provider inference. These are distinct from a
positive hosted teacher extraction test.

Four additional synthetic parser checks passed in actual Deno 2.9.6 (DOCX,
PPTX, text PDF and OCR-required PDF), using the exact map and parser.

No authorized production teacher/student test login was available. Positive
hosted extraction and full authenticated browser end-to-end verification remain
unverified. Existing real academic records and accounts were not changed.

The existing frontend material readiness switch may now be activated through the
existing Pages workflow, while inference remains false. Record the successful
workflow and deployed flag checks before marking the UI activation live. Manual
planning remains explicitly deterministic; approved plans still require explicit
teacher publication.

## Backup and rollback

A new encrypted backup was verified immediately before deployment: 89 database/
Auth tables, all 32 private Storage objects (33,370,453 bytes), full archive
decompression/count checks, encryption/decryption, source hashes and unchanged
Storage inventory. Archives, recovery mapping and instructions are outside Git.
Full Supabase platform restore remains untested.

To suspend extraction, set `VITE_ACADEMIC_MATERIALS_READY=false` and redeploy the
existing frontend. Keep generation flags false. Retain the additive schema,
plans and derived index history; do not delete accounts or restore over live data.
The previous frontend commit is `8bd92c0bd640f5f907ab285e0f9b2f3f5898b952`.
