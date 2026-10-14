import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Public profiles live at /@handle. A folder can't start with "@" (that's a
  // parallel route slot), so the page is app/(public)/u/[handle] behind this
  // rewrite.
  rewrites: async () => [{ source: "/@:handle", destination: "/u/:handle" }],
  // Trips moved under Profile (Home · Log · Profile); old links still work.
  redirects: async () => [{ source: "/app/trips", destination: "/app/profile", permanent: false }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
