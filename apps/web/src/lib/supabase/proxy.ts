import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

// Refreshes the Supabase session cookie once per navigation, before any
// Server Component reads it, and guards the owner app (#13): /app/* without a
// session goes to /login, and /login with a session goes to /app. This is a
// convenience, not the security boundary: RLS in Postgres is.
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
  if (signedIn && pathname === "/login") {
    return redirectWithCookies(new URL("/app", request.url), response);
  }

  return response;
}

// A redirect must carry any cookies the refresh just set or cleared, or the
// browser and server drift out of sync.
function redirectWithCookies(to: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(to);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
