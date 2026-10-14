-- Share-card stats count the owner's entries up to and including this one.
-- Run with `supabase test db`.
begin;
select plan(7);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Fixtures, as the superuser --------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

insert into public.shows (id, title) values
  ('5a000000-0000-0000-0000-000000000001', 'Hamilton'),
  ('5a000000-0000-0000-0000-000000000002', 'Hadestown');

insert into public.venues (id, name, city) values
  ('7e000000-0000-0000-0000-000000000001', 'Richard Rodgers Theatre', 'New York'),
  ('7e000000-0000-0000-0000-000000000002', 'Walter Kerr Theatre', 'New York');

-- Alice: Hamilton at the Rodgers in 2025, then in 2026 Hamilton twice on the
-- same day (logged in order), Hadestown at the Rodgers, and Hadestown with no
-- venue. Bob has his own Hamilton at the Rodgers, which never counts for her.
insert into public.entries (id, user_id, show_id, venue_id, date, visibility, created_at) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2025-12-30', 'public',  '2026-01-01 10:00+00'),
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-01', 'private', '2026-10-02 10:00+00'),
  ('e0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-01', 'public',  '2026-10-02 11:00+00'),
  ('e0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000002', '7e000000-0000-0000-0000-000000000001', '2026-10-03', 'public',  '2026-10-04 10:00+00'),
  ('e0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000002', null,                                   '2026-10-05', 'public',  '2026-10-06 10:00+00'),
  ('e0000000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-09-01', 'public',  '2026-09-02 10:00+00');

-- Tests -----------------------------------------------------------------------

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select results_eq(
  $$ select show_of_year, venue_visit, times_seen from public.entry_card_stats('e0000000-0000-0000-0000-000000000001') $$,
  $$ values (1, 1, 1) $$,
  'the first entry is first in everything'
);

select results_eq(
  $$ select show_of_year, venue_visit, times_seen from public.entry_card_stats('e0000000-0000-0000-0000-000000000002') $$,
  $$ values (1, 2, 2) $$,
  'a new year restarts the year count, not the venue or show counts; private entries count'
);

select results_eq(
  $$ select show_of_year, venue_visit, times_seen from public.entry_card_stats('e0000000-0000-0000-0000-000000000003') $$,
  $$ values (2, 3, 3) $$,
  'same date: the one logged later comes after'
);

select results_eq(
  $$ select show_of_year, venue_visit, times_seen from public.entry_card_stats('e0000000-0000-0000-0000-000000000004') $$,
  $$ values (3, 4, 1) $$,
  'a different show at the same venue'
);

select results_eq(
  $$ select show_of_year, venue_visit, times_seen from public.entry_card_stats('e0000000-0000-0000-0000-000000000005') $$,
  $$ values (4, 0, 2) $$,
  'no venue: venue visit is 0'
);

select is_empty(
  $$ select * from public.entry_card_stats('e0000000-0000-0000-0000-000000000006') $$,
  'another user''s entry returns nothing, even a public one'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select results_eq(
  $$ select show_of_year, venue_visit, times_seen from public.entry_card_stats('e0000000-0000-0000-0000-000000000006') $$,
  $$ values (1, 1, 1) $$,
  'Bob''s counts ignore Alice''s entries'
);

select * from finish();
rollback;
