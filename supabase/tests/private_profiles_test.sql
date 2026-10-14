-- Private profiles hide public entries, trips, links and photos from everyone
-- but the owner, and a handle can't be removed once set.
-- Run with `supabase test db`.
begin;
select plan(14);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- Fixtures, as the superuser --------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

update public.profiles set handle = 'alice' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set handle = 'bob' where id = 'bbbbbbbb-0000-0000-0000-000000000000';

insert into public.shows (id, title) values ('5a000000-0000-0000-0000-000000000001', 'Hamilton');
insert into public.venues (id, name, city) values
  ('7e000000-0000-0000-0000-000000000001', 'Richard Rodgers Theatre', 'New York');

insert into public.entries (id, user_id, show_id, venue_id, date, visibility, photo_path) values
  ('e0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-01', 'public',
   'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000a.jpg');

insert into public.collections (id, user_id, name, start_date, end_date) values
  ('c0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'NYC Oct 2026', '2026-10-01', '2026-10-05');

insert into public.entry_collections (entry_id, collection_id) values
  ('e0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a');

insert into storage.objects (bucket_id, name, owner) values
  ('entry-photos', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000a.jpg',
   'aaaaaaaa-0000-0000-0000-000000000000');

-- Public profile: as before -----------------------------------------------------

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  1,
  'anon sees a public profile''s public entry'
);

-- Alice goes private ------------------------------------------------------------

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ update public.profiles set is_private = true where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a user can make their profile private'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'anon cannot see a private profile''s public entries'
);

select is(
  (select count(*)::int from public.collections where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'anon cannot see a private profile''s public trips'
);

select is(
  (select count(*)::int from public.entry_collections where collection_id = 'c0000000-0000-0000-0000-00000000000a'),
  0,
  'anon cannot see a private profile''s trip links'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'entry-photos'
     and name like 'aaaaaaaa-0000-0000-0000-000000000000/%'),
  0,
  'anon cannot read a private profile''s photos'
);

select results_eq(
  $$ select shows from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (0) $$,
  'a private profile''s stats are zero for anon'
);

select is(
  (select handle::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000' and is_private),
  'alice',
  'anon still sees the handle and that the profile is private'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'other signed-in users cannot see a private profile''s entries'
);

select lives_ok(
  $$ update public.profiles set is_private = false where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'another user''s update runs...'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select is(
  (select is_private from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  true,
  '...but changes nothing'
);

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  1,
  'the owner still sees their own entries'
);

-- Handles -----------------------------------------------------------------------

select throws_ok(
  $$ update public.profiles set handle = null where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'a handle cannot be removed once set'
);

select lives_ok(
  $$ update public.profiles set handle = 'alice_a' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a handle can still be changed'
);

select * from finish();
rollback;
