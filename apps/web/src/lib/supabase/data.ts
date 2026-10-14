import { connection } from "next/server";

import { ENTRY_SELECT, signPhotos, toEntryRow, type EntryRow } from "@/lib/entries";
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
    supabase.from("profiles").select("handle").eq("id", userId!).maybeSingle(),
  ]);
  return {
    ...found,
    handle: (profile?.handle as string | null) ?? null,
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
