import { parseModelChoice } from "@/lib/ai";
import { identifyConfigured, identifyShow, type IdentifyInput } from "@/lib/identify";
import { MAX_IDENTIFY_PHOTOS } from "@/lib/import/drafts";
import { currentUser } from "@/lib/supabase/require-user";

// The photo-identify call can include several web searches.
export const maxDuration = 90;

const MAX_PHOTO_BYTES = 1_500_000;

// POST multipart: photo (JPEG re-encoded on the device; repeat the field for
// up to 4 photos of one visit, #18), date, time, city,
// country, lat/lng (rounded), candidates (JSON), optional model
// ("provider[:model]", runs only that one; admins only) → a suggested show and venue (#14).
// 503 "not_configured" until an AI key (GROQ_API_KEY or ANTHROPIC_API_KEY)
// is set; the form then just skips the suggestion.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  // Optional "provider" or "provider:model" from the admin import tool's picker.
  const models = parseModelChoice(form?.get("model"));
  if (models === null) return Response.json({ error: "invalid_model" }, { status: 400 });
  if (models && !user.admin) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!identifyConfigured(models)) {
    return Response.json({ error: models ? "model_unavailable" : "not_configured" }, { status: models ? 400 : 503 });
  }
  const photos = form?.getAll("photo") ?? [];
  if (
    !photos.length ||
    photos.length > MAX_IDENTIFY_PHOTOS ||
    photos.some((p) => !(p instanceof Blob) || p.type !== "image/jpeg" || p.size > MAX_PHOTO_BYTES)
  ) {
    return Response.json({ error: "invalid_photo" }, { status: 400 });
  }

  const text = (key: string, pattern: RegExp) => {
    const v = form?.get(key);
    return typeof v === "string" && pattern.test(v) ? v : null;
  };
  const name = (key: string) => {
    const v = form?.get(key);
    return typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null;
  };

  const lat = Number(form?.get("lat"));
  const lng = Number(form?.get("lng"));
  const point =
    form?.get("lat") != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 }
      : null;

  let candidates: IdentifyInput["candidates"] = [];
  try {
    const raw = JSON.parse(String(form?.get("candidates") ?? "[]"));
    if (Array.isArray(raw)) {
      candidates = raw
        .filter((c) => typeof c?.osm_id === "string" && typeof c?.name === "string")
        .slice(0, 8)
        .map((c) => ({
          osm_id: String(c.osm_id).slice(0, 40),
          name: String(c.name).slice(0, 200),
          distance_m: Math.round(Number(c.distance_m) || 0),
        }));
    }
  } catch {
    // Ignore a malformed list; identify from the photo and date alone.
  }

  const input: IdentifyInput = {
    photos: await Promise.all(
      (photos as Blob[]).map(async (p) => ({
        base64: Buffer.from(await p.arrayBuffer()).toString("base64"),
        mediaType: "image/jpeg" as const,
      })),
    ),
    date: text("date", /^\d{4}-\d{2}-\d{2}$/),
    time: text("time", /^\d{2}:\d{2}$/),
    city: name("city"),
    country: name("country"),
    point,
    candidates,
  };

  try {
    const answer = await identifyShow(input, models);
    // `model` says which provider answered ("groq:…"), for the import tool.
    return Response.json({ result: answer?.result ?? null, model: answer ? `${answer.model.provider}:${answer.model.model}` : null });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 300) : null;
    console.error("Identify failed", detail ?? error);
    // The provider's status and message (never the key), for the import tool.
    return Response.json({ error: "identify_failed", detail }, { status: 502 });
  }
}
