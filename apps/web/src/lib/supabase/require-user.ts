import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

// For Route Handlers that cost money or hit third-party services: only a
// signed-in user may call them. Returns the user id, or null.
export async function requireUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

// The signed-in user and whether they're an admin (see lib/admin), or null.
export async function currentUser(): Promise<{ id: string; admin: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? { id: sub, admin: isAdmin(data?.claims) } : null;
}
