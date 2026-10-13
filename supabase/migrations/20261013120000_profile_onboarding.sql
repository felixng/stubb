-- Profile onboarding: a signed-in user without a handle is sent to /welcome
-- to pick one, with their name, a short bio and one link (Instagram, a
-- website...). Bio and link are public, like the handle and display name.

alter table public.profiles
  add column bio  text check (char_length(bio) <= 160),
  -- One absolute http(s) URL. The client adds https:// to a bare
  -- "instagram.com/you" before saving.
  add column link text check (char_length(link) <= 200 and link ~ '^https?://[^[:space:]]+\.[^[:space:]]+$');

-- authenticated already selects every column (table-level grant).
grant select (bio, link) on public.profiles to anon;
grant update (bio, link) on public.profiles to authenticated;
