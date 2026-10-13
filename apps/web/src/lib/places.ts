// Nearby theatres from OpenStreetMap, for the photo-first log flow (#14) and
// photo import (#18). Server only: OSM's usage policies ask for an
// identifying User-Agent, which browsers can't set. The GPS point is used for
// this lookup only and never stored or logged.

export type PlaceCandidate = {
  osm_id: string; // "way/123456"
  name: string;
  address: string | null;
  city: string | null;
  country: string | null; // ISO 3166-1 alpha-2, upper case
  lat: number;
  lng: number;
  distance_m: number;
};

export type NearbyPlaces = {
  candidates: PlaceCandidate[];
  // Where the photo was taken, for venues added by hand at that spot.
  city: string | null;
  country: string | null;
};

const USER_AGENT = "Stubbed/0.1 (theatre diary; https://github.com/felixng/stubbed)";
// The main public Overpass server is often overloaded (504s); mirrors run
// the same API. Tried in order until one answers.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

// Broadway houses can be under 100 m apart and phone GPS in Midtown can be
// 20–50 m off, so look a little wider and let distance order the list.
export const NEARBY_RADIUS_M = 150;
const MAX_CANDIDATES = 8;

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export function parseOverpass(json: unknown, lat: number, lng: number): PlaceCandidate[] {
  const elements = (json as { elements?: OverpassElement[] })?.elements ?? [];
  const seen = new Set<string>();
  const out: PlaceCandidate[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = (tags["name:en"] ?? tags.name ?? "").trim();
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (!name || pLat == null || pLng == null) continue;
    const osm_id = `${el.type}/${el.id}`;
    if (seen.has(osm_id)) continue;
    seen.add(osm_id);
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
    out.push({
      osm_id,
      name,
      address: street || null,
      city: tags["addr:city"] ?? null,
      country: tags["addr:country"]?.toUpperCase() ?? null,
      lat: pLat,
      lng: pLng,
      distance_m: Math.round(distanceMeters(lat, lng, pLat, pLng)),
    });
  }
  return out.sort((a, b) => a.distance_m - b.distance_m).slice(0, MAX_CANDIDATES);
}

type NominatimReverse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country_code?: string;
  };
};

export function parseNominatim(json: unknown): { city: string | null; country: string | null } {
  const a = (json as NominatimReverse)?.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state ?? null;
  return { city, country: a.country_code ? a.country_code.toUpperCase() : null };
}

async function getJson(url: string, init?: RequestInit, timeoutMs = 8000) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

async function queryOverpass(query: string) {
  let lastError: unknown;
  for (const url of OVERPASS_URLS) {
    try {
      return await getJson(url, { method: "POST", body: new URLSearchParams({ data: query }) }, 6000);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function findNearbyTheatres(lat: number, lng: number): Promise<NearbyPlaces> {
  const query =
    `[out:json][timeout:8];` +
    `nwr(around:${NEARBY_RADIUS_M},${lat},${lng})["amenity"="theatre"];` +
    `out center tags;`;

  // Both lookups are best effort: a failed one leaves its part blank.
  const [overpass, reverse] = await Promise.allSettled([
    queryOverpass(query),
    getJson(
      `${NOMINATIM_URL}?${new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lng),
        zoom: "10",
        "accept-language": "en",
      })}`,
    ),
  ]);

  const place = reverse.status === "fulfilled" ? parseNominatim(reverse.value) : { city: null, country: null };
  const candidates =
    overpass.status === "fulfilled"
      ? parseOverpass(overpass.value, lat, lng).map((c) => ({
          ...c,
          // Most theatres don't carry addr:city; the point's city is close enough.
          city: c.city ?? place.city,
          country: c.country ?? place.country,
        }))
      : [];
  if (overpass.status === "rejected") console.error("Overpass lookup failed", String(overpass.reason));
  if (reverse.status === "rejected") console.error("Nominatim lookup failed", String(reverse.reason));

  return { candidates, ...place };
}
