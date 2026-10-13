// The photo steps shared by the log form (#14) and batch import (#18), on
// the device: read EXIF and make clean JPEG copies, find theatres near where
// the photo was taken, then ask Claude which show it was. Each step is best
// effort; a failure leaves its part blank for the user to fill in.
import type { NearbyVenue, Venue } from "@/lib/entries";
import type { Identification } from "@/lib/identify";
import { IDENTIFY_PHOTO_EDGE, readPhotoMeta, reencodeJpeg, STORED_PHOTO_EDGE, type PhotoMeta } from "@/lib/photo";
import type { NearbyPlaces } from "@/lib/places";
import { createClient } from "@/lib/supabase/client";
import type { Place } from "./drafts";

export type { Place };

export type PreparedPhoto = {
  meta: PhotoMeta;
  // 1600px, no metadata: what gets uploaded with the entry.
  stored: Blob;
  // 1024px, no metadata: what Claude sees.
  small: Blob;
};

// Throws when the browser can't decode the file (e.g. HEIC outside Safari).
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const [meta, stored, small] = await Promise.all([
    readPhotoMeta(file),
    reencodeJpeg(file, STORED_PHOTO_EDGE),
    reencodeJpeg(file, IDENTIFY_PHOTO_EDGE, 0.8),
  ]);
  return { meta, stored, small };
}

// Theatres near a point, matched to venues already in the catalogue.
export async function lookupNearby(lat: number, lng: number): Promise<{ candidates: NearbyVenue[]; place: Place }> {
  try {
    const res = await fetch("/api/photo/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    if (!res.ok) return { candidates: [], place: { city: null, country: null } };
    const found = (await res.json()) as NearbyPlaces;
    const osmIds = found.candidates.map((c) => c.osm_id);
    const { data: known } = osmIds.length
      ? await createClient().from("venues").select("id, name, city, country, lat, lng, osm_id").in("osm_id", osmIds)
      : { data: [] as Venue[] };
    const candidates = found.candidates.map((c): NearbyVenue => {
      const row = (known as Venue[] | null)?.find((v) => v.osm_id === c.osm_id);
      return row
        ? { ...row, distance_m: c.distance_m }
        : { name: c.name, city: c.city, country: c.country, lat: c.lat, lng: c.lng, osm_id: c.osm_id, distance_m: c.distance_m };
    });
    return { candidates, place: { city: found.city, country: found.country } };
  } catch {
    // Offline or the lookup failed: carry on without nearby theatres.
    return { candidates: [], place: { city: null, country: null } };
  }
}

// `error` is set when no answer came back; null `result` without an error
// means Claude looked and couldn't tell.
// `model` is which one answered ("groq:…"), when the server says.
export type IdentifyOutcome = {
  result: Identification | null;
  model?: string | null;
  error?: "not_configured" | "model_unavailable" | "failed";
  // The provider's own error message, when the server passes it on.
  detail?: string | null;
};

// Asks Claude for the show (and to choose between neighbouring theatres).
// `photos` are the small re-encoded copies, 1 to 4 from the same visit.
export async function requestIdentify({
  photos,
  meta,
  point,
  place,
  candidates,
  model,
}: {
  photos: Blob[];
  meta: Pick<PhotoMeta, "date" | "time">;
  point: { lat: number; lng: number } | null;
  place: Place;
  candidates: NearbyVenue[];
  // "provider" or "provider:model" to run only that model (import tool).
  model?: string;
}): Promise<IdentifyOutcome> {
  try {
    const body = new FormData();
    photos.forEach((p, i) => body.append("photo", p, `photo-${i + 1}.jpg`));
    if (meta.date) body.set("date", meta.date);
    if (meta.time) body.set("time", meta.time);
    if (place.city) body.set("city", place.city);
    if (place.country) body.set("country", place.country);
    // ~100 m precision: enough to search the area if no theatre was found.
    if (point) {
      body.set("lat", point.lat.toFixed(3));
      body.set("lng", point.lng.toFixed(3));
    }
    if (model) body.set("model", model);
    body.set(
      "candidates",
      JSON.stringify(candidates.map((c) => ({ osm_id: c.osm_id, name: c.name, distance_m: c.distance_m }))),
    );
    const res = await fetch("/api/photo/identify", { method: "POST", body });
    if (res.ok) return (await res.json()) as { result: Identification | null; model: string | null };
    if (res.status === 503) return { result: null, error: "not_configured" };
    const { error, detail } = (await res.json().catch(() => ({}))) as { error?: string; detail?: string | null };
    return { result: null, error: error === "model_unavailable" ? "model_unavailable" : "failed", detail };
  } catch {
    return { result: null, error: "failed" };
  }
}
