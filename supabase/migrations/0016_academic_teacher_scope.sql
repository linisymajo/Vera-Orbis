-- 0016: bound legacy broad academic policies to record ownership and enrollment.
-- Apply after 0009 and 0013, following live-schema review and staging verification.
-- Restrictive policies only: existing permissive policies must also allow access.
-- No records, ownership values, table grants or enrollment sources are changed.
begin;

-- A null owner is writable only when the existing row already has a null owner.
-- This prevents clearing an owned row's teacher_id to manufacture a legacy row.
create or replace function public.can_update_legacy_academic_feedback(p_feedback_id uuid,p_student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_teacher_access_student(auth.uid(),p_student_id) and exists(
    select 1 from public.feedback f
    where f.id=p_feedback_id and f.student_id=p_student_id and f.teacher_id is null
  );
$$;
revoke all on function public.can_update_legacy_academic_feedback(uuid,uuid) from public,anon;
grant execute on function public.can_update_legacy_academic_feedback(uuid,uuid) to authenticated;

alter table public.feedback enable row level security;
drop policy if exists "academic feedback select scope" on public.feedback;
create policy "academic feedback select scope" on public.feedback as restrictive
for select to authenticated using (
  (student_id=(select auth.uid()) and public.student_has_academic_access((select auth.uid())))
  or ((teacher_id=(select auth.uid()) or teacher_id is null)
    and public.can_teacher_access_student((select auth.uid()),student_id))
);
drop policy if exists "academic feedback insert scope" on public.feedback;
create policy "academic feedback insert scope" on public.feedback as restrictive
for insert to authenticated with check (
  teacher_id=(select auth.uid())
  and public.can_teacher_access_student((select auth.uid()),student_id)
);
drop policy if exists "academic feedback update scope" on public.feedback;
create policy "academic feedback update scope" on public.feedback as restrictive
for update to authenticated using (
  (teacher_id=(select auth.uid()) or teacher_id is null)
  and public.can_teacher_access_student((select auth.uid()),student_id)
) with check (
  (teacher_id=(select auth.uid())
    and public.can_teacher_access_student((select auth.uid()),student_id))
  or (teacher_id is null and public.can_update_legacy_academic_feedback(id,student_id))
);
drop policy if exists "academic feedback delete scope" on public.feedback;
create policy "academic feedback delete scope" on public.feedback as restrictive
for delete to authenticated using (
  (teacher_id=(select auth.uid()) or teacher_id is null)
  and public.can_teacher_access_student((select auth.uid()),student_id)
);

alter table public.weekly_challenges enable row level security;
drop policy if exists "academic challenge select scope" on public.weekly_challenges;
create policy "academic challenge select scope" on public.weekly_challenges as restrictive
for select to authenticated using (
  (public.student_has_academic_access((select auth.uid()))
    and (student_id=(select auth.uid()) or audience='all'))
  or (teacher_id=(select auth.uid()) and public.is_academic_staff()
    and (student_id is null or public.can_teacher_access_student((select auth.uid()),student_id)))
);
drop policy if exists "academic challenge insert scope" on public.weekly_challenges;
create policy "academic challenge insert scope" on public.weekly_challenges as restrictive
for insert to authenticated with check (
  teacher_id=(select auth.uid()) and public.is_academic_staff()
  and (student_id is null or public.can_teacher_access_student((select auth.uid()),student_id))
);
drop policy if exists "academic challenge update scope" on public.weekly_challenges;
create policy "academic challenge update scope" on public.weekly_challenges as restrictive
for update to authenticated using (
  teacher_id=(select auth.uid()) and public.is_academic_staff()
  and (student_id is null or public.can_teacher_access_student((select auth.uid()),student_id))
) with check (
  teacher_id=(select auth.uid()) and public.is_academic_staff()
  and (student_id is null or public.can_teacher_access_student((select auth.uid()),student_id))
);
drop policy if exists "academic challenge delete scope" on public.weekly_challenges;
create policy "academic challenge delete scope" on public.weekly_challenges as restrictive
for delete to authenticated using (
  teacher_id=(select auth.uid()) and public.is_academic_staff()
  and (student_id is null or public.can_teacher_access_student((select auth.uid()),student_id))
);

alter table public.challenge_submissions enable row level security;
drop policy if exists "academic challenge response select scope" on public.challenge_submissions;
create policy "academic challenge response select scope" on public.challenge_submissions as restrictive
for select to authenticated using (
  (student_id=(select auth.uid()) and public.student_has_academic_access((select auth.uid())))
  or (public.can_teacher_access_student((select auth.uid()),student_id) and exists(
    select 1 from public.weekly_challenges c where c.id=challenge_submissions.challenge_id
      and c.teacher_id=(select auth.uid())
      and (c.student_id=challenge_submissions.student_id or c.audience='all')
  ))
);
drop policy if exists "academic challenge response insert scope" on public.challenge_submissions;
create policy "academic challenge response insert scope" on public.challenge_submissions as restrictive
for insert to authenticated with check (
  (student_id=(select auth.uid()) and public.student_has_academic_access((select auth.uid()))
    and status='submitted' and teacher_feedback is null and exists(
      select 1 from public.weekly_challenges c where c.id=challenge_submissions.challenge_id
        and c.status='active' and (c.end_date is null or c.end_date>now())
        and (c.student_id=(select auth.uid()) or c.audience='all')
    ))
  or (public.can_teacher_access_student((select auth.uid()),student_id) and exists(
    select 1 from public.weekly_challenges c where c.id=challenge_submissions.challenge_id
      and c.teacher_id=(select auth.uid())
      and (c.student_id=challenge_submissions.student_id or c.audience='all')
  ))
);
drop policy if exists "academic challenge response update scope" on public.challenge_submissions;
create policy "academic challenge response update scope" on public.challenge_submissions as restrictive
for update to authenticated using (
  public.can_teacher_access_student((select auth.uid()),student_id) and exists(
    select 1 from public.weekly_challenges c where c.id=challenge_submissions.challenge_id
      and c.teacher_id=(select auth.uid())
      and (c.student_id=challenge_submissions.student_id or c.audience='all')
  )
) with check (
  public.can_teacher_access_student((select auth.uid()),student_id) and exists(
    select 1 from public.weekly_challenges c where c.id=challenge_submissions.challenge_id
      and c.teacher_id=(select auth.uid())
      and (c.student_id=challenge_submissions.student_id or c.audience='all')
  )
);
drop policy if exists "academic challenge response delete scope" on public.challenge_submissions;
create policy "academic challenge response delete scope" on public.challenge_submissions as restrictive
for delete to authenticated using (
  public.can_teacher_access_student((select auth.uid()),student_id) and exists(
    select 1 from public.weekly_challenges c where c.id=challenge_submissions.challenge_id
      and c.teacher_id=(select auth.uid())
      and (c.student_id=challenge_submissions.student_id or c.audience='all')
  )
);

notify pgrst,'reload schema';
commit;
