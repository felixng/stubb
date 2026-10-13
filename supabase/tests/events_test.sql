-- Analytics events: write-only, signed-in only, and nobody can record as
-- someone else.
-- Run with `supabase test db`.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@example.com');

-- Logged out.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ insert into public.events (name) values ('card_shared') $$,
  '42501', null,
  'anon cannot record events'
);

select throws_ok(
  $$ select * from public.events $$,
  '42501', null,
  'anon cannot read events'
);

-- Signed in as e1.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.events (name, props) values ('entry_logged', '{"method": "photo"}') $$,
  'a signed-in user can record their own event'
);

select throws_ok(
  $$ insert into public.events (name, user_id) values ('entry_logged', '00000000-0000-0000-0000-0000000000e2') $$,
  '42501', null,
  'nobody can set user_id (record as someone else)'
);

select throws_ok(
  $$ insert into public.events (name) values ('made_up_event') $$,
  '23514', null,
  'unknown event names are rejected'
);

select throws_ok(
  $$ insert into public.events (name, props) values ('entry_logged', '["not", "an", "object"]') $$,
  '23514', null,
  'props must be an object'
);

select throws_ok(
  $$ insert into public.events (name, props) values ('entry_logged', jsonb_build_object('x', repeat('a', 2000))) $$,
  '23514', null,
  'props are capped in size'
);

select throws_ok(
  $$ select * from public.events $$,
  '42501', null,
  'signed-in users cannot read events'
);

reset role;

select is(
  (select user_id from public.events where name = 'entry_logged'),
  '00000000-0000-0000-0000-0000000000e1'::uuid,
  'user_id comes from the token'
);

select * from finish();
rollback;
