-- Share-card stats for one entry: its place in its year, the visit number at
-- its venue and how many times its show has been seen.
--
-- A SQL function so the web and iOS cards show identical numbers (moved from
-- apps/web/src/lib/supabase/data.ts). Counted over the owner's entries up to
-- and including this one, by date, then by when they were logged, so an old
-- entry's card shows what was true then. Same rows as the web counted before:
-- every entry, planned ones included.
--
-- Only for the caller's own entries: anyone else's entry id returns no row.
-- Runs as the caller, so RLS still applies on top.

create function public.entry_card_stats(entry_id uuid)
returns table (
  show_of_year integer,  -- Nth entry in this entry's year
  venue_visit  integer,  -- Nth visit to this venue; 0 when the entry has no venue
  times_seen   integer   -- Nth time seeing this show
)
language sql
stable
set search_path = ''
as $$
  select count(*) filter (where extract(year from e.date) = extract(year from self.date))::integer,
         count(*) filter (where e.venue_id = self.venue_id)::integer,
         count(*) filter (where e.show_id = self.show_id)::integer
  from public.entries self
  join public.entries e
    on e.user_id = self.user_id
   and (e.date, e.created_at) <= (self.date, self.created_at)
  where self.id = entry_id
    and self.user_id = auth.uid()
  group by self.id;
$$;

revoke execute on function public.entry_card_stats(uuid) from public;
grant execute on function public.entry_card_stats(uuid) to authenticated;
