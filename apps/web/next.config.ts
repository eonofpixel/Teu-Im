import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@teu-im/shared", "@teu-im/ui", "@teu-im/supabase"],
  output: "standalone",
};

export default nextConfig;
