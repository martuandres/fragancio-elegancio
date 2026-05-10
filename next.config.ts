import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fimgs.net" },
      { protocol: "https", hostname: "*.fragrantica.com" },
    ],
  },
};

export default nextConfig;
