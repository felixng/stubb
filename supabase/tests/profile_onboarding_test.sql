-- Profile onboarding fields: bio and link. Run with `supabase test db`.
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

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

update public.profiles set handle = 'bob' where id = 'bbbbbbbb-0000-0000-0000-000000000000';

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ update public.profiles
     set handle = 'alice', display_name = 'Alice A', bio = 'Front row or bust.',
         link = 'https://instagram.com/alice'
     where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  'a user can complete their profile'
);

select throws_ok(
  $$ update public.profiles set handle = 'bob' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23505', null,
  'a taken handle is rejected'
);

select throws_ok(
  $$ update public.profiles set link = 'instagram.com/alice' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'links must be absolute http(s) URLs'
);

select throws_ok(
  $$ update public.profiles set link = 'javascript:alert(1)' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'non-http links are rejected'
);

select throws_ok(
  $$ update public.profiles set bio = repeat('x', 161) where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$,
  '23514', null,
  'bios are at most 160 characters'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

update public.profiles set bio = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000000';

select pg_temp.as_anon();

select is(
  (select bio from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'Front row or bust.',
  'other users cannot change someone else''s bio'
);

select is(
  (select link from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'https://instagram.com/alice',
  'anon can read a link'
);

select throws_ok(
  $$ update public.profiles set bio = 'x' $$,
  '42501', null,
  'anon cannot update profiles'
);

select throws_ok(
  $$ select default_visibility from public.profiles $$,
  '42501', null,
  'anon still cannot read default_visibility'
);

select * from finish();
rollback;
