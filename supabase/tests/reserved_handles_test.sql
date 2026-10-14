-- Reserved handles. Run with `supabase test db`.
begin;
select plan(8);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

-- The owner hands one out from the SQL editor (running as postgres).
select lives_ok(
  $$ update public.profiles set handle = 'stubbed' where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'the owner can still assign a reserved handle'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select throws_ok(
  $$ update public.profiles set handle = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', 'handle "admin" is reserved',
  'a user cannot claim a reserved handle'
);

select throws_ok(
  $$ update public.profiles set handle = 'Support' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'the check ignores case'
);

select lives_ok(
  $$ update public.profiles set handle = 'admin_fan' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'handles that only contain a reserved word are fine'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select lives_ok(
  $$ update public.profiles set bio = 'The official account.', handle = 'stubbed'
     where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'a user keeps a reserved handle they already hold when saving their profile'
);

select lives_ok(
  $$ update public.profiles set handle = 'stubbed_official' where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'and can move off it'
);

select throws_ok(
  $$ update public.profiles set handle = 'stubbed' where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  '23514', null,
  'but not back on again'
);

reset role;

select ok(
  public.is_reserved_handle('stubbedapp') and not public.is_reserved_handle('alice'),
  'is_reserved_handle matches the list'
);

select * from finish();
rollback;
