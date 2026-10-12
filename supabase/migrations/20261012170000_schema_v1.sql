-- Schema v1 (#12): profiles, the show/venue catalogue, entries, and
-- collections (trips and labels), with row-level security.
--
-- Both clients (web and iOS) talk to these tables directly with the user's
-- token, so every rule lives here: constraints, RLS and SQL functions.
-- See docs/ARCHITECTURE.md, "Rules live in Postgres".
--
-- No seed catalogue (docs/DECISIONS.md): shows and venues are added through
-- the app and by imports. `search_shows` / `search_venues` let the client
-- find an existing row before it creates a near-duplicate, and
-- `venues.osm_id` is unique so the same OpenStreetMap theatre is stored once.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.visibility as enum ('public', 'private');
create type public.show_type as enum ('musical', 'play', 'opera', 'dance', 'comedy', 'other');
create type public.collection_kind as enum ('trip', 'label');

-- Shared trigger: keep updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- profiles: one row per auth user, created by a trigger on sign-up.
-------------------------------------------------------------------------------

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  -- Null until chosen. Checked as text: citext's `~` ignores case, which
  -- would let 'Felix' through. Lowercase-only plus citext keeps it unique
  -- however it's typed in a URL.
  handle             extensions.citext unique
                     check (handle::text ~ '^[a-z0-9_]{3,20}$'),
  display_name       text check (char_length(display_name) <= 50),
  avatar_url         text check (char_length(avatar_url) <= 500),
  default_visibility public.visibility not null default 'public',
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Logged-out visitors see the public columns only. Signed-in users also read
-- default_visibility (the log form shows it); grants are per column, not per
-- row, so that includes other people's. It reveals nothing their public
-- entries don't already.
revoke all on public.profiles from anon, authenticated;
grant select (id, handle, display_name, avatar_url, created_at) on public.profiles to anon;
grant select on public.profiles to authenticated;
grant update (handle, display_name, avatar_url, default_visibility) on public.profiles to authenticated;

create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- venues and shows: the shared catalogue. Anyone reads; signed-in users add;
-- creators edit their own rows until they're verified. `verified` is set by
-- the owner from the dashboard (clients have no grant on it).
-------------------------------------------------------------------------------

create table public.venues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 200),
  city       text check (char_length(city) <= 100),
  country    text check (char_length(country) <= 100),
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  -- e.g. 'way/123456'. Set when the venue came from an OpenStreetMap lookup (#18).
  osm_id     text unique check (osm_id ~ '^(node|way|relation)/[0-9]+$'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  verified   boolean not null default false,
  created_at timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);

create index venues_name_trgm on public.venues using gin (name extensions.gin_trgm_ops);

create table public.shows (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  type       public.show_type not null default 'other',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);

create index shows_title_trgm on public.shows using gin (title extensions.gin_trgm_ops);

alter table public.venues enable row level security;
alter table public.shows enable row level security;

revoke all on public.venues, public.shows from anon, authenticated;
grant select on public.venues, public.shows to anon, authenticated;
grant insert (id, name, city, country, lat, lng, osm_id),
      update (name, city, country, lat, lng, osm_id)
  on public.venues to authenticated;
grant insert (id, title, type), update (title, type) on public.shows to authenticated;

create policy "Venues are public"
  on public.venues for select
  to anon, authenticated
  using (true);

create policy "Signed-in users add venues"
  on public.venues for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Creators edit their unverified venues"
  on public.venues for update
  to authenticated
  using (created_by = (select auth.uid()) and not verified)
  with check (created_by = (select auth.uid()) and not verified);

create policy "Shows are public"
  on public.shows for select
  to anon, authenticated
  using (true);

create policy "Signed-in users add shows"
  on public.shows for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Creators edit their unverified shows"
  on public.shows for update
  to authenticated
  using (created_by = (select auth.uid()) and not verified)
  with check (created_by = (select auth.uid()) and not verified);

-------------------------------------------------------------------------------
-- entries: one show seen on one date. Rating and note are optional; "add a
-- review later" is editing the note.
-------------------------------------------------------------------------------

create table public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  show_id    uuid not null references public.shows (id) on delete restrict,
  venue_id   uuid not null references public.venues (id) on delete restrict,
  date       date not null,
  -- Unscaled numeric so 0.45 is rejected rather than rounded to 0.5.
  rating     numeric check (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2)),
  note       text check (char_length(note) <= 10000),
  -- Path inside the Storage bucket, not a URL.
  photo_path text check (char_length(photo_path) <= 500),
  -- Filled from profiles.default_visibility when not given (trigger below).
  visibility public.visibility not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entries_user_date on public.entries (user_id, date desc);
create index entries_show on public.entries (show_id);
create index entries_venue on public.entries (venue_id);

-------------------------------------------------------------------------------
-- collections: trips (usually with dates) and labels, many-to-many with entries.
-------------------------------------------------------------------------------

create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  kind       public.collection_kind not null default 'trip',
  start_date date,
  end_date   date,
  visibility public.visibility not null,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index collections_user on public.collections (user_id);

create table public.entry_collections (
  entry_id      uuid not null references public.entries (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (entry_id, collection_id)
);

create index entry_collections_collection on public.entry_collections (collection_id);

-- Default visibility comes from the owner's profile. Runs as the table owner
-- so it also works for rows written from the dashboard or an import job.
create function public.set_default_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility is null then
    select p.default_visibility into new.visibility
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.set_default_visibility() from public, anon, authenticated;

create trigger entries_default_visibility
  before insert on public.entries
  for each row execute function public.set_default_visibility();

create trigger collections_default_visibility
  before insert on public.collections
  for each row execute function public.set_default_visibility();

create trigger entries_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

alter table public.entries enable row level security;
alter table public.collections enable row level security;
alter table public.entry_collections enable row level security;

revoke all on public.entries, public.collections, public.entry_collections from anon, authenticated;
grant select on public.entries, public.collections, public.entry_collections to anon;
grant select, insert, update, delete
  on public.entries, public.collections, public.entry_collections to authenticated;

create policy "Public entries are visible to everyone"
  on public.entries for select
  to anon, authenticated
  using (visibility = 'public');

create policy "Owners manage their entries"
  on public.entries for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Public collections are visible to everyone"
  on public.collections for select
  to anon, authenticated
  using (visibility = 'public');

create policy "Owners manage their collections"
  on public.collections for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A link is public when both ends are, so a public trip page or recap card
-- can list its public entries without exposing private ones.
create policy "Links between public rows are visible to everyone"
  on public.entry_collections for select
  to anon, authenticated
  using (
    exists (select 1 from public.entries e
            where e.id = entry_id and e.visibility = 'public')
    and exists (select 1 from public.collections c
                where c.id = collection_id and c.visibility = 'public')
  );

-- Owners link only their own entries into their own collections.
create policy "Owners manage their links"
  on public.entry_collections for all
  to authenticated
  using (
    exists (select 1 from public.entries e
            where e.id = entry_id and e.user_id = (select auth.uid()))
    and exists (select 1 from public.collections c
                where c.id = collection_id and c.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.entries e
            where e.id = entry_id and e.user_id = (select auth.uid()))
    and exists (select 1 from public.collections c
                where c.id = collection_id and c.user_id = (select auth.uid()))
  );

-------------------------------------------------------------------------------
-- Search: picking a show or venue in the log form (#14), and "does this
-- already exist?" when confirming an import. Trigram matching tolerates typos
-- ("hamiltn") and partial words ("ham"). Run as the caller, so RLS applies.
-------------------------------------------------------------------------------

create function public.search_shows(q text)
returns setof public.shows
language sql
stable
set search_path = public, extensions
as $$
  select s.*
  from public.shows s
  where s.title ilike '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
     or btrim(q) <% s.title
  order by greatest(similarity(btrim(q), s.title), word_similarity(btrim(q), s.title)) desc,
           s.verified desc,
           s.title
  limit 20;
$$;

-- With near_lat/near_lng, nearby venues rank higher (the same name exists in
-- many cities) and distance_km is filled in. Distance uses the haversine
-- formula; no PostGIS needed at this size.
create function public.search_venues(
  q text,
  near_lat double precision default null,
  near_lng double precision default null
)
returns table (
  id          uuid,
  name        text,
  city        text,
  country     text,
  lat         double precision,
  lng         double precision,
  osm_id      text,
  verified    boolean,
  distance_km double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with matches as (
    select v.*,
           greatest(similarity(btrim(q), v.name), word_similarity(btrim(q), v.name)) as score,
           case when near_lat is not null and near_lng is not null and v.lat is not null then
             2 * 6371 * asin(sqrt(
               power(sin(radians(v.lat - near_lat) / 2), 2)
               + cos(radians(near_lat)) * cos(radians(v.lat))
                 * power(sin(radians(v.lng - near_lng) / 2), 2)
             ))
           end as distance_km
    from public.venues v
    where v.name ilike '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
       or btrim(q) <% v.name
  )
  select m.id, m.name, m.city, m.country, m.lat, m.lng, m.osm_id, m.verified, m.distance_km
  from matches m
  order by m.score
           + case when m.distance_km < 2 then 0.5
                  when m.distance_km < 50 then 0.25
                  else 0 end desc,
           m.verified desc,
           m.name
  limit 20;
$$;

revoke execute on function public.search_shows(text) from public;
revoke execute on function public.search_venues(text, double precision, double precision) from public;
grant execute on function public.search_shows(text) to anon, authenticated;
grant execute on function public.search_venues(text, double precision, double precision) to anon, authenticated;
