import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicEntryCard } from "@/components/profile/PublicEntryCard";
import { formatDate } from "@/lib/entries";
import { getPublicEntry } from "@/lib/public-pages";

// Public entry page, the link behind a shared card: the show as a post, with
// a link to the rest of @handle's diary. Only public, logged entries on
// public profiles (RLS, via the publishable key); anything else is a 404,
// even for the owner. Its preview image is /api/og/entry/[id].

export async function generateMetadata({ params }: PageProps<"/e/[id]">): Promise<Metadata> {
  const { id } = await params;
  const found = await getPublicEntry(id);
  if (!found) return { title: "Not found — Stubbed", robots: { index: false } };
  const { entry, owner, version } = found;
  const at = entry.venue ? `${entry.show.title} at ${entry.venue.name}` : entry.show.title;
  const title = `${at} — @${owner.handle} on Stubbed`;
  const description = [
    `@${owner.handle} saw ${entry.show.title}${entry.venue?.city ? ` in ${entry.venue.city}` : ""} on ${formatDate(entry.date, { day: "numeric", month: "long", year: "numeric" })}`,
    entry.rating != null ? `and rated it ${entry.rating} out of 5` : null,
  ]
    .filter(Boolean)
    .join(" ")
    .concat(".");
  const image = { url: `/api/og/entry/${entry.id}?v=${version}`, width: 1200, height: 630, alt: `${at}, tracked on Stubbed` };
  return {
    title,
    description,
    alternates: { canonical: `/e/${entry.id}` },
    openGraph: { type: "article", title: at, description, url: `/e/${entry.id}`, images: [image] },
    twitter: { card: "summary_large_image", title: at, description, images: [image] },
  };
}

async function Entry({ params }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const found = await getPublicEntry(id);
  if (!found) notFound();
  const { entry, owner, photoUrl } = found;
  const name = owner.display_name || `@${owner.handle}`;
  return (
    <>
      <PublicEntryCard
        entry={entry}
        photoUrl={photoUrl ?? undefined}
        handle={owner.handle}
        name={name}
        avatarUrl={owner.avatar_url}
        page
      />
      <Link
        href={`/@${owner.handle}`}
        className="inline-flex min-h-11 w-fit items-center rounded-pill bg-tint-fill px-4 text-[15px] leading-5 font-semibold text-tint-text hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        More from @{owner.handle}
      </Link>
    </>
  );
}

export default function EntryPage(props: PageProps<"/e/[id]">) {
  return (
    <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
      <Entry {...props} />
    </Suspense>
  );
}
