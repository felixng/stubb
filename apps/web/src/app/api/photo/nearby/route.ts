import { findNearbyTheatres } from "@/lib/places";
import { requireUserId } from "@/lib/supabase/require-user";

// POST { lat, lng } → theatres near where a photo was taken (#14).
// POST rather than GET so the coordinates stay out of URLs and access logs.
export async function POST(request: Request) {
  if (!(await requireUserId())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "invalid_point" }, { status: 400 });
  }

  return Response.json(await findNearbyTheatres(lat, lng));
}
