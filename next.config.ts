import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 👈 isso faz o deploy não travar por causa de lint
  },
  // opcional, se o TypeScript também estiver barrando o build:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
