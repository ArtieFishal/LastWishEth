import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Set workspace root to avoid Turbopack workspace detection issues
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
