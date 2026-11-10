-- 0017: Inbox participant authorization after 0010 and 0013.
-- Preserve the existing student-own-thread representation and all stored messages.
-- Existing anti-spoofing/immutability triggers and column grants remain in force.
begin;
alter table public.inbox_messages enable row level security;

drop policy if exists "inbox participant read boundary" on public.inbox_messages;
create policy "inbox participant read boundary" on public.inbox_messages as restrictive
for select to authenticated
using (
  case when public.is_academic_staff() then
    sender_id = auth.uid() or recipient_id = auth.uid()
    or (sender_role = 'student' and sender_id = recipient_id
      and public.can_teacher_access_student(auth.uid(), sender_id))
  else
    public.student_has_academic_access(auth.uid())
    and (sender_id = auth.uid() or recipient_id = auth.uid())
  end
);

drop policy if exists "inbox authorized insert boundary" on public.inbox_messages;
create policy "inbox authorized insert boundary" on public.inbox_messages as restrictive
for insert to authenticated
with check (
  is_read = false and read_at is null
  and case when public.is_academic_staff() then
    sender_id = auth.uid() and sender_role = 'teacher' and recipient_role = 'student'
      and public.can_teacher_access_student(auth.uid(), recipient_id)
  else
    public.student_has_academic_access(auth.uid())
    and sender_id = auth.uid() and sender_role = 'student'
    and (
      (recipient_id = auth.uid() and recipient_role = 'student')
      or (recipient_role = 'teacher'
        and public.can_teacher_access_student(recipient_id, auth.uid()))
    )
  end
);

-- Students cannot SELECT the teachers roster after 0013. This narrow grant uses
-- the server helper instead of 0010's roster subquery and allows an explicitly
-- addressed message when that teacher has an existing recipient profile.
-- The existing own-thread UI works without a profile row for the teacher.
drop policy if exists "enrolled students send assigned inbox messages" on public.inbox_messages;
create policy "enrolled students send assigned inbox messages" on public.inbox_messages
for insert to authenticated
with check (
  not public.is_academic_staff()
  and public.student_has_academic_access(auth.uid())
  and sender_id = auth.uid() and sender_role = 'student'
  and (
    (recipient_id = auth.uid() and recipient_role = 'student')
    or (recipient_role = 'teacher'
      and public.can_teacher_access_student(recipient_id, auth.uid()))
  )
);

drop policy if exists "inbox recipient update boundary" on public.inbox_messages;
create policy "inbox recipient update boundary" on public.inbox_messages as restrictive
for update to authenticated
using (
  case when public.is_academic_staff() then
    recipient_id = auth.uid()
    or (sender_role = 'student' and sender_id = recipient_id
      and public.can_teacher_access_student(auth.uid(), sender_id))
  else
    public.student_has_academic_access(auth.uid()) and recipient_id = auth.uid()
      and sender_id is distinct from auth.uid()
  end
)
with check (
  case when public.is_academic_staff() then
    recipient_id = auth.uid()
    or (sender_role = 'student' and sender_id = recipient_id
      and public.can_teacher_access_student(auth.uid(), sender_id))
  else
    public.student_has_academic_access(auth.uid()) and recipient_id = auth.uid()
      and sender_id is distinct from auth.uid()
  end
);

drop policy if exists "inbox participant delete boundary" on public.inbox_messages;
create policy "inbox participant delete boundary" on public.inbox_messages as restrictive
for delete to authenticated
using (
  public.is_academic_staff()
  and (
    sender_id = auth.uid() or recipient_id = auth.uid()
    or (sender_role = 'student' and sender_id = recipient_id
      and public.can_teacher_access_student(auth.uid(), sender_id))
  )
);

-- SECURITY DEFINER bypasses RLS: repeat the same recipient and assigned-thread
-- condition explicitly. A sender cannot mark a different recipient's copy read.
create or replace function public.mark_inbox_message_as_read(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$ declare v_count integer;
begin
  if auth.uid() is null or not (
      public.is_academic_staff() or public.student_has_academic_access(auth.uid())) then
    raise exception 'Approved academic access required';
  end if;
  update public.inbox_messages
  set is_read = true, read_at = coalesce(read_at, now()), updated_at = now()
  where id = p_message_id and (
    (recipient_id = auth.uid() and sender_id is distinct from auth.uid())
    or (
      public.is_academic_staff()
      and sender_role = 'student' and sender_id = recipient_id
      and public.can_teacher_access_student(auth.uid(), sender_id)
    )
  );
  get diagnostics v_count = row_count;
  return v_count > 0;
end; $$;
revoke all on function public.mark_inbox_message_as_read(uuid) from public, anon;
grant execute on function public.mark_inbox_message_as_read(uuid) to authenticated;
revoke all on public.inbox_messages from anon;
notify pgrst, 'reload schema';
commit;
