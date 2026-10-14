-- Account deletion. Run with `supabase test db`.
begin;
select plan(9);

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

update public.profiles set handle = 'alice' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set handle = 'bob' where id = 'bbbbbbbb-0000-0000-0000-000000000000';

insert into public.shows (id, title, created_by)
  values ('5a000000-0000-0000-0000-000000000001', 'Hadestown', 'aaaaaaaa-0000-0000-0000-000000000000');
insert into public.venues (id, name) values ('7e000000-0000-0000-0000-000000000001', 'Walter Kerr Theatre');

insert into public.entries (id, user_id, show_id, venue_id, date) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-10'),
  ('e0000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001', '2026-10-10');

insert into public.collections (id, user_id, name, start_date, end_date) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'NYC Oct 2026',
   '2026-10-08', '2026-10-12');
insert into public.entry_collections (entry_id, collection_id) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');

-- Who may call it ---------------------------------------------------------------

select pg_temp.as_anon();

select throws_ok(
  $$ select public.delete_my_account('alice') $$,
  '42501',
  null,
  'logged-out visitors cannot call it'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select throws_ok(
  $$ select public.delete_my_account('bob') $$,
  '22023',
  null,
  'someone else''s handle does not confirm'
);

select throws_ok(
  $$ select public.delete_my_account('') $$,
  '22023',
  null,
  'an empty confirmation does not confirm'
);

select pg_temp.as_admin();

select is(
  (select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  1,
  'a failed confirmation deletes nothing'
);

-- Deleting ----------------------------------------------------------------------

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ select public.delete_my_account(' @Alice ') $$,
  'the own handle confirms, ignoring case, spaces and a leading @'
);

select pg_temp.as_admin();

select is(
  (select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000000')
  + (select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  0,
  'the auth user and profile are gone'
);

select is(
  (select count(*)::int from public.entries where user_id = 'aaaaaaaa-0000-0000-0000-000000000000')
  + (select count(*)::int from public.collections where user_id = 'aaaaaaaa-0000-0000-0000-000000000000')
  + (select count(*)::int from public.entry_collections where collection_id = 'c0000000-0000-0000-0000-000000000001'),
  0,
  'their entries, trips and links are gone'
);

select is(
  (select created_by from public.shows where id = '5a000000-0000-0000-0000-000000000001'),
  null,
  'shows they added stay in the catalogue, unattributed'
);

select is(
  (select count(*)::int from public.entries where user_id = 'bbbbbbbb-0000-0000-0000-000000000000'),
  1,
  'other users keep their entries'
);

select * from finish();
rollback;
