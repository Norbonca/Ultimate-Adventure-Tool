export async function register() {
  // Only load Sentry if the package is installed
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  } catch {
    // @sentry/nextjs not installed — skip initialization
  }
}
