// Reading show bookings out of one confirmation email with an AI model (#17).
//
// Server only. Goes through lib/ai (task "email"), so AI_MODELS_EMAIL or the
// import tool's model picker choose the provider. Gets the email's text, already
// decoded on the device, and returns every performance it books: one email
// can hold several. Results are drafts for the review screen; nothing is
// saved until the owner confirms. The email text is never stored or logged.
import { aiConfigured, generateJson, type Generated, type ModelRef } from "@/lib/ai";
import { SHOW_TYPES } from "@/lib/identify";
import type { Extracted } from "./drafts";

export type EmailInput = {
  subject: string | null;
  from: string | null;
  sent: string | null; // "2026-10-02"
  text: string;
};

export const EMAIL_KINDS = ["booking", "reminder", "exchange", "cancellation", "not_a_booking"] as const;

export type EmailExtraction = {
  kind: (typeof EMAIL_KINDS)[number];
  shows: Extracted[];
};

// Structured output. As in identify.ts, "unknown" is an empty string rather
// than null, because the API rejects nullable enums.
const SHOW = {
  type: "object",
  additionalProperties: false,
  required: ["show_title", "show_type", "venue_name", "city", "country", "date", "time", "seats", "price", "confidence", "reason"],
  properties: {
    show_title: { type: "string", description: 'The show\'s usual title, e.g. "Hadestown", without "Broadway" or ticket-type words.' },
    show_type: { type: "string", enum: [...SHOW_TYPES] },
    venue_name: { type: "string", description: 'The theatre, e.g. "Walter Kerr Theatre". Empty string if not given.' },
    city: { type: "string", description: "City of the theatre, from the address or your knowledge of the venue. Empty string if unsure." },
    country: { type: "string", description: 'ISO 3166-1 alpha-2, e.g. "US", "GB". Empty string if unsure.' },
    date: { type: "string", description: 'Performance date as "YYYY-MM-DD". Empty string if the email doesn\'t give one.' },
    time: { type: "string", description: 'Performance start time, 24-hour "HH:MM". Empty string if not given.' },
    seats: { type: "string", description: 'Seats as written, e.g. "Orchestra M 104–105". Empty string if not given.' },
    price: { type: "string", description: 'Total paid with currency, e.g. "$289.00". Empty string if not given.' },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string", description: 'One short line on where this came from, e.g. "Telecharge confirmation; date and seats in the order summary".' },
  },
} as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "shows"],
  properties: {
    kind: {
      type: "string",
      enum: [...EMAIL_KINDS],
      description:
        "booking: a purchase confirmation or e-ticket. reminder: a pre-show reminder for an existing booking. exchange: tickets moved to a new date. cancellation: tickets refunded or cancelled. not_a_booking: anything else (newsletters, offers, receipts for merchandise).",
    },
    shows: { type: "array", items: SHOW },
  },
} as const;

const SYSTEM = `You read ticket emails for a theatregoer who is importing their history into a theatre diary. You get one email (often a confirmation from a ticketing site or box office, sometimes forwarded). List every live performance it books: show, theatre, date and time, plus seats and price when given.

Rules:
- One entry per performance. Several tickets for the same performance are one entry; a festival or package email with several performances is several entries.
- Use the show's usual title, not the ticket product name ("Hamilton", not "HAMILTON - Broadway Premium Orchestra").
- Dates: use the performance date, not the date of purchase. When the email omits the year, take the first matching date on or after the date it was sent.
- For an exchange, list only the new performance. For a cancellation, list the cancelled performance so the user can see it, with confidence "low".
- Newsletters, offers and non-theatre emails: kind "not_a_booking" and no shows.
- Never invent details. Leave a field as an empty string rather than guessing. You may fill city and country from your knowledge of a well-known venue.
- confidence "high": the email clearly states show, venue and date. "medium": one of them is inferred. "low": unclear or cancelled.`;

function describe(input: EmailInput) {
  return [
    `Subject: ${input.subject ?? "(none)"}`,
    `From: ${input.from ?? "(unknown)"}`,
    `Sent: ${input.sent ?? "(unknown)"}`,
    "",
    input.text,
  ].join("\n");
}

export function emailConfigured(models?: ModelRef[]) {
  return aiConfigured("email", undefined, models);
}

// `models`: a chain picked by the caller; otherwise the configured chain.
export async function extractEmail(input: EmailInput, models?: ModelRef[]): Promise<Generated<EmailExtraction> | null> {
  const answer = await generateJson(
    {
      system: SYSTEM,
      content: [{ type: "text", text: describe(input) }],
      schema: { name: "email_bookings", schema: SCHEMA },
      // Low effort: a structured read of one email, many in a row.
      effort: "low",
    },
    {
      task: "email",
      models,
      parse: (raw) => clean(raw as { kind: string; shows: Record<string, string>[] }),
      budgetMs: 55_000,
    },
  );
  // Never the email itself: only what came out.
  if (answer) console.info("Email extraction", answer.model.provider, answer.result.kind, answer.result.shows.length, "shows");
  return answer;
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);

// Keep only what the review screen can trust: valid dates and times, known
// enums, empty strings as null.
export function clean(raw: { kind: string; shows: Record<string, string>[] }): EmailExtraction {
  const kind = EMAIL_KINDS.includes(raw.kind as never) ? (raw.kind as EmailExtraction["kind"]) : "not_a_booking";
  const shows = (Array.isArray(raw.shows) ? raw.shows : []).slice(0, 20).map(
    (s): Extracted => ({
      show_title: blank(s.show_title),
      show_type: SHOW_TYPES.includes(s.show_type as never) ? (s.show_type as Extracted["show_type"]) : null,
      venue_name: blank(s.venue_name),
      venue_osm_id: null,
      city: blank(s.city),
      country: /^[A-Z]{2}$/.test(s.country ?? "") ? s.country : null,
      date: /^\d{4}-\d{2}-\d{2}$/.test(s.date ?? "") && !Number.isNaN(Date.parse(s.date)) ? s.date : null,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time ?? "") ? s.time : null,
      seats: blank(s.seats),
      price: blank(s.price),
      confidence: kind === "cancellation" ? "low" : (["high", "medium", "low"] as const).find((c) => c === s.confidence) ?? "low",
      reason: String(s.reason ?? "").slice(0, 300),
    }),
  );
  return { kind, shows: shows.filter((s) => s.show_title || s.date) };
}
