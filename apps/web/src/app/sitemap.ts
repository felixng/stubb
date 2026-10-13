import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// The landing page and the legal pages are public for now (/llms.txt is
// for AI tools, not a page, so it stays out). Public entry and profile pages
// get added here when they ship.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL.href, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/terms", SITE_URL).href, changeFrequency: "yearly", priority: 0.2 },
    { url: new URL("/privacy", SITE_URL).href, changeFrequency: "yearly", priority: 0.2 },
  ];
}
