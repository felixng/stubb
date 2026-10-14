// The access token from an `Authorization: Bearer <token>` header, or null.
// The iOS app has no cookies: it sends its Supabase session token this way.
export function bearerToken(header: string | null | undefined): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  return match ? match[1] : null;
}
