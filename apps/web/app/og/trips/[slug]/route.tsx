/**
 * A túra megosztóképe (OpenGraph / Twitter, 1200×630 PNG) — FR-M02-010.
 * Terv: design/D02_Trip_Management.pen#eUTEO (borítóval), #sK41E (borító nélkül).
 *
 * - Csak nyilvános túrához készül saját kép (a `trips_select_public` RLS szabálya szerint); minden más esetben
 *   az általános Trevu-kép (`app/opengraph-image.tsx`) jön vissza — nem nyilvános túra adata nem kerül ki.
 * - A borítókép csak a saját tárhelyről és az Unsplash-ról töltődik le (SSRF ellen), 4 mp-es időkorláttal,
 *   és csak JPEG/PNG lehet; egyébként a Night alap teal fénnyel áll.
 * - A színek a Night-tokenek értékei (`globals.css [data-surface="night"]`): az ImageResponse nem ismeri a
 *   CSS-változókat. Gyorsan elavuló adat (szabad helyek) nincs a képen.
 */

import { createElement } from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createT, type Locale } from "@uat/i18n";
import { fetchTripBySlug } from "@/app/(app)/trips/actions";
import OpengraphImage from "@/app/opengraph-image";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { iconSvgNode } from "@/lib/icons";
import { isTripPublic, tripDays } from "@/lib/share/trip-share";

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

function fitTitle(title: string): { text: string; size: number } {
  const text = title.length > 90 ? `${title.slice(0, 88).trimEnd()}…` : title;
  return { text, size: text.length > 60 ? 48 : text.length > 36 ? 56 : 64 };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);
  if (!trip || !isTripPublic(trip)) return generic();

  const lang = new URL(request.url).searchParams.get("lang");
  const locale: Locale = lang === "en" ? "en" : "hu";
  const t = createT(locale);
  const intlLocale = locale === "en" ? "en-US" : "hu-HU";

  const catRaw = trip.categories;
  const category = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { name: string; name_localized: Record<string, string> | null } | null;
  const display = category ? CATEGORY_DISPLAY[category.name] : undefined;
  const categoryName = category ? category.name_localized?.[locale] || category.name : null;

  const dateFmt = new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const start = trip.start_date ? new Date(`${String(trip.start_date).slice(0, 10)}T00:00:00Z`) : null;
  const end = trip.end_date ? new Date(`${String(trip.end_date).slice(0, 10)}T00:00:00Z`) : null;
  const dateText = start ? (end && end.getTime() !== start.getTime() ? dateFmt.formatRange(start, end) : dateFmt.format(start)) : null;
  const days = tripDays(trip.start_date as string | null, trip.end_date as string | null);

  let country: string | null = null;
  try {
    country = trip.location_country ? new Intl.DisplayNames([intlLocale], { type: "region" }).of(String(trip.location_country)) ?? null : null;
  } catch {
    country = (trip.location_country as string | null) ?? null;
  }
  const place = [trip.location_city, country].filter(Boolean).join(", ") || null;

  const price = trip.price_amount
    ? `${new Intl.NumberFormat(intlLocale, { style: "currency", currency: String(trip.price_currency || "EUR"), maximumFractionDigits: 0 }).format(Number(trip.price_amount))} ${t("trips.share.og.perPerson")}`
    : t("trips.share.og.free");

  const root = process.cwd();
  const [bold, regular, cover] = await Promise.all([
    readFile(join(root, "app/_og/DMSans-Bold.ttf")),
    readFile(join(root, "app/_og/DMSans-Regular.ttf")),
    loadCover(trip.cover_image_url as string | null),
  ]);
  const title = fitTitle(String(trip.title));
  const meta = [
    dateText ? { icon: "calendar", text: dateText } : null,
    place ? { icon: "map-pin", text: place } : null,
    days ? { icon: "hourglass", text: t("trips.share.og.days", { count: days }) } : null,
  ].filter((m): m is { icon: string; text: string } => m !== null);

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: NIGHT.bg, fontFamily: "DM Sans" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) csak <img>-et ismer
          <img src={cover} alt="" width={SIZE.width} height={SIZE.height} style={{ position: "absolute", top: 0, left: 0, width: SIZE.width, height: SIZE.height, objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", top: 0, left: 0, width: SIZE.width, height: SIZE.height, display: "flex", background: "radial-gradient(circle at 10% 5%, rgba(45,212,191,0.20), rgba(15,23,42,0) 60%)" }} />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE.width,
            height: SIZE.height,
            display: "flex",
            background: "linear-gradient(90deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.85) 50%, rgba(15,23,42,0.2) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", width: SIZE.width, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: NIGHT.primary, color: NIGHT.onPrimary, fontSize: 26, fontWeight: 700 }}>T</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: NIGHT.primary }}>trevu</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
            {categoryName && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start", padding: "6px 12px", borderRadius: 6, background: display ? `${display.colorHex}33` : "rgba(255,255,255,0.08)", color: NIGHT.text, fontSize: 18, fontWeight: 700 }}>
                {display && <SvgIcon name={display.icon} size={18} color={display.colorHex} />}
                {categoryName}
              </div>
            )}
            <div style={{ display: "flex", fontSize: title.size, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.2, color: NIGHT.text }}>{title.text}</div>
            {meta.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                {meta.map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: NIGHT.body }}>
                    <SvgIcon name={icon} size={24} color={NIGHT.primary} />
                    {text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: NIGHT.text }}>{price}</div>
            <div style={{ display: "flex", fontSize: 22, color: NIGHT.muted }}>www.ttvk.hu</div>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "DM Sans", data: bold, weight: 700, style: "normal" },
        { name: "DM Sans", data: regular, weight: 400, style: "normal" },
      ],
      headers: { "Cache-Control": CACHE },
    },
  );
  return image;
}
