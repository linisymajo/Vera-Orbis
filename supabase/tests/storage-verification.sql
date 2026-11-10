-- Read-only checks for a disposable/staging project after migrations 0005 and 0011.
-- Run with: psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/storage-verification.sql
begin read only;
do $$
declare bucket storage.buckets%rowtype; mime text;
begin
  select * into bucket from storage.buckets where id = 'materials';
  if not found then raise exception 'materials bucket is missing'; end if;
  if bucket.public is distinct from false then raise exception 'materials bucket must be private'; end if;
  if bucket.file_size_limit is distinct from 10485760 then raise exception 'materials size limit must be 10 MiB'; end if;
  foreach mime in array array[
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ] loop
    if bucket.allowed_mime_types is not null and not (mime = any(bucket.allowed_mime_types)) then
      raise exception 'Missing Office MIME type: %', mime;
    end if;
  end loop;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='storage' and c.relname='objects' and c.relrowsecurity) then
    raise exception 'storage.objects RLS must be enabled';
  end if;
end $$;
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='materials';
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
select count(*) as stored_material_objects from storage.objects where bucket_id='materials';
rollback;

