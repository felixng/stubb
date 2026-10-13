import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ShareSheet } from "@/components/app/share/ShareSheet";
import { formatDate } from "@/lib/entries";
import type { CardData } from "@/lib/share-card";
import { getShareCard } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Share" };

// Opens straight after logging (?new=1), and from an entry's Share button.
async function Share({ params, searchParams }: PageProps<"/app/entries/[id]/share">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const found = await getShareCard(id);
  if (!found) notFound();
  const { entry, photoUrl } = found;
  const data: CardData = {
    title: entry.show.title,
    venue: entry.venue.name,
    where: [entry.venue.name, entry.venue.city].filter(Boolean).join(", "),
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title-2 font-display text-label">{query.new === "1" ? "Logged. Share it?" : "Share"}</h1>
        <Link
          href={`/app/entries/${entry.id}`}
          className="inline-flex min-h-11 items-center rounded-pill px-4 text-headline text-tint-text hover:bg-tint-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {query.new === "1" ? "Done" : "Cancel"}
        </Link>
      </div>
      {entry.visibility === "private" && (
        <p className="text-footnote text-label-secondary">
          This entry is private. Sharing the image doesn’t change that.
        </p>
      )}
      <ShareSheet data={data} photoUrl={photoUrl} slug={slug} />
    </div>
  );
}

export default function SharePage(props: PageProps<"/app/entries/[id]/share">) {
  return (
    <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
      <Share {...props} />
    </Suspense>
  );
}
