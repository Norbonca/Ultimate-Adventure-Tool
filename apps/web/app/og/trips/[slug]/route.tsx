/**
 * A túra megosztóképe (OpenGraph / Twitter, 1200×630 PNG) — FR-M02-010.
 * Terv: design/D02_Trip_Management.pen#eUTEO (borítóval), #sK41E (borító nélkül).
 *
 * - Csak nyilvános túrához készül saját kép (a `trips_select_public` RLS szabálya szerint); minden más esetben
 *   az általános Trevu-kép (`app/opengraph-image.tsx`) jön vissza — nem nyilvános túra adata nem kerül ki.
 * - A borítókép csak a saját tárhelyről és az Unsplash-ról töltődik le (SSRF ellen), 4 mp-es időkorláttal,
 *   és csak JPEG/PNG lehet; egyébként a Night alap teal fénnyel áll.
 * - A színek a Night-tokenek értékei (`globals.css [data-surface="night"]`): az ImageResponse nem ismeri a
 *   CSS-változókat.
 * - **A képen nincs felirat** (Norbert, 2026-11-09: képre nem kerülhet beégetett szöveg, mindennek
 *   nyelvesíthetőnek kell lennie): csak a borítókép, illetve borító nélkül a kategória ikonja, és a logó.
 *   A cím, dátum, helyszín, ár szövegként az og:title / og:description-ben van, az olvasó nyelvén.
 */

import { createElement } from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchTripBySlug } from "@/app/(app)/trips/actions";
import OpengraphImage from "@/app/opengraph-image";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { iconSvgNode } from "@/lib/icons";
import { isTripPublic } from "@/lib/share/trip-share";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const NIGHT = { bg: "#0F172A", text: "#F1F5F9", body: "#E2E8F0", muted: "#94A3B8", primary: "#2DD4BF", onPrimary: "#0F172A" };
const MAX_COVER_BYTES = 6 * 1024 * 1024;

function allowedCoverHosts(): Set<string> {
  const hosts = new Set(["images.unsplash.com"]);
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) hosts.add(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host);
  } catch {
    /* hibás env — csak az Unsplash marad */
  }
  return hosts;
}

/** A borítókép data-URI-ként, vagy null (tiltott host, időtúllépés, nem JPEG/PNG, túl nagy). */
async function loadCover(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !allowedCoverHosts().has(url.host)) return null;
  if (url.host === "images.unsplash.com") {
    for (const [k, v] of Object.entries({ fm: "jpg", w: "1200", h: "630", fit: "crop", q: "75" })) url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: "error" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_COVER_BYTES) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function generic(): Promise<Response> {
  const res = await OpengraphImage();
  res.headers.set("Cache-Control", CACHE);
  return res;
}

/** Lucide-geometria <svg>-ként (a satori nem futtat kliens-komponenst). */
function SvgIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const node = iconSvgNode(name);
  if (!node) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {node.map(([tag, attrs], i) => createElement(tag, { ...attrs, key: attrs.key ?? i }))}
    </svg>
  );
}


/** A logó (márkajel + szóvédjegy) sötét alátéten — a design `OG Brand` rétege; nem nyelvfüggő felirat. */
function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px 10px 10px", borderRadius: 16, background: "rgba(15,23,42,0.85)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: NIGHT.primary, color: NIGHT.onPrimary, fontSize: 26, fontWeight: 700 }}>T</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: NIGHT.primary }}>trevu</div>
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);
  if (!trip || !isTripPublic(trip)) return generic();

  const catRaw = trip.categories;
  const category = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { name: string } | null;
  const display = category ? CATEGORY_DISPLAY[category.name] : undefined;

  const root = process.cwd();
  const [bold, cover] = await Promise.all([
    readFile(join(root, "app/_og/DMSans-Bold.ttf")),
    loadCover(trip.cover_image_url as string | null),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: NIGHT.bg, fontFamily: "DM Sans" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) csak <img>-et ismer
          <img src={cover} alt="" width={SIZE.width} height={SIZE.height} style={{ position: "absolute", top: 0, left: 0, width: SIZE.width, height: SIZE.height, objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", top: 0, left: 0, width: SIZE.width, height: SIZE.height, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 10% 5%, rgba(45,212,191,0.20), rgba(15,23,42,0) 60%)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220, borderRadius: 9999, background: "#1E293B" }}>
              <SvgIcon name={display?.icon ?? "compass"} size={120} color={display?.colorHex ?? NIGHT.primary} />
            </div>
          </div>
        )}
        <div style={{ position: "absolute", top: 56, left: 64, display: "flex" }}>
          <Brand />
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [{ name: "DM Sans", data: bold, weight: 700, style: "normal" }],
      headers: { "Cache-Control": CACHE },
    },
  );
}
