import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Signed-in visitors to the landing page go straight to the app. Anyone
  // without a Supabase auth cookie can't be signed in, so they skip the
  // session check and the landing page stays fast and cacheable for them.
  // Public profiles likewise: they need the session only to show a signed-in
  // visitor's Follow button and, for a private profile they follow, its shows.
  const { pathname } = request.nextUrl;
  if ((pathname === "/" || pathname.startsWith("/@")) && !hasAuthCookie(request)) {
    return NextResponse.next();
  }
  return updateSession(request);
}

// Supabase stores the session as sb-<project>-auth-token, sometimes split
// into .0, .1, … chunks.
function hasAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

// Only signed-in surfaces need the session refreshed, plus the landing page
// so signed-in users can be sent on to the app, and public profiles for
// follows.
export const config = {
  matcher: ["/", "/app/:path*", "/login", "/welcome", "/auth/:path*", "/@:handle", "/@:handle/:list"],
};
