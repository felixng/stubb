# Decisions

A short log of choices made and why. Newest at the bottom. See `CLAUDE.md` for the project brief.

## Open decisions

| # | Question | Needed by | Notes |
|---|----------|-----------|-------|
| 1 | Confirm architecture in `docs/ARCHITECTURE.md` (Next.js on Vercel Hobby + Supabase Free) | Now | Proposed 2026-10-12 |
| 4 | Email import method: paste-in vs. forwarding address vs. Gmail connect | Phase 2 | Brief suggests starting with paste-in |
| 5 | Reactions / comments: include or defer | Phase 3 | |
| 6 | Badges: app-defined only, or user/group-defined too? | When badges are scheduled | Idea; see `CLAUDE.md` "Ideas to explore" |
| 7 | Discord: channel webhook vs. Discord login vs. server/bot integration | When Discord is scheduled | Idea; tied to groups |

## Log

### 2026-10-12: Project brief lives in `CLAUDE.md`
Saved the brief as `CLAUDE.md` so every Claude Code session loads it automatically. Phases are tracked as GitHub epic issues.

### 2026-10-12: Web validation build this week, iOS app in about a month, $0/month
The owner wants a quick web version to validate this week, then an iOS app sharing the same users and data, on free tiers only. This brings iOS forward from "Later". Proposed design: `docs/ARCHITECTURE.md`. Both clients talk directly to Supabase, with rules enforced by Postgres RLS. Vercel hosts only server-needing routes (share cards, public OG pages). No custom API server.

### 2026-10-12: Entries default to public
Owner's call, "for now". It maximises shareable content and supports the share-card acquisition loop. Safeguards: the visibility state is shown on the log form with a one-tap per-entry toggle; users can change their default to private in settings; RLS tests cover both states. Revisit if early users find it surprising.

### 2026-10-12: iOS app is native SwiftUI
Owner prefers native SwiftUI over Expo/React Native. Consequence: no shared client code, so logic both apps need (validation, stats, search) lives in Postgres (constraints, RLS, SQL functions). The schema is the contract; Swift types are generated with `supabase gen types --lang swift`. Repo layout: see the monorepo entry below.

### 2026-10-12: This week is "NYC week"
The owner has ~3–4 sessions of 2 hours this week. Focus: (1) a great public landing page with mockups and a waitlist, (2) an owner-only hidden login to log their NYC shows (manual, from ticket emails, or from photos), group them into a trip, and share an excellent Instagram card at the end of the week. Public sign-up is off. This pulls email/photo import and the trip recap card forward from Phase 2, in a minimal owner-only form. Tracked in the NYC week epic.

### 2026-10-12: Name, Claude API and NYC-week dependencies approved
- Product name: **Stubbed**.
- The Claude API is approved for email/photo import (paid, small; spend limit set in the Anthropic console).
- Approved dependencies for NYC week: Tailwind CSS, `@supabase/supabase-js`, `@supabase/ssr`, `exifr`, Anthropic SDK (plus Next.js/React/TypeScript tooling). Anything beyond this list still needs a check.
- The NYC show list will come from the owner once the web app is ready. Seed data covers venues plus a few long-running shows; other shows get added through the app.

### 2026-10-12: Monorepo with pnpm workspaces
The owner wants the iOS app, the web app and the landing page in this one repo. Layout: `apps/web` (Next.js: landing at `/`, owner app at `/app`, share cards), `apps/ios` (SwiftUI, later), `supabase/` (the shared backend), `packages/` (only if shared JS is ever needed). pnpm workspaces only, no Turborepo/Nx. The landing page is part of the web app, not a separate app, so it shares the domain, design tokens and the share-card route. Vercel root directory: `apps/web`.

### 2026-10-12: Any theatre, no city limit; US/UK focus is internal only
The owner dropped the London/NYC/Edinburgh launch scope: the product covers any theatre, anywhere. Early effort (seed catalogue, marketing) still focuses on the US and UK, but users aren't told this. Public copy doesn't mention launch cities or regions, and the waitlist doesn't ask for a city.

### 2026-10-12: Design system "Interval"
The owner's design system artifact (https://claude.ai/artifact/UZXAQQuAaRmwtUDhYPE36U) replaces the earlier cream/curtain-red/Fraunces palette. It is dark first, with a single lime accent for the one primary action, Bricolage Grotesque + DM Sans, and a 4px spacing scale. Tokens live in `apps/web/src/app/globals.css`, React components in `apps/web/src/components/ui/`, and the mapping in `docs/DESIGN.md`.

### 2026-10-12: No share button on the waitlist success state
The owner dropped the "share with a theatre friend" button from #10. The success state is just the confirmation message. The share card remains the acquisition loop.

### 2026-10-12: Design system "Footlight" (native first)
The owner moved the design system to iOS-native first: "Footlight" (https://claude.ai/artifact/Pw3EwEHyfYxzshKVTFQAzc) replaces "Interval". Tokens are named after the iOS semantic colours, type is the system font (SF Pro) instead of Google Fonts, buttons and chips are capsules, and the page follows the visitor's light/dark setting instead of being dark-only. The wordmark is now `STUBBED` in capitals. The SwiftUI files in the artifact's `ios.md` are the native counterpart to `apps/web/src/components/ui/`. Mapping: `docs/DESIGN.md`.

### 2026-10-12: Design system "Footlight Coral" and new landing copy
The owner moved Footlight from the lime tint to coral: "Footlight Coral" (https://claude.ai/artifact/2r1EvQn2286Y29ZJNgPfP6) replaces the earlier Footlight artifact. Same token names, plus `tint-text` (brand colour as text, since coral fails contrast as text on light), `glow` (hero halo) and three shadows (`shadow-sm`, `shadow-lg`, `shadow-btn`); light mode sits on a soft peach ground. The landing page follows the owner's "Footlight Coral" landing design (https://claude.ai/artifact/GPberFRRTagnixyiXy3euN): pill-shaped email field, glow halo behind the phone and four feature cards, keeping the existing beta pill, feature chips and footer. The eyebrow reads "For the theatre regulars" (owner's wording).

### 2026-10-12: Schema v1 details (#12)
- `entries.venue_id` is required, like `show_id` and `date`, so stats ("venues visited", cities) stay accurate.
- New entries and collections take `visibility` from the profile default when the client doesn't send one (a trigger), so web and iOS can't drift.
- Clients can't set `verified` on shows or venues (column grants); the owner verifies from the dashboard. Shows have no unique title constraint (*Macbeth* is a play and an opera); `search_shows` is the dedupe step. Venues dedupe on `osm_id`.
- Logged-out visitors read only a profile's handle, display name and avatar. Signed-in users can also read `default_visibility`, since grants are per column; it reveals nothing their public entries don't.
- A trip's entry links are public only when both the entry and the trip are public, so a public trip page never lists private entries.

### 2026-10-12: Wordmark option B (lowercase)
The owner picked option B from the wordmark options board: `stubbed` in lowercase, SF Pro Display heavy (800), tracking -0.045em, in `label`. It replaces the capitals wordmark in both Footlight systems (lime and Coral), the landing and app-screen designs, the web `Wordmark` and `FLWordmark`. The product name in running copy stays "Stubbed", and screen readers hear "Stubbed". No colour or other token changed.

### 2026-10-12: Sign-in is Google + email and password; sign-ups stay off
Owner's call (#13): no magic link or emailed code. The login page offers "Continue with Google" and an email + password form. Sign-ups remain off during NYC week, so both only sign in accounts created in the Supabase dashboard; Google signs into the account whose email matches. Not depending on login emails also sidesteps Supabase's built-in sender limit of a few emails an hour. Apple sign-in is still needed before the iOS app ships (App Store rule 4.8). Password reset by email comes with public sign-up.
