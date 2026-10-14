-- Likes and comments: who can like and comment, who sees them, and who can
-- delete a comment. Run with `supabase test db`.
begin;
select plan(31);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- Bob is public with a public entry (b1), a private one (b2) and a planned one
-- (b3). Alice is private with a public entry (a1); Carol follows her, Dave
-- doesn't.
-- Fixtures, as the superuser --------------------------------------------------

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000000', 'd@example.com');

update public.profiles set handle = 'alice', is_private = true where id = 'aaaaaaaa-0000-0000-0000-000000000000';
update public.profiles set handle = 'bob' where id = 'bbbbbbbb-0000-0000-0000-000000000000';
update public.profiles set handle = 'carol' where id = 'cccccccc-0000-0000-0000-000000000000';
update public.profiles set handle = 'dave' where id = 'dddddddd-0000-0000-0000-000000000000';

insert into public.shows (id, title) values ('5a000000-0000-0000-0000-000000000001', 'Hamilton');

insert into public.entries (id, user_id, show_id, date, visibility, status) values
  ('e0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '2026-10-01', 'public', 'logged'),
  ('e0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '2026-10-01', 'public', 'logged'),
  ('e0000000-0000-0000-0000-0000000000b2', 'bbbbbbbb-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '2026-10-02', 'private', 'logged'),
  ('e0000000-0000-0000-0000-0000000000b3', 'bbbbbbbb-0000-0000-0000-000000000000',
   '5a000000-0000-0000-0000-000000000001', '2099-01-01', 'public', 'planned');

insert into public.follows (follower_id, followee_id) values
  ('cccccccc-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000');
update public.follows set status = 'accepted';

-- Likes -----------------------------------------------------------------------

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000b1') $$,
  'a user can like a public entry'
);

select throws_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000b1') $$,
  '23505', null,
  'a user likes an entry once'
);

select throws_ok(
  $$ insert into public.entry_likes (entry_id, user_id)
     values ('e0000000-0000-0000-0000-0000000000b1', 'dddddddd-0000-0000-0000-000000000000') $$,
  '42501', null,
  'a user cannot like as someone else'
);

select throws_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000b2') $$,
  '42501', null,
  'nobody can like a private entry'
);

select throws_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000b3') $$,
  '42501', null,
  'nobody can like a planned entry'
);

select lives_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000a1') $$,
  'an approved follower can like a private profile''s public entry'
);

select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000');

select throws_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000a1') $$,
  '42501', null,
  'a stranger cannot like a private profile''s entry'
);

select is(
  (select count(*)::integer from public.entry_likes where entry_id = 'e0000000-0000-0000-0000-0000000000a1'),
  0,
  'a stranger does not see likes on a private profile''s entry'
);

select lives_ok(
  $$ insert into public.entry_likes (entry_id) values ('e0000000-0000-0000-0000-0000000000b1') $$,
  'a second user likes the public entry'
);

select is(
  (select count(*)::integer from public.entry_likes
   where entry_id = 'e0000000-0000-0000-0000-0000000000b1' and user_id = 'cccccccc-0000-0000-0000-000000000000'),
  1,
  'users see each other''s likes on a public entry'
);

delete from public.entry_likes where user_id = 'cccccccc-0000-0000-0000-000000000000';

select pg_temp.as_anon();

select is(
  (select count(*)::integer from public.entry_likes where entry_id = 'e0000000-0000-0000-0000-0000000000b1'),
  2,
  'nobody can remove someone else''s like, and visitors see likes on a public entry'
);

select throws_ok(
  $$ insert into public.entry_likes (entry_id, user_id)
     values ('e0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000') $$,
  '42501', null,
  'visitors cannot like'
);

select pg_temp.as_user('dddddddd-0000-0000-0000-000000000000');

select lives_ok(
  $$ delete from public.entry_likes where entry_id = 'e0000000-0000-0000-0000-0000000000b1'
       and user_id = 'dddddddd-0000-0000-0000-000000000000' $$,
  'a user can unlike'
);

-- Comments --------------------------------------------------------------------

select lives_ok(
  $$ insert into public.entry_comments (id, entry_id, body)
     values ('c0000000-0000-0000-0000-0000000000d1', 'e0000000-0000-0000-0000-0000000000b1', 'What a night!') $$,
  'a user can comment on a public entry'
);

select throws_ok(
  $$ insert into public.entry_comments (entry_id, body)
     values ('e0000000-0000-0000-0000-0000000000b1', '   ') $$,
  '23514', null,
  'an empty comment is refused'
);

select throws_ok(
  $$ insert into public.entry_comments (entry_id, body)
     values ('e0000000-0000-0000-0000-0000000000b1', repeat('x', 501)) $$,
  '23514', null,
  'a comment over 500 characters is refused'
);

select throws_ok(
  $$ insert into public.entry_comments (entry_id, body)
     values ('e0000000-0000-0000-0000-0000000000b2', 'Hi') $$,
  '42501', null,
  'nobody can comment on a private entry'
);

select throws_ok(
  $$ insert into public.entry_comments (entry_id, body)
     values ('e0000000-0000-0000-0000-0000000000a1', 'Hi') $$,
  '42501', null,
  'a stranger cannot comment on a private profile''s entry'
);

select throws_ok(
  $$ update public.entry_comments set body = 'Edited' where id = 'c0000000-0000-0000-0000-0000000000d1' $$,
  '42501', null,
  'comments cannot be edited'
);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select lives_ok(
  $$ insert into public.entry_comments (id, entry_id, body)
     values ('c0000000-0000-0000-0000-0000000000c1', 'e0000000-0000-0000-0000-0000000000b1', 'Agreed') $$,
  'another user comments'
);

select lives_ok(
  $$ insert into public.entry_comments (entry_id, body)
     values ('e0000000-0000-0000-0000-0000000000a1', 'Jealous') $$,
  'an approved follower can comment on a private profile''s public entry'
);

delete from public.entry_comments where id = 'c0000000-0000-0000-0000-0000000000d1';

select pg_temp.as_anon();

select is(
  (select count(*)::integer from public.entry_comments where entry_id = 'e0000000-0000-0000-0000-0000000000b1'),
  2,
  'nobody deletes someone else''s comment on someone else''s entry, and visitors see comments'
);

select is(
  (select count(*)::integer from public.entry_comments where entry_id = 'e0000000-0000-0000-0000-0000000000a1'),
  0,
  'visitors do not see comments on a private profile''s entry'
);

select is(
  (select row(likes, comments, liked)::text from public.entry_reactions(array['e0000000-0000-0000-0000-0000000000b1'::uuid])),
  '(1,2,f)',
  'entry_reactions counts likes and comments for a visitor'
);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select is(
  (select row(likes, comments, liked)::text from public.entry_reactions(array['e0000000-0000-0000-0000-0000000000b1'::uuid])),
  '(1,2,t)',
  '...and says whether the caller liked it'
);

-- The entry's owner -----------------------------------------------------------

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select lives_ok(
  $$ delete from public.entry_comments where id = 'c0000000-0000-0000-0000-0000000000d1' $$,
  'the entry''s owner can delete any comment on it'
);

select is(
  (select count(*)::integer from public.entry_comments where entry_id = 'e0000000-0000-0000-0000-0000000000b1'),
  1,
  '...and it is gone'
);

update public.entries set visibility = 'private' where id = 'e0000000-0000-0000-0000-0000000000b1';

select is(
  (select row(likes, comments)::text from public.entry_reactions(array['e0000000-0000-0000-0000-0000000000b1'::uuid])),
  '(1,1)',
  'the owner still sees likes and comments once the entry is private'
);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000000');

select is(
  (select row(likes, comments)::text from public.entry_reactions(array['e0000000-0000-0000-0000-0000000000b1'::uuid])),
  '(0,0)',
  'nobody else sees them once the entry is private'
);

select lives_ok(
  $$ delete from public.entry_comments where id = 'c0000000-0000-0000-0000-0000000000c1' $$,
  'a commenter can delete their own comment...'
);

-- RLS hides the row from Carol now, so check as the owner.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000000');

select is(
  (select count(*)::integer from public.entry_comments where id = 'c0000000-0000-0000-0000-0000000000c1'),
  1,
  '...but not once the entry is hidden from them'
);

select * from finish();
rollback;
