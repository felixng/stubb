import { RatingStars } from "@/components/ui/RatingStars";
import { formatDate, SHOW_TYPE_LABELS, type EntryRow } from "@/lib/entries";
import { Avatar } from "./Avatar";

// One public entry on a profile, as a post: who and when, the show, where,
// stars, the note and the photo. Only public trips appear as chips (RLS
// hides links to private ones).
export function PublicEntryCard({
  entry,
  photoUrl,
  handle,
  name,
  avatarUrl,
}: {
  entry: EntryRow;
  photoUrl?: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
}) {
  const where = [entry.venue.name, entry.venue.city].filter(Boolean).join(", ");
  return (
    <article
      id={`entry-${entry.id}`}
      aria-labelledby={`entry-${entry.id}-title`}
      className="flex scroll-mt-20 flex-col gap-3 rounded-md border border-separator bg-surface p-4 shadow-sm target:outline-2 target:outline-offset-2 target:outline-focus"
    >
      <header className="flex items-center gap-3">
        <Avatar name={name} url={avatarUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate text-subheadline font-semibold text-label">@{handle}</p>
          <p className="text-footnote text-label-secondary">
            <time dateTime={entry.date}>{formatDate(entry.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</time>
          </p>
        </div>
      </header>
      <div className="flex flex-col gap-1">
        <h3 id={`entry-${entry.id}-title`} className="text-title-2 font-display text-label">
          {entry.show.title}
        </h3>
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
      {entry.collections.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Trips and labels">
          {entry.collections.map((c) => (
            <li key={c.id} className="rounded-pill bg-fill px-3 text-footnote leading-7 font-medium text-label">
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
