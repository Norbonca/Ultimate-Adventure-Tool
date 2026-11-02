/**
 * Alapértelmezett megosztási kép (OpenGraph / Twitter, 1200×630) minden oldalra, amely nem ad sajátot.
 * Brand Guide v2 „Éjszakai túra”: Night alap, a weboldal hero-fotója balról sötétítve, DM Sans, teal akcentus.
 * Szöveg: a jóváhagyott szervezői prezentáció borítója.
 */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Trevu — A kalandtúrád szervezése egy helyen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const root = process.cwd();
  const [bold, regular, hero] = await Promise.all([
    readFile(join(root, "app/_og/DMSans-Bold.ttf")),
    readFile(join(root, "app/_og/DMSans-Regular.ttf")),
    readFile(join(root, "public/discover/hero.jpg")),
  ]);
  const heroSrc = `data:image/jpeg;base64,${hero.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0F172A", fontFamily: "DM Sans" }}>
        <img src={heroSrc} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(90deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.86) 48%, rgba(15,23,42,0.25) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px", width: 820, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "#2DD4BF", color: "#0F172A", fontSize: 30, fontWeight: 700 }}>T</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#2DD4BF", letterSpacing: 0.5 }}>trevu</div>
          </div>
          <div style={{ marginTop: 40, fontSize: 68, fontWeight: 700, lineHeight: 1.05, color: "#F1F5F9", letterSpacing: -1.5 }}>A kalandtúrád szervezése egy helyen</div>
          <div style={{ marginTop: 26, fontSize: 28, lineHeight: 1.4, color: "#CBD5E1" }}>Meghirdetés, jelentkezők, teendők és közös költségek – egy felületen.</div>
          <div style={{ marginTop: 40, fontSize: 24, color: "#94A3B8" }}>www.ttvk.hu</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Sans", data: bold, weight: 700, style: "normal" },
        { name: "DM Sans", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
