import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We use external Auth.js + DB; allow the build to handle them on server.
  serverExternalPackages: ["postgres", "bcryptjs", "adm-zip"],
};

export default nextConfig;
