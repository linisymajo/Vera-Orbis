# Materials Storage verification and deployment

Migration `supabase/migrations/0011_material_office_formats.sql` only adds six Word,
PowerPoint and Excel MIME types to the existing allowlist. It preserves the null
allowlist (unrestricted MIME configuration), existing formats including SVG, bucket
privacy, size limits, object data and every Storage policy. It does not create a
missing bucket or repair insecure preexisting settings. Migration 0005 configures
a private materials bucket with a 10 MiB limit. Files must be nonempty in the browser;
the Storage service enforces the configured maximum.

The upload helper confirms the authenticated user, uses that user's folder,
disables overwrites and requires Storage to return the requested path. File
extension, size and browser MIME validation are metadata checks, not malware
scanning or complete document validation. Existing SVG files can still be read;
new SVG uploads remain excluded by the existing frontend allowlist.

## Local evidence

Run `node --test tests/material-storage.test.mjs`.
The suite applies the actual 0005 and 0011 SQL in disposable PGlite PostgreSQL and
checks privacy, 10 MiB limit, MIME additions, null allowlist preservation,
idempotence, existing SVG metadata, unchanged policies, assigned-student reads,
unassigned-student denial, teacher uploads and rejected student/wrong-folder writes.
This covers PostgreSQL RLS behavior; PGlite does not run the Supabase Storage API.

In-memory DOCX/PPTX/XLSX ZIP packages, PDF, PNG and WAV samples round-trip exact
bytes through a Storage API test double. These are local adapter tests, not live
upload/download evidence or full Microsoft Office interoperability certification.
No local psql, Docker or Supabase CLI was found during this implementation.
No Supabase test credentials were used and no production changes were made.

## Review and staging procedure

1. Export the deployed bucket configuration and all `storage.objects` policies.
   Check that 0005 is already represented and that no extra permissive policy grants
   broad public access. Compare the current materials table RLS with the repository.
   Migration 0011 leaves existing permission boundaries unchanged. Follow the full
   reviewed chain through 0021 and guarded staging identity/preflight procedure in
   [academic-deployment.md](academic-deployment.md). The user confirmed there is
   no staging project yet; do not use the existing production project.
2. After the isolated project, reviewed baseline and backup exist, apply only the
   pending checksum-verified migrations through the staging release process.
3. Run `supabase/tests/storage-verification.sql` using the same independently
   verified staging connection and a reviewed read-only SQL client session.
   If privacy or size assertions fail, review the exported configuration and
   authorize a separate correction before any production change. Do not blindly
   reapply 0005 over a deployed custom MIME allowlist.
4. With authorized teacher, approved assigned student, unrelated approved student,
   pending student and anonymous accounts, upload actual Word/PowerPoint/Excel/PDF
   and permitted media via the UI. Confirm the persisted materials row and private
   object, then open the file through its signed URL and compare downloaded bytes.
   Verify 0-byte, >10 MiB, MIME mismatch, unsupported extension and wrong-folder
   uploads fail, and that an unrelated student cannot obtain a signed URL.
5. After applying reviewed 0015_material_owner_boundary.sql (with its prerequisites), confirm another teacher cannot read a private material row or obtain a signed URL for its object. Staff Storage access must remain inside their own UUID folder. Confirm legacy SVG and media downloads still work for the owning teacher and assigned approved student. Confirm pending/unverified
   students are blocked by the 0013 enrollment storage boundary. Use fresh signed
   URLs for authorization checks: issued signed URLs are bearer access until expiry.
6. Compare object counts, bucket settings and policies with the export. Delete
   staging test records/objects using their recorded IDs only.

Historical migration 0005 permits registered teachers to read all materials files;
student reads require an assigned materials row or audience=all, subject to
materials RLS. Its update/delete policies use the authenticated folder prefix.
Migration 0013 adds a restrictive staff-only Storage write boundary and
approved-student read boundary. Migration 0015_material_owner_boundary.sql further
restricts staff material metadata to the owning teacher (with an explicit legacy
admin exception) and staff Storage access to their own UUID folder. It blocks
cross-teacher private reads even though historical 0005 remains in migration
history. Review the policies together; 0011 itself does not tighten permissions.

Production remains blocked on a reviewed remote schema/policy export, explicit
production authorization and successful isolated staging evidence. A later release
must use the complete verified migration sequence, not reapply 0011 independently
over newer policy/function changes. Keep production credentials out of this
repository and browser bundles. To reverse the allowlist change, restore its
exported previous value only after confirming new Office objects no longer need
new uploads; restoring an allowlist does not delete stored files.

## Student attachments and batch materials

0018 creates the private `academic-submissions` bucket and metadata reservations,
verified upload confirmation, atomic answer/file submission and file-set versions.
Teachers choose disabled, optional or required files in Exercise Studio. Required
files cannot be bypassed through the original submit RPC. Supported files match
the academic allowlist, at most five per submission and 10 MiB per file. File
extension and MIME checks do not inspect document contents or scan for malware.

Uploaded objects cannot be overwritten or deleted through student permissions.
Explicitly permitted revisions before the deadline create new immutable file-set
versions; earlier files remain reviewable. Students see their authorized files;
teachers see confirmed submitted files for their own authorized assignments.
Signed download URLs expire after five minutes and are bearer links until expiry.
Test fresh URL issuance and direct object access as unrelated/pending/anonymous
users, rather than treating an already-issued URL as a new authorization decision.

Materials Studio supports keyboard file selection, drag-and-drop and per-file batch
statuses. Stable record IDs and preserved private paths allow safe reconciliation
after lost upload/save responses. Ambiguous saves retain objects and require
confirmed metadata; retry does not overwrite bytes or delete a possibly referenced
object. The retry queue is recoverable within the teacher's browser session.

Run `tests/exercise-attachments.test.mjs` and `tests/materials-studio.test.mjs` with
Node, plus the Chromium browser suite. SQL policies run in local PostgreSQL; local
Storage adapters transport byte samples. None is evidence of a live Supabase
Storage upload, signed URL request or Microsoft Office interoperability test.


