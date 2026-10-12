# Supabase

The shared backend for web and iOS: SQL migrations (tables, constraints, row-level security, functions) and database tests. The schema is the contract between the two apps.

```
config.toml   local stack config (`supabase init`)
migrations/   timestamped SQL migrations
tests/        pgTAP privacy tests
```

There is no seed catalogue: shows and venues are added through the app and by imports. Use `search_shows(q)` and `search_venues(q, near_lat, near_lng)` to find an existing row before creating one.

## Local

Requires Docker and the Supabase CLI (`npx supabase ...` works).

```bash
npx supabase start        # local stack; applies migrations
npx supabase db reset     # re-apply migrations from scratch
npx supabase test db      # run tests/ (also runs in CI)
```

## Schema v1 (#12)

| Table | Read | Write |
|-------|------|-------|
| `profiles` | Everyone (anon: handle, display name, avatar only) | Own row; created by a trigger on sign-up |
| `shows`, `venues` | Everyone | Signed-in users add; creators edit their own unverified rows; `verified` is set from the dashboard |
| `entries`, `collections` | Everyone if `visibility = 'public'`; owner always | Owner only |
| `entry_collections` | Everyone if both ends are public; owner always | Owner, linking own entries to own collections |

New entries and collections take `visibility` from `profiles.default_visibility` (default `public`) unless given.

## Auth (#13)

Owner-only sign-in: email → 6-digit code. Sign-ups are off (`enable_signup = false` here and in the hosted project), so codes only go to existing users. The sign-in email template is `templates/magic_link.html`; it has the code and a fallback link to `/auth/confirm`.

Hosted project, once:

1. Authentication → Emails → **Magic Link**: subject `Your Stubbed sign-in code`, body from `templates/magic_link.html`. The default template has no code, only a link.
2. Authentication → URL Configuration: **Site URL** = the production URL (e.g. `https://stubbed.vercel.app`), so the fallback link points at the app.
3. Authentication → Sign In / Providers: **Allow new users to sign up** off; create the owner from Authentication → Users.

Locally, sign-ups are off too: add a user in Studio, then read the code in Mailpit (http://127.0.0.1:54324).
