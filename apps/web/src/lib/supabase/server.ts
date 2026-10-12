import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/env";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Create one per request; never share it between requests.
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. Safe to ignore: the proxy
          // refreshes the session before the page renders.
        }
      },
    },
  });
}
