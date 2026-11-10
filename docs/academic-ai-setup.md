# Academic AI setup and verification

Status: implemented locally; disabled by default. No provider request, remote
migration, Edge Function deployment or real student processing has been performed.
The adapters used in tests are explicit HTTP doubles; they are not an offline AI.

## Database and deployment

1. Export the target schema and review existing migrations and policies. Use a
   staging project with authorized teacher/student accounts first.
2. Apply the existing migration chain through 0013 in order, then the exact
   additive file `supabase/migrations/0014_ai_drafts.sql`. It requires profiles,
   teachers, exercises, assignments, attempts, feedback, challenges and the 0013
   enrollment helpers. Do not skip enrollment migration 0013.
3. Run `node --test tests/academic-ai.test.mjs`. Its PostgreSQL tests create an
   isolated in-memory database, apply actual migrations and exercise real RLS
   roles. They do not validate your remote schema or Supabase Auth.
4. Deploy `supabase/functions/academic-ai` only after reviewing its code:
   `supabase functions deploy academic-ai --project-ref <staging-ref>`.
   Keep `verify_jwt = true`; never deploy this function with `--no-verify-jwt`.
5. Configure secrets in the staging project's Edge Function secret manager.
   The function needs `SUPABASE_URL` and `SUPABASE_ANON_KEY`, normally provided
   by Supabase. It deliberately never reads a service-role credential.
6. Keep `ACADEMIC_AI_ENABLED=false` until consent wording, the approved model,
   authorized test accounts and provider billing limits have been reviewed.
7. Apply the remaining reviewed chain through 0021 before using the new plan,
   challenge and finals interfaces. Set the public presentation switch
   `VITE_ACADEMIC_AI_ENABLED=true` only after authorized staging provider checks.
   It defaults to false and disables generation controls; it is not a credential
   or an authorization boundary. Server configuration and consent remain required
   independently. Manual learning plans and saved-draft review remain available.

Server-only configuration:

| Variable | Required value |
| --- | --- |
| ACADEMIC_AI_ENABLED | Exact `true` to enable requests; absent or any other value disables |
| ACADEMIC_AI_PROVIDER | `openai`; no fallback or simulated provider |
| OPENAI_API_KEY | Scoped provider project key, stored only as an Edge Function secret |
| ACADEMIC_AI_MODEL | Explicit approved Responses model supporting strict JSON schema; no model is assumed |
| ACADEMIC_AI_ALLOWED_ORIGINS | Comma-separated exact frontend origins, e.g. `https://staging.example.com`; no wildcard |

Set provider project billing/spend limits before enabling the function. Do not
commit secrets, prefix them with `VITE_`, paste them into source or put them in
SQL. Environment changes and any production deployment require the normal
reviewed release process. This document does not authorize a production change.

## Consent, access and data scope

Students choose whether their teacher may send academic data to the configured
external AI provider. Consent is off until the approved student explicitly opts
in. A teacher cannot grant consent for a student. Revocation immediately prevents
new context retrieval, reservation and completed generation writes. A request
already transmitted cannot be recalled from the provider.

Suggested disclosure: “Allow your teacher to use an external AI provider to
prepare editable learning drafts using your objectives, progress, exercise
answers, this teacher's feedback and challenge responses. Nothing is sent to you
or assigned without teacher review. You can turn this off at any time.”

The context RPC checks verified teacher membership, approved and verified student
enrollment, the teacher/student relationship from 0013, and current student
consent. It returns bounded academic fields and this teacher's recent submissions,
feedback, challenges and approved plan. It excludes direct profile identifiers,
private teacher notes, files, unrelated teachers' material and unrestricted
database queries. Free-text responses can contain personal information; use
authorized accounts and appropriate consent for the configured provider.

Feedback generation requires a specific exercise attempt belonging to both the
selected student and the teacher's non-revoked assignment. The provider receives
the student's response and exercise objective, never an API credential or a
database token. Other draft types use recent authorized academic context.

External tools can be prepared against the same `get_academic_ai_context` RPC
using a verified teacher's user session JWT and public project key. The RPC
requires the same enrollment, teacher relationship and consent checks. No MCP
server, OAuth client, refresh-token sharing, unrestricted SQL tool or external
account integration has been enabled. Configure and test any external tool
separately before claiming it works.

## Generation, review and publication

The provider-independent orchestrator in `core.js` validates request fields,
obtains scoped context, reserves quota, invokes the configured server adapter,
validates the output and confirms the saved draft ID. The initial actual adapter
uses OpenAI Responses with strict JSON schema and `store:false`. It declines
incomplete output, refusals, malformed JSON, unknown fields, unsupported exercise
types, incorrect choice answers and missing usage accounting.

All plans, exercises, challenges and feedback contain Listen -> Repeat ->
Personalize -> Use in order, with communicative activities and no default grammar
lecture. Matching and ordering use validated lists compatible with Exercise
Studio. Listening can supply a teacher-read script; no audio is fabricated.

Generated content always enters `ai_academic_drafts` as `draft`. Teacher edits
and approvals use `review_academic_ai_draft`. Approval marks that draft reviewed;
the RPC never publishes an exercise, creates an assignment, sends feedback or
changes a student's plan. Use the approved content through the appropriate
teacher workflow. Learning Plans imports a selected saved recommendation into a
new editable student-specific version. The teacher completes its objectives,
saves and explicitly approves it for the student. Approved content is immutable;
changes create new versions and retain prior approved history. Objective progress
is stored separately with revision checks and an event history.

Challenge Manager loads persisted recommendations, permits edits and approval,
and publishes the exact saved approved content to an individual or selected group.
One publication per recommendation and stable request IDs prevent duplicate
assignments. Student responses and private/released teacher feedback use scoped
RPCs; notifications are transactional. Neither interface generates a substitute
recommendation when the provider is absent. Local test recommendations are
explicit fixtures, never evidence of live AI generation.

## Usage and failure behavior

Atomic PostgreSQL reservations enforce 3 requests/minute and 10/rolling 24 hours
per teacher, plus 100/rolling 24 hours for the project. Failed, abandoned and expired
requests still count. The shared transaction lock prevents separate Edge
instances from bypassing the count check. Requests cannot be reset or inserted
through browser table permissions.

The provider uses a fixed HTTPS endpoint, a 30-second deadline, at most 2,500 output
tokens, a 32,000-byte UTF-8 request limit, no tool execution, no automatic retries
and a bounded 128,000-byte response reader. Completion rejects usage above 40,000
input tokens or 2,500 output tokens. These request/token limits bound consumption;
the approved model's prices and provider-side budget configuration determine the
monetary cap. Failed or rate-limited requests do not generate a fake draft.

Usage rows store IDs, task type, state, counts and timestamps. They do not store
provider credentials, prompts, responses, raw errors or personal identifiers from
Auth. Provider errors are sanitized before returning to the frontend. A failed
save reports failure and keeps the reservation counted; it does not claim success.

## Required staging checks

Use authorized test accounts for one teacher, their approved student, a pending
student, an unrelated teacher and a separate approved student. Confirm:

- Default-disabled and missing-provider configuration produce a clear failure.
- Pending/unverified students cannot consent or read academic content.
- Student opt-in enables only their authorized teacher's generation.
- Another teacher and a cross-student attempt are denied.
- Generate, edit and approve all four draft types with a real configured provider.
- Invalid, refused, timed-out and rate-limited generations never claim a saved draft.
- The student sees nothing from AI until the explicit teacher publication/send workflow.
- Consent revocation and enrollment suspension stop future AI data access.
- Browser assets, network payloads and logs contain no provider or administrative key.

The local tests cover real PostgreSQL role permissions, consent, scope, review and
quotas plus provider protocol and failure paths using HTTP doubles. Live provider
quality, Deno deployment, Supabase gateway/CORS behavior and authenticated browser
end-to-end tests remain unverified until staging configuration is available.

Sources checked during implementation:
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
and [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth).
