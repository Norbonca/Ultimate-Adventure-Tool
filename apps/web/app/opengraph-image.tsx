/**
 * Alapértelmezett megosztási kép (OpenGraph / Twitter, 1200×630) minden oldalra, amely nem ad sajátot.
 * Terv: design/D00_Core_Components.pen#BAKFQ — a weboldal hero-fotója és a márka logója (components/brand/og.tsx).
 *
 * **A képen nincs felirat** (Norbert, 2026-11-09: képre nem kerülhet beégetett szöveg, mindennek
 * nyelvesíthetőnek kell lennie). Az oldal címe és leírása az og:title / og:description-ben van, az
 * olvasó nyelvén; az `alt` a márkanév, ami minden nyelven azonos.
 */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "@/lib/seo";
import { OG_NIGHT, OgBrand } from "@/components/brand/og";

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
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: OG_NIGHT.bg, fontFamily: "DM Sans" }}>
        <img src={heroSrc} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 56, left: 64, display: "flex" }}>
          <OgBrand />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "DM Sans", data: bold, weight: 700, style: "normal" }],
    },
  );
}
