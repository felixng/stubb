import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteEntryButton } from "@/components/app/DeleteEntryButton";
import { RatingStars } from "@/components/ui/RatingStars";
import { formatDate, SHOW_TYPE_LABELS } from "@/lib/entries";
import { getOwnEntry } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Entry" };

async function Entry({ params, searchParams }: PageProps<"/app/entries/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const found = await getOwnEntry(id);
  if (!found) notFound();
  const { entry, photoUrl } = found;
  const where = [entry.venue.name, entry.venue.city].filter(Boolean).join(", ");

  return (
    <article className="flex flex-col gap-5">
      {query.new === "1" && (
        <p role="status" className="rounded-md bg-tint-fill px-4 py-3 text-subheadline font-medium text-label">
          Logged.
        </p>
      )}
      {query.photo === "failed" && (
        <p role="alert" className="rounded-md bg-fill px-4 py-3 text-subheadline text-destructive">
          Saved, but the photo didn’t upload. Edit the entry to add it again.
        </p>
      )}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
        <img src={photoUrl} alt="" className="max-h-[60vh] w-full rounded-md bg-fill object-cover" />
      )}
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-display text-label">{entry.show.title}</h1>
        <p className="text-subheadline text-label-secondary">
          {SHOW_TYPE_LABELS[entry.show.type]} · {where}
        </p>
        <p className="text-subheadline text-label-secondary">
          {formatDate(entry.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>
      {entry.rating != null && <RatingStars value={entry.rating} size={24} />}
      {entry.note && <p className="text-body whitespace-pre-line text-label">{entry.note}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {entry.collections.map((c) => (
          <Link
            key={c.id}
            href={`/app/trips/${c.id}`}
            className="inline-flex min-h-7 items-center rounded-pill bg-fill px-3 text-footnote font-medium text-label hover:bg-tint-fill"
          >
            {c.name}
          </Link>
        ))}
        <span className="text-footnote text-label-secondary">
          {entry.visibility === "public" ? "Public" : "Private"}
        </span>
      </div>
      <div className="flex flex-col gap-3 pt-2">
        <Link
          href={`/app/entries/${entry.id}/share`}
          className="inline-flex min-h-[50px] items-center justify-center rounded-pill bg-tint px-6 text-headline text-on-tint shadow-btn hover:bg-tint-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Share
        </Link>
        <Link
          href={`/app/entries/${entry.id}/edit`}
          className="inline-flex min-h-[50px] items-center justify-center rounded-pill bg-tint-fill px-6 text-headline text-tint-text hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Edit
        </Link>
        <DeleteEntryButton id={entry.id} photoPath={entry.photo_path} />
      </div>
    </article>
  );
}

export default function EntryPage(props: PageProps<"/app/entries/[id]">) {
  return (
    <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
      <Entry {...props} />
    </Suspense>
  );
}
