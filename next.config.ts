import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  typescript: {
    // Ignore type errors from Supabase Edge Functions (Deno) during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
