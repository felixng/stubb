import { parseModelChoice } from "@/lib/ai";
import { MAX_EMAIL_CHARS } from "@/lib/import/email-parse";
import { emailConfigured, extractEmail } from "@/lib/import/extract-email";
import { requireUserId } from "@/lib/supabase/require-user";

export const maxDuration = 60;

// Best-effort per-user limit. In memory, so it resets per server instance,
// but it stops a runaway client loop from draining the spend limit.
const WINDOW_MS = 10 * 60_000;
// Compare mode sends each email to every provider, so up to 4 calls each.
const MAX_PER_WINDOW = 600;
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

// POST { subject, from, sent, text, model? } → the shows one email books
// (#17), and which model read it. The client decodes the email file and
// sends one email per call, a few at a time. `model` ("provider[:model]")
// runs only that model. 503 "not_configured" until an AI key is set.
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const models = parseModelChoice(body?.model);
  if (models === null) return Response.json({ error: "invalid_model" }, { status: 400 });
  if (!emailConfigured(models)) {
    return Response.json({ error: models ? "model_unavailable" : "not_configured" }, { status: models ? 400 : 503 });
  }
  if (!allow(userId)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_EMAIL_CHARS) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }
  const sent = field(body?.sent, 10);

  try {
    const answer = await extractEmail(
      {
        subject: field(body?.subject, 300),
        from: field(body?.from, 300),
        sent: sent && /^\d{4}-\d{2}-\d{2}$/.test(sent) ? sent : null,
        text,
      },
      models,
    );
    return Response.json({ result: answer?.result ?? null, model: answer ? `${answer.model.provider}:${answer.model.model}` : null });
  } catch (error) {
    console.error("Email extraction failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "extract_failed" }, { status: 502 });
  }
}
