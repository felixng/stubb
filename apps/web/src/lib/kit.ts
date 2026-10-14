// Waitlist sign-ups go to Kit (kit.com), which sends the double opt-in
// confirmation email. Server-only: the API key must never reach the browser.
//
// Kit setup: create a form, turn on double opt-in (form → Incentive), then set
// KIT_API_KEY (Settings → Developer → v4 API key) and KIT_FORM_ID.

const API = "https://api.kit.com/v4";

export function kitConfigured() {
  return Boolean(process.env.KIT_API_KEY && process.env.KIT_FORM_ID);
}

async function kitPost(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": process.env.KIT_API_KEY!,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Kit ${path} failed: ${res.status} ${await res.text()}`);
  }
}

// Two calls, as Kit's v4 API requires: create the subscriber as inactive, so
// they don't count as confirmed yet, then add them to the form, which sends
// the form's confirmation email. Kit reads utm_* from the referrer URL, so
// that is where the sign-up source goes. Both calls are upserts, and Kit doesn't
// resend the confirmation to someone already on the form, so a repeat sign-up
// is harmless.
export async function subscribeToKit(email: string, referrer: string | null) {
  await kitPost("/subscribers", { email_address: email, state: "inactive" });
  await kitPost(`/forms/${process.env.KIT_FORM_ID}/subscribers`, {
    email_address: email,
    ...(referrer ? { referrer } : {}),
  });
}
