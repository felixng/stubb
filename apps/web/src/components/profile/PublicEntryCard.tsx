import Link from "next/link";

import { RatingStars } from "@/components/ui/RatingStars";
import { formatDate, SHOW_TYPE_LABELS, type EntryRow } from "@/lib/entries";
import type { Reactions } from "@/lib/reactions";
import { Avatar } from "./Avatar";
import { EntryReactions } from "./EntryReactions";

// Who is looking (null when signed out) and the entry's likes and comments,
// for the Like and Comment row under the card.
export type CardSocial = { viewerId: string | null; reactions: Reactions };

// One public entry, as a post: who and when, the show, where, stars, the note
// and the photo. Used on profiles, trip pages and the entry's own page
// (`page`: the title is the page's h1 and doesn't link to itself). Only public
// trips appear as chips (RLS hides links to private ones), each linking to its
// trip page. On a trip page (`inTrip`), the header and that trip's chip are
// left out, since the page already says whose trip it is; the date stays.
// The feed points `href` and `tripHref` at the app's own pages for your own
// shows, and can pass `href={null}` where no page would open; `badge` marks
// your private shows.
// With `social`, the card ends with Like and Comment; signed-out visitors
// sign in and come back to `loginNext`.
export function PublicEntryCard({
  entry,
  photoUrl,
  handle,
  name,
  avatarUrl,
  page = false,
  inTrip,
  href = `/e/${entry.id}`,
  tripHref = (id) => `/t/${id}`,
  badge,
  social,
  loginNext,
}: {
  entry: EntryRow;
  photoUrl?: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  page?: boolean;
  inTrip?: string;
  href?: string | null;
  tripHref?: (id: string) => string | null;
  badge?: string;
  social?: CardSocial;
  loginNext?: string;
}) {
  const Title = page ? "h1" : "h3";
  const trips = entry.collections.filter((c) => c.id !== inTrip);
  const where = [entry.venue?.name, entry.venue?.city].filter(Boolean).join(", ");
  return (
    <article
      id={`entry-${entry.id}`}
      aria-labelledby={`entry-${entry.id}-title`}
      className="flex scroll-mt-20 flex-col gap-3 rounded-md border border-separator bg-surface p-4 shadow-sm target:outline-2 target:outline-offset-2 target:outline-focus"
    >
      {inTrip ? (
        <p className="text-footnote text-label-secondary">
          <time dateTime={entry.date}>{formatDate(entry.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</time>
        </p>
      ) : (
        <header className="flex items-center gap-3">
          <Link href={`/@${handle}`} className="shrink-0 rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <Avatar name={name} url={avatarUrl} size={40} />
            <span className="sr-only">@{handle}’s profile</span>
          </Link>
          <div className="min-w-0">
            <p className="truncate text-subheadline font-semibold text-label">
              <Link href={`/@${handle}`} className="underline-offset-2 hover:underline">
                @{handle}
              </Link>
            </p>
            <p className="text-footnote text-label-secondary">
              <time dateTime={entry.date}>{formatDate(entry.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</time>
            </p>
          </div>
          {badge && <span className="ml-auto shrink-0 rounded-pill bg-fill px-3 text-footnote leading-7 font-medium text-label-secondary">{badge}</span>}
        </header>
      )}
      <div className="flex flex-col gap-1">
        <Title id={`entry-${entry.id}-title`} className={`${page ? "text-title" : "text-title-2"} font-display text-label`}>
          {page || !href ? (
            entry.show.title
          ) : (
            <Link href={href} className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              {entry.show.title}
            </Link>
          )}
        </Title>
        <p className="text-subheadline text-label-secondary">
          {SHOW_TYPE_LABELS[entry.show.type]} · {where}
        </p>
      </div>
      {entry.rating != null && <RatingStars value={entry.rating} size={20} />}
      {entry.note && <p className="text-body whitespace-pre-line text-label">{entry.note}</p>}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, EXIF stripped on upload
        <img
          src={photoUrl}
          alt={`Photo from ${entry.show.title}`}
          loading="lazy"
          className="aspect-4/5 max-h-[480px] w-full rounded-md bg-fill object-cover"
        />
      )}
      {trips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Trips and labels">
          {trips.map((c) => {
            const to = tripHref(c.id);
            return (
              <li key={c.id}>
                {to ? (
                  <Link
                    href={to}
                    className="inline-flex min-h-7 items-center rounded-pill bg-fill px-3 text-footnote font-medium text-label hover:bg-tint-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {c.name}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-7 items-center rounded-pill bg-fill px-3 text-footnote font-medium text-label">{c.name}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {social && (
        <EntryReactions
          entryId={entry.id}
          reactions={social.reactions}
          viewerId={social.viewerId}
          commentsHref={page ? "#comments" : `/e/${entry.id}#comments`}
          loginHref={`/login?next=${encodeURIComponent(loginNext ?? `/e/${entry.id}`)}`}
        />
      )}
    </article>
  );
}
