-- The home feed and people search (Phase 3, #4), on top of follows
-- (20261014160000_follows.sql). In SQL so the web and iOS apps agree.

-- Find people by handle or name: handles starting with the query first, then
-- names containing it. Profiles without a handle (mid-onboarding) are left out.
create function public.search_profiles(q text)
returns table (id uuid, handle text, display_name text, avatar_url text, is_private boolean)
language sql
stable
set search_path = ''
as $$
  select p.id, p.handle::text, p.display_name, p.avatar_url, p.is_private
  from public.profiles p
  where p.handle is not null
    and length(btrim(q)) >= 2
    and (
      p.handle::text ilike replace(replace(lower(btrim(q, ' @')), '%', ''), '_', '\_') || '%'
      or p.display_name ilike '%' || replace(replace(btrim(q), '%', ''), '_', '\_') || '%'
    )
  order by (p.handle::text ilike replace(replace(lower(btrim(q, ' @')), '%', ''), '_', '\_') || '%') desc,
           p.handle
  limit 20;
$$;

revoke execute on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

-- The home feed: the caller's own logged shows (private ones too: it's their
-- feed) and the shows of everyone they follow that RLS lets them see, newest
-- first. Runs as the caller, so RLS applies. Page with `before_date` /
-- `before_created` (the last row's date and created_at).
create function public.feed_entries(
  max_rows integer default 30,
  before_date date default null,
  before_created timestamptz default null
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
    and (before_date is null or (e.date, e.created_at) < (before_date, before_created))
  order by e.date desc, e.created_at desc
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.feed_entries(integer, date, timestamptz) from public;
grant execute on function public.feed_entries(integer, date, timestamptz) to authenticated;
