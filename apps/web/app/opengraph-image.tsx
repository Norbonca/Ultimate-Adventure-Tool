import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Trevu — Trek Beyond Ordinary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #047857 0%, #10B981 60%, #34D399 100%)",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 160,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Trevu
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            fontWeight: 500,
            opacity: 0.92,
          }}
        >
          Trek Beyond Ordinary
        </div>
        <div
          style={{
            marginTop: 60,
            fontSize: 24,
            fontWeight: 400,
            opacity: 0.78,
            display: "flex",
          }}
        >
          ttvk.hu
        </div>
      </div>
    ),
    { ...size }
  );
}
