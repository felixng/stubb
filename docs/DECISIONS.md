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

### 2026-10-12: Logging is photo first (#14)
Owner's call. The log form starts with a photo and fills in what it can: the date from the photo's EXIF, nearby theatres from its GPS (OpenStreetMap), and the show and venue from Claude (photo + nearby theatres + date, with web search). Anything it can't work out stays blank for the user. High or medium confidence fills empty fields; low confidence only shows a "Maybe X?" chip. Detection never overwrites a field the user has touched. With no date in the photo, the date defaults to today. "No photo? Fill in by hand" skips straight to the form. This pulls the single-photo part of #18 into #14; #18 keeps batch import of several photos, reusing the same routes.
- The original photo never leaves the phone: it's re-encoded to JPEG on the device (no EXIF/GPS), then uploaded to the private `entry-photos` bucket. Others can read a photo only while its entry is public.
- Claude calls go through `/api/photo/identify` (`claude-opus-5-5`, effort medium, web search up to 3 uses, server-side refusal fallback on). Until `ANTHROPIC_API_KEY` is set it returns 503 and the form simply skips the suggestion.

### 2026-10-13: App and sign-in are always light; landing menu links to sign-in
Owner's call: `/app` and `/login` now stay light whatever the device setting, like the landing page (`data-theme="light"`). Dark mode can come back later; the tokens are unchanged. The landing page gets a hamburger menu next to the beta pill whose only item is "Sign in", so the login page is no longer unlinked. Sign-ups stay off, so the link reveals nothing.

### 2026-10-13: AI calls go through `lib/ai`, Groq first
Owner's call. All model calls go through `apps/web/src/lib/ai`: a feature sends a provider-neutral request (system prompt, text/image parts, JSON Schema, optional web search) and gets back the first acceptable answer from an ordered chain of models. Providers live side by side (`groq.ts`, `anthropic.ts`); adding one is a new file plus an entry in the registry.
- Default chain: Groq (`meta-llama/llama-4-scout-17b-16e-instruct`, vision + JSON Schema) then Claude (`claude-opus-5-5` with web search). Called with `fetch`, so Groq adds no dependency.
- Swap or reorder models with `AI_MODELS` or a per-task `AI_MODELS_<TASK>` (e.g. `AI_MODELS_IDENTIFY="anthropic,groq"`); providers without a key are skipped.
- A model that errors, declines, or isn't accepted by the feature hands over to the next. Photo identify only accepts a named show at medium or high confidence, since Groq's vision models can't search the web; otherwise Claude gets a go. The whole chain shares one time budget so the fallback fits in the route's limit.
- Gemini and Cerebras added as optional providers (fetch only, no SDK), not in the default chain; name them in `AI_MODELS` to try them. Gemini (`gemini-flash-latest`) takes images and uses Google Search grounding. Cerebras (`gpt-oss-120b`) is text only, so requests with images skip it; it's meant for text tasks like pasted ticket emails.

### 2026-10-13: Bulk import tool, testing version (#17, #18)
Owner's call: one import screen (`/app/import`) for both sources, built for desktop testing first, on shared logic that a mobile-first import can reuse.
- **Emails:** upload exported files (.eml, .mbox, saved .html, .txt) or paste one. MIME is decoded on the device (`lib/import/email-parse.ts`); only the readable text goes to `/api/import/email`, one email per call, a few at a time. Attachments are never sent. The email text isn't stored or logged (token counts only). Extraction goes through `lib/ai` like photo detection (task `email`, low effort, no web search), so `AI_MODELS_EMAIL` picks its chain.
- **Photos:** several at once. Each runs through the #14 pipeline, now shared in `lib/import/photo-pipeline.ts`. Photos from the same visit (same date, within 5 hours, within 250 m) become one draft and one identify call with up to 4 photos (`/api/photo/identify` now accepts several).
- **Review:** every source is listed with what was read from it. Each show becomes a draft with the read values, confidence and reason, and editable show, venue, date, rating and note. Same rule as the log form: low confidence never fills a field, it offers "Maybe X?". A booking and its reminder merge into one draft. Drafts matching an entry already in the diary are flagged. Nothing is saved until "Save"; entries take the profile's default visibility, and can be added to trips and labels in one go.
- Drafts live in page state for now; `import_drafts` comes with the mobile flow if needed.
- Unit tests use Node's built-in test runner (`pnpm test`, also in CI), so no new dependency. They cover email parsing, photo grouping, draft merging and the extraction mapping, with synthetic fixtures. Redacted real confirmation emails can be added under `apps/web/test/fixtures/emails/`.
- **Choosing the AI provider:** the import screen has a model picker (owner testing). The default, **Compare all providers**, sends each email or photo visit to every provider with an API key at once (photos skip text-only ones) and shows the answers side by side with timings and the fields they disagree on. Drafts come from the best answer (confident first, then the default chain's order), and "Use this" switches a source's drafts to another provider's answer. It costs one call per provider per source. The other options: the default chain with fallback, or one provider (optionally a model id) with no fallback. Each source and draft shows which model read it. The choice is remembered in the browser.

### 2026-10-13: Groq and Cerebras pick their default model from what they serve
Found in the owner's first real import: Groq's default (Llama 4 Scout, shut down 17 July 2026) and Cerebras's new default (Gemma 4 31B, off the shared API since 3 September 2026) both returned "model not found". Providers retire models every few months, so a hardcoded default goes stale. Groq and Cerebras now keep a short preference list (Groq: `qwen/qwen3.8-27b`, then `qwen/qwen3.6-27b`; Cerebras: `qwen-3.8-27b`, all vision models) and use the first one their `/models` endpoint lists for the key, checked every 10 minutes; if the list can't be read, the first preference is used. A model named explicitly (`groq:…`) is used as is. The import tool's picker suggests model ids from those lists, and failed calls show the provider's error message. This replaces the Gemma 4 decision and the Groq model named in the `lib/ai` entry. Gemini's 429 in the same run was the key's quota, not code; at the owner's request Gemini now defaults to `gemini-3.8-flash`, which their free-tier key can use.

### 2026-10-13: Compare mode runs several Claude models side by side
Owner's call, to see how fast and accurate each Claude model is. In the import tool's compare mode Claude gets one column per model: Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 (the list is `COMPARE_MODELS` in `lib/ai/anthropic.ts`). Every column gets the identical request (same prompt, photos, effort and web search) and shows its own round-trip time. Haiku 5.5 has no server-side refusal fallback and takes the basic web search tool, so its requests leave the fallback out and use `web_search_20250305`; the others are unchanged. Cost: a photo visit is now up to 7 calls, Fable being the priciest; the email route's per-user limit goes to 1,000 calls per 10 minutes.

### 2026-10-13: Photo identify works from venue and date first; compare Opus and Haiku only
Owner's call. The identify prompt now follows the owner's order: (1) take the venue and date (nearby theatres plus the photo's date), (2) search what was playing there that day for a short list of shows, (3) match the photo's set against that list, searching production photos when it helps. (4) A title, programme or Playbill readable in the photo always wins; the venue search then only picks the theatre. The reason starts with what settled it. Providers without web search are told to skip searching, as before. The import tool's compare mode now runs only Opus 5.5 against Haiku 5.5: Sonnet and Fable are dropped, and so are Groq, Gemini and Cerebras (still pickable one at a time, and still in the default chain where configured). Compare mode includes only providers that list `compareModels`.

### 2026-10-13: Faster nearby-theatre lookup; three visits at a time; photo thumbnails
Production logs showed every nearby lookup failing (public Overpass servers timing out or returning 504 from Vercel), costing about 14 seconds per photo visit before identify even started, and leaving Claude with no candidate theatres. Now:
- The Overpass mirrors are asked at once and the first answer wins, with a 4-second limit. Nominatim's theatre search (no key needed, like Overpass) runs alongside as the fallback when every Overpass server fails. Nominatim calls are spaced about a second apart, as its usage policy asks. Results are cached per ~100 m square for the server instance.
- The client checks saved venues near the photo at the same time, so a theatre already in the catalogue is found even when OpenStreetMap is down.
- The import tool runs three photo visits (and three emails) at a time; with only two compared models, that's safe for rate limits.
- Each photo visit in "What we read" shows its photos as thumbnails (tap to open full size), so it's clear which photo the results are about.

### 2026-10-13: The log form never locks; the show arrives as a suggestion
Owner's call, for logging on a trip: replaces "Lock the log form while the photo is checked". Picking a photo fills the date at once and the venue within about a second (one theatre in range fills it; several show as tap-to-pick chips, nearest first). Every field and Save stay usable while the AI works out the show, shown as a small "Working out the show from your photo…" pill. When the answer arrives it fills only fields the user hasn't set: a different show or venue from the user's pick, or a low-confidence guess, appears as a chip ("Photo suggests…", "Maybe…?") and never replaces a choice. Saving first drops the late answer. After 20 seconds the pill gives up quietly ("Couldn't work out the show"). A hard cap on the whole process was rejected: the correct answers that need a web search take 6–17 seconds.
