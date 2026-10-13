import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Only the landing page is public for now. Public entry and profile pages
// get added here when they ship.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL.href, changeFrequency: "weekly", priority: 1 }];
}
