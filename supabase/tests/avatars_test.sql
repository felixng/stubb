-- Avatar storage rules. Run with `supabase test db`.
--
-- Rows are written to storage.objects directly, the way the Storage API
-- does after checking these same policies as the caller.
begin;
select plan(6);
select set_config('storage.allow_delete_query', 'true', true);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_admin() returns void language sql as $$
  select set_config('role', 'postgres', true),
         set_config('request.jwt.claims', '', true);
$$;

create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

select is(
  (select (public, allowed_mime_types) from storage.buckets where id = 'avatars')::text,
  '(t,{image/jpeg})',
  'the bucket is public and takes JPEGs only'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('avatars', 'aaaaaaaa-0000-0000-0000-000000000000/1.jpg', auth.uid()) $$,
  'owners upload into their own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('avatars', 'bbbbbbbb-0000-0000-0000-000000000000/1.jpg', auth.uid()) $$,
  '42501', null,
  'nobody uploads into someone else''s folder'
);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

delete from storage.objects where bucket_id = 'avatars';
select pg_temp.as_admin();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'),
  1,
  'nobody deletes someone else''s avatar'
);

select pg_temp.as_anon();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'),
  0,
  'visitors can''t list avatars (they load them by public URL)'
);

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

delete from storage.objects where bucket_id = 'avatars';
select pg_temp.as_admin();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'),
  0,
  'owners delete their own avatar'
);

select * from finish();
rollback;
