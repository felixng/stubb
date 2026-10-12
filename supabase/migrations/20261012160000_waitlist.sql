-- Waitlist for the public landing page (#10).
--
-- Anonymous visitors may INSERT only. Nobody reads, updates or deletes
-- through the API; the owner views and exports the list from the Supabase
-- dashboard (which bypasses RLS). A duplicate email is dropped silently, so
-- the table never reveals whether an address is already on the list, even to
-- someone calling the API directly with the public key.
--
-- No city column: the waitlist doesn't ask where people go to the theatre
-- (see docs/DECISIONS.md, "Any theatre, no city limit").

create extension if not exists citext with schema extensions;

create table public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      extensions.citext not null unique
             check (char_length(email) <= 254
                    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  -- utm_source, ref or referrer, so we can see whether shared cards drive sign-ups.
  source     text check (char_length(source) <= 100),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Supabase grants everything on new public tables to the API roles by
-- default; take it all back and allow inserting the two client fields only.
revoke all on public.waitlist from anon, authenticated;
grant insert (email, source) on public.waitlist to anon, authenticated;

create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Skip duplicates without an error. Runs as the table owner because the
-- caller can't read the table. The unique constraint still backs this up if
-- two identical sign-ups race.
create function public.waitlist_skip_duplicate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Spell out citext's operator: with an empty search_path a bare `=` would
  -- compare as text and miss case-only duplicates.
  if exists (
    select 1 from public.waitlist where email operator(extensions.=) new.email
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke execute on function public.waitlist_skip_duplicate() from public, anon, authenticated;

create trigger waitlist_skip_duplicate
  before insert on public.waitlist
  for each row execute function public.waitlist_skip_duplicate();
