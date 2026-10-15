# Stubbed

**The project brief lives in a Google Doc: [Stubbed: Project Brief](https://docs.google.com/document/d/1NdEgeTRMkKQ5TL87Urwpe7WG9fcrejPsZKsmrO2Enak/edit).** It is the single source of truth for what we're building, why, what's built, what's next and the ideas list. Don't copy it back into the repo.

- Read it before planning or scoping work. In a session with the Google Drive connector, read it with `read_file_content` (file ID `1NdEgeTRMkKQ5TL87Urwpe7WG9fcrejPsZKsmrO2Enak`). Without the connector, ask the owner to paste the relevant section.
- Where the brief marks something **[Decision needed]**, ask the owner rather than assuming.
- If work changes what the brief says (a feature ships, a decision is made, the focus moves), tell the owner which section to update, or update it yourself when the session can edit Google Docs.
- Decisions, once made, are logged in [`docs/DECISIONS.md`](docs/DECISIONS.md). Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Monetisation ideas: [`docs/MONETISATION.md`](docs/MONETISATION.md).

## Working agreements for Claude Code

These are standing rules for every session, kept here so they load automatically.

- **Product name: Stubbed.** Use it in UI copy, the landing page and share-card wordmarks.
- **Monetisation is deferred.** Don't build payment or paywall features.
- **Public copy never mentions launch cities or regions**, or asks users where they go to the theatre. The product covers any theatre, anywhere.
- **Privacy:** every read and write path respects visibility and private profiles, with database tests around the privacy rules. Strip EXIF/GPS from any stored or served image.
- **Rules live in Postgres** (constraints, RLS, SQL functions), so the web and iOS apps can't drift.
- **Pages keep their state when you leave them.** The web app runs Next with `cacheComponents`, so a page you navigate away from is hidden, not unmounted: `useState` values survive and come back on return, while effects clean up and re-run. For every stateful client component, decide what the page should look like when someone returns after finishing the task (saved, created, added, deleted) and make that happen with `useFreshOnReturn` (`apps/web/src/lib/use-fresh-on-return.ts`). Keep unfinished drafts and selections for a stray tab tap. Never free something state still points at (e.g. `URL.revokeObjectURL` for a preview) in an effect cleanup, because that also runs when the page is hidden. Free it when it's replaced, removed or reset.
- Prefer small, reviewable commits and short summaries of what changed.
- When a requirement is ambiguous or a [Decision needed] appears, ask rather than guess.
- Don't add dependencies, paid services or monetisation features without checking with the owner.
- Keep a short `docs/DECISIONS.md` log of choices made and why.
- Work is tracked as GitHub issues: one epic per area (labelled `epic`, plus `phase-N`, `nyc-week` or `ios`).
