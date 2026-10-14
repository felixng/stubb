"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AVATAR_BUCKET } from "@/lib/avatar";
import { PHOTO_BUCKET } from "@/lib/entries";
import { normalizeHandle, ONBOARDED_COOKIE } from "@/lib/profile-handle";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { error?: string };

// Deletes the signed-in user's account once they've typed their handle.
// Files first, through the Storage API (Postgres can't delete Storage
// objects), then `delete_my_account`, which checks the handle again and
// cascades to profile, entries and trips.
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirm = normalizeHandle(String(formData.get("confirm") ?? ""));
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) redirect("/login");

  // Check before deleting anything, so a typo can't cost the photos.
  const { data: profile } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  if (!confirm || !profile?.handle || confirm !== profile.handle.toLowerCase()) {
    return { error: "That doesn’t match your handle." };
  }

  // Both buckets keep each user's files under `{user_id}/`.
  for (const name of [PHOTO_BUCKET, AVATAR_BUCKET]) {
    const bucket = supabase.storage.from(name);
    for (;;) {
      const { data: files, error } = await bucket.list(userId, { limit: 1000 });
      if (error) return { error: "Couldn’t delete your photos. Try again." };
      if (!files.length) break;
      const { data: removed, error: removeError } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
      // Nothing removed would loop forever; stop and let them retry.
      if (removeError || !removed?.length) return { error: "Couldn’t delete your photos. Try again." };
    }
  }

  const { error } = await supabase.rpc("delete_my_account", { confirm });
  if (error) {
    console.error("delete_my_account failed", error.code, error.message);
    return { error: "Couldn’t delete your account. Try again." };
  }

  // The user no longer exists; this just clears the session cookies.
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(ONBOARDED_COOKIE);
  redirect("/login?deleted=1");
}
