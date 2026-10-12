# Design system ("Interval")

The source of truth is the design system artifact: https://claude.ai/artifact/UZXAQQuAaRmwtUDhYPE36U. This file covers how it maps onto the web app. If you change a token or rule, change it in the artifact first, then mirror it here and in `apps/web/src/app/globals.css`.

## Principles

- **Dark first.** The house lights are down and the poster does the talking. Light theme only when asked for (`<html data-theme="light">`); there's no toggle yet.
- **One signal colour.** `accent` (lime) marks the single most important thing on a screen: the one primary action, links, the active nav item. Nothing else.
- **Copy:** terse and confident, sentence case, no emoji, no exclamation marks. Button labels are verbs. Show titles use the display face. Numbers are tabular.
- **Ratings** always show as the five `RatingStars`, never a bare number.

## Tokens → Tailwind

Defined in `apps/web/src/app/globals.css`.

| Token | Tailwind | Use |
|---|---|---|
| `surface`, `surface-raised`, `surface-sunken` | `bg-surface`, `bg-surface-raised`, `bg-surface-sunken` | Page, cards/inputs, wells/poster placeholders |
| `ink`, `ink-muted` | `text-ink`, `text-ink-muted` | All text |
| `border`, `border-strong` | `border-border`, `border-border-strong` | Hairlines; control borders and empty stars |
| `accent`, `accent-strong`, `on-accent` | `bg-accent`, `hover:bg-accent-strong`, `text-on-accent` | Primary action only |
| `accent-tint` | `bg-accent-tint` | Chips, highlighted rows (text: `ink`) |
| `highlight` | `fill-highlight` | Rating stars and award marks, never words |
| `focus` | `outline-focus` | 2px ring, 2px offset, on every interactive element |
| `shadow-raised` | `shadow-raised` | Menus and sheets only; cards use a border |

**Type:** Bricolage Grotesque (`font-display`, variable, with its optical-size axis so large sizes get the display cut) and DM Sans (`font-sans`), via `next/font`. The styles are Tailwind font sizes that carry their own line height, weight and tracking: `text-display-xl` 56, `text-display-lg` 40, `text-heading` 28 (with `font-display`), and `text-title` 20, `text-body-lg` 17, `text-body` 15 (default), `text-label` 13, `text-caption` 12 (with `font-sans`). Never set body text below `caption`.

**Spacing:** `space-1…space-8` = 4, 8, 12, 16, 24, 32, 48, 64px = Tailwind `1, 2, 3, 4, 6, 8, 12, 16`. Use only these. Card padding and gaps are `4`; page gutters are `px-6` on phones and `lg:px-12` on desktop.

**Radius:** `rounded-sm` 4px (chips, inputs), `rounded-md` 8px (buttons, posters), `rounded-lg` 12px (cards, sheets), `rounded-pill` (avatars only).

## Components

React ports of the artifact's components live in `apps/web/src/components/ui/`:

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant` primary \| secondary \| ghost, `size` md \| sm, native button props | One `primary` per screen |
| `Chip` | `selected`, `onClick`, children | Toggle button with `onClick`, static tag without |
| `RatingStars` | `value` 0–5 (halves), `size` px | 14px in cards, 20px+ on show pages |
| `ShowCard` | `title`, `venue`, `date`, `rating`, `poster` | 176px wide, 2:3 poster or initials, bordered |
| `Wordmark` | `size` px (min 20) | "Stubbed" with a capital S, `ink` only, never accent |

## Icons

No icon set is chosen yet. The system calls for a 24px line set at 1.5px stroke (e.g. Lucide), in `ink`/`ink-muted`, with `accent` only for an active state. Adding one is a new dependency, so check with the owner first.
