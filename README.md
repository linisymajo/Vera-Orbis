# Vera Orbis

Vera Orbis is a role-based language learning platform with Student and Teacher
experiences and a separate Vera Voice service.

## Local setup

1. Install Node.js 20 or newer.
2. Install frontend dependencies:

   ```text
   npm.cmd install
   ```

3. Create `.env.local` with the frontend variables documented in
   [docs/security-and-testing.md](./docs/security-and-testing.md).
4. Start the frontend:

   ```text
   npm.cmd run dev
   ```

5. If Vera Voice is needed locally, create
   `vera-tutor-backend/.env` with its server variables and run:

   ```text
   cd vera-tutor-backend
   npm.cmd install
   npm.cmd run dev
   ```

Do not commit either environment file or any secret value.

## Verification

```text
npm.cmd test
npm.cmd run build
node --check vera-tutor-backend/server.js
node --check vera-tutor-backend/public/app.js
```

## Architecture and current scope

The entry points are `platform.html`, `teacher.html`, `login.html`,
`register.html`, and `onboarding.html`. Supabase Auth and the frontend
publishable key are used by the browser. Vera Voice validates access tokens in
its backend before loading a profile or calling Gemini.

The implementation status and the boundary for safe feature work are documented
in [docs/implementation-status.md](./docs/implementation-status.md). Supabase
schema and RLS templates are in
[supabase/migrations/](./supabase/migrations/), but they must not be applied
until the current remote schema has been exported and reviewed.
