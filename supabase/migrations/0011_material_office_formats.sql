-- Extend the private materials bucket without removing existing formats or policies.
update storage.buckets
set allowed_mime_types = case when allowed_mime_types is null then null else
  array(select distinct unnest(allowed_mime_types || array[
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ])) end
where id = 'materials';