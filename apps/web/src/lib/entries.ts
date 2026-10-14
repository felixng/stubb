// Entry, show and venue reads/writes shared by the log form, diary and trips
// (#14). Both browser and server Supabase clients work here: every rule
// (ownership, visibility, rating steps) is enforced by RLS and constraints.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Visibility = "public" | "private";
export type ShowType = "musical" | "play" | "opera" | "dance" | "comedy" | "other";

export const SHOW_TYPE_LABELS: Record<ShowType, string> = {
  musical: "Musical",
  play: "Play",
  opera: "Opera",
  dance: "Dance",
  comedy: "Comedy",
  other: "Other",
};

export type Show = { id: string; title: string; type: ShowType };

export type Venue = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  lat?: number | null;
  lng?: number | null;
  osm_id?: string | null;
};

// A show or venue the form is about to create. Created on save, not before,
// so abandoning the form leaves no stray catalogue rows.
export type NewShow = { id?: undefined; title: string; type: ShowType };
export type NewVenue = Omit<Venue, "id"> & { id?: undefined };

export type VenueChoice = Venue | NewVenue;

// A theatre near where a photo was taken; `id` is set when it's already in
// the catalogue.
export type NearbyVenue = VenueChoice & { distance_m: number };

export type Collection = {
  id: string;
  name: string;
  kind: "trip" | "label";
  start_date: string | null;
  end_date: string | null;
  visibility: Visibility;
};

export type EntryRow = {
  id: string;
  date: string;
  rating: number | null;
  note: string | null;
  photo_path: string | null;
  visibility: Visibility;
  show: Show;
  venue: Venue | null; // null for a planned show without one yet
  collections: Pick<Collection, "id" | "name" | "kind">[];
};

export const ENTRY_SELECT =
  "id, date, rating, note, photo_path, visibility, show:shows!inner(id, title, type), venue:venues(id, name, city, country), collections:entry_collections(collection:collections(id, name, kind))";

type RawEntry = Omit<EntryRow, "collections" | "rating"> & {
  rating: number | string | null;
  collections: { collection: EntryRow["collections"][number] | null }[];
};

export function toEntryRow(raw: RawEntry): EntryRow {
  return {
    ...raw,
    rating: raw.rating == null ? null : Number(raw.rating),
    collections: raw.collections.flatMap((c) => (c.collection ? [c.collection] : [])),
  };
}

export const PHOTO_BUCKET = "entry-photos";

export function photoPath(userId: string, entryId: string) {
  return `${userId}/${entryId}.jpg`;
}

// Signed URLs for a batch of photo paths; the bucket is private and RLS
// decides who may sign. Missing or failed paths are simply left out.
export async function signPhotos(supabase: SupabaseClient, paths: (string | null)[], expiresIn = 3600) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (!unique.length) return urls;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, expiresIn);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

// Reuse an existing show when the title matches exactly (any case), so a
// suggested or retyped title doesn't create a duplicate.
export async function ensureShow(supabase: SupabaseClient, show: Show | NewShow): Promise<string> {
  if (show.id) return show.id;
  const title = show.title.trim();
  const { data: matches } = await supabase.rpc("search_shows", { q: title });
  const same = (matches as Show[] | null)?.find((s) => s.title.toLowerCase() === title.toLowerCase());
  if (same) return same.id;
  const { data, error } = await supabase.from("shows").insert({ title, type: show.type }).select("id").single();
  if (error) throw error;
  return data.id;
}

// Venues from OpenStreetMap are matched on osm_id, then on name in the same
// city; otherwise a new row is added.
export async function ensureVenue(supabase: SupabaseClient, venue: Venue | NewVenue): Promise<string> {
  if (venue.id) return venue.id;
  const name = venue.name.trim();
  if (venue.osm_id) {
    const { data } = await supabase.from("venues").select("id").eq("osm_id", venue.osm_id).maybeSingle();
    if (data) return data.id;
  }
  const { data: matches } = await supabase.rpc("search_venues", {
    q: name,
    near_lat: venue.lat ?? null,
    near_lng: venue.lng ?? null,
  });
  const same = (matches as Venue[] | null)?.find(
    (v) =>
      v.name.toLowerCase() === name.toLowerCase() &&
      (v.city ?? "").toLowerCase() === (venue.city ?? "").trim().toLowerCase(),
  );
  if (same) return same.id;
  const { data, error } = await supabase
    .from("venues")
    .insert({
      name,
      city: venue.city?.trim() || null,
      country: venue.country?.trim() || null,
      lat: venue.lat ?? null,
      lng: venue.lng ?? null,
      osm_id: venue.osm_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// The trip covering a date, for pre-selecting it on a new entry. Open-ended
// trips (no end date) cover everything from their start.
export function activeTripFor(collections: Collection[], date: string) {
  return collections.find(
    (c) => c.kind === "trip" && c.start_date && c.start_date <= date && (!c.end_date || date <= c.end_date),
  );
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  // Dates are calendar days; format at noon UTC so no zone shifts the day.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function localToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
