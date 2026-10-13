import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin, isAdminPath } from "@/lib/admin";
import { supabaseEnv } from "@/lib/env";

// Refreshes the Supabase session cookie once per navigation, before any
// Server Component reads it, and guards the owner app (#13): /app/* without a
// session goes to /login, and /login with a session goes to /app. Admin pages
// (/app/admin/*) are a 404 for everyone else, before anything renders. This
// is a convenience, not the security boundary: RLS in Postgres and the checks
// in each admin page and route are.
export async function updateSession(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Don't run code between createServerClient and getClaims(): it would make
  // random sign-outs hard to debug.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && (pathname === "/app" || pathname.startsWith("/app/"))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return redirectWithCookies(login, response);
  }
  if (signedIn && isAdminPath(pathname) && !isAdmin(data?.claims)) {
    // A path no page answers, so Next renders its 404 with a 404 status.
    return withCookies(NextResponse.rewrite(new URL("/app-admin-not-found", request.url)), response);
  }
  if (signedIn && pathname === "/login") {
    return redirectWithCookies(new URL("/app", request.url), response);
  }

  return response;
}

// A redirect or rewrite must carry any cookies the refresh just set or
// cleared, or the browser and server drift out of sync.
function redirectWithCookies(to: URL, from: NextResponse) {
  return withCookies(NextResponse.redirect(to), from);
}

function withCookies(to: NextResponse, from: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}
