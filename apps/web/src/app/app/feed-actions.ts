"use server";

import { ownerContext, readFeedPage, type FeedCursor, type FeedPage } from "@/lib/supabase/data";

// The next page of the home feed, after `cursor`. Runs as the signed-in user,
// so RLS decides what's in it, as for the first page.
export async function loadFeedPage(cursor: FeedCursor): Promise<FeedPage> {
  const { supabase, userId } = await ownerContext();
  if (!userId) return { items: [], next: null };
  return readFeedPage(supabase, userId, cursor);
}
