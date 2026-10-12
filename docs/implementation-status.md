# Vera Orbis implementation status

This repository contains a Vite application with role-specific entry points and a
separate Express/Gemini Vera Voice service. The current worktree also contains
local changes that predate this document; they must be preserved.

## Implemented and locally verifiable

- Supabase Auth session lookup for the Student and Teacher platforms.
- Student profile, materials, feedback, challenge, and onboarding flows already
  present in the frontend.
- Teacher access gate based on an authenticated user and a matching `teachers`
  record.
- Teacher workspace overview, academic material/challenge creation, private
  file upload validation, student list, academic profile editing, and private
  teacher notes surfaces are present in the frontend.
- Vera Voice token handshake, profile loading, and authenticated text/live
  requests.
- Frontend production build and native Node authorization tests.
- Exercise Studio authoring, draft publishing/archive/duplication, explicit
  assignments, sanitized student exercise content, and attempt submission are
  implemented locally behind `0004_exercise_studio.sql`.

## Incomplete or dependent on remote schema

- Calendar, class scheduling, attendance, courses, packages, payments, expenses,
  reports, prospects, communications, and culture modules now have an additive
  schema and RLS migration, but require review and application in Supabase
  before their live workflows can persist data.
- Exercise Studio also requires `0004_exercise_studio.sql` and authenticated
  teacher/student RLS tests in Supabase before it can be considered remotely
  verified.
- Materials and challenges exist in the Student Platform, but a complete
  teacher authoring/review workflow is not present.
- Interactive exercise types, submission review, and progress reporting need
  versioned tables and policies before they can be connected safely.
- Teacher authorization currently depends on Supabase RLS for row-level scope.
  The repository does not contain the remote schema or policy definitions.
- Registration does not explicitly create a `profiles` row. This may be
  provided by an unversioned remote trigger and must be verified before changing
  the flow.

## Safe next implementation boundary

The next feature work should start only after exporting the current Supabase
schema and RLS policies. Additive migrations can then introduce academic,
financial, CRM, and communication tables without guessing existing columns or
breaking existing data.
