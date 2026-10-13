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
  country: string | null;
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

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["show_title", "show_type", "venue_osm_id", "venue_name", "confidence", "reason"],
  properties: {
    show_title: {
      type: ["string", "null"],
      description: "The show's usual title, e.g. \"Hadestown\". Null if you can't tell.",
    },
    show_type: { type: ["string", "null"], enum: [...SHOW_TYPES, null] },
    venue_osm_id: {
      type: ["string", "null"],
      description: "osm_id of the nearby theatre where this was taken, copied exactly. Null if none fits.",
    },
    venue_name: {
      type: ["string", "null"],
      description: "The theatre's name. When no nearby theatre fits but the photo or search names one, give it here.",
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: {
      type: "string",
      description:
        "One short line on what settled it, e.g. \"Show curtain reads Hadestown; Walter Kerr is 40 m away; playing that date\".",
    },
  },
} as const;

const SYSTEM = `You help a theatregoer log a show they saw. Given one photo they took at the theatre and where and when it was taken, work out which show it was and at which theatre.

How to decide:
- Read the photo first: show curtains, logos, marquees, Playbills, programmes, tickets and distinctive sets often name the show outright, and can tell neighbouring theatres apart.
- The nearby theatres come from OpenStreetMap, nearest first. GPS can be 20–50 m off, so the nearest is not always right.
- Use web search to check what was playing at a candidate theatre on that date, especially for generic stage shots or recent productions. Times after about 17:00 are usually evening performances; earlier ones may be matinees.
- With no location, rely on the photo and the date.

Rules:
- Never identify performers by their face. Cast lists don't matter here.
- Prefer "low" confidence, or nulls, over guessing. "high" means the photo or a search result plainly confirms it; "medium" means it's the most likely answer with a gap.
- Only use an osm_id from the list you were given.`;

function describe(input: IdentifyInput) {
  const when = input.date ? `${input.date}${input.time ? ` at ${input.time} local time` : ""}` : "unknown";
  const where = [input.city, input.country].filter(Boolean).join(", ") || "unknown";
  const nearby = input.candidates.length
    ? input.candidates.map((c) => `- ${c.name} (osm_id ${c.osm_id}, ${c.distance_m} m away)`).join("\n")
    : "none (no location in the photo, or no theatre found nearby)";
  return `Photo taken: ${when}\nArea: ${where}\nNearby theatres:\n${nearby}`;
}

export function identifyConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function identifyShow(input: IdentifyInput): Promise<Identification | null> {
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });

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
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
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

    const text = response.content.findLast((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    return clean(JSON.parse(text.text) as Identification, input);
  }
  return null;
}

// Keep only what the form can trust: an osm_id from the candidate list, and
// no low-confidence answers dressed up as facts.
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
