-- Trips v2: trips always have dates, hold only shows within those dates, and
-- have no privacy setting of their own (a trip is public when it holds a
-- public logged show). Labels are deferred: the 'label' kind stays in the enum
-- for later, but the app no longer creates them. No trips exist yet, so
-- nothing needs backfilling.

-- 1. A trip has a start and an end date (labels, later, need neither).
alter table public.collections
  add constraint collections_trip_dates
  check (kind <> 'trip' or (start_date is not null and end_date is not null));

-- 2. A trip is public when at least one of its shows is public and logged, and
--    the owner's profile isn't private. Security definer so the check can read
--    links and entries without the policies on those tables recursing back here.
create function public.collection_is_public(collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entry_collections ec
    join public.entries e on e.id = ec.entry_id
    join public.profiles p on p.id = e.user_id
    where ec.collection_id = collection
      and e.status = 'logged'
      and e.visibility = 'public'
      and not p.is_private
  );
$$;

revoke execute on function public.collection_is_public(uuid) from public;
grant execute on function public.collection_is_public(uuid) to anon, authenticated;

alter policy "Public collections are visible to everyone"
  on public.collections
  using (public.collection_is_public(id));

-- A link is public when its show is (entries' own RLS also hides private
-- profiles); its trip is then public too, by the rule above.
alter policy "Links between public rows are visible to everyone"
  on public.entry_collections
  using (
    exists (
      select 1 from public.entries e
      where e.id = entry_collections.entry_id
        and e.status = 'logged'
        and e.visibility = 'public'
    )
  );

-- 3. Trips no longer have their own visibility.
drop trigger collections_default_visibility on public.collections;
alter table public.collections drop column visibility;

-- 4. A trip holds only shows dated within it. Checked when a show is added, when
--    a trip's dates change, and when a show in a trip is re-dated.
create function public.check_trip_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.collections c
    join public.entries e on e.id = new.entry_id
    where c.id = new.collection_id
      and c.kind = 'trip'
      and (e.date < c.start_date or e.date > c.end_date)
  ) then
    raise exception 'show is outside the trip dates' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger entry_collections_within_trip
  before insert or update on public.entry_collections
  for each row execute function public.check_trip_link();

create function public.check_trip_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'trip' and exists (
    select 1
    from public.entry_collections ec
    join public.entries e on e.id = ec.entry_id
    where ec.collection_id = new.id
      and (e.date < new.start_date or e.date > new.end_date)
  ) then
    raise exception 'trip has shows outside these dates' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger collections_shows_within_dates
  before update of kind, start_date, end_date on public.collections
  for each row execute function public.check_trip_dates();

create function public.check_entry_trip_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.entry_collections ec
    join public.collections c on c.id = ec.collection_id
    where ec.entry_id = new.id
      and c.kind = 'trip'
      and (new.date < c.start_date or new.date > c.end_date)
  ) then
    raise exception 'show date is outside its trip' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger entries_within_trips
  before update of date on public.entries
  for each row execute function public.check_entry_trip_dates();

-- Trigger functions only; not callable through the API.
revoke execute on function public.check_trip_link() from public, anon, authenticated;
revoke execute on function public.check_trip_dates() from public, anon, authenticated;
revoke execute on function public.check_entry_trip_dates() from public, anon, authenticated;
