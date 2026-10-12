# Supabase migrations

No authoritative Supabase schema or RLS export is currently tracked in this
repository. Do not run the template migration against a production project.

## Consolidated activation procedure

The repository cannot determine whether the remote project has applied either
teacher-operations migration: migration history and the live schema are not
available locally, and no remote SQL is executed by this project. The only
authoritative decision point is the `supabase_migrations.schema_migrations`
history together with a schema/RLS export from the target project.

Run the following as one reviewed change in a disposable Supabase project
first, then repeat against the intended project after taking a backup:

1. Export the schema, constraints, indexes, RLS policies, storage policies and
   migration history.
2. If neither `0002_teacher_operations` nor its equivalent schema exists, apply
   `0002_teacher_operations.sql` once.
3. If the legacy tables already exist and `0002` has not been applied, apply
   `0003_teacher_operations_corrective.sql` once. It preserves rows, backfills
   ownership only when the package owner is unambiguous, migrates legacy
   single-student classes only when that column exists, and aborts rather than
   guessing missing owners.
4. If `0002` is already present, do not apply `0002` again. `0003` is only
   needed for a demonstrably partial/legacy installation; its idempotent
   guards make it safe to review against the corrected shape, but it is not a
   replacement for migration history.
5. Verify that all teacher-operation tables have RLS enabled, teacher writes
   require `auth.uid()`, students can only read their own classes,
   participants, attendance and package assignments, and students have no
   direct `select` policy on `payments`.
6. Verify the private `materials` bucket and its object policies separately.
   Teacher uploads must be allowed only under the authenticated teacher path;
   student reads must be limited to material rows already visible to that
   student. The frontend then uses `file_path` and a one-hour signed URL.
7. Run positive and negative tests with separate teacher/student sessions,
   including cross-teacher foreign keys, repeated package assignments,
   payment visibility and private material access.

8. If Exercise Studio is required, apply `0004_exercise_studio.sql` after
   `0002`/`0003`. It adds private teacher authoring, explicit assignments,
   student attempts and a sanitized student view that never exposes answer
   keys or explanations. Test objective and open-answer attempts separately.

The exact remote blocker is the missing target project URL/credentials or an
export of its schema and `schema_migrations` history. Without that data, local
code cannot distinguish “both pending” from “0002 applied” safely.

The migrations are intentionally not applied by build or deployment.
