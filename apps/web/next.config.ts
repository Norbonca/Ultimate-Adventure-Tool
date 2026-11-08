import type { NextConfig } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * M151 Rendszerállapot: a telepített kód migrációs fájljainak verziói buildkor rögzítve
 * („001,002,…”) — az admin ezt veti össze az éles adatbázis lefutott migrációival.
 * Ha a mappa nem érhető el (pl. a build csak az apps/web-et látja), üres → „nem ellenőrizhető”.
 */
function listMigrationVersions(): string {
  try {
    return readdirSync(join(process.cwd(), "../../supabase/migrations"))
      .filter((f) => /^\d+_.+\.sql$/.test(f))
      .map((f) => f.split("_")[0])
      .sort()
      .join(",");
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    TREVU_EXPECTED_MIGRATIONS: listMigrationVersions(),
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
