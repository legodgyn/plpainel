import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix:
    process.env.NODE_ENV === "production" ? "https://plpainel.com" : undefined,
};

export default nextConfig;
