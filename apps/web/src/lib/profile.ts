// Profile fields set during onboarding (/welcome). The same rules are check
// constraints in Postgres; these give the form friendly messages first.

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
export const NAME_MAX = 50;
export const BIO_MAX = 160;
export const LINK_MAX = 200;

// Set by the proxy once a user has a handle, holding their user id, so later
// navigations skip the profile lookup. Not a security boundary: it only
// decides whether to show onboarding.
export const ONBOARDED_COOKIE = "stubbed-onboarded";

// "@Felix.Ng " → "felixng". People paste handles from Instagram.
export function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function handleProblem(handle: string): string | null {
  if (!handle) return "Pick a handle.";
  if (handle.length < 3) return "At least 3 characters.";
  if (handle.length > 20) return "At most 20 characters.";
  if (!HANDLE_PATTERN.test(handle)) return "Letters, numbers and underscores only.";
  return null;
}

// "instagram.com/you" → "https://instagram.com/you". Returns null when it
// isn't a usable http(s) link.
export function normalizeLink(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || /\s/.test(withScheme)) return null;
    return withScheme.length <= LINK_MAX ? withScheme : null;
  } catch {
    return null;
  }
}
