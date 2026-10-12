-- Waitlist privacy rules (#10): anon can insert, nobody can read it back.
-- Run with `supabase test db`.
begin;
select plan(9);

set local role anon;

select lives_ok(
  $$ insert into public.waitlist (email, source) values ('fan@example.com', 'instagram') $$,
  'anon can join the waitlist'
);

select lives_ok(
  $$ insert into public.waitlist (email) values ('FAN@example.com') $$,
  'a duplicate email (any case) succeeds silently'
);

select throws_ok(
  $$ select * from public.waitlist $$,
  '42501', null,
  'anon cannot select'
);

select throws_ok(
  $$ update public.waitlist set source = 'x' $$,
  '42501', null,
  'anon cannot update'
);

select throws_ok(
  $$ delete from public.waitlist $$,
  '42501', null,
  'anon cannot delete'
);

select throws_ok(
  $$ insert into public.waitlist (email) values ('not-an-email') $$,
  '23514', null,
  'invalid emails are rejected'
);

set local role authenticated;

select throws_ok(
  $$ select * from public.waitlist $$,
  '42501', null,
  'signed-in users cannot select either'
);

reset role;

select is(
  (select count(*)::int from public.waitlist where email = 'fan@example.com'),
  1,
  'the duplicate was not stored'
);

select is(
  (select source from public.waitlist where email = 'fan@example.com'),
  'instagram',
  'the first sign-up is kept as is'
);

select * from finish();
rollback;
