import { Chip } from "@/components/ui/Chip";
import { RatingStars } from "@/components/ui/RatingStars";

function initials(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

// Poster, title, venue, date and rating, for feeds, lists and the diary.
// Fixed 176px wide; grid them with gap-4. Bordered, never shadowed.
export function ShowCard({
  title,
  venue,
  date,
  rating,
  poster,
  className = "",
}: {
  title: string;
  venue?: string;
  date?: string;
  rating?: number;
  poster?: string;
  className?: string;
}) {
  const meta = [venue, date].filter(Boolean).join(" · ");
  return (
    <article
      className={`flex w-44 flex-col overflow-hidden rounded-lg border border-border bg-surface-raised ${className}`}
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- posters come from anywhere
        <img
          src={poster}
          alt=""
          className="aspect-2/3 w-full bg-surface-sunken object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-2/3 w-full items-center justify-center bg-surface-sunken font-display text-5xl font-bold text-border-strong"
        >
          {initials(title)}
        </div>
      )}
      <div className="flex flex-col items-start gap-1 px-4 pt-3 pb-4">
        <h3 className="line-clamp-2 font-display text-lg leading-[22px] font-bold text-ink">
          {title}
        </h3>
        {meta && (
          <p className="mb-1 w-full truncate text-label font-normal text-ink-muted">
            {meta}
          </p>
        )}
        {rating ? <RatingStars value={rating} size={14} /> : <Chip>Want to see</Chip>}
      </div>
    </article>
  );
}
