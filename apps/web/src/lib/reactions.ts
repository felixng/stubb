import type { createClient } from "@/lib/supabase/server";
import type { FollowPerson } from "@/lib/follows";

// Likes and comments on entries (supabase/migrations/20261014170000_likes_comments.sql).
// Anyone signed in who can see a public entry can like it and comment on it;
// Postgres enforces who, so these reads and the client writes stay thin.

export type Reactions = { likes: number; comments: number; liked: boolean };
export type Comment = { id: string; body: string; created_at: string; author: FollowPerson };

export const NO_REACTIONS: Reactions = { likes: 0, comments: 0, liked: false };
export const COMMENT_MAX = 500;

type Client = Awaited<ReturnType<typeof createClient>>;

const PERSON = "id, handle, display_name, avatar_url";

// Counts for a page of entries, and whether the viewer liked each, in one
// call. Read with the viewer's session so `liked` is theirs.
export async function getReactions(supabase: Client, entryIds: string[]) {
  const map = new Map<string, Reactions>();
  if (entryIds.length === 0) return map;
  const { data } = await supabase.rpc("entry_reactions", { entry_ids: entryIds });
  for (const r of (data ?? []) as ({ entry_id: string } & Reactions)[]) {
    map.set(r.entry_id, { likes: r.likes, comments: r.comments, liked: r.liked });
  }
  return map;
}

// An entry's comments, oldest first, like a conversation.
export async function listComments(supabase: Client, entryId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("entry_comments")
    .select(`id, body, created_at, author:profiles!entry_comments_user_id_fkey(${PERSON})`)
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as unknown as (Omit<Comment, "author"> & { author: FollowPerson | null })[]).flatMap((c) =>
    c.author?.handle ? [{ ...c, author: c.author }] : [],
  );
}

// The most recent people to like an entry, for "Liked by @a, @b and 3 others".
export async function listLikers(supabase: Client, entryId: string, limit = 3): Promise<FollowPerson[]> {
  const { data } = await supabase
    .from("entry_likes")
    .select(`person:profiles!entry_likes_user_id_fkey(${PERSON})`)
    .eq("entry_id", entryId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as { person: FollowPerson | null }[]).flatMap((r) =>
    r.person?.handle ? [r.person] : [],
  );
}

// "now", "5m", "3h", "2d", then a date: compact, as on Hevy and Instagram.
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}),
  });
}
