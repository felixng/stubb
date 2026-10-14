import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/EmptyState";
import { PublicEntryCard } from "@/components/profile/PublicEntryCard";
import { NO_REACTIONS } from "@/lib/reactions";
import { FEED_SIZE, getFeed } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Home" };

const FIND =
  "inline-flex min-h-11 items-center rounded-pill bg-tint-fill px-4 text-[15px] leading-5 font-semibold text-tint-text hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

async function Feed() {
  const { items, photos, reactions, following, viewerId: me } = await getFeed();

  return (
    <>
      {following === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-md border border-separator bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-headline text-label">Follow people you go to the theatre with</h2>
            <p className="text-subheadline text-label-secondary">Their shows appear here next to yours.</p>
          </div>
          <Link href="/app/people" className={FIND}>
            Find people
          </Link>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">
          <Link href="/app/log" className="font-semibold text-tint-text underline-offset-2 hover:underline">
            Track a show
          </Link>{" "}
          and it appears here, along with shows from people you follow.
        </EmptyState>
      ) : (
        items.map(({ entry, owner, mine }) => {
          // Your own shows open in the app; others' open their page, which
          // opens for approved followers of a private profile too. Trip pages
          // don't, so a private profile's trips don't link.
          const open = mine ? `/app/entries/${entry.id}` : `/e/${entry.id}`;
          return (
            <PublicEntryCard
              key={entry.id}
              entry={entry}
              photoUrl={entry.photo_path ? photos.get(entry.photo_path) : undefined}
              handle={owner.handle!}
              name={owner.display_name || `@${owner.handle}`}
              avatarUrl={owner.avatar_url}
              href={open}
              tripHref={(id) => (mine ? `/app/trips/${id}` : owner.is_private ? null : `/t/${id}`)}
              badge={mine && entry.visibility === "private" ? "Private" : undefined}
              social={
                entry.visibility === "public"
                  ? { viewerId: me, reactions: reactions.get(entry.id) ?? NO_REACTIONS }
                  : undefined
              }
            />
          );
        })
      )}
      {items.length === FEED_SIZE && (
        <p className="text-center text-footnote text-label-secondary">
          That’s the latest {FEED_SIZE}. Your older shows are in{" "}
          <Link href="/app/profile" className="font-semibold text-tint-text underline-offset-2 hover:underline">
            your diary
          </Link>
          .
        </p>
      )}
    </>
  );
}

// Home: the feed. Your shows and the shows of people you follow, newest
// first. Your diary lives on the Profile tab.
export default function HomePage() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title font-display text-label">Home</h1>
        <Link href="/app/people" className="text-subheadline font-semibold text-tint-text underline-offset-2 hover:underline">
          Find people
        </Link>
      </div>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Feed />
      </Suspense>
    </section>
  );
}
