import { createClient } from "@/lib/supabase/server";

// For Route Handlers that cost money or hit third-party services: only a
// signed-in user may call them. Returns the user id, or null.
export async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}
