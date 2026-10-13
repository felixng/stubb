import { NextResponse, type NextRequest } from "next/server";

import { importGoogleAvatar } from "@/lib/avatar";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Google sends the browser back here with a one-time code (PKCE). Exchanging
// it sets the session cookies. Failures, including a Google account with no
// matching user while sign-ups are off, go back to /login with a message.
// A new user's Google photo becomes their avatar (they can change it at
// /welcome).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await importGoogleAvatar(supabase, data.user);
      return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url));
    }
    console.error("exchangeCodeForSession failed", error.code, error.message);
  }
  return NextResponse.redirect(new URL("/login?error=google", request.url));
}
