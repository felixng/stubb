-- Follows: who can follow, approve and unfollow; that approved followers (and
-- only they) see a private profile's public rows; and who sees follow lists.
-- Run with `supabase test db`.
begin;
select plan(33);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- Alice is private, Bob and Carol are public. Alice has a public and a
-- private entry, in a trip, both with photos.
-- Fixtures, as the superuser --------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.com');

update public.profiles set handle = 'alice', is_private = true where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set handle = 'bob' where id = 'bbbbbbbb-0000-0000-0000-000000000000';
update public.profiles set handle = 'carol' where id = 'cccccccc-0000-0000-0000-000000000000';

insert into public.shows (id, title) values ('5a000000-0000-0000-0000-000000000001', 'Hamilton');
insert into public.venues (id, name, city) values
  ('7e000000-0000-0000-0000-000000000001', 'Richard Rodgers Theatre', 'New York');

insert into public.entries (id, user_id, show_id, venue_id, date, visibility, photo_path) values
  ('e0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-01', 'public',
   'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000a.jpg'),
  ('e0000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-02', 'private',
   'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000b.jpg');

insert into public.collections (id, user_id, name, start_date, end_date) values
  ('c0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'NYC Oct 2026', '2026-10-01', '2026-10-05');

insert into public.entry_collections (entry_id, collection_id) values
  ('e0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a'),
  ('e0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000a');

insert into storage.objects (bucket_id, name, owner) values
  ('entry-photos', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000a.jpg',
   'aaaaaaaa-0000-0000-0000-000000000000'),
  ('entry-photos', 'aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000b.jpg',
   'aaaaaaaa-0000-0000-0000-000000000000');

-- Following a public profile ----------------------------------------------------

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into public.follows (follower_id, followee_id)
     values ('cccccccc-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000') $$,
  'a user can follow a public profile'
);

select is(
  (select status from public.follows where followee_id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  'accepted',
  'following a public profile takes effect at once'
);

select throws_ok(
  $$ insert into public.follows (follower_id, followee_id)
     values ('bbbbbbbb-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000') $$,
  '42501', null,
  'a user cannot make someone else follow'
);

select throws_ok(
  $$ insert into public.follows (follower_id, followee_id)
     values ('cccccccc-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000') $$,
  '23514', null,
  'a user cannot follow themselves'
);

select throws_ok(
  $$ insert into public.follows (follower_id, followee_id, status)
     values ('cccccccc-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'accepted') $$,
  '42501', null,
  'a client cannot choose the status'
);

-- Requesting to follow a private profile ---------------------------------------

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into public.follows (follower_id, followee_id)
     values ('bbbbbbbb-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000') $$,
  'a user can ask to follow a private profile'
);

select is(
  (select status from public.follows where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'pending',
  'following a private profile is a request'
);

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'a pending request shows nothing'
);

select lives_ok(
  $$ update public.follows set status = 'accepted'
     where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'the requester''s own approval runs...'
);

select is(
  (select status from public.follows where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'pending',
  '...but changes nothing'
);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.follows where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'others cannot see a pending request'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.follows
   where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000' and status = 'pending'),
  1,
  'the private profile sees the request'
);

select throws_ok(
  $$ update public.follows set followee_id = 'cccccccc-0000-0000-0000-000000000000'
     where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '42501', null,
  'a request cannot be redirected to someone else'
);

select lives_ok(
  $$ update public.follows set status = 'accepted'
     where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'the private profile approves the request'
);

select throws_ok(
  $$ update public.follows set status = 'pending'
     where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '42501', null,
  'an approval cannot be turned back into a request'
);

-- What an approved follower sees -------------------------------------------------

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select results_eq(
  $$ select id from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  $$ values ('e0000000-0000-0000-0000-00000000000a'::uuid) $$,
  'an approved follower sees a private profile''s public entries, not its private ones'
);

select is(
  (select count(*)::int from public.collections where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  1,
  'an approved follower sees its trips'
);

select is(
  (select count(*)::int from public.entry_collections where collection_id = 'c0000000-0000-0000-0000-00000000000a'),
  1,
  'an approved follower sees the trip''s public links only'
);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'entry-photos'
     and name like 'aaaaaaaa-0000-0000-0000-000000000000/%' $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000000/e0000000-0000-0000-0000-00000000000a.jpg') $$,
  'an approved follower can read the public entry''s photo only'
);

select results_eq(
  $$ select shows from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (1) $$,
  'an approved follower sees its stats'
);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'someone who doesn''t follow still sees nothing'
);

-- Follow lists and counts ------------------------------------------------------------

select results_eq(
  $$ select * from public.follow_counts('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (1, 0) $$,
  'counts include a private profile''s approved followers'
);

select is(
  (select count(*)::int from public.follows where followee_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'a stranger cannot list a private profile''s followers'
);

select is(
  (select count(*)::int from public.follows where follower_id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  0,
  '...nor see it in a public profile''s following list'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.follows where followee_id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  1,
  'anon sees follows between public profiles'
);

select results_eq(
  $$ select * from public.follow_counts('bbbbbbbb-0000-0000-0000-000000000000') $$,
  $$ values (1, 1) $$,
  'anon sees counts'
);

-- Ending follows ----------------------------------------------------------------------

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ delete from public.follows where follower_id = 'bbbbbbbb-0000-0000-0000-000000000000'
       and followee_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a profile can remove a follower'
);

select lives_ok(
  $$ delete from public.follows where follower_id = 'cccccccc-0000-0000-0000-000000000000' $$,
  'deleting a follow between two other people runs...'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'a removed follower loses access'
);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.follows where follower_id = 'cccccccc-0000-0000-0000-000000000000'),
  1,
  '...but changes nothing'
);

select lives_ok(
  $$ delete from public.follows where follower_id = 'cccccccc-0000-0000-0000-000000000000'
       and followee_id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'a user can unfollow'
);

-- Going public approves waiting requests ----------------------------------------

select lives_ok(
  $$ insert into public.follows (follower_id, followee_id)
     values ('cccccccc-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000') $$,
  'a new request to the private profile'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
update public.profiles set is_private = false where id = 'aaaaaaaa-0000-0000-0000-000000000000';

select is(
  (select status from public.follows where follower_id = 'cccccccc-0000-0000-0000-000000000000'
     and followee_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'accepted',
  'making a profile public approves its waiting requests'
);

select * from finish();
rollback;
