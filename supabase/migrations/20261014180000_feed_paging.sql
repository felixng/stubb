-- Feed paging (#4). Pages are cut on (date, created_at, id), newest first:
-- the id breaks ties, so two shows on the same date logged in the same
-- instant (an import saves several at once) are never skipped or repeated.
-- Replaces feed_entries from 20261014170000_feed.sql; pass the last row's
-- date, created_at and id to get the next page.

drop function public.feed_entries(integer, date, timestamptz);

create function public.feed_entries(
  max_rows integer default 30,
  before_date date default null,
  before_created timestamptz default null,
  before_id uuid default null
)
returns setof public.entries
language sql
stable
set search_path = ''
as $$
  select e.*
  from public.entries e
  where e.status = 'logged'
    and (
      e.user_id = (select auth.uid())
      or e.user_id in (
        select f.followee_id from public.follows f
        where f.follower_id = (select auth.uid()) and f.status = 'accepted'
      )
    )
    and (
      before_date is null
      or (e.date, e.created_at, e.id) < (before_date, before_created, coalesce(before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'))
    )
  order by e.date desc, e.created_at desc, e.id desc
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.feed_entries(integer, date, timestamptz, uuid) from public;
grant execute on function public.feed_entries(integer, date, timestamptz, uuid) to authenticated;

-- The feed's own shows and each followed person's, newest first.
create index if not exists entries_user_feed on public.entries (user_id, date desc, created_at desc, id desc)
  where status = 'logged';
