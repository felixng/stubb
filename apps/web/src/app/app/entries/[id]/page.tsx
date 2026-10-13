import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteEntryButton } from "@/components/app/DeleteEntryButton";
import { ShareSheet } from "@/components/app/share/ShareSheet";
import { formatDate, SHOW_TYPE_LABELS } from "@/lib/entries";
import type { CardData } from "@/lib/share-card";
import { getShareCard } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Entry" };

// The entry page is the share screen: sharing is the first thing on it, as
// in Hevy. The share cards carry the title, venue, date and rating; the
// details below add what the cards don't (type, note, trips, visibility).
async function Entry({ params, searchParams }: PageProps<"/app/entries/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const found = await getShareCard(id);
  if (!found) notFound();
  const { entry, photoUrl } = found;
  const where = [entry.venue.name, entry.venue.city].filter(Boolean).join(", ");
  const data: CardData = {
    title: entry.show.title,
    venue: entry.venue.name,
    where,
    date: formatDate(entry.date),
    year: Number(entry.date.slice(0, 4)),
    rating: entry.rating,
    showOfYear: found.showOfYear,
    venueVisit: found.venueVisit,
    timesSeen: found.timesSeen,
    handle: found.handle,
  };
  const slug = entry.show.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "show";

  return (
    <article className="flex flex-col gap-5">
      {query.new === "1" && (
        <p role="status" className="rounded-md bg-tint-fill px-4 py-3 text-subheadline font-medium text-label">
          Logged. Share it?
        </p>
      )}
      {query.photo === "failed" && (
        <p role="alert" className="rounded-md bg-fill px-4 py-3 text-subheadline text-destructive">
          Saved, but the photo didn’t upload. Edit the entry to add it again.
        </p>
      )}
      <ShareSheet data={data} photoUrl={photoUrl} slug={slug} editHref={`/app/entries/${entry.id}/edit`} />
      <section className="flex flex-col gap-3 border-t border-separator pt-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-title-2 font-display text-label">{entry.show.title}</h1>
          <p className="text-subheadline text-label-secondary">
            {SHOW_TYPE_LABELS[entry.show.type]} · {where}
          </p>
          <p className="text-subheadline text-label-secondary">
            {formatDate(entry.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>
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
            {entry.visibility === "public" ? "Public" : "Private. Sharing the image doesn’t change that."}
          </span>
        </div>
      </section>
      <DeleteEntryButton id={entry.id} photoPath={entry.photo_path} />
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
