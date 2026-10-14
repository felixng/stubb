-- Profile photos: one JPEG per upload at `avatars/{user_id}/{timestamp}.jpg`,
-- linked from profiles.avatar_url.
--
-- Avatars are public by design (a private profile still shows its avatar), so
-- the bucket is public and served by plain URL. Each upload gets a new name,
-- so a changed photo never shows stale from a cache; the client deletes the
-- old file afterwards. Like entry photos, the client re-encodes on the device
-- first, which drops all EXIF/GPS metadata.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The first folder of the path is the owner's id. Owners write only there.
create policy "Owners upload avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners delete avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Public URLs don't need this; the Storage API does, to find what it deletes.
-- Owners only, so nobody can list everyone's avatars.
create policy "Owners see their avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
