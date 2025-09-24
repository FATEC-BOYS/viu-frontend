// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      { source: "/shared/:token", destination: "/l/:token" },
    ];
  },
  // Se TypeScript estiver travando o build, descomente:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
