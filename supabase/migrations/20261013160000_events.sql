-- Product analytics events (docs/ANALYTICS.md).
--
-- Page traffic goes to Vercel Web Analytics. This table holds the product
-- events Vercel can't count on the free plan (custom events need Pro), and
-- which web and iOS should record the same way: how entries get logged and
-- how share cards get shared. Views of public pages (/@handle) are page
-- views, so Vercel counts those.
--
-- Write-only, like the waitlist: clients insert, nobody reads through the
-- API. The owner queries it from the Supabase dashboard (saved queries in
-- docs/ANALYTICS.md). No IP address, user agent or free text is stored;
-- `props` holds small, non-personal details (e.g. how an entry was logged).
--
-- Things the database already records (entries.created_at, waitlist rows and
-- their `source`) are counted from those tables, not duplicated here.

create table public.events (
  id         bigint generated always as identity primary key,
  -- Only names listed here can be recorded, so a typo in a client fails
  -- loudly in development instead of quietly splitting a metric.
  name       text not null check (name in (
               'entry_logged', -- a new entry was saved
               'card_shared'   -- a share card was shared, saved or its text copied
             )),
  -- Always the signed-in user, from their token. Deleted with the account.
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  props      jsonb not null default '{}'
             check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 1024),
  created_at timestamptz not null default now()
);

create index events_name_created_at on public.events (name, created_at);
create index events_user_id on public.events (user_id);

alter table public.events enable row level security;

-- Signed-in users send the name and props only. user_id always comes from
-- the token (the column default), so nobody can record events as someone
-- else. Logged-out visitors can't record anything.
revoke all on public.events from anon, authenticated;
grant insert (name, props) on public.events to authenticated;

create policy "Signed-in users record their own events"
  on public.events for insert
  to authenticated
  with check (user_id = auth.uid());
