-- 0005_materials_storage_policy.sql
-- Private Storage RLS for materials bucket: least-privilege student and teacher access.
-- Applies to storage.objects. Keeps the 'materials' bucket strictly private.

-- 1. Ensure the 'materials' bucket exists and is private (public = false)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('materials', 'materials', false)
  on conflict (id) do update set public = false;

  -- Configure file size limit (10MB) if the column exists in this Supabase version
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) then
    update storage.buckets
    set file_size_limit = 10485760
    where id = 'materials';
  end if;

  -- Configure allowed MIME types if the column exists
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types'
  ) then
    update storage.buckets
    set allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'video/mp4'
    ]
    where id = 'materials';
  end if;
end $$;

-- 2. Ensure RLS is active on storage.objects
alter table storage.objects enable row level security;

-- 3. Clean up any previous, contradictory, or overly-restrictive materials policies
drop policy if exists "Students can read assigned materials" on storage.objects;
drop policy if exists "Students read assigned materials" on storage.objects;
drop policy if exists "Allow authenticated students to read files assigned through public.materials" on storage.objects;
drop policy if exists "Give students access to own folder" on storage.objects;
drop policy if exists "Students can only access own folder" on storage.objects;
drop policy if exists "student_materials_select" on storage.objects;
drop policy if exists "materials_student_select" on storage.objects;
drop policy if exists "Teachers can read materials" on storage.objects;
drop policy if exists "Teachers can upload materials" on storage.objects;
drop policy if exists "Teachers can update materials" on storage.objects;
drop policy if exists "Teachers can delete materials" on storage.objects;

-- 4. STUDENT READ POLICY (PERMISSIVE):
-- Authenticated students can read ONLY files that match an assignment in public.materials
-- where the student_id matches their own auth.uid() or audience is 'all'.
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

-- 5. TEACHER READ POLICY (PERMISSIVE):
-- Teachers can view files in their own folder prefix or if verified in public.teachers.
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
