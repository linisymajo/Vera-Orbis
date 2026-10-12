-- 0005_materials_storage_policy.sql
-- Private Storage RLS for materials bucket: least-privilege student and teacher access.
-- Applies to storage.objects. Requires the private 'materials' bucket.

-- 1. Ensure the private 'materials' bucket exists and is not public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  10485760, -- 10 MB limit
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760;

-- 2. Ensure RLS is active on storage.objects
alter table storage.objects enable row level security;

-- 3. Clean up any previous conflicting or overly-restrictive materials policies
drop policy if exists "Students can read assigned materials" on storage.objects;
drop policy if exists "Teachers can read materials" on storage.objects;
drop policy if exists "Teachers can upload materials" on storage.objects;
drop policy if exists "Teachers can update materials" on storage.objects;
drop policy if exists "Teachers can delete materials" on storage.objects;
drop policy if exists "Give students access to own folder" on storage.objects;
drop policy if exists "student_materials_select" on storage.objects;
drop policy if exists "materials_student_select" on storage.objects;

-- 4. STUDENT READ POLICY:
-- Allows authenticated students to read ONLY materials explicitly assigned to them
-- or marked for audience = 'all' in public.materials matching the exact object name.
create policy "Students can read assigned materials"
on storage.objects for select to authenticated
using (
  bucket_id = 'materials'
  and exists (
    select 1
    from public.materials m
    where m.file_path = storage.objects.name
      and (
        m.student_id = (select auth.uid())
        or m.audience = 'all'
      )
  )
);

-- 5. TEACHER READ POLICY:
-- Allows authenticated teachers to view their own uploaded materials
-- or any material if registered as a teacher.
create policy "Teachers can read materials"
on storage.objects for select to authenticated
using (
  bucket_id = 'materials'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.teachers t
      where t.id = (select auth.uid())
    )
  )
);

-- 6. TEACHER INSERT POLICY:
-- Teachers can upload materials only inside their own folder: ${teacher_id}/...
create policy "Teachers can upload materials"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.teachers t
    where t.id = (select auth.uid())
  )
);

-- 7. TEACHER UPDATE POLICY:
-- Teachers can only update files in their own folder.
create policy "Teachers can update materials"
on storage.objects for update to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 8. TEACHER DELETE POLICY:
-- Teachers can only delete files in their own folder.
create policy "Teachers can delete materials"
on storage.objects for delete to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
