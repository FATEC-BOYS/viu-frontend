// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // next/image recusa host remoto não declarado. As artes vêm por URL
    // assinada do R2, e avatares de seed vêm do Unsplash — sem isso a lista
    // de feedbacks quebra com "Invalid src prop".
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
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
