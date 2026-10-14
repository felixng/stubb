-- Trips v2: dates required, only shows within the dates, and no privacy setting
-- of their own (public when they hold a public logged show). Run with
-- `supabase test db`.
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
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com');

insert into public.shows (id, title) values
  ('5a000000-0000-0000-0000-000000000001', 'Hamilton');

-- Alice: a private logged show, and a public planned one, both in October.
insert into public.entries (id, user_id, show_id, date, visibility, status) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '2026-10-10', 'private', 'logged'),
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', '5a000000-0000-0000-0000-000000000001', '2026-10-12', 'public', 'planned');

-- Tests -----------------------------------------------------------------------

select hasnt_column('public', 'collections', 'visibility', 'trips have no visibility of their own');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select throws_ok(
  $$ insert into public.collections (name, start_date) values ('No end', '2026-10-01') $$,
  '23514', null,
  'a trip needs an end date'
);

select lives_ok(
  $$ insert into public.collections (id, name, start_date, end_date)
     values ('c0000000-0000-0000-0000-000000000001', 'NYC', '2026-10-09', '2026-10-13') $$,
  'a trip with a start and end date can be created'
);

select lives_ok(
  $$ insert into public.entry_collections (entry_id, collection_id) values
       ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
       ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001') $$,
  'shows dated within the trip can be added'
);

select throws_ok(
  $$ update public.collections set end_date = '2026-10-11' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'a trip''s dates cannot shrink past one of its shows'
);

select throws_ok(
  $$ update public.entries set date = '2026-10-20' where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'a show in a trip cannot be re-dated outside it'
);

select lives_ok(
  $$ update public.entries set note = 'Still fine' where id = 'e0000000-0000-0000-0000-000000000001' $$,
  'other edits to a show in a trip are unaffected'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.collections),
  0,
  'a trip holding only a private show and a planned show is not public'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
update public.entries set visibility = 'public' where id = 'e0000000-0000-0000-0000-000000000001';

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.collections),
  1,
  'the trip becomes public once it holds a public logged show'
);

select is(
  (select count(*)::int from public.entry_collections),
  1,
  'anon sees the link to the public logged show, not the planned one'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
update public.profiles set is_private = true where id = 'aaaaaaaa-0000-0000-0000-000000000000';

select pg_temp.as_anon();

select is(
  (select count(*)::int from public.collections),
  0,
  'a private profile''s trips are hidden'
);

select * from finish();
rollback;
