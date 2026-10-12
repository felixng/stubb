"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { step: "email"; email?: string; error?: string }
  | { step: "code"; email: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

// Only paths inside the owner app, so `next` can't send anyone off-site.
function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next === "/app" || /^\/app\/[^/\\]/.test(next) ? next : "/app";
}

// One action for the whole form, so the client keeps a single state. The
// submit button says which step this is ("send", "verify" or "restart").
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  switch (formData.get("intent")) {
    case "send":
      return sendCode(formData);
    case "verify":
      return verifyCode(formData);
    default:
      return { step: "email" };
  }
}

// Step 1: email a one-time code. Sign-ups are off in Supabase Auth and
// `shouldCreateUser` is false, so a code only goes to existing users. Unknown
// emails get the same "check your inbox" step, so the form never reveals who
// has an account. The one error shown is the rate limit, so the owner isn't
// left waiting for a code that was never sent.
async function sendCode(formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { step: "email", email, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "over_request_rate_limit"
  ) {
    return {
      step: "email",
      email,
      error: "Too many codes requested. Wait a minute, then try again.",
    };
  }
  if (error && error.code !== "otp_disabled" && error.code !== "signup_disabled") {
    console.error("signInWithOtp failed", error.code, error.message);
  }
  return { step: "code", email };
}

// Step 2: exchange the code for a session (cookies are set by the server
// client), then go to the page the visitor first asked for.
async function verifyCode(formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(token)) {
    return { step: "code", email, error: "Enter the 6-digit code." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return {
      step: "code",
      email,
      error: "That code didn’t work. Check it, or send a new one.",
    };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  // This device only; the phone stays signed in if signing out on a laptop.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
