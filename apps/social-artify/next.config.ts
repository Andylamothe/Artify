import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/social",
  env: {
    NEXT_PUBLIC_API_URL: "/social",
    NEXT_PUBLIC_AR_WEB_URL: "",
  },
};

export default nextConfig;
