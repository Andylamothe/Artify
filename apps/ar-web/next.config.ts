import type { NextConfig } from "next";

const socialOrigin = process.env.SOCIAL_INTERNAL_ORIGIN ?? "http://127.0.0.1:3290";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/social/:path*",
        destination: `${socialOrigin}/social/:path*`,
      },
    ];
  },
};

export default nextConfig;
