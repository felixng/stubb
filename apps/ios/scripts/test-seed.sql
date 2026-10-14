-- Local-only diary for the UI test user (ios-test@stubbed.local), run by
-- `scripts/dev test-users` after the account exists. Replaces the user's
-- entries and trips each run, so tests start from the same diary.
do $$
declare
  uid uuid := (select id from auth.users where email = 'ios-test@stubbed.local');
begin
  delete from public.entries where user_id = uid;
  delete from public.collections where user_id = uid;
  update public.profiles set display_name = 'iOS Test', bio = 'Musicals, mostly. Always the front row.'
    where id = uid;

  insert into public.shows (id, title, type) values
    ('00000000-0000-4000-a000-000000000001', 'Hamilton', 'musical'),
    ('00000000-0000-4000-a000-000000000002', 'Operation Mincemeat', 'musical'),
    ('00000000-0000-4000-a000-000000000003', 'Hadestown', 'musical'),
    ('00000000-0000-4000-a000-000000000004', 'Stereophonic', 'play')
  on conflict (id) do nothing;
  insert into public.venues (id, name, city, country) values
    ('00000000-0000-4000-b000-000000000001', 'Richard Rodgers Theatre', 'New York', 'United States'),
    ('00000000-0000-4000-b000-000000000002', 'Golden Theatre', 'New York', 'United States'),
    ('00000000-0000-4000-b000-000000000003', 'Walter Kerr Theatre', 'New York', 'United States'),
    ('00000000-0000-4000-b000-000000000004', 'Duke of York''s Theatre', 'London', 'United Kingdom')
  on conflict (id) do nothing;

  insert into public.collections (id, user_id, name, kind, start_date, end_date) values
    ('00000000-0000-4000-c000-000000000001', uid, 'NYC Oct 2026', 'trip', '2026-10-04', '2026-10-08');

  insert into public.entries (id, user_id, show_id, venue_id, date, status, rating, note, visibility) values
    ('00000000-0000-4000-d000-000000000001', uid, '00000000-0000-4000-a000-000000000001',
     '00000000-0000-4000-b000-000000000001', '2026-10-05', 'logged', 4.5,
     'Lin''s replacement was brilliant. Front mezz, row B.', 'public'),
    ('00000000-0000-4000-d000-000000000002', uid, '00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-b000-000000000002', '2026-10-06', 'logged', 5, null, 'public'),
    ('00000000-0000-4000-d000-000000000003', uid, '00000000-0000-4000-a000-000000000004',
     '00000000-0000-4000-b000-000000000004', '2026-09-12', 'logged', 4, null, 'private'),
    ('00000000-0000-4000-d000-000000000004', uid, '00000000-0000-4000-a000-000000000003',
     '00000000-0000-4000-b000-000000000003', current_date + 20, 'planned', null, null, 'public');

  insert into public.entry_collections (entry_id, collection_id) values
    ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001'),
    ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001');
end $$;
