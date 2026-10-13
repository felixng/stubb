// Handles are lowercase letters, digits and underscores, 3–20 long (the
// profiles.handle check). URLs may use any case; the column is citext.
// Separate from lib/profile.ts so client components can import it.
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
