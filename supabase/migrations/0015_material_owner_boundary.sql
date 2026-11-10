-- 0015: Own-teacher material rows and Storage namespace boundary.
-- Additive access-policy hardening after 0013. No rows or objects are changed.
-- Compatibility: unowned (teacher_id IS NULL) metadata is available to assigned
-- approved students, while staff review requires an administrator. Staff cannot
-- access another teacher's Storage folder. Review legacy paths/ownership through
-- privileged SQL before changing them; do not infer an owner from an applicant.
begin;
alter table public.materials enable row level security;
-- Managed Storage can grant policy management without granting table ownership.
-- Skip an owner-only ALTER when RLS is already active; otherwise require ownership.
do $storage_rls$
begin
  if not (select c.relrowsecurity from pg_catalog.pg_class c
    where c.oid = 'storage.objects'::regclass) then
    alter table storage.objects enable row level security;
  end if;
end $storage_rls$;
revoke all on public.materials from anon;

-- Add administrator visibility only for legacy unowned metadata. Restrictive
-- policies below continue to apply; this grants no Storage-folder override.
drop policy if exists "admins review unowned material metadata" on public.materials;
create policy "admins review unowned material metadata" on public.materials
for select to authenticated
using (teacher_id is null and public.is_academic_admin());

drop policy if exists "material owner read boundary" on public.materials;
create policy "material owner read boundary" on public.materials as restrictive
for select to authenticated
using (
  case when public.is_academic_staff() then
    teacher_id = auth.uid() or (teacher_id is null and public.is_academic_admin())
  else
    public.student_has_academic_access(auth.uid())
      and (student_id = auth.uid() or audience = 'all')
  end
);

drop policy if exists "material owner insert boundary" on public.materials;
create policy "material owner insert boundary" on public.materials as restrictive
for insert to authenticated
with check (
  public.is_academic_staff()
  and (teacher_id = auth.uid() or (teacher_id is null and public.is_academic_admin()))
  and (student_id is null or public.can_teacher_access_student(auth.uid(), student_id))
  and (file_path is null or split_part(file_path, '/', 1) = auth.uid()::text)
);

drop policy if exists "material owner update boundary" on public.materials;
create policy "material owner update boundary" on public.materials as restrictive
for update to authenticated
using (
  public.is_academic_staff()
  and (teacher_id = auth.uid() or (teacher_id is null and public.is_academic_admin()))
)
with check (
  public.is_academic_staff()
  and (teacher_id = auth.uid() or (teacher_id is null and public.is_academic_admin()))
  and (student_id is null or public.can_teacher_access_student(auth.uid(), student_id))
  and (file_path is null or split_part(file_path, '/', 1) = auth.uid()::text)
);

drop policy if exists "material owner delete boundary" on public.materials;
create policy "material owner delete boundary" on public.materials as restrictive
for delete to authenticated
using (
  public.is_academic_staff()
  and (teacher_id = auth.uid() or (teacher_id is null and public.is_academic_admin()))
);

-- A restrictive SELECT is needed because 0005's permissive teacher SELECT
-- authorizes every teacher. For a student, retain exact assigned/global lookup
-- and ensure owned metadata points into its owner's folder. A preexisting forged
-- alias cannot turn a different teacher's object into an authorized download.
drop policy if exists "material storage owner read boundary" on storage.objects;
create policy "material storage owner read boundary" on storage.objects as restrictive
for select to authenticated
using (
  bucket_id <> 'materials'
  or case when public.is_academic_staff() then
    (storage.foldername(name))[1] = auth.uid()::text
  else
    public.student_has_academic_access(auth.uid())
    and exists (
      select 1 from public.materials m
      where m.file_path = storage.objects.name
        and (m.student_id = auth.uid() or m.audience = 'all')
        and (m.teacher_id is null
          or (storage.foldername(storage.objects.name))[1] = m.teacher_id::text)
    )
  end
);

drop policy if exists "material storage owner insert boundary" on storage.objects;
create policy "material storage owner insert boundary" on storage.objects as restrictive
for insert to authenticated
with check (
  bucket_id <> 'materials'
  or (public.is_academic_staff() and (storage.foldername(name))[1] = auth.uid()::text)
);
drop policy if exists "material storage owner update boundary" on storage.objects;
create policy "material storage owner update boundary" on storage.objects as restrictive
for update to authenticated
using (
  bucket_id <> 'materials'
  or (public.is_academic_staff() and (storage.foldername(name))[1] = auth.uid()::text)
)
with check (
  bucket_id <> 'materials'
  or (public.is_academic_staff() and (storage.foldername(name))[1] = auth.uid()::text)
);
drop policy if exists "material storage owner delete boundary" on storage.objects;
create policy "material storage owner delete boundary" on storage.objects as restrictive
for delete to authenticated
using (
  bucket_id <> 'materials'
  or (public.is_academic_staff() and (storage.foldername(name))[1] = auth.uid()::text)
);
drop policy if exists "material storage anonymous boundary" on storage.objects;
create policy "material storage anonymous boundary" on storage.objects as restrictive
for all to anon
using (bucket_id <> 'materials') with check (bucket_id <> 'materials');

notify pgrst, 'reload schema';
commit;
