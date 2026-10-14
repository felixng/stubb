import { connection } from "next/server";

import { ENTRY_SELECT, signPhotos, toEntryRow, TRIP_SELECT, type Collection, type EntryRow } from "@/lib/entries";
import { createClient } from "@/lib/supabase/server";

// Server-side reads for the owner app. Always scoped to the signed-in user:
// RLS would also return other people's public rows.
//
// connection(): this is live, private data, read per request. It keeps it out
// of the prerendered and session shells, where the Supabase client's own
// Date.now() (token expiry) would also be rejected.
export async function ownerContext() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId };
}

export async function getOwnEntry(id: string) {
  const { supabase, userId } = await ownerContext();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.from("entries").select(ENTRY_SELECT).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const entry = toEntryRow(data as never);
  const urls = await signPhotos(supabase, [entry.photo_path]);
  return { entry, photoUrl: entry.photo_path ? (urls.get(entry.photo_path) ?? null) : null };
}

// Newest first. Owner-scale (tens to hundreds of entries), so no paging yet.
export async function listOwnEntries() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return { entries: [] as EntryRow[], photos: new Map<string, string>() };
  const { data } = await supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  const entries = ((data ?? []) as never[]).map(toEntryRow);
  const photos = await signPhotos(supabase, entries.map((e) => e.photo_path));
  return { entries, photos };
}

// The owner's trips, newest first.
export async function listOwnTrips() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return [] as Collection[];
  const { data } = await supabase
    .from("collections")
    .select(TRIP_SELECT)
    .eq("user_id", userId)
    .eq("kind", "trip")
    .order("start_date", { ascending: false });
  return (data ?? []) as Collection[];
}

// One entry plus what its share cards show: its place in the year, the visit
// number at its venue, how many times the show has been seen, and the handle.
// The counts come from entry_card_stats in Postgres, so iOS shows the same.
export async function getShareCard(id: string) {
  const found = await getOwnEntry(id);
  if (!found) return null;
  const { supabase, userId } = await ownerContext();
  const [{ data: stats }, { data: profile }] = await Promise.all([
    supabase
      .rpc("entry_card_stats", { entry_id: id })
      .maybeSingle<{ show_of_year: number; venue_visit: number; times_seen: number }>(),
    supabase.from("profiles").select("handle, is_private").eq("id", userId!).maybeSingle(),
  ]);
  return {
    ...found,
    handle: (profile?.handle as string | null) ?? null,
    // Whether /e/[id] shows this entry to everyone (see lib/public-pages).
    isPublic: found.entry.visibility === "public" && found.entry.status === "logged" && profile?.is_private === false,
    showOfYear: stats?.show_of_year ?? 0,
    venueVisit: stats?.venue_visit ?? 0,
    timesSeen: stats?.times_seen ?? 0,
  };
}

export type OwnProfile = {
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  link: string | null;
  avatar_url: string | null;
  is_private: boolean;
};

export async function getOwnProfile() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("handle, display_name, bio, link, avatar_url, is_private")
    .eq("id", userId)
    .maybeSingle<OwnProfile>();
  return data;
}

export type FeedOwner = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null; is_private: boolean };
export type FeedItem = { entry: EntryRow; owner: FeedOwner; mine: boolean };

export const FEED_SIZE = 30;

// The home feed (feed_entries in Postgres, so iOS gets the same): your own
// shows and the ones RLS lets you see from people you follow, newest first.
// `following` counts follows and requests, for the empty state.
export async function getFeed() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return { items: [] as FeedItem[], photos: new Map<string, string>(), following: 0 };
  const [{ data: rows, error }, { count: following }] = await Promise.all([
    supabase.rpc("feed_entries", { max_rows: FEED_SIZE }).select(`${ENTRY_SELECT}, user_id`),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (error) console.error("feed_entries failed", error.code, error.message);
  const raw = (rows ?? []) as unknown as { user_id: string }[];
  const ids = [...new Set(raw.map((r) => r.user_id))];
  const { data: owners } = ids.length
    ? await supabase.from("profiles").select("id, handle, display_name, avatar_url, is_private").in("id", ids)
    : { data: [] };
  const byId = new Map(((owners ?? []) as FeedOwner[]).map((o) => [o.id, o]));
  const items = raw.flatMap((r) => {
    const owner = byId.get(r.user_id);
    return owner?.handle ? [{ entry: toEntryRow(r as never), owner, mine: r.user_id === userId }] : [];
  });
  const photos = await signPhotos(supabase, items.map((i) => i.entry.photo_path));
  return { items, photos, following: following ?? 0 };
}
