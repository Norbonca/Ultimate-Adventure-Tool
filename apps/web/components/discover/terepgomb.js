// terepgomb.js — 3D földgömb túrakereső (vanilla JS; MapLibre GL JS gömbvetítés + DOM/SVG réteg).
//
// Forrás: handoff/globe/terepgomb.js (Claude Design, Terepgomb.html végleges állapota, 2026-09-14).
// Bekötéskor változott (S39b–S40): i18n szótár, week0 az API-ból, `tg-` előtag, update(), a11y, destroy,
// tokenekből jövő színek (PLAN-011), idővonal széle a múltbeli és 52 héten túli túráknak, szűk nézet.
//
// 2026-09-15 — MOTORCSERE (Norbert döntése: „az engine változik, a design nem”):
//   A felszínt és a földrajzi alapréteget (tenger, szárazföld, határok, fokhálózat) korábban a processzor
//   rajzolta: minden képkockán pixelenként inverz ortografikus vetítés a Web Mercator csempékre, majd
//   putImageData, fölötte óriási SVG-poligonok. Ez nagy felbontáson és gyengébb gépen lassú volt.
//   Most a MapLibre GL JS 5 rajzolja a GPU-n, gömbvetítésben (projection: globe). A csempék éjszakai tónusát
//   csempénként EGYSZER, betöltéskor számoljuk (addProtocol), nem képkockánként.
//   Változatlan maradt a látvány és minden, ami fölötte van: zászlók, klaszterek, kártya, tokenek, idővonal,
//   évszak-chipek, városok és hegységek felirata, útvonal — ezek továbbra is DOM/SVG-rétegek, a gömbre a
//   MapLibre vetítéséből (map.project) kerülnek. A forgatás, a csippentés és a görgetés a MapLibre sajátja.
//
// Használat:
//   const globe = await mountGlobe(rootEl, { trips, categories, routes, week0, tiles, atlasUrl, locale, t, onOpen });
//   globe.update({ trips, routes }); globe.frameTrip(id); globe.destroy();
// - trips: [{ id, slug, cat, title, place, host, week, days, price, spots, diff, ll: [lon, lat], approximate, past, image }]
// - categories: [{ id, label, color }]
// - routes: { [tripId]: [[név, lon, lat], …] } — a napi program pontjai; üres objektum is mehet
// - week0: 'YYYY-MM-DD' — a 0. hét napja (az API adja)
// - tiles: { url(z, x, y), maxZoom }, atlasUrl: a countries-50m.json helye
// - t: feliratszótár (ld. GlobeDiscover.tsx), locale: 'hu' | 'en'
// - onOpen(slug): a "Részletek" gomb
import maplibregl from "maplibre-gl";
import { geoDistance, geoGraticule, mean } from "d3";
import * as topojson from "topojson-client";

const TILE_PROTOCOL = "trevu-globe";
const TILE_RETRIES = 3;
// az aktuális csempeszolgáltató — a protokoll egyszer regisztrálódik, a mount állítja be
let tileSource = null;

/** Éjszakai tónus csempénként egyszer: a műholdszínek hűvösítve, sötétítve (a korábbi pixelképlet szürkére pontos közelítése). */
function nightTone(bitmap) {
  const w = bitmap.width, h = bitmap.height;
  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(112,135,166)"; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgb(12,22,42)"; ctx.fillRect(0, 0, w, h);
  return typeof canvas.transferToImageBitmap === "function" ? canvas.transferToImageBitmap() : createImageBitmap(canvas);
}

function registerTileProtocol() {
  if (registerTileProtocol.done) return; registerTileProtocol.done = true;
  maplibregl.addProtocol(TILE_PROTOCOL, async (params, abortController) => {
    const m = /^trevu-globe:\/\/(\d+)\/(\d+)\/(\d+)/.exec(params.url);
    const src = tileSource;
    if (!m || !src) throw new Error("globe tile: no source");
    const z = +m[1], x = +m[2], y = +m[3];
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(src.url(z, x, y), { signal: abortController.signal, mode: "cors" });
        if (!res.ok) throw new Error("tile " + res.status);
        const bitmap = await createImageBitmap(await res.blob());
        const toned = await nightTone(bitmap); bitmap.close?.();
        src.onLoaded();
        return { data: toned };
      } catch (err) {
        if (abortController.signal.aborted) throw err;
        // a hibás csempe visszalépéssel újrapróbálódik (korábban örökre lyuk maradt → „széttört” felszín)
        if (attempt + 1 >= TILE_RETRIES) { src.onFailed(z); throw err; }
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1) * (attempt + 1)));
        if (abortController.signal.aborted) throw err;
      }
    }
  });
}

export async function mountGlobe(root, opts) {
  const $ = (id) => root.querySelector("#tg-" + id);
  const T = opts.t;
  const intlLocale = opts.locale === "en" ? "en-US" : "hu-HU";

  // színek a globals.css tokenjeiből — a gyökérelemen olvasva, így egy helyen állíthatók (PLAN-011)
  const rootStyle = getComputedStyle(root);
  const token = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback;
  const COL = {
    primary: token("--dark-primary", "rgb(45,212,191)"), label: token("--border-subtle", "rgb(226,232,240)"), stopInk: token("--globe-stop-ink", "rgb(6,11,22)"),
    sphere: [token("--globe-sphere-1", "rgb(22,40,66)"), token("--globe-sphere-2", "rgb(12,24,44)"), token("--globe-sphere-3", "rgb(6,11,22)")],
    land: [token("--globe-land-1", "rgb(40,58,84)"), token("--globe-land-2", "rgb(24,38,60)")],
  };

  const CATS = opts.categories;            // [{id,label,color}]
  let TRIPS = opts.trips.slice();          // update() cseréli
  let ROUTES = opts.routes || {};          // { [tripId]: [[név, lon, lat], …] }
  const catOf = (id) => CATS.find((c) => c.id === id) || { color: COL.primary, label: "" };

  // Tájékozódási feliratok: csak nevek — a geometriát a csempe adja (a vízrajz-réteg 2026-09-15-én kikerült: nem működött megbízhatóan)
  const RANGES = [ { n: "Magas-Tátra", ll: [20.1, 49.2], r: 34 }, { n: "Alpok", ll: [11.5, 47.0], r: 120 }, { n: "Júliai-Alpok", ll: [13.8, 46.4], r: 26 }, { n: "Bükk", ll: [20.5, 48.05], r: 16 }, { n: "Mátra", ll: [19.85, 47.85], r: 12, minK: 1.2 }, { n: "Alacsony-Tátra", ll: [19.6, 48.9], r: 22, below: true }, { n: "Kárpátok", ll: [24.5, 47.0], r: 90 }, { n: "Dolomitok", ll: [11.6, 46.55], r: 30, minK: 1.3 } ];
  const CITIES = [ { n: "Budapest", ll: [19.04, 47.5] }, { n: "Wien", ll: [16.37, 48.21] }, { n: "Praha", ll: [14.42, 50.09] }, { n: "Kraków", ll: [19.94, 50.06] }, { n: "Bratislava", ll: [17.11, 48.14] }, { n: "Ljubljana", ll: [14.51, 46.06] }, { n: "Zagreb", ll: [15.98, 45.81] }, { n: "München", ll: [11.58, 48.14] }, { n: "Berlin", ll: [13.4, 52.52] }, { n: "Beograd", ll: [20.46, 44.82] } ];
  const W = 4;
  const HORIZON = 52;
  // az idővonalon elfoglalt hely: a múltbeli (negatív hét) és a 52 héten túli túra a sáv szélére kerül
  const tw = (tr) => Math.max(0, Math.min(HORIZON, Number.isFinite(tr.week) ? tr.week : 0));

  // ── idő: a 0. hét napja az API-ból ───────────────────────────────────────
  const week0 = new Date(opts.week0 + "T12:00:00");
  const dateAt = (t) => { const d = new Date(week0); d.setDate(d.getDate() + Math.round(t * 7)); return d; };
  const weeksUntil = (month, day) => { // a következő ilyen naptári nap, hetekben week0-tól
    let d = new Date(week0.getFullYear(), month - 1, day, 12);
    if (d < week0) d = new Date(week0.getFullYear() + 1, month - 1, day, 12);
    return Math.max(0, Math.min(52, Math.round((d - week0) / 604800000)));
  };
  const monthFmt = new Intl.DateTimeFormat(intlLocale, { month: "short" });
  const dayFmt = new Intl.DateTimeFormat(intlLocale, { month: "long", day: "numeric" });
  const MONTHS = Array.from({ length: 12 }, (_, i) => { const d = new Date(week0.getFullYear(), week0.getMonth() + i, 1); return monthFmt.format(d).replace(".", ""); });
  function weekLabel(t) { return dayFmt.format(dateAt(t)); }
  function seasonKey(t) { const m = dateAt(t).getMonth() + 1; return m >= 9 && m <= 11 ? "autumn" : m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : "summer"; }
  function season(t) { return T[seasonKey(t)]; }
  const SEASONS = [
    { l: T.seasonNow[seasonKey(3)], t: 3 },
    { l: T.seasonWinter, t: weeksUntil(1, 15) },
    { l: T.seasonSpring, t: weeksUntil(4, 12) },
    { l: T.seasonSpringBreak, t: weeksUntil(4, 5) },
    { l: T.seasonSummer, t: weeksUntil(7, 18) },
  ];


  // kezdőnézet: a teljes bolygó (Norbert, 2026-09-15 — a közép-európai ráközelítés induláskor nem érthető)
  const WORLD_CENTER = [10, 30];
  // fit: amíg igaz, a nagyítás minden elrendezésnél a teljes gömbhöz igazodik (méretváltáskor is); nagyítás, túra-ráközelítés kikapcsolja
  const state = { t: 3, scale: 1, fit: true, active: Object.fromEntries(CATS.map((c) => [c.id, true])), selected: null, gyro: false };
  const app = root, svgEl = $("globe"), pinsEl = $("pins"), cardEl = $("card");
  const SVG_NS = "http://www.w3.org/2000/svg";
  let cardKey = "";
  // a kártya eseményei egyszer, delegálva kötődnek (a tartalom cserélhető alatta)
  cardEl.addEventListener("pointerdown", (e) => e.stopPropagation());
  cardEl.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  cardEl.addEventListener("click", (e) => {
    const trip = TRIPS.find((t) => t.id === state.selected); if (!trip) return;
    const target = e.target instanceof Element ? e.target : null; if (!target) return;
    if (target.closest("[data-close]")) { e.stopPropagation(); state.selected = null; render(); return; }
    if (target.closest("[data-fit]")) { e.stopPropagation(); frameRoute(trip); render(); return; }
    const open = target.closest("[data-open]");
    // módosító billentyűvel (új lap) a böngésző saját linkkezelése marad
    if (open && opts.onOpen && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) { e.preventDefault(); opts.onOpen(trip.slug); }
  });
  let width = 0, height = 0, R = 1, silR = 1, baseR = 1, floorR = 1, bottomReserve = 170, gcx = 0, gcy = 0;
  let chipRects = [];

  // ── földrajzi alapréteg (GeoJSON a GPU-nak) ──────────────────────────────
  const topo = await (await fetch(opts.atlasUrl)).json();
  const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
  const land = topojson.merge(topo, topo.objects.countries.geometries);
  const graticule = geoGraticule().step([5, 5])();
  const feature = (geometry) => ({ type: "Feature", properties: {}, geometry });

  // ── felszín: Web Mercator csempék, éjszakai tónussal ─────────────────────
  const MAX_TILE_Z = opts.tiles.maxZoom, MAX_VIEW_Z = MAX_TILE_Z + 1.5;
  let anyLoaded = false, earlyFails = 0, reliefFailShown = false, destroyed = false;
  tileSource = {
    url: opts.tiles.url,
    onLoaded() { if (!anyLoaded && !destroyed) { anyLoaded = true; if (map.getLayer("land")) map.setPaintProperty("land", "fill-color", "rgba(10,18,34,.14)"); render(); } },
    onFailed(z) { if (!anyLoaded && z <= 3 && ++earlyFails >= 3) reliefFail(); },
  };
  registerTileProtocol();
  function reliefFail() { if (reliefFailShown || destroyed) return; reliefFailShown = true; const el = document.createElement("div"); el.className = "mono tg-relief-fail"; el.setAttribute("role", "status"); el.textContent = T.reliefFail; app.appendChild(el); }

  const mapEl = $("map");
  const map = new maplibregl.Map({
    container: mapEl,
    style: {
      version: 8,
      projection: { type: "globe" },
      sources: {
        surface: { type: "raster", tiles: [TILE_PROTOCOL + "://{z}/{x}/{y}"], tileSize: 256, minzoom: 0, maxzoom: MAX_TILE_Z },
        land: { type: "geojson", data: feature(land) },
        borders: { type: "geojson", data: feature(borders) },
        graticule: { type: "geojson", data: feature(graticule) },
      },
      layers: [
        { id: "sphere", type: "background", paint: { "background-color": COL.sphere[1] } },
        { id: "surface", type: "raster", source: "surface", paint: { "raster-fade-duration": 200 } },
        { id: "graticule", type: "line", source: "graticule", paint: { "line-color": "rgba(255,255,255,.045)", "line-width": 1 } },
        { id: "land", type: "fill", source: "land", paint: { "fill-color": COL.land[0], "fill-antialias": false } },
        { id: "coast", type: "line", source: "land", paint: { "line-color": "rgba(203,213,225,.22)", "line-width": 0.8 } },
        { id: "borders", type: "line", source: "borders", paint: { "line-color": "rgba(148,163,184,.28)", "line-width": 0.7, "line-dasharray": [2, 3] } },
      ],
    },
    center: WORLD_CENTER, zoom: 1, bearing: 0, pitch: 0, maxPitch: 0,
    maxZoom: MAX_VIEW_Z,
    attributionControl: false, // az attribúció a gömb láblécében áll (szolgáltató + Natural Earth)
    dragRotate: false, pitchWithRotate: false, touchPitch: false, keyboard: false, doubleClickZoom: false, boxZoom: false,
    fadeDuration: 0,
  });
  map.touchZoomRotate.disableRotation();
  // a csempehibák (megszakított vagy újrapróba után is hibás csempe) nem konzolhibák; a felszín-hiba jelzését a protokoll adja
  map.on("error", (e) => { if (e && (e.sourceId === "surface" || e.tile || (e.error && e.error.name === "AbortError"))) return; console.warn("[terepgomb] map:", e && e.error ? e.error.message : e); });

  // ── SVG-réteg: gömbárnyék, perem, hegységek, városok, útvonal ────────────
  const svgNode = (tag, attrs, parent) => { const n = document.createElementNS(SVG_NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const defs = svgNode("defs", {}, svgEl);
  const shade = svgNode("radialGradient", { id: "tg-shade", cx: "50%", cy: "50%", r: "50%", fx: "37.5%", fy: "35%", fr: "10%" }, defs);
  svgNode("stop", { offset: "0%", "stop-color": "rgba(255,255,255,.06)" }, shade);
  svgNode("stop", { offset: "80%", "stop-color": "rgba(6,11,22,0)" }, shade);
  svgNode("stop", { offset: "100%", "stop-color": "rgba(6,11,22,.75)" }, shade);
  const sphereGrad = svgNode("radialGradient", { id: "tg-sph", cx: "42%", cy: "32%", r: "75%" }, defs);
  svgNode("stop", { offset: "0%", "stop-color": COL.sphere[0] }, sphereGrad);
  svgNode("stop", { offset: "70%", "stop-color": "rgba(0,0,0,0)" }, sphereGrad);
  const rim = svgNode("radialGradient", { id: "tg-rim", cx: "50%", cy: "50%", r: "50%" }, defs);
  svgNode("stop", { offset: "86%", "stop-color": "rgba(45,212,191,0)" }, rim);
  svgNode("stop", { offset: "100%", "stop-color": "rgba(45,212,191,.35)" }, rim);
  const glow = svgNode("filter", { id: "tg-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  svgNode("feGaussianBlur", { stdDeviation: 10 }, glow);
  const g = svgNode("g", {}, svgEl);
  const sphereLight = svgNode("circle", { fill: "url(#tg-sph)" }, g);
  const shadeC = svgNode("circle", { fill: "url(#tg-shade)" }, g);
  const rangesG = svgNode("g", {}, g), citiesG = svgNode("g", {}, g), routeG = svgNode("g", {}, g), labelsG = svgNode("g", {}, g);
  const rimC = svgNode("circle", { fill: "url(#tg-rim)" }, g);

  const projection = (ll) => { const p = map.project(ll); return [p.x, p.y]; };
  const centerLL = () => { const c = map.getCenter(); return [c.lng, c.lat]; };
  const occluded = (ll) => { const tr = map.transform; return typeof tr.isLocationOccluded === "function" ? tr.isLocationOccluded({ lng: ll[0], lat: ll[1] }) : geoDistance(ll, centerLL()) > Math.PI / 2; };
  function visible(ll) { return !occluded(ll) && geoDistance(ll, centerLL()) < Math.PI / 2 - 0.05; }

  // a gömb sugara pixelben (a MapLibre saját képlete: a nagyítás a középpont szélességén a síkvetítéssel egyező),
  // és a látszó körvonal (perspektivikus kamera: a középpontból a kamera c távolságra van)
  const globeRadius = (zoom, lat) => 512 * Math.pow(2, zoom) / (2 * Math.PI) / Math.cos(lat * Math.PI / 180);
  const cameraDist = () => { const c = map.transform.cameraToCenterDistance; return Number.isFinite(c) && c > 0 ? c : 1.5 * height; };
  const silhouette = (r, c) => c * r / Math.sqrt(c * c + 2 * c * r);
  /** A nagyítás, amelynél a gömb látszó körvonala `s` pixel sugarú (a teljes bolygó nézethez). */
  function zoomForSilhouette(s, lat) { const c = cameraDist(); const r = (s * s + s * Math.sqrt(s * s + c * c)) / c; return Math.log2(r * 2 * Math.PI * Math.cos(lat * Math.PI / 180) / 512); }
  function zoomForScale(scale, lat) { return Math.log2(baseR * scale * 2 * Math.PI * Math.cos(lat * Math.PI / 180) / 512); }

  let padTop = -1, adjusting = false;
  function layout() {
    width = app.clientWidth; height = app.clientHeight;
    // az alsó sáv (idő, évszakok, attribúció) valós magassága — szűk nézetben két-három sorra törik
    const bottomEl = app.querySelector(".tg-bottom"); bottomReserve = Math.max(170, bottomEl ? bottomEl.offsetHeight + 12 : 170);
    app.style.setProperty("--tg-bottom-h", (bottomEl ? bottomEl.offsetHeight : 150) + "px");
    svgEl.setAttribute("width", String(width)); svgEl.setAttribute("height", String(height));
    const canvas = map.getCanvas(); if (Math.abs(canvas.clientWidth - width) > 1 || Math.abs(canvas.clientHeight - height) > 1) map.resize();
    // a gömb középpontja a nézet 55%-án (mint korábban): felső kitöltés = 10% magasság
    const wantPad = Math.round(height * 0.1); if (wantPad !== padTop && !map.isMoving()) { padTop = wantPad; map.setPadding({ top: wantPad, bottom: 0, left: 0, right: 0 }); }
    // analitikus illesztés: a fő túra-bbox (lon 13–21 × lat 46–49.5 ≈ 8° × 4°) kitölti a biztonságos sávot; px/fok a középen ≈ R·π/180
    const rad = Math.PI / 180;
    baseR = Math.max(1, Math.min((width - 80) / (8 * rad * Math.cos(48 * rad)), (height - 340) / (4.5 * rad)));
    floorR = Math.max(1, Math.min(width - 40, height - 340) / 2);
    const lat = map.getCenter().lat, zoom = map.getZoom();
    const fitZoom = zoomForSilhouette(floorR, lat);
    // a teljes bolygónál kisebbre nem lehet kicsinyíteni (korábban: R ≥ floorR)
    if (!adjusting && Math.abs(map.getMinZoom() - fitZoom) > 0.01) { adjusting = true; map.setMinZoom(Math.max(-2, fitZoom - 0.001)); adjusting = false; }
    if (state.fit && !map.isMoving() && Math.abs(zoom - fitZoom) > 0.01) { adjusting = true; map.jumpTo({ zoom: fitZoom }); adjusting = false; }
    R = globeRadius(map.getZoom(), lat); silR = silhouette(R, cameraDist());
    state.scale = R / baseR;
    const cp = map.project(map.getCenter()); gcx = cp.x; gcy = cp.y;
  }

  // az SVG-elemek kulcs szerinti újrahasznosítása (kevés elem, képkockánként)
  function keyed(parent, items, key, create) {
    const have = new Map(); for (const n of [...parent.children]) have.set(n.dataset.k, n);
    const out = items.map((d) => { const k = key(d); let n = have.get(k); if (n) have.delete(k); else { n = create(d); n.dataset.k = k; } parent.appendChild(n); return [n, d]; });
    for (const n of have.values()) n.remove();
    return out;
  }

  function drawGeo() {
    const k = R / baseR;
    for (const c of [sphereLight, shadeC, rimC]) { c.setAttribute("cx", String(gcx)); c.setAttribute("cy", String(gcy)); c.setAttribute("r", String(silR)); }
    sphereLight.setAttribute("opacity", anyLoaded ? "0" : "1");
    const moving = interacting();
    keyed(rangesG, RANGES.filter((r) => visible(r.ll) && r.r * k < 1200), (d) => d.n, () => { const gg = document.createElementNS(SVG_NS, "g"); svgNode("circle", { class: "halo", filter: "url(#tg-glow)" }, gg); svgNode("circle", { class: "core", fill: "none", stroke: "rgba(251,191,36,.35)", "stroke-width": 1, "stroke-dasharray": "1 4" }, gg); return gg; })
      .forEach(([gg, d]) => { const [x, y] = projection(d.ll); const [halo, core] = gg.children;
        const showHalo = d.r * k < 260 && !moving; halo.setAttribute("display", showHalo ? "inline" : "none");
        if (showHalo) { halo.setAttribute("cx", x); halo.setAttribute("cy", y); halo.setAttribute("r", d.r * k); halo.setAttribute("fill", `rgba(251,191,36,${Math.min(.12, .08 * k)})`); }
        core.setAttribute("cx", x); core.setAttribute("cy", y); core.setAttribute("r", d.r * k * .45); });
    const inChip = (x, y) => chipRects.some((r) => x > r.l && x < r.r && y > r.t && y < r.b);
    keyed(citiesG, CITIES.filter((c) => { if (!visible(c.ll) || k <= 0.8) return false; const [x, y] = projection(c.ll); return y > 140 && y < height - bottomReserve && !inChip(x, y); }), (d) => d.n, (d) => { const gg = document.createElementNS(SVG_NS, "g"); svgNode("circle", { r: 1.8, fill: "rgba(203,213,225,.6)" }, gg); const tx = svgNode("text", { class: "city" }, gg); tx.textContent = d.n; return gg; })
      .forEach(([gg, d]) => { const [x, y] = projection(d.ll); gg.children[0].setAttribute("cx", x); gg.children[0].setAttribute("cy", y); gg.children[1].setAttribute("x", x + 5); gg.children[1].setAttribute("y", y + 3); });
    const labels = [...RANGES.filter((r) => !r.minK || k > r.minK).map((r) => ({ ...r, cls: "range", dy: r.below ? r.r * k * .5 + 12 : -r.r * k * .5 - 4 }))].filter((l) => visible(l.ll) && k > 0.6).filter((l) => { const [x, y] = projection(l.ll); const yy = y + l.dy; return yy > 140 && yy < height - bottomReserve && !inChip(x, yy); });
    labels.sort((a, b) => (b.r || 0) - (a.r || 0)); const kept = [];
    labels.forEach((l) => { const [x, y] = projection(l.ll); const yy = y + l.dy; if (!kept.some((o) => Math.abs(o.x - x) < (o.n.length + l.n.length) * 3.6 && Math.abs(o.yy - yy) < 14)) kept.push({ ...l, x, yy }); });
    keyed(labelsG, kept, (d) => d.n, (d) => { const tx = svgNode("text", { class: "geo-label " + d.cls, "text-anchor": "middle" }); tx.textContent = d.n; return tx; })
      .forEach(([tx, d]) => { tx.setAttribute("x", d.x); tx.setAttribute("y", d.yy); });
    drawRoute(k);
  }

  // ── útvonal: ráfordulás és ráközelítés úgy, hogy a nyomvonal a kártya mellett/fölött elférjen ──
  function frameRoute(tr) {
    const pts = ROUTES[tr.id];
    const cs = pts ? pts.map((p) => [p[1], p[2]]) : [tr.ll];
    const lons = cs.map((c) => c[0]), lats = cs.map((c) => c[1]);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    if (!(pts && pts.length > 1)) { map.easeTo({ center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2], duration }); return; }
    const narrow = width <= 720;
    // szabad terület: széles nézetben a kártya melletti sáv, szűkben a lap fölötti sáv — a kártya valós méretéből
    const hostR = app.getBoundingClientRect(), cr = cardEl.getBoundingClientRect();
    const sheetTop = cr.height ? cr.top - hostR.top : height - bottomReserve - Math.min(height * .45, Math.max(0, height - 340));
    const freeTop = 150;
    const box = narrow
      ? { top: freeTop, bottom: Math.max(freeTop + 90, sheetTop), left: 30, right: width - 30 }
      : { top: freeTop, bottom: Math.max(freeTop + 200, height - 170), left: 60, right: Math.max(300, width - 60 - 340) };
    // a nyomvonal a szabad terület ~62–70%-át töltse ki (mint korábban)
    const fill = narrow ? .70 : .62, bw = box.right - box.left, bh = box.bottom - box.top;
    const padding = { top: box.top + bh * (1 - fill) / 2, bottom: height - box.bottom + bh * (1 - fill) / 2, left: box.left + bw * (1 - fill) / 2, right: width - box.right + bw * (1 - fill) / 2 };
    padding.top -= padTop; // a térkép saját felső kitöltése már eltolja a középpontot
    const cam = map.cameraForBounds([[minLon, minLat], [maxLon, maxLat]], { padding, maxZoom: MAX_VIEW_Z });
    state.fit = false;
    if (cam) map.easeTo({ center: cam.center, zoom: cam.zoom, bearing: 0, duration });
  }

  function zoomToCluster(cl) {
    state.fit = false;
    const lat = cl.ll[1], want = Math.max(map.getZoom() + 1, zoomForScale(2, lat));
    map.easeTo({ center: cl.ll, zoom: Math.min(MAX_VIEW_Z, want), duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
  }

  function drawRoute(k) {
    const tr = TRIPS.find((t) => t.id === state.selected);
    const pts = tr && ROUTES[tr.id];
    if (!pts) { routeG.replaceChildren(); return; }
    const col = catOf(tr.cat).color;
    if (routeG.dataset.trip !== tr.id) {
      routeG.replaceChildren(); routeG.dataset.trip = tr.id;
      svgNode("path", { class: "halo", fill: "none", stroke: col, "stroke-opacity": .22, "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#tg-glow)" }, routeG);
      svgNode("path", { class: "core", fill: "none", stroke: col, "stroke-linecap": "round", "stroke-linejoin": "round" }, routeG);
      svgNode("g", { class: "stops" }, routeG);
    }
    const [haloP, coreP, stopsG] = routeG.children;
    // a vonal a horizontnál megszakad (a takart pontok között nincs szakasz)
    let d = "", pen = false;
    for (const p of pts) { const ll = [p[1], p[2]]; if (!visible(ll)) { pen = false; continue; } const [x, y] = projection(ll); d += (pen ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); pen = true; }
    haloP.setAttribute("d", d); coreP.setAttribute("d", d);
    haloP.setAttribute("stroke-width", Math.max(4, Math.min(14, 8 * k)));
    coreP.setAttribute("stroke-width", Math.max(1.6, Math.min(4.5, 2.6 * k)));
    // a szaggatás mérete felül korlátos: nagy nagyításnál különben egy-egy szakasz több száz pixel lenne, és a vonal „félbeszakadtnak” látszana
    coreP.setAttribute("stroke-dasharray", `${Math.min(22, Math.max(7, 11 * k))} ${Math.min(14, Math.max(5, 7 * k))}`);
    const seen = new Set();
    const all = pts.map((p, i) => ({ n: p[0], ll: [p[1], p[2]], i, last: i === pts.length - 1 }))
      .filter((s) => visible(s.ll)).map((s) => { const [x, y] = projection(s.ll); return { ...s, x, y }; });
    const extent = all.length > 1 ? Math.max(Math.max(...all.map((s) => s.x)) - Math.min(...all.map((s) => s.x)), Math.max(...all.map((s) => s.y)) - Math.min(...all.map((s) => s.y))) : 0;
    const stops = all.filter((s) => { if (seen.has(s.n)) return false; seen.add(s.n); return true; });
    // pont- és feliratméret az útvonal képernyőn elfoglalt méretéhez és a nézet méretéhez igazítva
    const vmin = Math.min(width, height), spread = stops.length > 1 ? extent / Math.max(1, stops.length - 1) : extent;
    const rBase = Math.max(2.2, Math.min(7, Math.min(spread * .22, vmin * .012, 3 + 4 * k)));
    const fs = Math.max(9, Math.min(13, Math.min(spread * .34, vmin * .022)));
    const labelled = [];
    if (extent > 70 && spread > 22) stops.forEach((s) => { const half = s.n.length * fs * .3;
      if (!labelled.some((o) => Math.abs(o.x - s.x) < half + o.n.length * fs * .3 && Math.abs(o.y - s.y) < fs + 5)) labelled.push(s); });
    else if (stops.length) labelled.push(stops[0]);
    const lset = new Set(labelled.map((s) => s.i));
    keyed(stopsG, stops, (s) => String(s.i), () => { const gg = document.createElementNS(SVG_NS, "g"); svgNode("circle", { class: "ring", fill: "none" }, gg); svgNode("circle", { class: "dot" }, gg); svgNode("text", { class: "sl", "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "paint-order": "stroke" }, gg); return gg; })
      .forEach(([gg, s]) => {
        const first = s.i === 0, r = first || s.last ? rBase * 1.35 : rBase;
        const [ring, dot, text] = gg.children;
        ring.setAttribute("cx", s.x); ring.setAttribute("cy", s.y); ring.setAttribute("r", r + Math.max(2.5, rBase * .7)); ring.setAttribute("stroke", col); ring.setAttribute("stroke-opacity", first ? .85 : .4); ring.setAttribute("stroke-width", 1.2);
        dot.setAttribute("cx", s.x); dot.setAttribute("cy", s.y); dot.setAttribute("r", r); dot.setAttribute("fill", first ? col : COL.stopInk); dot.setAttribute("stroke", col); dot.setAttribute("stroke-width", 1.6);
        text.setAttribute("x", s.x); text.setAttribute("y", s.y - r - Math.max(6, fs * .62)); text.setAttribute("font-size", fs);
        text.setAttribute("fill", COL.label); text.setAttribute("stroke", "rgba(6,11,22,.85)"); text.setAttribute("stroke-width", Math.max(2.5, fs * .28));
        text.setAttribute("opacity", lset.has(s.i) ? 1 : 0); text.textContent = s.n;
      });
  }

  // csak http(s) kép-URL mehet a kártyába (a borítókép a túra adatából jön)
  const safeImage = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function cardMarkup(tr) {
    const c = catOf(tr.cat); const rt = ROUTES[tr.id];
    return `<div class="panel"><div class="scroll"><div class="tg-card-hero" style="background:repeating-linear-gradient(135deg,${c.color}55 0 12px,${c.color}33 12px 24px)">${safeImage(tr.image) ? `<img class="tg-card-img" src="${esc(tr.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
          <span class="tg-card-tag">${esc(c.label)} · ${esc(T.days.replace("{count}", String(tr.days)))}</span>
          <button type="button" data-close class="tg-card-close" aria-label="${esc(T.close)}">×</button></div>
          <div class="tg-card-title">${esc(tr.title)}</div>
          <div class="tg-card-meta">${esc(weekLabel(tr.week))} · ${esc(tr.place)}${tr.host ? " · " + esc(tr.host) : ""}${tr.past ? `<span class="tg-card-past">${esc(T.past)}</span>` : ""}${tr.approximate ? `<span class="tg-card-approx">${esc(T.approximate)}</span>` : ""}</div>${rt ? `<div class="tg-card-route"><span class="tg-card-route-line" style="background:${c.color}"></span><span class="tg-card-route-text">${esc(T.routePoints.replace("{count}", String(rt.length)))} · ${esc(rt[0][0])} → ${esc(rt[rt.length - 1][0])}</span><button type="button" data-fit class="tg-card-fit">${esc(T.fitRoute)}</button></div>` : ""}
          </div><div class="foot"><div class="tg-card-price-wrap"><div class="tg-card-price">${esc(tr.price)}</div><div class="tg-card-spots">${esc(T.spotsLeft.replace("{count}", String(tr.spots)))}</div></div>
          <a data-open href="/trips/${esc(tr.slug)}" class="tg-card-cta">${esc(T.details)}</a></div></div>`;
  }

  const pinBtn = (el, label, onClick, onDbl) => {
    el.setAttribute("role", "button"); el.setAttribute("tabindex", "0"); el.setAttribute("aria-label", label);
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
    if (onDbl) el.addEventListener("dblclick", (e) => { e.stopPropagation(); onDbl(); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } });
  };

  function drawPins() {
    const all = TRIPS.filter((tr) => state.active[tr.cat] && visible(tr.ll)).map((tr) => {
      const c = catOf(tr.cat), d = tr.past ? W + 1 + Math.max(0, state.t) : Math.abs(tw(tr) - state.t), near = d <= W, mid = d <= 12, sel = state.selected === tr.id;
      const [x, y] = projection(tr.ll);
      return { tr, c, x, y, near, mid, sel, opacity: sel || near ? 1 : mid ? .55 : .18, scale: sel ? 1.12 : near ? 1 : mid ? .82 : .66, stem: sel ? 54 : near ? 30 + tr.spots * 2 : mid ? 20 : 12, side: 0 };
    }).sort((a, b) => a.y - b.y);
    // klaszter: 70 px-en belüli zászlók egy chipbe olvadnak (3+), amíg nem közelítünk rá; a kiválasztott sosem
    const clusters = [], used = new Set();
    all.forEach((p) => { if (used.has(p) || p.sel) return; const grp = all.filter((q) => !used.has(q) && !q.sel && Math.hypot(q.x - p.x, q.y - p.y) < 70); if (grp.length >= 3 && state.scale < 1.8) { grp.forEach((q) => used.add(q)); clusters.push(grp); } });
    const vis = all.filter((p) => !used.has(p));
    for (let i = 0; i < vis.length; i++) for (let j = 0; j < i; j++) {
      const a = vis[i], b = vis[j]; if (!(a.mid && b.mid)) continue;
      if (Math.abs(a.x - b.x) < 220 && Math.abs(a.y - b.y) < 46) { if (!a.side) a.side = b.side === 1 ? -1 : 1; else if (a.stem < 90) a.stem = Math.min(90, a.stem + 44); }
    }
    vis.forEach((p) => { p.stem = Math.min(90, p.stem); const top = p.y - p.stem - 38; if (top < 140) p.stem = Math.max(12, p.y - 178); const edge = Math.min(300, width * .3); if (p.x < 40) p.hideLabel = true; else if (p.x < edge) p.side = 1; else if (p.x > width - edge) p.side = -1; p.hideLabel = p.hideLabel || p.y - p.stem - 38 > height - bottomReserve - 30 || p.y > height - bottomReserve || (state.scale < .45 && !p.near && !p.sel && geoDistance(p.tr.ll, centerLL()) < 0.35); });
    const clusterEls = clusters.map((grp) => {
      const cx = mean(grp, (q) => q.x), cy = mean(grp, (q) => q.y), near = grp.some((q) => q.near);
      const uniq = [...new Set(grp.map((q) => q.tr.place.split(",")[0]))]; const names = uniq.slice(0, 2).join(" · ") + (grp.length > 2 ? " · +" + (grp.length - 2) : "");
      const ll = [mean(grp, (q) => q.tr.ll[0]), mean(grp, (q) => q.tr.ll[1])];
      return { cx, cy, near, names, n: grp.length, ll, colors: grp.map((q) => q.c.color), stem: 40, side: 0 };
    });
    clusterEls.sort((a, b) => a.cy - b.cy);
    for (let i = 0; i < clusterEls.length; i++) for (let j = 0; j < i; j++) { const a = clusterEls[i], b = clusterEls[j]; if (Math.abs(a.cx - b.cx) < 320 && Math.abs(a.cy - b.cy) < 46 + Math.abs(a.stem - b.stem)) { if (!a.side) a.side = b.side === 1 ? -1 : 1; else a.stem += 44; } }
    const crect = (c) => { const w = 320, l = c.side === 1 ? c.cx - w * .08 : c.side === -1 ? c.cx - w * .92 : c.cx - w / 2, t = c.cy - c.stem - 38; return { l, r: l + w, t, b: t + 38 }; };
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < clusterEls.length; i++) for (let j = 0; j < i; j++) { const a = clusterEls[i], b = clusterEls[j], ra = crect(a), rb = crect(b); if (ra.l < rb.r && ra.r > rb.l && ra.t < rb.b && ra.b > rb.t) a.stem += 44; }
    // egyedi zászló és klaszterchip ne fedje egymást: a közeli (ablakon belüli) zászló feltolja a chipet, a halvány ponttá válik
    const prect = (p) => { const w = Math.min(width - 16, 60 + p.tr.title.length * 7.5), l = p.side === 1 ? p.x - w * .08 : p.side === -1 ? p.x - w * .92 : p.x - w / 2, t = p.y - p.stem - 38; return { l, r: l + w, t, b: t + 38 }; };
    const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    vis.forEach((p) => { if (p.hideLabel || p.sel) return; clusterEls.forEach((c) => { if (p.hideLabel || !hit(prect(p), crect(c))) return; if (p.near) c.stem += 44; else p.hideLabel = true; }); });
    // egymást fedő zászlófeliratok (főleg teljes bolygó nézetben és mobilon): fontossági sorrendben (kiválasztott → ablakon belüli → többi)
    // csak az első marad felirat, a többi pont lesz — a pont koppintásra ugyanúgy kiválaszt
    const keptRects = clusterEls.map(crect);
    [...vis].sort((a, b) => (b.sel - a.sel) || (b.near - a.near) || (b.mid - a.mid)).forEach((p) => {
      if (p.hideLabel) return; const r = prect(p);
      if (!p.sel && keptRects.some((k) => hit(r, k))) { p.hideLabel = true; return; }
      keptRects.push(r);
    });
    // a chipek alatt nincs földrajzi felirat
    chipRects = clusterEls.filter((c) => c.cy - c.stem - 40 <= height - bottomReserve - 30 && c.cy <= height - bottomReserve).map((c) => { const w = 282, l = c.side === 1 ? c.cx - w * .08 : c.side === -1 ? c.cx - w * .92 : c.cx - w / 2; return { l, r: l + w, t: c.cy - c.stem - 44, b: c.cy - c.stem + 4 }; });
    pinsEl.innerHTML = "";
    const select = (tr) => { state.selected = tr.id; state.t = tw(tr); render(); };
    vis.forEach((p) => {
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) return;
      if (p.hideLabel) {
        const d = document.createElement("div"); d.className = "tg-dotpin";
        d.style.cssText = `left:${p.x}px;top:${p.y}px;background:${p.c.color};box-shadow:0 0 10px ${p.c.color};opacity:${Math.max(.5, p.opacity)}`;
        d.title = p.tr.title;
        pinBtn(d, p.tr.title, () => select(p.tr), () => { select(p.tr); frameRoute(p.tr); render(); });
        pinsEl.appendChild(d); return;
      }
      const el = document.createElement("div");
      el.className = "pin" + (p.near ? " near" : "") + (p.sel ? " sel" : "");
      el.style.left = p.x + "px"; el.style.top = p.y + "px"; el.style.opacity = p.opacity; el.style.zIndex = p.sel ? 100 : p.near ? 50 : 10;
      const tx = p.side === 1 ? "-8%" : p.side === -1 ? "-92%" : "-50%"; el.style.transformOrigin = p.side === 1 ? "8% 100%" : p.side === -1 ? "92% 100%" : "50% 100%";
      el.style.transform = `translate(${tx},-100%) scale(${p.scale})`; el.dataset.s = String(p.scale); el.style.pointerEvents = p.mid || p.sel ? "auto" : "none";
      el.innerHTML = `<div class="stem" style="height:${p.stem}px;left:${p.side === 1 ? "8%" : p.side === -1 ? "92%" : "50%"};background:linear-gradient(180deg,${p.c.color},transparent)"></div>
        <div class="lbl${p.tr.approximate ? " approx" : ""}" style="margin-bottom:${p.stem}px;border-color:${p.sel || p.near ? p.c.color : "var(--dark-border)"}"><span class="dot" style="background:${p.c.color};box-shadow:0 0 10px ${p.c.color}"></span><b>${esc(p.tr.title)}</b><small class="mono" style="color:${p.near ? p.c.color : "var(--text-slate)"}">${esc(weekLabel(p.tr.week))}</small></div>`;
      const lbl = el.querySelector(".lbl");
      pinBtn(lbl, p.tr.title, () => { if (p.sel) { state.selected = null; render(); return; } select(p.tr); }, () => { select(p.tr); frameRoute(p.tr); render(); });
      if (p.sel) lbl.setAttribute("aria-pressed", "true");
      pinsEl.appendChild(el);
    });
    clusterEls.filter((cl) => cl.cy - cl.stem - 40 <= height - bottomReserve - 30 && cl.cy <= height - bottomReserve).forEach((cl) => {
      const el = document.createElement("div"); el.className = "pin" + (cl.near ? " near" : "");
      el.style.left = cl.cx + "px"; el.style.top = cl.cy + "px"; el.style.opacity = cl.near ? 1 : .6; el.style.zIndex = 60; el.style.pointerEvents = "auto";
      const ctx = cl.side === 1 ? "-8%" : cl.side === -1 ? "-92%" : "-50%"; el.style.transform = `translate(${ctx},-100%)`;
      const label = T.tripsCount.replace("{count}", String(cl.n));
      el.innerHTML = `<div class="stem" style="height:${cl.stem}px;left:${cl.side === 1 ? "8%" : cl.side === -1 ? "92%" : "50%"};background:linear-gradient(180deg,var(--dark-primary),transparent)"></div>
        <div class="lbl tg-cluster" style="margin-bottom:${cl.stem}px;border-color:var(--dark-primary)"><span class="tg-cluster-dots">${cl.colors.slice(0, 4).map((c) => `<span class="dot" style="background:${c}"></span>`).join("")}</span><b>${esc(label)}</b><small class="mono tg-cluster-names">${esc(cl.names)}</small><small class="mono tg-cluster-zoom">⤢</small></div>`;
      pinBtn(el.querySelector(".lbl"), `${label} — ${cl.names}`, () => zoomToCluster(cl));
      pinsEl.appendChild(el);
    });
    const host = app.getBoundingClientRect();
    // szűk nézetben a felirat nem lóghat ki a gömb keretéből: vízszintesen visszatoljuk (a zászló szára a helyén marad)
    pinsEl.querySelectorAll(".lbl").forEach((el) => {
      const r = el.getBoundingClientRect(), k = Number(el.parentElement?.dataset.s) || 1, pad = 8;
      const over = r.right - (host.right - pad), under = (host.left + pad) - r.left;
      const shift = under > 0 ? under : over > 0 ? -Math.min(over, r.left - (host.left + pad)) : 0;
      if (shift) el.style.transform = `translateX(${shift / k}px)`;
    });
    pinsEl.querySelectorAll(".lbl").forEach((el) => { const r = el.getBoundingClientRect(); chipRects.push({ l: r.left - host.left, r: r.right - host.left, t: r.top - host.top, b: r.bottom - host.top }); });
    // a kártya DOM-ja csak akkor épül újra, ha a kiválasztott túra változik — különben egy kattintás közbeni
    // újrarajzolás (görgetés/trackpad-tehetetlenség, méretváltás) kicserélné a gombot, és a „Részletek” elveszne
    const cardTrip = TRIPS.find((t) => t.id === state.selected) || null;
    const nextCardKey = cardTrip ? cardTrip.id : "";
    if (nextCardKey !== cardKey) {
      cardKey = nextCardKey;
      cardEl.className = cardTrip ? "on" : "";
      cardEl.innerHTML = cardTrip ? cardMarkup(cardTrip) : "";
      const img = cardEl.querySelector(".tg-card-img"); if (img) img.addEventListener("error", () => img.remove(), { once: true }); // hibás kép → marad a csíkos helyőrző
    }
    const inWin = TRIPS.filter((tr) => state.active[tr.cat] && !tr.past && Math.abs(tw(tr) - state.t) <= W); const hidden = inWin.filter((tr) => !visible(tr.ll)).length;
    $("nowsub").textContent = `${season(state.t)} · ${T.inWindow.replace("{count}", String(inWin.length))}` + (hidden ? ` · ${T.hiddenBehind.replace("{count}", String(hidden))}` : "");
  }

  // ── kategória-tokenek: húzd a gömbre (be) vagy le róla (ki); koppintás = kapcsol ──
  const tokEl = $("tokens"), hint = $("tokhint");
  const tokCount = (id) => TRIPS.filter((t) => t.cat === id).length;
  CATS.forEach((c) => {
    const el = document.createElement("div"); el.className = "tok"; el.setAttribute("role", "switch"); el.setAttribute("tabindex", "0"); el.setAttribute("aria-label", c.label);
    el.innerHTML = `<span class="d" style="background:${c.color};box-shadow:0 0 12px ${c.color}"></span>${esc(c.label)}<span class="mono tg-tok-count">${tokCount(c.id)}</span>`;
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation(); el.setPointerCapture(e.pointerId); const sx = e.clientX, sy = e.clientY;
      const mv = (ev) => { el.classList.add("drag"); el.style.transform = `translate(${ev.clientX - sx}px,${ev.clientY - sy}px) scale(1.08) rotate(-3deg)`; const on = ev.clientY > 160 && ev.clientY < height - 150; hint.textContent = on ? T.tokenDropOn : T.tokenDropOff; };
      const up = (ev) => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.classList.remove("drag"); el.style.transform = "";
        const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy); const on = ev.clientY > 160 && ev.clientY < height - 150;
        state.active[c.id] = dist < 6 ? !state.active[c.id] : on; hint.textContent = T.tokenHint; renderTokens(); drawPins(); renderTime(); };
      el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.active[c.id] = !state.active[c.id]; renderTokens(); drawPins(); renderTime(); } });
    el.dataset.id = c.id; tokEl.appendChild(el);
  });
  function renderTokens() { tokEl.querySelectorAll(".tok").forEach((el) => { const on = state.active[el.dataset.id]; el.classList.toggle("off", !on); el.setAttribute("aria-checked", on ? "true" : "false"); el.style.borderColor = on ? catOf(el.dataset.id).color + "AA" : ""; el.querySelector(".tg-tok-count").textContent = String(tokCount(el.dataset.id)); }); }

  // ── idővonal (52 hét) ────────────────────────────────────────────────────
  const track = $("track");
  MONTHS.forEach((m, i) => { const x = (i / 12 * 100) + "%"; const t = document.createElement("div"); t.className = "tick"; t.style.left = x; track.appendChild(t); const l = document.createElement("div"); l.className = "tickl mono" + (i % 2 ? " tg-tick-odd" : ""); l.style.left = x; l.textContent = m; track.appendChild(l); });
  let dots = [];
  function buildDots() {
    dots.forEach(({ d }) => d.remove());
    dots = TRIPS.map((tr) => { const d = document.createElement("div"); d.className = "tld"; d.style.left = (tw(tr) / 52 * 100) + "%"; d.style.width = Math.max(6, tr.days * 3) + "px"; d.style.background = catOf(tr.cat).color; track.insertBefore(d, win); return { d, tr }; });
  }
  const win = document.createElement("div"); win.id = "tg-win"; track.appendChild(win);
  const handle = document.createElement("div"); handle.id = "tg-handle"; track.appendChild(handle);
  buildDots();
  let scrubbing = false;
  const tFrom = (e) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(52, (e.clientX - r.left) / r.width * 52)); };
  track.addEventListener("pointerdown", (e) => { track.setPointerCapture(e.pointerId); scrubbing = true; state.t = tFrom(e); state.selected = null; render(); });
  track.addEventListener("pointermove", (e) => { if (scrubbing) { state.t = tFrom(e); render(); } });
  track.addEventListener("pointerup", () => { scrubbing = false; render(); }); track.addEventListener("pointercancel", () => scrubbing = false);
  track.addEventListener("keydown", (e) => { const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!step) return; e.preventDefault(); state.t = Math.max(0, Math.min(52, state.t + step)); state.selected = null; render(); });
  const seasonsEl = $("seasons");
  SEASONS.forEach((s) => { const el = document.createElement("button"); el.type = "button"; el.className = "chip"; el.textContent = s.l; el.addEventListener("click", () => { state.t = s.t; state.selected = null; render(); }); el.dataset.t = s.t; seasonsEl.appendChild(el); });
  function renderTime() {
    $("now").textContent = weekLabel(state.t);
    handle.style.left = (state.t / 52 * 100) + "%";
    track.setAttribute("aria-valuenow", String(Math.round(state.t))); track.setAttribute("aria-valuetext", weekLabel(state.t));
    const a = Math.max(0, state.t - W), b = Math.min(52, state.t + W); win.style.left = (a / 52 * 100) + "%"; win.style.width = ((b - a) / 52 * 100) + "%";
    dots.forEach(({ d, tr }) => d.style.opacity = state.active[tr.cat] ? (!tr.past && Math.abs(tw(tr) - state.t) <= W ? 1 : .45) : .12);
    seasonsEl.querySelectorAll(".chip").forEach((el) => { const on = Math.abs(state.t - +el.dataset.t) < 3; el.classList.toggle("on", on); el.setAttribute("aria-pressed", on ? "true" : "false"); });
  }

  // ── gesztusok: a forgatás, csippentés és görgetés a MapLibre-é ───────────
  let userMoving = false;
  map.on("movestart", (e) => { if (e.originalEvent) { userMoving = true; mapEl.classList.add("drag"); } });
  map.on("zoomstart", (e) => { if (e.originalEvent) state.fit = false; });
  map.on("moveend", () => { if (userMoving) { userMoving = false; mapEl.classList.remove("drag"); if (state.gyro) gyroBase = centerLL(); } render(); });
  map.on("move", () => { if (!adjusting) render(); });
  // üres gömbfelületre koppintás: a kiválasztás megszűnik (húzás után nincs click esemény)
  map.on("click", () => { if (state.selected) { state.selected = null; render(); } });
  // gyro (telefonon a készülék döntése) — a nézet a bekapcsoláskori középpont körül billen
  let gyroBase = null;
  const onOrient = (e) => { if (e.gamma == null || !gyroBase || userMoving) return; const dx = Math.max(-8, Math.min(8, e.gamma / 4)), dy = Math.max(-6, Math.min(6, (e.beta - 45) / 8)); map.jumpTo({ center: [gyroBase[0] - dx, Math.max(-85, Math.min(85, gyroBase[1] - dy))] }); };
  const gyroBtn = $("gyro");
  gyroBtn.addEventListener("click", async function () {
    if (state.gyro) { window.removeEventListener("deviceorientation", onOrient); state.gyro = false; if (gyroBase) map.jumpTo({ center: gyroBase }); gyroBase = null; this.classList.remove("on"); this.setAttribute("aria-pressed", "false"); render(); return; }
    try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() !== "granted") return; } } catch (_) {}
    gyroBase = centerLL(); window.addEventListener("deviceorientation", onOrient); state.gyro = true; this.classList.add("on"); this.setAttribute("aria-pressed", "true");
  });
  const worldView = () => { state.fit = true; map.jumpTo({ center: WORLD_CENTER, zoom: zoomForSilhouette(floorR, WORLD_CENTER[1]) }); if (state.gyro) gyroBase = centerLL(); };
  $("world").addEventListener("click", () => { state.selected = null; worldView(); render(); });
  $("reset").addEventListener("click", () => { state.selected = null; state.t = 3; worldView(); render(); }); // vissza a kezdőnézetre

  // Rajzolás képkockánként legfeljebb egyszer (requestAnimationFrame): a DOM/SVG réteg a térkép mozgását követi.
  let painted = false, rafId = 0;
  function interacting() { return scrubbing || map.isMoving(); }
  function renderNow() {
    rafId = 0; if (destroyed || app.clientWidth === 0 || app.clientHeight === 0) return; painted = true; layout();
    drawPins(); drawGeo(); renderTime();
  }
  function render() { if (destroyed || rafId) return; rafId = requestAnimationFrame(renderNow); }
  const onVisibility = () => { if (!document.hidden) render(); };
  window.addEventListener("resize", render);
  const ro = new ResizeObserver(() => render()); ro.observe(app);
  renderTokens();
  map.once("load", () => { const loadingEl = $("loading"); if (loadingEl) loadingEl.remove(); render(); });
  let tickTO = null; const tick = () => { if (!painted) { render(); tickTO = setTimeout(tick, 100); } }; tick();
  window.addEventListener("load", render); window.addEventListener("pageshow", render); document.addEventListener("visibilitychange", onVisibility);
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) render(); }); io.observe(app);
  // a kezdőnézet a konténer méretéből (a teljes bolygó)
  if (app.clientWidth && app.clientHeight) { layout(); worldView(); }

  return {
    /** A szűrt túrakészlet cseréje újramountolás nélkül (a Discover szűrői, nyelvváltás). */
    update({ trips, routes }) {
      TRIPS = trips.slice(); ROUTES = routes || {}; cardKey = "";
      if (state.selected && !TRIPS.some((t) => t.id === state.selected)) state.selected = null;
      buildDots(); renderTokens(); render();
    },
    frameTrip(id) { const tr = TRIPS.find((t) => t.id === id); if (!tr) return; state.selected = tr.id; state.t = tw(tr); frameRoute(tr); render(); },
    destroy() {
      destroyed = true; if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(tickTO);
      ro.disconnect(); io.disconnect();
      window.removeEventListener("resize", render); window.removeEventListener("load", render); window.removeEventListener("pageshow", render);
      window.removeEventListener("deviceorientation", onOrient); document.removeEventListener("visibilitychange", onVisibility);
      map.remove();
    },
  };
}
