// The social sign-ins the login page offers. Anything else from a form or URL
// is ignored.
export const oauthProviders = ["google", "apple"] as const;
export type OAuthProvider = (typeof oauthProviders)[number];

export function oauthProvider(value: unknown): OAuthProvider | null {
  return oauthProviders.find((p) => p === value) ?? null;
}
