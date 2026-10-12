"use server";

import { createClient } from "@/lib/supabase/server";

export type WaitlistState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inserts into the `waitlist` table (schema and RLS: #10). Anonymous visitors
// may insert but never read, so a duplicate email reports success and the
// form never reveals who is already on the list.
export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  // Honeypot: real people never see this field, bots fill it in.
  if (formData.get("company")) return { status: "success" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  const source =
    String(formData.get("source") ?? "").trim().slice(0, 100) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email, source });
  // 23505 = unique violation: already on the list.
  if (error && error.code !== "23505") {
    console.error("waitlist insert failed", error);
    return {
      status: "error",
      message: "Something went wrong. Please try again in a moment.",
    };
  }
  return { status: "success" };
}
