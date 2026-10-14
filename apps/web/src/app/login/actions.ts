"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { oauthProvider } from "@/lib/oauth-provider";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { email?: string; error?: string };

// Email + password. Sign-ups are off in Supabase Auth, so this only signs in
// accounts created from the dashboard. One message for every failure, so the
// form never reveals which emails have an account.
export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { email, error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "over_request_rate_limit") {
      return { email, error: "Too many attempts. Wait a minute, then try again." };
    }
    return { email, error: "Email or password is incorrect." };
  }
  redirect(safeNext(formData.get("next")));
}

// Google or Apple. Supabase returns the provider's consent URL; the provider
// sends the browser back to /auth/callback, which finishes sign-in. With
// sign-ups off, an account only gets in if its email matches an existing user.
export async function signInWithProvider(formData: FormData) {
  const provider = oauthProvider(formData.get("provider"));
  if (!provider) redirect("/login");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const callback = new URL("/auth/callback", `${proto}://${host}`);
  callback.searchParams.set("next", safeNext(formData.get("next")));
  callback.searchParams.set("provider", provider);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) {
    console.error("signInWithOAuth failed", provider, error?.code, error?.message);
    redirect(`/login?error=${provider}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  // This device only; the phone stays signed in if signing out on a laptop.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
