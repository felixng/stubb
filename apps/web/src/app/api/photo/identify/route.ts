import { identifyConfigured, identifyShow, type IdentifyInput } from "@/lib/identify";
import { requireUserId } from "@/lib/supabase/require-user";

// The photo-identify call can include several web searches.
export const maxDuration = 90;

const MAX_PHOTO_BYTES = 1_500_000;

// POST multipart: photo (JPEG re-encoded on the device), date, time, city,
// country, lat/lng (rounded), candidates (JSON) → a suggested show and venue (#14).
// 503 "not_configured" until ANTHROPIC_API_KEY is set; the form then just
// skips the suggestion.
export async function POST(request: Request) {
  if (!(await requireUserId())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!identifyConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || photo.type !== "image/jpeg" || photo.size > MAX_PHOTO_BYTES) {
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

  try {
    const result = await identifyShow({
      photo: { base64: Buffer.from(await photo.arrayBuffer()).toString("base64"), mediaType: "image/jpeg" },
      date: text("date", /^\d{4}-\d{2}-\d{2}$/),
      time: text("time", /^\d{2}:\d{2}$/),
      city: name("city"),
      country: name("country"),
      point,
      candidates,
    });
    return Response.json({ result });
  } catch (error) {
    console.error("Identify failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "identify_failed" }, { status: 502 });
  }
}
