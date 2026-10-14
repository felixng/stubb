-- The home feed and people search. Run with `supabase test db`.
begin;
select plan(10);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- a: me. b: public, followed. c: private, followed and approved. d: private,
-- requested only. e: public, not followed.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000000', 'd@example.com'),
  ('eeeeeeee-0000-0000-0000-000000000000', 'e@example.com');
update public.profiles set handle = 'alice' where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set handle = 'bob', display_name = 'Bob Builder' where id = 'bbbbbbbb-0000-0000-0000-000000000000';
update public.profiles set handle = 'cara', is_private = true where id = 'cccccccc-0000-0000-0000-000000000000';
update public.profiles set handle = 'dora', is_private = true where id = 'dddddddd-0000-0000-0000-000000000000';
update public.profiles set handle = 'evan' where id = 'eeeeeeee-0000-0000-0000-000000000000';

insert into public.shows (id, title, type) values ('11111111-0000-0000-0000-000000000000', 'Hamlet', 'play');
insert into public.venues (id, name, city, country) values ('22222222-0000-0000-0000-000000000000', 'Globe', 'London', 'GB');
insert into public.entries (id, user_id, show_id, venue_id, date, visibility, status) values
  ('e0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-01', 'private', 'logged'),
  ('e0000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', null, '2027-01-01', 'public', 'planned'),
  ('e0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-02', 'public', 'logged'),
  ('e0000000-0000-0000-0000-0000000000b2', 'bbbbbbbb-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-06', 'private', 'logged'),
  ('e0000000-0000-0000-0000-0000000000c1', 'cccccccc-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-03', 'public', 'logged'),
  ('e0000000-0000-0000-0000-0000000000d1', 'dddddddd-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-04', 'public', 'logged'),
  ('e0000000-0000-0000-0000-0000000000e1', 'eeeeeeee-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-05', 'public', 'logged');

-- Follows: b accepted at once, c approved, d still a request.
insert into public.follows (follower_id, followee_id) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000000');
update public.follows set status = 'accepted' where followee_id = 'cccccccc-0000-0000-0000-000000000000';

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');

select results_eq(
  $$ select id::text from public.feed_entries() $$,
  $$ values ('e0000000-0000-0000-0000-0000000000c1'), ('e0000000-0000-0000-0000-0000000000b1'), ('e0000000-0000-0000-0000-0000000000a1') $$,
  'the feed: my logged shows (private too) and the public shows of people I follow or who approved me, newest first'
);
select is(
  (select count(*)::integer from public.feed_entries() where user_id = 'dddddddd-0000-0000-0000-000000000000'),
  0, 'a pending request shows nothing'
);
select is(
  (select count(*)::integer from public.feed_entries() where user_id = 'eeeeeeee-0000-0000-0000-000000000000'),
  0, 'people I don''t follow aren''t in it, even when public'
);
select is(
  (select count(*)::integer from public.feed_entries() where id = 'e0000000-0000-0000-0000-0000000000b2'),
  0, 'a followed person''s private show isn''t in it'
);
select results_eq(
  $$ select f.id::text from public.entries c, public.feed_entries(1, c.date, c.created_at, c.id) f
     where c.id = 'e0000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('e0000000-0000-0000-0000-0000000000b1') $$,
  'it pages on from a show'
);

-- Two shows on one date, logged in the same instant (as an import does):
-- paging one at a time still returns every show once, in order.
reset role;
insert into public.entries (id, user_id, show_id, venue_id, date, visibility, status, created_at) values
  ('e0000000-0000-0000-0000-0000000000b3', 'bbbbbbbb-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-02', 'public', 'logged', '2026-10-13 10:00+00'),
  ('e0000000-0000-0000-0000-0000000000b4', 'bbbbbbbb-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', '2026-10-02', 'public', 'logged', '2026-10-13 10:00+00');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000000');
create function pg_temp.page_through() returns setof text language plpgsql as $$
declare
  last public.entries;
  n integer := 0;
begin
  loop
    select * into last from public.feed_entries(1, last.date, last.created_at, last.id);
    exit when not found or n > 20;
    n := n + 1;
    return next last.id::text;
  end loop;
end;
$$;
select results_eq(
  $$ select * from pg_temp.page_through() $$,
  $$ select id::text from public.feed_entries(100) $$,
  'paging one show at a time returns the same shows, in the same order, as one big page'
);
select is(
  (select count(*)::integer from public.feed_entries(100)),
  5, 'including both shows logged in the same instant'
);

select pg_temp.as_user('eeeeeeee-0000-0000-0000-000000000000');
select results_eq(
  $$ select id::text from public.feed_entries() $$,
  $$ values ('e0000000-0000-0000-0000-0000000000e1') $$,
  'someone who follows no one sees only their own shows'
);
select results_eq(
  $$ select handle from public.search_profiles('@Bo') $$,
  $$ values ('bob') $$,
  'search finds handles by prefix, ignoring @ and case'
);
select results_eq(
  $$ select handle from public.search_profiles('builder') $$,
  $$ values ('bob') $$,
  'and names by any part'
);

select * from finish();
rollback;
