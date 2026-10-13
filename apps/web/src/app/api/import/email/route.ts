import { identifyConfigured } from "@/lib/identify";
import { MAX_EMAIL_CHARS } from "@/lib/import/email-parse";
import { extractEmail } from "@/lib/import/extract-email";
import { requireUserId } from "@/lib/supabase/require-user";

export const maxDuration = 60;

// Best-effort per-user limit. In memory, so it resets per server instance,
// but it stops a runaway client loop from draining the spend limit.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 200;
const calls = new Map<string, number[]>();

function allow(userId: string) {
  const now = Date.now();
  const recent = (calls.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return false;
  recent.push(now);
  calls.set(userId, recent);
  return true;
}

const field = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// POST { subject, from, sent, text } → the shows one email books (#17).
// The client decodes the email file and sends one email per call, a few at
// a time. 503 "not_configured" until ANTHROPIC_API_KEY is set.
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!identifyConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  if (!allow(userId)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_EMAIL_CHARS) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }
  const sent = field(body?.sent, 10);

  try {
    const result = await extractEmail({
      subject: field(body?.subject, 300),
      from: field(body?.from, 300),
      sent: sent && /^\d{4}-\d{2}-\d{2}$/.test(sent) ? sent : null,
      text,
    });
    return Response.json({ result });
  } catch (error) {
    console.error("Email extraction failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "extract_failed" }, { status: 502 });
  }
}
