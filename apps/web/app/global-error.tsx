"use client";

import { useEffect } from "react";
import { DEFAULT_THEME, resolveToken } from "@uat/config";
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
// A gyökér hibahatár a globális stíluslap nélkül renderelhet — a színek és a betű a témából, CSS nélkül.
const tok = (name: string, fallback: string) => resolveToken(DEFAULT_THEME, "night", name) ?? fallback;

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
          fontFamily: tok("font-family-sans", "Arial, sans-serif"),
          backgroundColor: tok("color-bg", "#222520"),
          color: tok("color-text", "#E9E7DE"),
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
            {t("errors.unexpectedTitle")}
          </h2>
          <p style={{ color: tok("color-text-muted", "#B9B8AE"), marginBottom: "1.5rem" }}>
            {t("errors.reportedAutomatically")}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: tok("color-primary", "#F15B2A"),
              color: tok("color-on-primary", "#222520"),
              border: "none",
              borderRadius: tok("radius-m", "0px"),
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
