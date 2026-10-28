import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    // next dev gets its own .next-dev: a Makers build rewrites next.config.ts, which restarts a running next dev and wipes its output directory.
    // Sharing .next with the build would delete the freshly built middleware, and every subdomain would serve the platform home page
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
    outputFileTracingRoot: process.cwd(),
    // Keys are route globs and "/**" matches every page and route: keep local Blob data, Git and previous build output out of the cloud function
    outputFileTracingExcludes: { "/**": [".blob-local/**", ".git/**", ".edgeone/**"] },
    // Makers preview deployments load static assets from this prefix; don't use basePath
    assetPrefix: process.env.EDGEONE_PREVIEW_ASSET_PREFIX,
    experimental: {
      // radix-ui exports every component from one entry and isn't on Next's default optimize list; without this each admin page ships about 80 KB more
      optimizePackageImports: ["radix-ui"],
      // Reader pages navigate client-side, and the browser reuses a visited page this long without asking the server.
      // The default is 5 minutes; 30 seconds (the minimum) keeps an open reader tab close to what the admin just saved
      staleTimes: { static: 30 },
    },
  };
}
