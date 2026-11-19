# Personal Learning Journey — exact staging supplement

2026-11-18. Target only `duinvkphfnugoyvvlbbq`.

The existing roadmap contains general language stages. The completed local
supplement projects each student's published lesson versions and real activity
evidence into that roadmap, preserving its 3D/flip design. It needs explicit
course, actual class and material links; these are not inferred from dates.

Proposed SQL: `supabase/migrations/0029_personal_learning_journey.sql`, 18,007 bytes,
SHA-256 `dd3e97f12efcdb74a9ff683068f71f8e6d6eab601b321d387f05f1926a446723`.
Apply that file and successful migration/checksum recording only, after a fresh
verified encrypted staging backup. Dependencies: existing 0019, 0022, 0023, 0025;
no 0024/0027 dependency, external provider, billing or production operation.

Adds one append-only, teacher-scoped resource-link history table; teacher-only
resource retrieval/save RPCs; one sanitized authorized Journey projection; and
two guards binding exercises/assignments to the published lesson's student.
It does not rewrite existing plans, accounts, exercises, files or attendance.
New trigger validation applies only when records are subsequently written.
Student projection excludes drafts, private notes, raw AI analysis, private file
paths, answer keys and unreleased feedback. Original private Storage policies
remain in force. Public/anonymous execution and direct binding writes are denied.

Completed classes require completed class status plus present/late attendance,
or an explicit audited teacher objective completion. A submission starts lesson
activity; it does not certify class completion. Stable objective IDs retain
assignments and recorded completion when a copied version is reordered. Earlier
published versions keep completed history. Course associations are explicit;
unassociated legacy history is labeled rather than counted toward a purchase.

Local actual PostgreSQL tests pass: private approval/publication, seven lessons,
editing, repeated publication, one assignment, actual submission, released-only
feedback, verified attendance, revision/reordering, history, optimistic locking,
student/unrelated-teacher denials and private helper/table restrictions.
Chromium verification is running; hosted 0029 verification has not occurred.

On failure, roll back the SQL transaction and record no success. After a later
release, disable the new UI or restore the prior frontend; preserve additive
schema and all history. Do not automatically reverse schema or restore over any
live database. Full Supabase platform restore remains unverified.
