-- Entry photo storage rules (#14). Run with `supabase test db`.
--
-- Rows are written to storage.objects directly, the way the Storage API
-- does after checking these same policies as the caller. Like the API, the
-- test sets storage.allow_delete_query so deletes get past the guard trigger.
begin;
select plan(9);
select set_config('storage.allow_delete_query', 'true', true);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

create function pg_temp.as_admin() returns void language sql as $$
  select set_config('role', 'postgres', true),
         set_config('request.jwt.claims', '', true);
$$;

-- Fixtures, as the superuser --------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

insert into public.shows (id, title) values ('5a000000-0000-0000-0000-000000000001', 'Hadestown');
insert into public.venues (id, name) values ('7e000000-0000-0000-0000-000000000001', 'Walter Kerr Theatre');

insert into public.entries (id, user_id, show_id, venue_id, date, visibility, photo_path) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001',
   '2026-10-10', 'public', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-000000000001.jpg'),
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001',
   '2026-10-11', 'private', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-000000000002.jpg');

select is(
  (select (public, allowed_mime_types) from storage.buckets where id = 'entry-photos')::text,
  '(f,{image/jpeg})',
  'the bucket is private and takes JPEGs only'
);

-- Writes ------------------------------------------------------------------------

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('entry-photos', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-000000000001.jpg', auth.uid()),
       ('entry-photos', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-000000000002.jpg', auth.uid()) $$,
  'owners upload into their own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('entry-photos', 'bbbbbbbb-0000-0000-0000-000000000000/x.jpg', auth.uid()) $$,
  '42501', null,
  'nobody uploads into someone else''s folder'
);

-- Reads -------------------------------------------------------------------------

select is(
  (select count(*)::int from storage.objects where bucket_id = 'entry-photos'),
  2,
  'owners see their public and private photos'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select is(
  (select array_agg(name)::text from storage.objects where bucket_id = 'entry-photos'),
  '{aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-000000000001.jpg}',
  'other users see only photos of public entries'
);

delete from storage.objects where bucket_id = 'entry-photos';
select pg_temp.as_admin();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'entry-photos'),
  2,
  'other users cannot delete someone''s photos'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'entry-photos'),
  1,
  'logged-out visitors see only photos of public entries'
);

-- Making an entry private hides its photo too.
select pg_temp.as_admin();
update public.entries set visibility = 'private' where id = 'e0000000-0000-0000-0000-000000000001';
select pg_temp.as_anon();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'entry-photos'),
  0,
  'a photo goes private with its entry'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

delete from storage.objects where bucket_id = 'entry-photos';
select pg_temp.as_admin();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'entry-photos'),
  0,
  'owners delete their own photos'
);

select * from finish();
rollback;
