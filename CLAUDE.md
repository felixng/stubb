# Project Brief: Theatre Diary (working title, repo: `stubb`)

This file explains what we're building, why, and in what order. Where something is marked **[Decision needed]**, ask the owner rather than assuming. Decisions, once made, are logged in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## 1. What we're building

A social theatre-logging app: Letterboxd for theatre, with Hevy/Strava-style shareability. People log the shows they see, rate them, optionally review them, group them into trips or festivals, and share good-looking cards and recaps (to Instagram etc.) with their handle and stats.

The owner is a solo indie builder doing this as a side project, so scope discipline and speed to a usable product matter more than completeness. Monetisation is deliberately deferred; do not build payment or paywall features yet.

## 2. Why this might work

- Theatregoers already "show off" their attendance on Instagram (ticket stubs, curtain shots, Playbills). This product moves that behaviour into a purpose-built place with structure (stats, diary, trips).
- Existing theatre diary apps appear to be small, indie and mostly iOS (e.g. Mezzanine Theater Diary, Stagely). No Letterboxd-scale winner was found. User numbers for these were not verified.
- Theatre is geographically concentrated (London West End, Broadway, Edinburgh Fringe, regional touring), so a dense early community is achievable.

## 3. Honest risks (design around these)

1. **Low frequency.** Theatregoers log maybe 5–30 times a year, unlike gym users who log several times a week. The app must be valuable between visits (stats, recaps, shareable cards), not just at logging time.
2. **Cold-start social graph.** An empty feed is useless. So the product must be good for a single user with zero followers.
3. **Show catalogue is the hard problem, not the app code.** There is no clean free dataset of what was playing where and when. Users must be able to add shows themselves.
4. **Niche audience.** Likely a few hundred thousand heavy theatregoers across major hubs. Build lean.

## 4. Core product principles

1. **Solo experience first.** The product must feel worthwhile with no social features. Social comes later.
2. **The share card is the acquisition loop, not the feed.** A well-designed image with the user's handle, show, rating and stats is how new users arrive.
3. **Low barrier to entry.** Logging a show should take under 20 seconds. Getting old history in (import) should be easy.
4. **One simple data model.** An entry has an optional rating and an optional note. "Add a review later" is just editing the entry. Do not split reviews into a separate model.
5. **Own the data.** Users can export their data (CSV). This is also a trust signal.
6. **Privacy-respecting by default.** Strip EXIF/GPS metadata from any publicly served image. Entries are private or public per user setting; default to a sensible, clearly shown option. **[Decision needed: default visibility]**

## 5. Target geography for launch

London (West End + off-West End), New York (Broadway + Off-Broadway), Edinburgh (Fringe). Everything else is supported through user-added shows. A "Fringe wrap" around Edinburgh Fringe (August 2027) is a target growth moment.

## 6. Features and phasing

### Phase 0: Foundations
- Repo, CI, deploy pipeline, environments.
- Auth (email + at least one social login), user profile with unique handle.
- Database schema (see section 7) and migrations.
- Seed catalogue: a small, hand-curated set of London/NYC/Edinburgh venues and a starter list of shows. Design for the catalogue to grow.

### Phase 1: Web MVP, the solo experience
- **Log an entry:** search/select a show (or add a new one), pick venue and date, half-star rating (0.5–5), optional note, optional photo upload.
- **Tags / trips:** user-created labels or "trips" (e.g. "NYC Oct 2026", "Fringe 2027") that entries can belong to. Trips may have an optional date range.
- **Diary view:** reverse-chronological list of own entries with filters (year, tag/trip, rating).
- **Stats page:** shows seen per year/month, venues visited, cities, average rating, most-seen show, etc. Keep it simple and accurate.
- **Share cards:** generate a shareable image per entry (portrait format for Instagram Stories) containing show title, venue, date, rating, handle and one or two stats. Also a public, shareable entry page with good Open Graph previews.
- **Public profile page (opt-in):** handle, headline stats, recent public entries.
- **Mobile-first responsive web.** It must feel good on a phone browser, since this is used right after a show.

### Phase 2: Import and trip recap
- **Import via ticket confirmation emails:** user forwards or pastes confirmation emails; an LLM extracts show, venue, date and ticket details into draft entries for the user to confirm. Never auto-save without confirmation. **[Decision needed: forwarding address vs. paste-in vs. Gmail connect; start with paste-in]**
- **Import via photos:** read EXIF GPS and timestamp, match to a known venue and date, and suggest candidate shows. Present as suggestions only. Also consider programme/ticket photo OCR.
- **Trip recap card:** a shareable multi-entry summary (e.g. "7 shows in 5 days in NYC") with stats and handle.

### Phase 3: Social
- Follow / unfollow, follower/following lists.
- Social feed of followed users' public entries.
- Basic reactions or comments **[Decision needed: include or defer]**.
- Basic moderation/reporting hooks.

### Phase 4: Year-end wrap and polish
- Annual wrap (shareable, multi-card).
- Show pages with aggregate ratings and "who you follow has seen this."
- Watchlist ("want to see").

### Later (explicitly out of scope for now)
- Native iOS/Android apps.
- Any monetisation (the owner is sceptical of subscriptions for this audience; ideas like ticket affiliate links or printed wrap products may be revisited later).
- Public API.

## 7. Suggested data model (starting point, refine as needed)

- `users`: id, handle (unique), display_name, avatar, created_at, default_visibility
- `venues`: id, name, city, country, lat, lng
- `shows`: id, title, type (musical/play/opera/dance/comedy/other), created_by (null if seeded), verified boolean
- `entries`: id, user_id, show_id, venue_id, date, rating (nullable, half-star steps), note (nullable), photo_url (nullable), visibility, created_at, updated_at
- `trips` (or `collections`): id, user_id, name, start_date, end_date (nullable)
- `entry_trips`: entry_id, trip_id (many-to-many); tags can reuse this model or a sibling `tags` table
- `follows`: follower_id, followee_id, created_at (Phase 3)
- `import_drafts`: id, user_id, source (email/photo), raw_payload, parsed_json, status (Phase 2)

Notes:
- User-added shows and venues need dedupe/merge tooling eventually. Plan for fuzzy matching on title and venue.
- A "production" concept (a specific run/cast of a show) is deliberately omitted for now. Revisit if users want cast tracking.

## 8. Suggested tech approach

This is a suggested default; confirm with the owner before locking in **[Decision needed]**:

- Next.js (App Router) + TypeScript, deployed on Vercel.
- Supabase for Postgres, auth and file storage, with row-level security so private entries stay private.
- Share-card image generation server-side (e.g. Vercel OG / `@vercel/og` or similar).
- LLM-backed parsing for email import, behind a small, testable server function with human-in-the-loop confirmation.
- Keep the stack boring and cheap to run.

## 9. Quality bar

- Mobile-first; core logging flow works one-handed.
- Every write path respects visibility settings; add tests around privacy rules.
- Strip EXIF from any publicly served images.
- Accessible by default (contrast, labels, keyboard navigation).
- Sensible empty states, since early users will have few entries.

## 10. How we'll know if it's working

Suggested early signals (the owner can adjust):

- Of the first ~100 real users, what share log 3+ entries in their first month?
- What share generate or post a share card?
- Do users come back when they've seen a new show, without prompting?

If logging and sharing are both very low after a genuine push to theatre-heavy users, stop or pivot rather than building further.

## 11. Working agreements for Claude Code

- Build Phase 0 then Phase 1 only unless told otherwise. Do not start later phases.
- Prefer small, reviewable commits and short summaries of what changed.
- When a requirement is ambiguous or a [Decision needed] appears, ask rather than guess.
- Don't add dependencies, paid services or monetisation features without checking with the owner.
- Keep a short `docs/DECISIONS.md` log of choices made and why.
- Work is tracked as GitHub issues: one epic per phase (labelled `epic` + `phase-N`).
