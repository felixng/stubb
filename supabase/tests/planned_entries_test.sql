-- Planned entries: the status lifecycle, optional venue, and privacy.
-- Planned entries are only ever visible to their owner; once logged they follow
-- the normal visibility rules. Run with `supabase test db`.
begin;
select plan(11);

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

insert into public.shows (id, title) values
  ('5a000000-0000-0000-0000-000000000001', 'Hamilton');

insert into public.venues (id, name, city) values
  ('7e000000-0000-0000-0000-000000000001', 'Richard Rodgers Theatre', 'New York');

-- Alice: two public logged entries (one without a venue, status left at its
-- default) and one public planned entry without a venue.
insert into public.entries (id, user_id, show_id, venue_id, date, visibility) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-01', 'public'),
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', null, '2026-10-02', 'public');

insert into public.entries (id, user_id, show_id, venue_id, date, visibility, status) values
  ('e0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', null, '2026-11-01', 'public', 'planned');

-- A public trip holding one logged and one planned entry.
insert into public.collections (id, user_id, name, visibility) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'NYC', 'public');
insert into public.entry_collections (entry_id, collection_id) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001');

-- Tests -----------------------------------------------------------------------

select is(
  (select status from public.entries where id = 'e0000000-0000-0000-0000-000000000001'),
  'logged'::public.entry_status,
  'status defaults to logged, so existing clients are unaffected'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into public.entries (id, show_id, date, status)
     values ('e0000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '2026-12-01', 'planned') $$,
  'a user can plan a show with just a show and a date (no venue)'
);

select throws_ok(
  $$ insert into public.entries (show_id, date, status, rating)
     values ('5a000000-0000-0000-0000-000000000001', '2026-12-02', 'planned', 4) $$,
  '23514', null,
  'a planned entry cannot carry a rating'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.entries where status = 'planned'),
  0,
  'anon cannot see planned entries, even when their visibility is public'
);

select is(
  (select count(*)::int from public.entries),
  2,
  'anon still sees the public logged entries, with or without a venue'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.entries where status = 'planned'),
  2,
  'the owner sees their own planned entries'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.entries where status = 'planned'),
  0,
  'another signed-in user cannot see them either'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.entry_collections),
  1,
  'a planned entry''s link to a public trip is not exposed'
);

select results_eq(
  $$ select shows, venues, cities from public.public_profile_stats('aaaaaaaa-0000-0000-0000-000000000000') $$,
  $$ values (2, 1, 1) $$,
  'profile stats count logged entries only, and keep entries without a venue'
);

-- Once the show has happened, the owner logs the same row.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ update public.entries set status = 'logged', rating = 4
     where id = 'e0000000-0000-0000-0000-000000000004' $$,
  'a planned entry becomes a logged one, with a rating, on the same row'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.entries),
  3,
  'once logged, the entry follows its normal visibility and appears publicly'
);

select * from finish();
rollback;
