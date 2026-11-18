import type { NextConfig } from "next";

// GitHub Pages serves this from /<repo>, so the base path has to be baked in
// at build time. Locally it is empty and everything is served from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Dhvani has no server side at all: every sound is synthesised or fetched in
  // the browser, so the whole thing exports to static files.
  output: "export",
  basePath: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,

  // Several lockfiles live above this directory; pin the root so the build
  // does not go looking for one.
  turbopack: {
    root: __dirname,
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
