import Link from "next/link";

import { Poster } from "@/components/ui/Poster";
import { RatingStars } from "@/components/ui/RatingStars";
import { formatDate, type EntryRow } from "@/lib/entries";

// Reverse-chronological list of entries: photo (or initials), title, venue,
// date, stars and trip chips. Used by the diary and trip pages.
export function EntryList({ entries, photos }: { entries: EntryRow[]; photos: Map<string, string> }) {
  return (
    <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
      {entries.map((e) => (
        <li key={e.id} className="border-b border-separator last:border-b-0">
          <Link
            href={`/app/entries/${e.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            <Poster
              title={e.show.title}
              poster={e.photo_path ? photos.get(e.photo_path) : undefined}
              className="w-14 flex-none"
            />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <p className="w-full truncate text-headline text-label">{e.show.title}</p>
              <p className="w-full truncate text-subheadline text-label-secondary">
                {[e.venue?.name, formatDate(e.date)].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {e.rating != null && <RatingStars value={e.rating} size={14} />}
                {e.collections.map((c) => (
                  <span key={c.id} className="rounded-pill bg-fill px-2 text-caption leading-5 text-label">
                    {c.name}
                  </span>
                ))}
                {e.visibility === "private" && (
                  <span className="text-caption text-label-secondary">Private</span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
