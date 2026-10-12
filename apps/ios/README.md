# Stubbed iOS app (planned)

Native **SwiftUI** app using [`supabase-swift`](https://github.com/supabase/supabase-swift) against the same Supabase project as the web app. Same users, same data, same row-level security. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §5.

The Xcode project lands here when iOS work starts (roughly a month after the web validation build). Until then this folder is a placeholder.

Notes for when it starts:
- Logic both apps need (validation, stats, search) lives in Postgres (`supabase/migrations`), not in Swift or TypeScript.
- Generate Swift types from the schema: `supabase gen types --lang swift`.
- Share cards come from the web app's `/api/card/*` route, so there's one card design.
