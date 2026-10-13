import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

// Supabase client for public pages (/@handle). It ignores the visitor's
// cookies and uses only the publishable key, so RLS lets it see public rows
// and nothing else, even when the owner is the one looking.
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
