import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
