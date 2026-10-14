import { PublicEntryCard } from "@/components/profile/PublicEntryCard";
import type { FeedItem } from "@/lib/supabase/data";

// One show in the home feed. Your own shows open in the app (and say when
// they're private); others' open their public page, which a followed
// private profile doesn't have, so those don't link.
export function FeedCard({ item }: { item: FeedItem }) {
  const { entry, owner, mine, photoUrl } = item;
  return (
    <PublicEntryCard
      entry={entry}
      photoUrl={photoUrl ?? undefined}
      handle={owner.handle!}
      name={owner.display_name || `@${owner.handle}`}
      avatarUrl={owner.avatar_url}
      href={mine ? `/app/entries/${entry.id}` : owner.is_private ? null : `/e/${entry.id}`}
      tripHref={(id) => (mine ? `/app/trips/${id}` : owner.is_private ? null : `/t/${id}`)}
      badge={mine && entry.visibility === "private" ? "Private" : undefined}
    />
  );
}
