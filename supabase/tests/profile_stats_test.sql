-- Public profile stats count public entries only, for every caller.
-- Run with `supabase test db`.
begin;
select plan(5);

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

insert into public.shows (id, title) values
  ('5a000000-0000-0000-0000-000000000001', 'Hamilton'),
  ('5a000000-0000-0000-0000-000000000002', 'Hadestown');

insert into public.venues (id, name, city) values
  ('7e000000-0000-0000-0000-000000000001', 'Richard Rodgers Theatre', 'New York'),
  ('7e000000-0000-0000-0000-000000000002', 'Walter Kerr Theatre', 'new york '),
  ('7e000000-0000-0000-0000-000000000003', 'Lyric Theatre', 'London'),
  ('7e000000-0000-0000-0000-000000000004', 'Barn Theatre', null);

-- Alice: four public entries (one show twice, one venue with no city), and a
-- private one in a city she hasn't otherwise been to.
insert into public.entries (user_id, show_id, venue_id, date, visibility) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-01', 'public'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-05', 'public'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000002', '7e000000-0000-0000-0000-000000000002', '2026-10-06', 'public'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000002', '7e000000-0000-0000-0000-000000000004', '2026-10-07', 'public'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000002', '7e000000-0000-0000-0000-000000000003', '2026-10-08', 'private');

-- Tests -----------------------------------------------------------------------

select pg_temp.as_anon();

select results_eq(
  $$ select shows, venues, cities from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (4, 3, 1) $$,
  'anon sees counts of public entries only; cities ignore case and blanks'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select results_eq(
  $$ select shows, venues, cities from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (4, 3, 1) $$,
  'the owner sees the same public numbers, not their private entries'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select results_eq(
  $$ select shows, venues, cities from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (4, 3, 1) $$,
  'another user sees the same public numbers'
);

select results_eq(
  $$ select shows, venues, cities from public.public_profile_stats('bbbbbbbb-0000-0000-0000-000000000000') $$,
  $$ values (0, 0, 0) $$,
  'a profile with no entries has zero stats'
);

-- Alice makes everything private: the public profile drops to zero.
reset role;
update public.entries set visibility = 'private' where user_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.as_anon();

select results_eq(
  $$ select shows from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (0) $$,
  'making entries private removes them from the stats'
);

select * from finish();
rollback;
