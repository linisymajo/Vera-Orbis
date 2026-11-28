# Gemini adult-only production activation — 2026-11-28

The founder definitively confirms all existing accounts are adults and future
admission is exclusively 18+, with no service offered in EEE/EU, Switzerland or
the UK. This supersedes the earlier minors-accessible premise. The existing app,
data model, Teacher Dashboard and Student Platform are retained.

Backend controls: signup requires explicit adult/eligible-region declarations;
academic access also requires verified adult admission. Only an authorized adult
teacher/administrator can verify future admission. Invitations record the
teacher verification and enrollment approval requires it. Metadata edits cannot
verify admission. Existing eligibility is seeded from the founder's explicit
confirmation without rewriting profiles, Auth accounts or enrollments. These are
declarations plus staff verification, not document-based identity verification.

Generation additionally checks current Auth, role, teacher membership, enrollment,
adult admission, the administrator-maintained adult educator registry and the
server teacher allowlist. Student roles cannot invoke it. Existing consent,
assigned-student scope, atomic quotas (3/minute, 10/teacher/day, 100/global/day),
private drafts, immutable approval history and explicit publishing remain.

Gemini receives only allowlisted language, CEFR, catalog communicative objective,
lesson count/duration, fixed practice areas, activity type and lesson ordinal.
No names, IDs, free-text goals, saved edits, assessments, responses or private
materials reach Google. Full contextual inference remains disabled. Generated
content is based on the selected pedagogy; it is not represented as an analysis
of private learner evidence. Unsupported listening/audio generation is excluded.

Model: gemini-3.1-flash-lite, existing official Google GenAI SDK. Generation is
bounded, structured, validated, without tools, paid fallback or automatic retries.
Free Tier uses the separate IA Architecture credential, solely as an Edge secret.
No billing or Vera Voice setting is changed. Eligibility is based on the declared
and enforced adult-only/region-restricted service; no separate Google exception
is claimed or needed on the earlier minors premise.

[Gemini terms](https://aistudio.google.com/docs/terms),
[model pricing](https://aistudio.google.com/docs/pricing#gemini-3.1-flash-lite).

Additive SQL 0032 enforces admission and preserves accepted answer variants in a
separate draft column, retaining the previous draft validation contract. Its
production transaction passed 107 rollback checks and 106 application checks,
including all existing application/Auth/Storage record fingerprints. Encrypted
DB/Auth plus 38 private Storage objects were verified before application. Full
platform recovery remains untested. Staging DNS is unavailable; it is not claimed
as a hosted staging pass.

Local focused verification: 26 distinct passing tests across admission, actual
PostgreSQL/RLS/persistence, official SDK outbound bytes, provider contracts,
private approval/publication and permissions, across focused runs. A real
synthetic provider call returned three valid questions, 264 input/820 output
tokens; a preceding explicit attempt failed without a saved draft. This provider
check is not the final production UI acceptance test.

Production publication and real teacher/Vera Test E2E are recorded separately in
the release receipts; they remain pending until those receipts report success.
Rollback: disable ACADEMIC_AI_ARCHITECT_ENABLED and VITE_LEARNING_ARCHITECT_ENABLED,
then republish the previous frontend/backend artifact if needed. Preserve the
adult-only admission boundary and all academic data. Do not restore/delete data
to roll back a UI or generation issue.
