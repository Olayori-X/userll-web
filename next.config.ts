import type { NextConfig } from "next";

function imagePatterns() {
  const sources = [process.env.API_BASE_URL, ...(process.env.IMAGE_HOSTS ?? "").split(",")];

  return sources.flatMap((source) => {
    const text = source?.trim();
    if (!text) return [];

    try {
      const url = new URL(text.includes("://") ? text : `https://${text}`);

      return [
        {
          protocol: url.protocol === "http:" ? ("http" as const) : ("https" as const),
          hostname: url.hostname,
          port: url.port,
        },
      ];
    } catch {
      return []; // not a usable address: skip it
    }
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imagePatterns(),
    // Next 16 will not optimise pictures from localhost or other private addresses unless told to. That is the
    // right default for a live site, but on your own computer the API is on localhost, so allow it while developing only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
