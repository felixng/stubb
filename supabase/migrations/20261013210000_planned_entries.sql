-- Planned shows: an entry has a lifecycle (planned -> logged) rather than a separate model.
-- A planned entry needs only a show (title) and a date; venue is optional.

-- 1. Lifecycle status. Existing rows and any client that doesn't set it stay 'logged'.
create type public.entry_status as enum ('planned', 'logged');

alter table public.entries
  add column status public.entry_status not null default 'logged';

-- 2. Venue is optional on every entry.
alter table public.entries
  alter column venue_id drop not null;

-- 3. A planned entry hasn't happened yet, so it can't carry a rating.
alter table public.entries
  add constraint entries_planned_unrated
  check (status <> 'planned' or rating is null);

-- 4. Fast "Upcoming" query: this user's planned entries, soonest first.
create index entries_user_planned
  on public.entries (user_id, date)
  where status = 'planned';

-- 5. Planned entries are private to their owner for now (public RLS only sees logged entries).
--    Revisit when deciding whether "going to X" should be shareable.
drop policy "Public entries are visible to everyone" on public.entries;
create policy "Public entries are visible to everyone"
  on public.entries
  for select
  to anon, authenticated
  using (
    status = 'logged'
    and visibility = 'public'
    and not exists (
      select 1 from public.profiles p
      where p.id = entries.user_id and p.is_private
    )
  );

drop policy "Links between public rows are visible to everyone" on public.entry_collections;
create policy "Links between public rows are visible to everyone"
  on public.entry_collections
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.id = entry_collections.entry_id
        and e.status = 'logged'
        and e.visibility = 'public'
    )
    and exists (
      select 1 from public.collections c
      where c.id = entry_collections.collection_id
        and c.visibility = 'public'
    )
  );

-- 6. Profile stats: only logged entries count as shows seen, and entries
--    without a venue still count (left join instead of inner join).
create or replace function public.public_profile_stats(profile_id uuid)
returns table(shows integer, venues integer, cities integer)
language sql
stable
set search_path to ''
as $function$
  select count(*)::integer,
         count(distinct e.venue_id)::integer,
         count(distinct lower(btrim(v.city)))
           filter (where nullif(btrim(v.city), '') is not null)::integer
  from public.entries e
  left join public.venues v on v.id = e.venue_id
  where e.user_id = profile_id
    and e.visibility = 'public'
    and e.status = 'logged';
$function$;
