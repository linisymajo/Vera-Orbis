# Students directory redesign

Production target: iopgzmvaqobigjwibual. This is a frontend-only release inside the existing Teacher Dashboard. No SQL, RLS, Auth roles, Edge Functions, provider secrets, inference settings, Vera Voice or billing changes are included. The pre-release live source is 8287b3dcd57e17f3d4a28a2dca9e6f6df3c9b5db.

## Interface

Replace the tall record cards with compact desktop directory rows and mobile cards. Show initials/name, language/level, active package, separately labelled learning evidence, status and a contextual menu. Search, status/language filters and summary counts use only the current authorized roster. Detail opens in an accessible native dialog with seven keyboard-navigable sections: Overview, Learning Journey, Learning Plans, Exercise Submissions, Materials & Classes, Assessments & Feedback, Enrollment & Administration. The existing profile editor, Journey, plans, private file downloads, confirmations and administrator-only deletion service remain in use. Inactive records retain authorized read-only history; editing follows existing enrollment permissions.

The student-to-Exercise Studio handoff now preselects the requested student for a new exercise as well as a lesson-derived draft. It does not create an assignment or change publication rules.

## Verified metric definitions

| Indicator | Source and interpretation |
| --- | --- |
| Recorded lesson history | profiles.lessons_completed and total_lessons; manual academic counter and target, not verified course completion |
| Attendance verified | Completed classes with present/late attendance, scoped to the enrollment/retained roster teacher by the existing RPC |
| Assigned lesson allowance | packages.class_count for each student_packages assignment; assignment alone is not proof of payment |
| Package usage | student_packages.classes_consumed, independent of profile lesson counters |
| Remaining allowance | The active assignment's own allowance minus its own consumption; invalid/over-consumed values require review instead of clamping |
| Enrollment teacher | enrollments.teacher_id, independent of the package's assigning teacher |

A read-only production check confirmed the actual columns and no automatic profile-to-package consumption synchronization. It found 3 students with recorded lessons but zero active package usage, and 3 students with packages but no enrollment teacher. These are separate sources; no records have been reconciled or altered. An RPC attendance zero without an enrollment teacher is displayed as unlinked/unverified, rather than asserted as no completed lessons. Cancelled/expired/exhausted packages do not inflate the active allowance. Stored history remains accessible in profile detail.

## Validation and release

Sixteen focused Node tests pass. Five distinct Chromium scenarios cover safe enrollment actions, typed administrator confirmation, student handoff, responsive/keyboard detail navigation and ledger/filter/feedback permission boundaries. Final receipts record the exact passing runs. The production artifact is scanned for private credentials and staging values; inference remains disabled. Publish only the source/test files in student-directory-redesign-manifest.json and these release/status documents from the isolated worktree through the existing Pages workflow. No secret or repository variable changes are needed.

After publishing, verify the actual founder/Vera Test sessions, real metric mapping, all seven sections, existing workspace handoffs, desktop/mobile geometry and screenshots. Limit any test enrollment writes to Vera Test, preserve the original final active/approved association, and never confirm permanent deletion. Screenshots exclude or mask personal contact details. Production verification is pending until receipts confirm it.

## Rollback

Republish 8287b3dcd57e17f3d4a28a2dca9e6f6df3c9b5db through the existing Pages workflow. There are no database or server configuration changes to revert. Preserve every existing academic record, enrollment, file and permission. The existing encrypted database/Auth/Storage backup and recovery procedure remain separate; this UI release does not perform a restore.
