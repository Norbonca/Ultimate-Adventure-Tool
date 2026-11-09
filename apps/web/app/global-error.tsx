"use client";

import { useEffect } from "react";
import { createT, DEFAULT_LOCALE, type Locale } from "@uat/i18n";
import { isSupportedLocale, LOCALE_COOKIE } from "@/lib/i18n/negotiate";

// A gyökér hibahatár a provider előtt fut (itt renderelődik a <html>/<body>), ezért a nyelvet
// maga oldja fel: választott nyelv (süti) → böngészőnyelv → alapértelmezett (az olvasó nyelve dönt).
function readerLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const fromCookie = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))?.[1];
  if (isSupportedLocale(fromCookie)) return fromCookie;
  const fromBrowser = navigator.language?.split("-")[0];
  return isSupportedLocale(fromBrowser) ? fromBrowser : DEFAULT_LOCALE;
}
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry if available (dynamic import keeps the optional-dependency
    // semantics of the previous require() without violating no-require-imports)
    import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {
        // Sentry not installed — log to console
        console.error("Unhandled error:", error);
      });
  }, [error]);

  const locale = readerLocale();
  const t = createT(locale);

  return (
    <html lang={locale}>
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "DM Sans, Arial, sans-serif",
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
            {t("errors.unexpectedTitle")}
          </h2>
          <p style={{ color: "#64748B", marginBottom: "1.5rem" }}>
            {t("errors.reportedAutomatically")}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#10B981",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      </body>
    </html>
  );
}
