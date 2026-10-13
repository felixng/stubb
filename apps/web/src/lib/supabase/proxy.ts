import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";
import { ONBOARDED_COOKIE } from "@/lib/profile";
import { safeNext } from "@/lib/safe-next";

// Refreshes the Supabase session cookie once per navigation, before any
// Server Component reads it, and guards the owner app (#13): /app/* without a
// session goes to /login, and /login with a session goes to /app. Signed-in
// users without a handle go to /welcome to set up their profile first. This
// is a convenience, not the security boundary: RLS in Postgres is.
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
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const { pathname, search } = request.nextUrl;
  const inApp = pathname === "/app" || pathname.startsWith("/app/");
  const welcome = pathname === "/welcome";

  if (!userId && (inApp || welcome)) {
    const login = new URL("/login", request.url);
    if (inApp) login.searchParams.set("next", pathname + search);
    return redirectWithCookies(login, response);
  }
  if (userId && pathname === "/login") {
    return redirectWithCookies(new URL("/app", request.url), response);
  }

  if (userId && (inApp || welcome)) {
    const remembered = request.cookies.get(ONBOARDED_COOKIE)?.value === userId;
    const onboarded = remembered || (await hasHandle(supabase, userId));
    if (inApp && !onboarded) {
      const setup = new URL("/welcome", request.url);
      setup.searchParams.set("next", pathname + search);
      return redirectWithCookies(setup, response);
    }
    if (welcome && onboarded) {
      const next = safeNext(request.nextUrl.searchParams.get("next"));
      return redirectWithCookies(new URL(next, request.url), response);
    }
    if (onboarded && !remembered) {
      response.cookies.set(ONBOARDED_COOKIE, userId, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return response;
}

async function hasHandle(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
  return Boolean(data?.handle);
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
