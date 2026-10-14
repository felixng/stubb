import type { SupabaseClient, User } from "@supabase/supabase-js";

// Profile photos live in the public `avatars` bucket at
// `{user_id}/{timestamp}.jpg`. A new name per upload, so caches never serve
// an old photo.
export const AVATAR_BUCKET = "avatars";
export const avatarPath = (userId: string) => `${userId}/${Date.now()}.jpg`;

const MAX_BYTES = 2 * 1024 * 1024;

// The Google profile photo URL from sign-in, asked for at 512 px square.
// Only Google's own image host, so this never fetches an arbitrary URL.
export function googlePhotoUrl(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const raw = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null;
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return null;
  // Google sizes by a trailing "=s96-c"; swap or add it.
  const base = url.toString().replace(/=[a-z0-9-]+$/i, "");
  return `${base}=s512-c`;
}

// On first sign-in with Google, copies the Google photo into our bucket as
// the avatar, so visitors never load it from Google and it survives a change
// on Google's side. Only before onboarding (no handle yet) and only when
// there's no avatar, so it never overrides one the user picked or removed.
// Google serves its own re-encoded JPEG (no camera EXIF). Never throws:
// sign-in carries on without a photo.
export async function importGoogleAvatar(supabase: SupabaseClient, user: User) {
  try {
    const source = googlePhotoUrl(user);
    if (!source) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, avatar_url")
      .eq("id", user.id)
      .maybeSingle<{ handle: string | null; avatar_url: string | null }>();
    if (!profile || profile.handle || profile.avatar_url) return;

    const res = await fetch(source, { headers: { Accept: "image/jpeg" }, signal: AbortSignal.timeout(3000) });
    if (!res.ok || res.headers.get("content-type")?.split(";")[0] !== "image/jpeg") return;
    const photo = await res.arrayBuffer();
    if (!photo.byteLength || photo.byteLength > MAX_BYTES) return;

    const path = avatarPath(user.id);
    const { error: upload } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, photo, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (upload) throw upload;
    const publicUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    if (error) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path]);
      throw error;
    }
  } catch (error) {
    console.error("Importing the Google photo failed", error);
  }
}
