-- Entry photos (#14, shared with #18): one JPEG per entry at
-- `entry-photos/{user_id}/{entry_id}.jpg`.
--
-- The client re-encodes every photo to JPEG on the device before upload,
-- which drops all EXIF/GPS metadata, so nothing stored here carries location.
-- The bucket is private: files are read through signed URLs, and the select
-- policy decides who may sign one. The owner always can; anyone else only
-- when the entry that points at the file is public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entry-photos', 'entry-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The first folder of the path is the owner's id. Owners write only there.
create policy "Owners upload entry photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'entry-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners replace entry photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'entry-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'entry-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners delete entry photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'entry-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Read: the owner, or anyone when a public entry uses the file.
create policy "Entry photos follow entry visibility"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'entry-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.entries e
        where e.photo_path = objects.name and e.visibility = 'public'
      )
    )
  );

create index entries_photo_path on public.entries (photo_path) where photo_path is not null;
