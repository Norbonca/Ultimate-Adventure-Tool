import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // MVP fázisban kikapcsoljuk — később bekapcsoljuk
    ignoreBuildErrors: true,
  },
  eslint: {
    // MVP fázisban kikapcsoljuk — később bekapcsoljuk
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@uat/db", "@uat/core", "@uat/validators", "@uat/config"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rpwajsbxrvypeqaalhvd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
