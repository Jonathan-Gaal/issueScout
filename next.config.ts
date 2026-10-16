import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // firebase-admin's token-verification path pulls in jwks-rsa -> jose,
  // whose ESM-only build breaks under Turbopack's server bundling
  // (require() of an ES module). Keep it external so Node loads it
  // natively from node_modules at runtime instead.
  serverExternalPackages: ["firebase-admin"],
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
