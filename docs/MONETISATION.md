# Monetisation ideas

Status: **ideas only, nothing scheduled.** Monetisation is deferred (see [the project brief](https://docs.google.com/document/d/1NdEgeTRMkKQ5TL87Urwpe7WG9fcrejPsZKsmrO2Enak/edit)), and the owner is sceptical of subscriptions for this audience. This file collects the ideas and comparable pricing so the decision is quick when it comes. Open decision #8 in `docs/DECISIONS.md`.

## Ground rules

- The free product must be complete on its own: logging, diary, stats, share cards and CSV export stay free. Paid features are extras, never a hostage of the user's own data.
- Don't build paywall or payment code until the owner says so.
- Keep schema choices from blocking these ideas (notes below).

## Candidate paid features

### 1. Multiple photos per entry
- Free: one photo per entry. Paid: several (e.g. curtain call, Playbill, stage door).
- Owner's rough price idea: **£3/month or £15/year**.
- Also covers our main real cost: Supabase Storage is likely the first free-tier limit we hit (`docs/ARCHITECTURE.md`).
- Schema: move photos into an `entry_photos` table (entry_id, url, position) instead of the single `entries.photo_url` column, ideally before iOS ships so both clients agree.

### 2. Import credits
- Email/photo import calls the Claude API, so each run has a small, real cost.
- Idea: a free allowance (enough to import a typical year's history), then paid packs of import runs as a **one-off purchase**, not a subscription.
- Tension: "getting old history in should be easy" is a core principle (risks 2 and 3 in [the project brief](https://docs.google.com/document/d/1NdEgeTRMkKQ5TL87Urwpe7WG9fcrejPsZKsmrO2Enak/edit)). The free allowance has to be generous enough that the first import never hits a paywall.
- Schema: count runs per user; `import_drafts` already records each run.

### 3. Long-range insights
- Free stats cover the current and previous year. Paid unlocks multi-year trends: year-on-year comparisons, rating drift, venues over time, the calendar heatmap across all years.
- Reference: Bevel puts deeper, longer-term insights in its Pro tier.
- Risk: stats are a main reason to open the app between visits (risk 1), so the free tier must still feel rich.

### Earlier ideas
- Ticket affiliate links (e.g. from show pages or the watchlist).
- Printed year-end wrap products.

## Comparable pricing

Checked 2026-10-13 from App Store listings and a pricing tracker. US prices unless noted; prices vary by country and change often, so re-check before deciding.

| App | What's paid | Monthly | Yearly | Notes |
|-----|-------------|---------|--------|-------|
| 1 Second Everyday (1SE) | Pro: music, unlimited backup and projects | $9.99 | $49.99 | France: €10.49 / €59.99. A $4.99 monthly entry also appears, possibly regional or promo. |
| Personal Best – Workouts (Codakuma) | Pro: Apple Health stats and records | $2.99 | $14.99 | Assumed this is the "Personal Best" meant. Other yearly tiers ($19.99–$24.99) also listed. |
| Bevel | Pro: coaching, custom insights | $14.99 | $99.99 | Tracker, Aug 2026. Older App Store listing showed $5.99 / $49.99. |

Takeaway: the owner's £3/month or £15/year sits at the Personal Best end, well under 1SE and Bevel. That suits a low-frequency hobby app with a small audience.

Sources:
- [1 Second Everyday on the App Store](https://apps.apple.com/app/id587823548)
- [1 Second Everyday (France)](https://apps.apple.com/fr/app/1-second-everyday/id587823548)
- [Personal Best – Workouts on the App Store](https://cur.at/OYXrZfW?m=web)
- [Bevel pricing (Recurdash)](https://recurdash.com/subscription-pricing/bevel)
- [Bevel on the App Store](https://apps.apple.com/us/app/-/id6456176249)

## Practical blockers before charging

- **Vercel Hobby is non-commercial only.** Charging means moving to Vercel Pro ($20/month) or another host (`docs/ARCHITECTURE.md`).
- **iOS:** digital features sold in the iOS app must use Apple in-app purchase (15% fee under the Small Business Program).
- Web payments would need a payment provider, which is a new paid service and needs the owner's OK.
