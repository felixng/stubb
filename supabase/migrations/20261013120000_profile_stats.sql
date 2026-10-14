-- Public profile stats (/@handle): the headline numbers under the handle.
--
-- A SQL function so the web profile and the iOS app show identical numbers
-- (docs/ARCHITECTURE.md, "Stats"). It counts public entries only, whoever
-- asks: the owner looking at their own public profile sees what visitors see.
-- Runs as the caller, so RLS still applies on top.

create function public.public_profile_stats(profile_id uuid)
returns table (
  shows  integer,  -- public entries (a show seen twice counts twice)
  venues integer,  -- distinct theatres
  cities integer   -- distinct cities, ignoring case; venues with no city don't count
)
language sql
stable
set search_path = ''
as $$
  select count(*)::integer,
         count(distinct e.venue_id)::integer,
         count(distinct lower(btrim(v.city)))
           filter (where nullif(btrim(v.city), '') is not null)::integer
  from public.entries e
  join public.venues v on v.id = e.venue_id
  where e.user_id = profile_id
    and e.visibility = 'public';
$$;

revoke execute on function public.public_profile_stats(uuid) from public;
grant execute on function public.public_profile_stats(uuid) to anon, authenticated;
