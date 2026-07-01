import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@meavo/navigation"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
