// Handles are lowercase letters, digits and underscores, 3–20 long (the
// profiles.handle check). URLs may use any case; the column is citext.
// Separate from lib/profile.ts so client components can import it.
// Also the onboarding (/welcome) field rules; Postgres checks the same.
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

// Handles nobody can claim: Stubbed's own names, staff-sounding ones, and
// words that would read as site pages or system values. Postgres refuses the
// same list (public.is_reserved_handle, migration
// 20261014150000_reserved_handles.sql); test/profile-handle.test.ts keeps the
// two in step. Lowercase, and 3–20 characters like any handle.
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Stubbed
  "stubbed", "stubbedapp", "getstubbed", "stubbed_app", "stubbedhq", "teamstubbed",
  // Staff and trust
  "admin", "administrator", "root", "sysadmin", "superuser", "staff", "team", "official",
  "mod", "mods", "moderator", "support", "help", "helpdesk", "security", "safety",
  "abuse", "legal", "privacy", "terms", "trust", "verified", "system", "owner", "founder",
  // Site pages and routes
  "app", "api", "about", "faq", "login", "logout", "signin", "signout", "signup",
  "register", "join", "welcome", "confirmed", "auth", "account", "settings", "profile",
  "import", "share", "trips", "diary", "explore", "search", "feed", "home", "news",
  "blog", "press", "jobs", "careers", "contact", "status", "docs", "sitemap", "robots",
  "www", "mail", "email", "noreply", "no_reply", "postmaster", "webmaster", "hostmaster",
  // Values that read as missing or everyone
  "null", "undefined", "none", "nobody", "anonymous", "everyone", "all", "user", "users",
  "test", "example",
]);

// `current` is the user's saved handle: one they already hold is never
// refused, even if it's on the list now.
export function handleProblem(handle: string, current?: string | null): string | null {
  if (!handle) return "Pick a handle.";
  if (handle.length < 3) return "At least 3 characters.";
  if (handle.length > 20) return "At most 20 characters.";
  if (!HANDLE_PATTERN.test(handle)) return "Letters, numbers and underscores only.";
  if (RESERVED_HANDLES.has(handle) && handle !== current) return "That handle is reserved. Try another.";
  return null;
}

// Postgres's refusal of a reserved handle (raised by the profiles trigger).
export function isReservedHandleError(error: { code?: string; message?: string } | null) {
  return error?.code === "23514" && /reserved/i.test(error.message ?? "");
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
