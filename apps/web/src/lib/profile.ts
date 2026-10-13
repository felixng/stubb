import { connection } from "next/server";
import { cache } from "react";

import { ENTRY_SELECT, signPhotos, toEntryRow, type EntryRow } from "@/lib/entries";
import { HANDLE_PATTERN } from "@/lib/profile-handle";
import { createPublicClient } from "@/lib/supabase/public";


export type PublicProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  link: string | null;
  is_private: boolean;
};

export type ProfileStats = { shows: number; venues: number; cities: number };

// Everything /@handle shows, read as a logged-out visitor would: the profile,
// its stats, and its public entries newest first. A private profile comes
// back with no stats and no entries. Null when no profile has that handle. Cached per
// request, so the page and its metadata share one read.
export const getPublicProfile = cache(async (rawHandle: string) => {
  // Live data, read per request, so a newly private entry disappears at once.
  await connection();
  const handle = rawHandle.toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) return null;

  const supabase = createPublicClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, bio, link, is_private")
    .eq("handle", handle)
    .maybeSingle<PublicProfile>();
  if (!profile) return null;
  // A private profile shows its header only. RLS would return no entries
  // anyway; this skips asking.
  if (profile.is_private) {
    return { profile, stats: null, entries: [] as EntryRow[], photos: new Map<string, string>() };
  }

  // Owner-scale (tens to hundreds of entries), so no paging yet. The explicit
  // visibility filter matches what RLS already enforces for this client.
  const [{ data: rows }, { data: stats }] = await Promise.all([
    supabase
      .from("entries")
      .select(ENTRY_SELECT)
      .eq("user_id", profile.id)
      .eq("visibility", "public")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("public_profile_stats", { profile_id: profile.id }).single<ProfileStats>(),
  ]);
  const entries: EntryRow[] = ((rows ?? []) as never[]).map(toEntryRow);
  const photos = await signPhotos(supabase, entries.map((e) => e.photo_path));

  return {
    profile,
    stats: (stats ?? { shows: 0, venues: 0, cities: 0 }) as ProfileStats | null,
    entries,
    photos,
  };
});
