import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Google sends the browser back here with a one-time code (PKCE). Exchanging
// it sets the session cookies. Failures, including a Google account with no
// matching user while sign-ups are off, go back to /login with a message.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url));
    }
    console.error("exchangeCodeForSession failed", error.code, error.message);
  }
  return NextResponse.redirect(new URL("/login?error=google", request.url));
}
