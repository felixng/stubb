import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only signed-in surfaces need the session refreshed. Keeping the public
// landing page and share cards out of the proxy keeps them fast and cacheable.
export const config = {
  matcher: ["/app/:path*", "/login", "/auth/:path*"],
};
