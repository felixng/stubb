import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

// Supabase client for Client Components.
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
