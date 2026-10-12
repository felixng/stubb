# Decisions

A short log of choices made and why. Newest at the bottom. See `CLAUDE.md` for the project brief.

## Open decisions

| # | Question | Needed by | Notes |
|---|----------|-----------|-------|
| 1 | Confirm architecture in `docs/ARCHITECTURE.md` (Next.js on Vercel Hobby + Supabase Free) | Now | Proposed 2026-10-12 |
| 2 | Default entry visibility (public vs. private) | Phase 0 (schema) | Must be clearly shown to the user |
| 3 | Social logins | Now | Proposed: email code + Google now; add Apple before iOS ships (App Store rule 4.8) |
| 6 | iOS framework: Expo (React Native) vs native SwiftUI | Before iOS work | Proposed: Expo, to share TypeScript code with web. Backend is identical either way. |
| 4 | Email import method: paste-in vs. forwarding address vs. Gmail connect | Phase 2 | Brief suggests starting with paste-in |
| 5 | Reactions / comments: include or defer | Phase 3 | |

## Log

### 2026-10-12: Project brief lives in `CLAUDE.md`
Saved the brief as `CLAUDE.md` so every Claude Code session loads it automatically. Phases are tracked as GitHub epic issues.

### 2026-10-12: Web validation build this week, iOS app in about a month, $0/month
The owner wants a quick web version to validate this week, then an iOS app sharing the same users and data, on free tiers only. This brings iOS forward from "Later". Proposed design: `docs/ARCHITECTURE.md`. Both clients talk directly to Supabase, with rules enforced by Postgres RLS. Vercel hosts only server-needing routes (share cards, public OG pages). No custom API server.
