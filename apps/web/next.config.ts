import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
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
    ],
  },
};

// Sentry wrapping — only active if @sentry/nextjs is installed
// Install: pnpm add @sentry/nextjs --filter @uat/web
let exportedConfig = nextConfig;
try {
  const { withSentryConfig } = require("@sentry/nextjs");
  exportedConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    widenClientFileUpload: true,
    silent: !process.env.CI,
    telemetry: false,
  });
} catch {
  // @sentry/nextjs not installed yet — skip wrapping
}

export default exportedConfig;
