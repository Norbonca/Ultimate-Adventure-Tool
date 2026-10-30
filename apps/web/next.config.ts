import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: "/discover",
        destination: "/",
        permanent: true,
      },
    ];
  },
  transpilePackages: ["@uat/db", "@uat/core", "@uat/validators", "@uat/config"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rpwajsbxrvypeqaalhvd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // C9 (2026-10-30): a borítóképek egy része Unsplash-URL (éles adat) — next/image optimalizálás ezekre is.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

// Sentry wrapping — @sentry/nextjs is a declared dependency of this package
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  silent: !process.env.CI,
  telemetry: false,
});
