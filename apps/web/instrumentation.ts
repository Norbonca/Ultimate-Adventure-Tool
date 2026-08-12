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

// Sentry v10: captures errors thrown inside nested React Server Components.
export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(...args);
  } catch {
    // @sentry/nextjs not installed — skip
  }
}
