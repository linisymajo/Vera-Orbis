# Security and testing

## Required environment variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_VERA_VOICE_URL` (optional locally; defaults to the local Vera Voice
  service)

Backend:

- `PORT`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CORS_ORIGIN`

Never commit values for these variables. Only the publishable Supabase key may
be used in the browser; service-role keys must remain server-side and are not
currently required by the frontend.

## Authorization requirements

The Teacher Platform checks the authenticated user and a matching row in
`teachers` before rendering. This is a UX and request-routing guard, not a
replacement for RLS. Every table used by a teacher operation must enforce:

1. authenticated access;
2. teacher membership or ownership for reads;
3. teacher membership or ownership for writes;
4. immutable ownership fields from the client;
5. student visibility limited to the teacher's assignments.

The current repository does not include enough schema information to assert
that these policies exist remotely. The template in
`supabase/migrations/0001_teacher_security.template.sql` must be reviewed
against an exported schema before it is applied.

## Local checks

```text
npm.cmd test
npm.cmd run build
node --check vera-tutor-backend/server.js
node --check vera-tutor-backend/public/app.js
```

The tests do not contact Supabase. A real authenticated integration test still
requires a disposable Supabase project and explicit test credentials.
