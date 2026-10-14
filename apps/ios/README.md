# Stubbed iOS app (planned)

Native **SwiftUI** app using [`supabase-swift`](https://github.com/supabase/supabase-swift) against the same Supabase project as the web app. Same users, same data, same row-level security. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §5 and the 2026-10-14 entry in [`docs/DECISIONS.md`](../../docs/DECISIONS.md).

The Xcode project lands here when iOS work starts. Until then this folder is a placeholder.

## Scope of the first version

Replicates the web owner app (`apps/web/src/app/app`):

- Sign in: Apple (native, `signInWithIdToken`), Google (GoogleSignIn SDK, `signInWithIdToken`), email + password. Then the welcome screen (handle, avatar).
- Diary, with the Upcoming (planned) section.
- Log and edit an entry: show and venue search, nearby theatres and the show suggestion from a photo, date, half-star rating, note, photo, visibility.
- Entry screen: share-card carousel, Stories / More / Download / Copy text / Edit, delete.
- Trips: list, detail, create, edit.
- Profile settings, and the public profile as a screen, with Follow / Requested / Following, follower and following lists, and follow requests to approve (`follows` table; rules in `supabase/README.md`, "Follows").
- Like and comment on public entries, with the comment thread on an entry screen (`entry_likes`, `entry_comments`, `entry_reactions`; rules in `supabase/README.md`, "Likes and comments").

Left out: import (an iOS-focused import comes later), admin pages, landing / waitlist / FAQ / legal pages (link to the web).

## Notes for building it

- **Minimum iOS 17** (iPhone XS/XR, SE 2nd gen and later).
- Logic both apps need (validation, stats, search) lives in Postgres (`supabase/migrations`), not in Swift or TypeScript. Generate Swift types from the schema: `supabase gen types --lang swift`.
- Every entry read must tolerate a **null venue** and **planned** entries (`status = 'planned'`, no rating).
- **Share cards are drawn natively** (SwiftUI `ImageRenderer`), matching the web designs in `apps/web/src/lib/share-card.ts` (1080×1080, three designs, transparent-background option). Their numbers come from `rpc("entry_card_stats", { entry_id })`.
- **Server routes** on the web app (`/api/photo/nearby`, `/api/photo/identify`): send the session's access token as `Authorization: Bearer <token>`.
- **Photos**: resize to 1600px and re-encode as JPEG on the device before upload, which drops EXIF/GPS (`apps/web/src/lib/photo.ts` has the sizes).
- **Google avatar**: the web copies the Google profile photo into the `avatars` bucket on first sign-in (no handle and no avatar yet). Native sign-in skips that callback, so do it on the device: take the profile image URL from GoogleSignIn, re-encode to 512px JPEG, upload, set `profiles.avatar_url`.
- **Analytics**: record `entry_logged` and `card_shared` in the `events` table, with the same props as the web (`apps/web/src/lib/analytics.ts`, `docs/ANALYTICS.md`).
- Sign in with Apple: add the app's bundle ID to Supabase → Auth → Apple → Client IDs. Google: create an iOS OAuth client and add it to the Google provider's authorised client IDs.
- Build and test on a Mac (Xcode, TestFlight). Avoid macOS GitHub runners on a private repo: they use free minutes at 10×.
