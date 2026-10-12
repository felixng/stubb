# Decisions

A short log of choices made and why. Newest at the bottom. See `CLAUDE.md` for the project brief.

## Open decisions

| # | Question | Needed by | Notes |
|---|----------|-----------|-------|
| 1 | Confirm architecture in `docs/ARCHITECTURE.md` (Next.js on Vercel Hobby + Supabase Free) | Now | Proposed 2026-10-12 |
| 3 | Social logins | Now | Proposed: email code + Google now; add Apple before iOS ships (App Store rule 4.8) |
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

### 2026-10-12: No seed catalogue; photo import uses OpenStreetMap + Claude with web search
The owner questioned the hand-curated venue/show seed planned for #12. Decision: drop it. `venues` and `shows` fill up from manual adds and imports, reusing existing rows when they match (fuzzy match on name). This supersedes the seed part of the earlier "Name, Claude API and NYC-week dependencies" entry and the Phase 0 seed item in `CLAUDE.md`.

Why it's safe: ticket-email import names the show and venue, so it needs no catalogue. For photo import, an LLM shouldn't map raw GPS to a venue on its own: Broadway houses are often under 100 m apart and phone GPS in Midtown can be 20–50 m off, and the model has no map. It also can't know what was playing in October 2026 from training data alone.

Photo import flow (#18): read date and GPS on the device → look up theatres within ~150 m on OpenStreetMap (free, no key, covers any theatre anywhere) → send Claude the downscaled, metadata-stripped photo, the nearby theatres and the date, with web search on → it returns venue and show with a confidence level and a one-line reason → the owner confirms. The photo itself often settles it (show curtain, Playbill, a distinctive set) and breaks ties between neighbouring theatres; venue + date + web search cover generic stage shots and shows newer than the model. No GPS → fall back to photo + date. Claude won't identify performers by face, so cast can't be used.

Cost: web search adds about a cent per search on top of the import call; negligible at owner-only volume. OpenStreetMap lookups are free (respect the usage policy: low rate, identifying User-Agent).
