"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry if available
    try {
      const Sentry = require("@sentry/nextjs");
      Sentry.captureException(error);
    } catch {
      // Sentry not installed — log to console
      console.error("Unhandled error:", error);
    }
  }, [error]);

  return (
    <html>
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
            Váratlan hiba történt
          </h2>
          <p style={{ color: "#64748B", marginBottom: "1.5rem" }}>
            A hiba automatikusan jelentve lett.
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
            Újrapróbálás
          </button>
        </div>
      </body>
    </html>
  );
}
