/**
 * Alapértelmezett megosztási kép (OpenGraph / Twitter, 1200×630) minden oldalra, amely nem ad sajátot.
 * Terv: design/D00_Core_Components.pen#BAKFQ — a weboldal hero-fotója és a Trevu logó.
 *
 * **A képen nincs felirat** (Norbert, 2026-11-09: képre nem kerülhet beégetett szöveg, mindennek
 * nyelvesíthetőnek kell lennie). Az oldal címe és leírása az og:title / og:description-ben van, az
 * olvasó nyelvén; az `alt` a márkanév, ami minden nyelven azonos.
 */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "@/lib/seo";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const root = process.cwd();
  const [bold, hero] = await Promise.all([
    readFile(join(root, "app/_og/DMSans-Bold.ttf")),
    readFile(join(root, "public/discover/hero.jpg")),
  ]);
  const heroSrc = `data:image/jpeg;base64,${hero.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0F172A", fontFamily: "DM Sans" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) csak <img>-et ismer */}
        <img src={heroSrc} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 56, left: 64, display: "flex", alignItems: "center", gap: 12, padding: "10px 18px 10px 10px", borderRadius: 16, background: "rgba(15,23,42,0.85)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#2DD4BF", color: "#0F172A", fontSize: 26, fontWeight: 700 }}>T</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#2DD4BF" }}>trevu</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "DM Sans", data: bold, weight: 700, style: "normal" }],
    },
  );
}
