// The public origin, for canonical links, Open Graph URLs and the sitemap.
// Set NEXT_PUBLIC_SITE_URL once there's a custom domain; until then Vercel's
// production domain is used, and localhost in development.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),
);

export const SITE_NAME = "Stubbed";
export const SITE_TITLE = "Stubbed — the theatre diary to log, rate and share shows";
// 140–160 characters, so search results show it whole. No launch cities or
// regions in public copy (see CLAUDE.md, section 5).
export const SITE_DESCRIPTION =
  "Stubbed is a theatre diary app. Log every play, musical and opera you see, rate it in half stars, group shows into trips and share cards. Now in private beta.";
