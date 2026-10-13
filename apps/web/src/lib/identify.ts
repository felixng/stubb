// Identify a show from a photo (#14, reused by #18's batch import).
//
// Claude gets a downscaled, re-encoded copy of the photo (no EXIF), the
// theatres near where it was taken, and the date and time, with web search
// on. The photo often settles it (show curtain, Playbill, marquee); venue and
// date plus a search cover generic stage shots and shows newer than the
// model's training data. The result is only a suggestion: the log form shows
// it for the user to confirm, and low confidence never fills a field.
import Anthropic from "@anthropic-ai/sdk";

export type IdentifyInput = {
  photo: { base64: string; mediaType: "image/jpeg" };
  date: string | null; // "2026-10-10"
  time: string | null; // "19:42", local to where the photo was taken
  city: string | null;
  country: string | null; // ISO 3166-1 alpha-2 when known
  // Rounded to ~100 m. Lets Claude search the area when OpenStreetMap
  // finds no theatre (or is down). Sent for this call only, never stored.
  point: { lat: number; lng: number } | null;
  candidates: { osm_id: string; name: string; distance_m: number }[];
};

export const SHOW_TYPES = ["musical", "play", "opera", "dance", "comedy", "other"] as const;

export type Identification = {
  show_title: string | null;
  show_type: (typeof SHOW_TYPES)[number] | null;
  venue_osm_id: string | null;
  venue_name: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

// Structured output. No nullable fields: the API rejects a "string or null"
// type combined with an enum, so "unknown" is an empty string instead.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["show_title", "show_type", "venue_osm_id", "venue_name", "confidence", "reason"],
  properties: {
    show_title: {
      type: "string",
      description: 'The show\'s usual title, e.g. "Hadestown". Empty string if you can\'t tell.',
    },
    show_type: { type: "string", enum: [...SHOW_TYPES] },
    venue_osm_id: {
      type: "string",
      description: "osm_id of the listed nearby theatre where this was taken, copied exactly. Empty string if none fits or none were listed.",
    },
    venue_name: {
      type: "string",
      description: "The theatre's name, e.g. \"Belasco Theatre\". Fill it whenever you know the venue, even with no osm_id. Empty string if unknown.",
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: {
      type: "string",
      description:
        'One short line on what settled it, e.g. "Set backdrop reads Maybe Happy Ending; playing at the Belasco, 60 m away".',
    },
  },
} as const;

const SYSTEM = `You help a theatregoer log a show they just saw. You get one photo they took at the theatre (often the set before curtain-up, a curtain call, a marquee, a Playbill or a ticket), plus when and roughly where it was taken. Work out which show it was and at which theatre.

Work through it in this order:
1. Read every bit of text in the photo: titles or logos projected or painted on the set, show curtains, marquees, Playbill covers, tickets, signs that are part of the set. Text in any language counts. If the photo names the show, that settles the show.
2. Describe the set to yourself: distinctive scenery and props (e.g. a pile of suitcases under a "Baggage Claim" sign, a band on a platform, a turntable), the style of the theatre (a Broadway or West End house, a studio space).
3. Search. When nearby theatres are listed, search what was playing at the closest ones around that date and pick the one whose show matches the photo. When none are listed but a location is given, search for theatres near that point and what they were playing then. When the photo shows no title, search for the distinctive set (e.g. "Broadway musical set suitcases baggage claim sign") and check the result is running at a theatre near the photo on that date.
4. Venue: GPS can be 20–50 m off and theatres can be under 100 m apart, so pick the theatre whose show matches, not simply the nearest. Give venue_name whenever you know the theatre, and venue_osm_id only when it's one of the listed theatres.

Timing: an empty house with the lights up is before the show; times after about 17:00 are usually evening performances, earlier ones matinees. Shows open and close, so check the run covers the date.

Rules:
- Never identify performers by their face. Who is on stage doesn't matter here.
- "high": the photo names the show, or a search ties the set and the theatre to that date beyond reasonable doubt. "medium": the most likely answer with a gap. "low": a guess; prefer this, or empty strings, over overclaiming.`;

function describe(input: IdentifyInput) {
  const when = input.date ? `${input.date}${input.time ? ` at ${input.time} local time` : ""}` : "unknown";
  const area = [input.city, input.country].filter(Boolean).join(", ") || "unknown";
  const point = input.point ? `${input.point.lat.toFixed(3)}, ${input.point.lng.toFixed(3)}` : "unknown";
  const nearby = input.candidates.length
    ? input.candidates.map((c) => `- ${c.name} (osm_id ${c.osm_id}, ${c.distance_m} m away)`).join("\n")
    : input.point
      ? "none found (the map lookup may have failed; search near the location instead)"
      : "none (the photo has no location)";
  return `Photo taken: ${when}\nArea: ${area}\nLocation (approx.): ${point}\nNearby theatres:\n${nearby}`;
}

export function identifyConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function identifyShow(input: IdentifyInput): Promise<Identification | null> {
  const client = new Anthropic({ timeout: 80_000, maxRetries: 1 });
  const web_search: Anthropic.Beta.BetaWebSearchTool20260209 = {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 5,
    // Localises results ("what's on near me") when we know the area.
    ...(input.country && /^[A-Z]{2}$/.test(input.country)
      ? { user_location: { type: "approximate", country: input.country, ...(input.city ? { city: input.city } : {}) } }
      : {}),
  };

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: input.photo.mediaType, data: input.photo.base64 } },
        { type: "text", text: describe(input) },
      ],
    },
  ];

  // A long web search can pause the turn; resume it a couple of times.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      tools: [web_search],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") {
      console.error("Identify refused", response.stop_details?.category ?? null);
      return null;
    }

    // With web search the answer can arrive split across several text
    // blocks (citations); the JSON is everything after the last search.
    const lastTool = response.content.findLastIndex((b) => b.type !== "text");
    const json = response.content
      .slice(lastTool + 1)
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (!json) return null;
    const result = clean(JSON.parse(json) as Identification, input);
    console.info("Identify", result.confidence, result.show_title, "|", result.reason);
    return result;
  }
  return null;
}

// Keep only what the form can trust: empty strings become null, and an
// osm_id must come from the candidate list.
function clean(result: Identification, input: IdentifyInput): Identification {
  const known = input.candidates.some((c) => c.osm_id === result.venue_osm_id);
  return {
    show_title: result.show_title?.trim() || null,
    show_type: SHOW_TYPES.includes(result.show_type as never) ? result.show_type : null,
    venue_osm_id: known ? result.venue_osm_id : null,
    venue_name: result.venue_name?.trim() || null,
    confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "low",
    reason: String(result.reason ?? "").slice(0, 300),
  };
}
