import type { NextConfig } from "next";

// On low-resource servers the TypeScript check during `next build` can be very
// slow or run out of memory. Set SKIP_TYPECHECK=true to skip it there.
const skipTypecheck = process.env.SKIP_TYPECHECK === "true";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  devIndicators: false,
  typescript: { ignoreBuildErrors: skipTypecheck },
};

export default nextConfig;
