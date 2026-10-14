-- Schema v1 privacy and integrity rules (#12). Run with `supabase test db`.
--
-- Users are created in auth.users (the sign-up trigger makes their profiles).
-- `as_user` switches to the `authenticated` role with that user's JWT, the
-- way PostgREST does for a real request.
begin;
select plan(49);

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

select is(
  (select count(*)::int from public.profiles
   where id in ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000')),
  2,
  'signing up creates a profile'
);

select is(
  (select default_visibility from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'public'::public.visibility,
  'profiles default to public'
);

update public.profiles set handle = 'alice' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set handle = 'bob', default_visibility = 'private'
  where id = 'bbbbbbbb-0000-0000-0000-000000000000';

insert into public.shows (id, title, type, created_by, verified) values
  ('5a000000-0000-0000-0000-000000000001', 'Hamilton', 'musical', null, true),
  ('5a000000-0000-0000-0000-000000000002', 'Operation Mincemeat', 'musical', null, true),
  ('5a000000-0000-0000-0000-000000000003', 'Hadestown', 'musical', null, true);

insert into public.venues (id, name, city, country, lat, lng, verified) values
  ('7e000000-0000-0000-0000-000000000001', 'Richard Rodgers Theatre', 'New York', 'US', 40.7590, -73.9867, true),
  ('7e000000-0000-0000-0000-000000000002', 'Fortune Theatre', 'London', 'GB', 51.5130, -0.1210, true),
  ('7e000000-0000-0000-0000-000000000003', 'Fortune Theatre', 'Dunedin', 'NZ', -45.8740, 170.5030, true);

-- Profiles ----------------------------------------------------------------------

select throws_ok(
  $$ update public.profiles set handle = 'Alice' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'handles must be lowercase'
);

select throws_ok(
  $$ update public.profiles set handle = 'al' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'handles must be at least 3 characters'
);

select pg_temp.as_anon();

select is(
  (select handle::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'alice',
  'anon can read a handle'
);

select throws_ok(
  $$ select default_visibility from public.profiles $$,
  '42501', null,
  'anon cannot read default_visibility'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select lives_ok(
  $$ update public.profiles set display_name = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'updating someone else''s profile runs...'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  null,
  '...but changes nothing'
);

select lives_ok(
  $$ update public.profiles set display_name = 'Alice A' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'users can update their own profile'
);

select throws_ok(
  $$ insert into public.profiles (id) values (gen_random_uuid()) $$,
  '42501', null,
  'clients cannot create profiles directly'
);

-- Entries: defaults and the rating check -------------------------------------------

-- Alice (default public) logs one entry with the default and one private.
select lives_ok(
  $$ insert into public.entries (id, show_id, venue_id, date, rating, note)
     values ('e0000000-0000-0000-0000-00000000000a', '5a000000-0000-0000-0000-000000000001',
             '7e000000-0000-0000-0000-000000000001', '2026-10-14', 4.5, 'Wow') $$,
  'a user can log an entry'
);

select is(
  (select visibility from public.entries where id = 'e0000000-0000-0000-0000-00000000000a'),
  'public'::public.visibility,
  'entries take the profile default (public)'
);

select is(
  (select user_id from public.entries where id = 'e0000000-0000-0000-0000-00000000000a'),
  'aaaaaaaa-0000-0000-0000-000000000000'::uuid,
  'user_id defaults to the signed-in user'
);

insert into public.entries (id, show_id, venue_id, date, visibility)
values ('e0000000-0000-0000-0000-00000000000b', '5a000000-0000-0000-0000-000000000002',
        '7e000000-0000-0000-0000-000000000002', '2026-09-01', 'private');

select throws_ok(
  $$ insert into public.entries (show_id, venue_id, date, rating)
     values ('5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-14', 0.3) $$,
  '23514', null,
  'rating 0.3 is rejected'
);

select throws_ok(
  $$ insert into public.entries (show_id, venue_id, date, rating)
     values ('5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-14', 5.5) $$,
  '23514', null,
  'rating 5.5 is rejected'
);

select throws_ok(
  $$ insert into public.entries (show_id, venue_id, date, rating)
     values ('5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-14', 0.45) $$,
  '23514', null,
  'rating 0.45 is rejected, not rounded'
);

select lives_ok(
  $$ insert into public.entries (show_id, venue_id, date, rating)
     values ('5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-15', 0.5),
            ('5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-16', 5),
            ('5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-17', null) $$,
  'ratings 0.5, 5 and none are accepted'
);

-- Bob (default private) logs one entry.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

insert into public.entries (id, show_id, venue_id, date)
values ('e0000000-0000-0000-0000-0000000000bb', '5a000000-0000-0000-0000-000000000003',
        '7e000000-0000-0000-0000-000000000001', '2026-10-13');

select is(
  (select visibility from public.entries where id = 'e0000000-0000-0000-0000-0000000000bb'),
  'private'::public.visibility,
  'entries take the profile default (private)'
);

-- Entries: who can read and write what ---------------------------------------------

select pg_temp.as_anon();

select ok(
  exists (select 1 from public.entries where id = 'e0000000-0000-0000-0000-00000000000a'),
  'anon can read a public entry'
);

select ok(
  not exists (select 1 from public.entries
              where id in ('e0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-0000000000bb')),
  'anon cannot read private entries'
);

select throws_ok(
  $$ insert into public.entries (user_id, show_id, venue_id, date)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001',
             '7e000000-0000-0000-0000-000000000001', '2026-10-14') $$,
  '42501', null,
  'anon cannot log entries'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select ok(
  exists (select 1 from public.entries where id = 'e0000000-0000-0000-0000-00000000000a'),
  'user B can read user A''s public entry'
);

select ok(
  not exists (select 1 from public.entries where id = 'e0000000-0000-0000-0000-00000000000b'),
  'user B cannot read user A''s private entry'
);

select throws_ok(
  $$ insert into public.entries (user_id, show_id, venue_id, date)
     values ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001',
             '7e000000-0000-0000-0000-000000000001', '2026-10-14') $$,
  '42501', null,
  'user B cannot log an entry as user A'
);

update public.entries set note = 'Hacked'
  where id in ('e0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000b');
delete from public.entries
  where id in ('e0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000b');

update public.entries set user_id = 'bbbbbbbb-0000-0000-0000-000000000000'
  where id = 'e0000000-0000-0000-0000-00000000000a';

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select results_eq(
  $$ select id, note from public.entries
     where id in ('e0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000b')
     order by id $$,
  $$ values ('e0000000-0000-0000-0000-00000000000a'::uuid, 'Wow'),
            ('e0000000-0000-0000-0000-00000000000b'::uuid, null) $$,
  'user B could not edit or delete user A''s entries'
);

select is(
  (select user_id from public.entries where id = 'e0000000-0000-0000-0000-00000000000a'),
  'aaaaaaaa-0000-0000-0000-000000000000'::uuid,
  'user B could not take over user A''s entry'
);

select ok(
  not exists (select 1 from public.entries where id = 'e0000000-0000-0000-0000-0000000000bb'),
  'user A cannot read user B''s private entry'
);

select lives_ok(
  $$ update public.entries set note = 'Wow. Add a review later = edit the note.'
     where id = 'e0000000-0000-0000-0000-00000000000a' $$,
  'owners can edit their entries'
);

-- now() is fixed inside this test's transaction, so check the trigger exists.
select has_trigger('public', 'entries', 'entries_updated_at', 'editing an entry sets updated_at');

-- Collections and links -----------------------------------------------------------

select lives_ok(
  $$ insert into public.collections (id, name, kind, start_date, end_date) values
       ('c0000000-0000-0000-0000-00000000000a', 'NYC Oct 2026', 'trip', '2026-10-12', '2026-10-18') $$,
  'a user can create a trip'
);

-- A label (kind kept for later) needs no dates. It holds only a private show.
insert into public.collections (id, name, kind) values
  ('c0000000-0000-0000-0000-00000000000b', 'Secret label', 'label');

select throws_ok(
  $$ insert into public.collections (name, start_date, end_date) values ('Backwards', '2026-10-18', '2026-10-12') $$,
  '23514', null,
  'a trip cannot end before it starts'
);

select lives_ok(
  $$ insert into public.entry_collections (entry_id, collection_id) values
       ('e0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a'),
       ('e0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b') $$,
  'owners can add their entries to their collections'
);

select throws_ok(
  $$ insert into public.entry_collections (entry_id, collection_id) values
       ('e0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000a') $$,
  '23514', null,
  'a show dated outside a trip cannot be added to it'
);

select pg_temp.as_anon();

select ok(
  exists (select 1 from public.collections where id = 'c0000000-0000-0000-0000-00000000000a')
  and not exists (select 1 from public.collections where id = 'c0000000-0000-0000-0000-00000000000b'),
  'anon can read a trip with a public show, but not one with only private shows'
);

select results_eq(
  $$ select entry_id, collection_id from public.entry_collections $$,
  $$ values ('e0000000-0000-0000-0000-00000000000a'::uuid, 'c0000000-0000-0000-0000-00000000000a'::uuid) $$,
  'anon sees only links to public shows'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select ok(
  not exists (select 1 from public.collections where id = 'c0000000-0000-0000-0000-00000000000b'),
  'user B cannot read user A''s private collection'
);

insert into public.collections (id, name, start_date, end_date)
values ('c0000000-0000-0000-0000-0000000000bb', 'Bob''s trip', '2026-10-01', '2026-10-31');

select throws_ok(
  $$ insert into public.entry_collections (entry_id, collection_id)
     values ('e0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000bb') $$,
  '42501', null,
  'user B cannot add user A''s entry to their own collection'
);

select throws_ok(
  $$ insert into public.entry_collections (entry_id, collection_id)
     values ('e0000000-0000-0000-0000-0000000000bb', 'c0000000-0000-0000-0000-00000000000a') $$,
  '42501', null,
  'user B cannot add their entry to user A''s collection'
);

delete from public.entry_collections;
update public.collections set name = 'Hacked' where id = 'c0000000-0000-0000-0000-00000000000a';

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.entry_collections),
  2,
  'user B could not remove user A''s links'
);

select is(
  (select name from public.collections where id = 'c0000000-0000-0000-0000-00000000000a'),
  'NYC Oct 2026',
  'user B could not rename user A''s trip'
);

-- Catalogue: shows and venues -------------------------------------------------------

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.shows), 3,
  'anon can read shows'
);

select throws_ok(
  $$ insert into public.shows (title) values ('Anon Show') $$,
  '42501', null,
  'anon cannot add shows'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into public.shows (id, title, type) values ('5a000000-0000-0000-0000-00000000000a', 'Alice''s Fringe Show', 'comedy') $$,
  'signed-in users can add shows'
);

select throws_ok(
  $$ insert into public.shows (title, verified) values ('Self-verified', true) $$,
  '42501', null,
  'users cannot mark a show verified'
);

update public.shows set title = 'Renamed' where id = '5a000000-0000-0000-0000-000000000001';

select is(
  (select title from public.shows where id = '5a000000-0000-0000-0000-000000000001'),
  'Hamilton',
  'users cannot edit verified (seeded) shows'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

update public.shows set title = 'Hacked' where id = '5a000000-0000-0000-0000-00000000000a';

select is(
  (select title from public.shows where id = '5a000000-0000-0000-0000-00000000000a'),
  'Alice''s Fringe Show',
  'users cannot edit shows someone else added'
);

-- Search ----------------------------------------------------------------------------

select pg_temp.as_anon();

select is(
  (select title from public.search_shows('hamiltn') limit 1),
  'Hamilton',
  'search_shows tolerates typos'
);

select is(
  (select title from public.search_shows('mincemeat') limit 1),
  'Operation Mincemeat',
  'search_shows matches part of a title'
);

select is(
  (select city from public.search_venues('fortune theatre', -45.87, 170.50) limit 1),
  'Dunedin',
  'search_venues ranks the nearby venue first'
);

select * from finish();
rollback;
