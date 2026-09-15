// terepgomb.js — 3D földgömb túrakereső (vanilla, d3-geo + topojson + Web Mercator csempék).
//
// Forrás: handoff/globe/terepgomb.js (Claude Design, Terepgomb.html végleges állapota, 2026-09-14).
// Bekötéskor változott:
//   - nincs CDN: a world-atlas JSON és a csempe-URL az opts-ból jön (public/globe/, lib/globe-tiles.ts);
//   - a csempe-zoom a szolgáltató maxZoom-jára van vágva (GIBS: 8; EOX: 13);
//   - minden felirat az opts.t szótárból jön (i18n), a hónapnevek és a hétcímkék az opts.locale szerint;
//   - a hét számítása az API week0 napjától, nem beégetett dátumtól;
//   - az elemazonosítók `tg-` előtagot kaptak, a gyökér osztálya `.terepgomb` (nincs globális id-ütközés);
//   - update({ trips, routes }) a szűrt túrakészlet cseréjére újramountolás nélkül;
//   - a11y: a zászlók gombok (role, aria-label, billentyű), a kapcsolók aria-pressed-et kapnak;
//   - a destroy minden window/document figyelőt leszed.
// 2026-09-15 (S40):
//   - színek a globals.css tokenjeiből (PLAN-011), nincs hex a rendererben;
//   - a múltbeli és az 52 héten túli túrák az idővonal szélére kerülnek (tw), a kártya jelzi a lezajlottat;
//   - szűk nézet: a zászló- és klaszterfeliratok a gömb szélén belül maradnak, az alsó sáv valós magassága a határ.
//
// Használat:
//   const globe = await mountGlobe(rootEl, { trips, categories, routes, week0, tiles, atlasUrl, locale, t, onOpen });
//   globe.update({ trips, routes }); globe.destroy();
// - trips: [{ id, slug, cat, title, place, host, week, days, price, spots, diff, ll: [lon, lat], approximate, past, image }]
// - categories: [{ id, label, color }]
// - routes: { [tripId]: [[név, lon, lat], …] } — a napi program pontjai; üres objektum is mehet
// - week0: 'YYYY-MM-DD' — a 0. hét napja (az API adja)
// - tiles: { url(z, x, y), maxZoom }, atlasUrl: a countries-50m.json helye
// - t: feliratszótár (ld. GlobeDiscover.tsx), locale: 'hu' | 'en'
// - onOpen(slug): a "Részletek" gomb
import * as d3 from "d3";
import * as topojson from "topojson-client";

export async function mountGlobe(root, opts) {
  const $ = (id) => root.querySelector("#tg-" + id);
  const T = opts.t;
  const intlLocale = opts.locale === "en" ? "en-US" : "hu-HU";

  // színek a globals.css tokenjeiből — a gyökérelemen olvasva, így egy helyen állíthatók (PLAN-011)
  const rootStyle = getComputedStyle(root);
  const token = (name) => rootStyle.getPropertyValue(name).trim();
  const COL = {
    primary: token("--dark-primary"), label: token("--border-subtle"), stopInk: token("--globe-stop-ink"),
    sphere: [token("--globe-sphere-1"), token("--globe-sphere-2"), token("--globe-sphere-3")],
    land: [token("--globe-land-1"), token("--globe-land-2")],
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

  // kezdőnézet: a teljes bolygó (Norbert, 2026-09-15 — a közép-európai ráközelítés induláskor nem érthető);
  // a lépték a `layout()` után áll be, mert a teljes gömb mérete a konténerből jön (floorR / baseR)
  const WORLD_ROT = [-10, -30, 0];
  // fit: amíg igaz, a lépték minden elrendezésnél a teljes gömbhöz igazodik (méretváltáskor is); nagyítás, túra-ráközelítés kikapcsolja
  const state = { t: 3, rot: WORLD_ROT.slice(), scale: 1, fit: true, active: Object.fromEntries(CATS.map((c) => [c.id, true])), selected: null, gyro: false, dx: 0, dy: 0, dragging: false };
  const app = root, svg = d3.select($("globe")), pinsEl = $("pins"), cardEl = $("card");
  let cardKey = "";
  // a kártya eseményei egyszer, delegálva kötődnek (a tartalom cserélhető alatta)
  cardEl.addEventListener("pointerdown", (e) => e.stopPropagation());
  cardEl.addEventListener("click", (e) => {
    const trip = TRIPS.find((t) => t.id === state.selected); if (!trip) return;
    const target = e.target instanceof Element ? e.target : null; if (!target) return;
    if (target.closest("[data-close]")) { e.stopPropagation(); state.selected = null; render(); return; }
    if (target.closest("[data-fit]")) { e.stopPropagation(); frameRoute(trip); render(); return; }
    const open = target.closest("[data-open]");
    // módosító billentyűvel (új lap) a böngésző saját linkkezelése marad
    if (open && opts.onOpen && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) { e.preventDefault(); opts.onOpen(trip.slug); }
  });
  let width = 0, height = 0, R = 0, baseR = 1, floorR = 1, bottomReserve = 170;
  let chipRects = [];
  const projection = d3.geoOrthographic().clipAngle(90);
  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule().step([5, 5]);

  const topo = await (await fetch(opts.atlasUrl)).json();
  const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
  const land = topojson.merge(topo, topo.objects.countries.geometries);
  const loadingEl = $("loading"); if (loadingEl) loadingEl.remove();

  // ── felszín: Web Mercator csempék a gömbre vetítve ───────────────────────
  // Teljesítmény (S40 zoom-javítás, 2026-09-15):
  //  - a csempe pixeleit betöltéskor EGYSZER dekódoljuk (korábban minden képkockán drawImage + getImageData csempénként);
  //  - interakció (húzás, görgetés, csippentés, idő-húzás) közben durva mintavétel; a hiányzó csempe helyén a
  //    legközelebbi betöltött szülő csempe látszik, amíg a pontos meg nem jön;
  //  - legfeljebb TILE_CONCURRENCY kérés fut egyszerre, a sorban álló, már nem aktuális zoomszintű kérés kiesik;
  //    a hibás csempe visszalépéssel újrapróbálódik (korábban örökre lyuk maradt → „széttört” felszín);
  //  - a z2–z3 világcsempék induláskor betöltődnek, így mindig van mire visszaesni.
  const relief = { canvas: $("relief"), ctx: null, tiles: new Map(), fail: false, anyLoaded: false };
  relief.ctx = relief.canvas.getContext("2d");
  const TILE = 256, TILE_URL = opts.tiles.url, MAX_TILE_Z = opts.tiles.maxZoom, MIN_TILE_Z = 2;
  const TILE_CONCURRENCY = 8, TILE_RETRIES = 3, DECODED_CAP = 320;
  const tileCanvas = document.createElement("canvas"); tileCanvas.width = TILE; tileCanvas.height = TILE; const tileCtx = tileCanvas.getContext("2d", { willReadFrequently: true });
  let tileQueue = [], tileActive = 0, wantedZ = MIN_TILE_Z, destroyed = false, decodedCount = 0, useTick = 0;
  function tileKey(z, x, y) { return z + "/" + x + "/" + y; }
  function pumpTiles() {
    while (!destroyed && tileActive < TILE_CONCURRENCY && tileQueue.length) {
      const t = tileQueue.pop(); // a legfrissebb kérés előre
      if (t.z > MIN_TILE_Z + 1 && t.z !== wantedZ) { t.state = "idle"; continue; } // elavult zoomszint — kiesik, később újrakérhető
      tileActive++; t.state = "loading";
      const img = new Image(); img.crossOrigin = "anonymous"; img.decoding = "async";
      img.onload = () => {
        tileActive--;
        try { tileCtx.clearRect(0, 0, TILE, TILE); tileCtx.drawImage(img, 0, 0); t.data = tileCtx.getImageData(0, 0, TILE, TILE).data; t.state = "ok"; decodedCount++; relief.anyLoaded = true; }
        catch (_) { t.state = "failed"; }
        evictTiles(); scheduleRelief(); pumpTiles();
      };
      img.onerror = () => {
        tileActive--; t.tries++;
        if (t.tries < TILE_RETRIES) { t.state = "retry"; setTimeout(() => { if (!destroyed && t.state === "retry") { t.state = "queued"; tileQueue.push(t); pumpTiles(); } }, 800 * t.tries * t.tries); }
        else { t.state = "failed"; if (!relief.anyLoaded && !relief.fail && t.z <= MIN_TILE_Z + 1) { relief.fail = true; reliefFail(); } }
        pumpTiles();
      };
      img.src = TILE_URL(t.z, t.x, t.y);
    }
  }
  function evictTiles() {
    if (decodedCount <= DECODED_CAP) return;
    const olds = [...relief.tiles.values()].filter((t) => t.state === "ok" && t.z > MIN_TILE_Z + 1).sort((a, b) => a.used - b.used);
    for (const t of olds.slice(0, decodedCount - DECODED_CAP)) { t.data = null; t.state = "idle"; decodedCount--; }
  }
  /** A csempe pixelei, ha betöltött; `request` esetén a hiányzót sorba állítja. */
  function tilePixels(z, x, y, request) {
    const n = 1 << z; x = ((x % n) + n) % n; if (y < 0 || y >= n) return null;
    const k = tileKey(z, x, y); let t = relief.tiles.get(k);
    if (!t) { t = { z, x, y, state: "idle", tries: 0, data: null, used: 0 }; relief.tiles.set(k, t); }
    if (t.state === "ok") { t.used = useTick; return t.data; }
    if (request && t.state === "idle") { t.state = "queued"; tileQueue.push(t); }
    return null;
  }
  function reliefFail() { const el = document.createElement("div"); el.className = "mono tg-relief-fail"; el.setAttribute("role", "status"); el.textContent = T.reliefFail; app.appendChild(el); }
  const merc = { x: (lon, z) => (lon + 180) / 360 * (1 << z), y: (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * (1 << z); } };
  function zoomLevel() { const pxPerDeg = projection.scale() * Math.PI / 180; return Math.max(MIN_TILE_Z, Math.min(MAX_TILE_Z, Math.round(Math.log2(pxPerDeg * 360 / TILE) + 0.6))); }
  let reliefImage = null;
  function drawRelief(fast) {
    const cv = relief.canvas; if (cv.width !== width || cv.height !== height) { cv.width = width; cv.height = height; reliefImage = null; }
    const ctx = relief.ctx; ctx.clearRect(0, 0, width, height);
    if (relief.fail && !relief.anyLoaded) return;
    useTick++;
    const [cx, cy] = projection.translate(), r = projection.scale();
    // interakció közben is kérünk csempét a pillanatnyi zoomszintre, de a sor az elavult szinteket eldobja és
    // legfeljebb TILE_CONCURRENCY kérés fut — így nincs kérésvihar, és a felszín menet közben is élesedik
    const z = zoomLevel(), step = fast ? 3 : 2, request = true;
    if (request && z !== wantedZ) { wantedZ = z; tileQueue = tileQueue.filter((t) => { const keep = t.z <= MIN_TILE_Z + 1 || t.z === z; if (!keep) t.state = "idle"; return keep; }); }
    if (!reliefImage) reliefImage = ctx.createImageData(width, height);
    const out = reliefImage, od = out.data; od.fill(0);
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(width, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(height, Math.ceil(cy + r));
    // az ortografikus vetítés inverze kézzel (a d3 általános invert-lánca pixelenként drága; egyezése a d3-mal ellenőrizve, hiba < 1e-12°)
    const rot = projection.rotate(), dl = rot[0] * Math.PI / 180, dp = rot[1] * Math.PI / 180, cosP = Math.cos(dp), sinP = Math.sin(dp);
    const DEG = 180 / Math.PI, LAT_MAX = 85 * Math.PI / 180, TWO_PI = Math.PI * 2;
    let hitZ = -1, hitX = -1, hitY = -1, hitData = null; // az előző pixel célcsempéje és feloldása — a szomszédos pixelek jellemzően ugyanabba esnek
    for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
      const px = (x - cx) / r, py = (cy - y) / r, rho2 = px * px + py * py; if (rho2 > 1) continue;
      const Z = Math.sqrt(1 - rho2);
      const latR = Math.asin(py * cosP - Z * sinP); if (latR > LAT_MAX || latR < -LAT_MAX) continue;
      let lonR = Math.atan2(px, Z * cosP + py * sinP) - dl; lonR -= TWO_PI * Math.floor((lonR + Math.PI) / TWO_PI);
      const ll0 = lonR * DEG, ll1 = latR * DEG;
      let R0 = 0, G0 = 0, B0 = 0, got = false;
      // a kívánt zoomszint csempéje; ha még nincs, a legközelebbi betöltött szülő (a z2 mindig megvan)
      const mx0 = merc.x(ll0, z), my0 = merc.y(ll1, z), tx0 = Math.floor(mx0), ty0 = Math.floor(my0);
      // a célcsempe → a ténylegesen használt (betöltött) csempe feloldása csak csempeváltáskor
      if (tx0 !== hitX || ty0 !== hitY) {
        hitX = tx0; hitY = ty0; hitData = null; hitZ = -1;
        for (let tz = z; tz >= MIN_TILE_Z; tz--) {
          const f = 1 << (z - tz), d = tilePixels(tz, Math.floor(tx0 / f), Math.floor(ty0 / f), request && tz === z);
          if (d) { hitData = d; hitZ = tz; break; }
        }
      }
      if (hitData) {
        const f = 1 << (z - hitZ), mx = mx0 / f, my = my0 / f, tx = Math.floor(mx), ty = Math.floor(my);
        const px2 = Math.min(TILE - 1, Math.floor((mx - tx) * TILE)), py2 = Math.min(TILE - 1, Math.floor((my - ty) * TILE)); const i = (py2 * TILE + px2) * 4;
        R0 = hitData[i]; G0 = hitData[i + 1]; B0 = hitData[i + 2]; got = true;
      }
      if (!got) continue;
      const lum = R0 * .3 + G0 * .59 + B0 * .11;
      // éjszakai tónus: a műholdszínek hűvösítve, sötétítve
      const rr = 12 + R0 * .40 + lum * .04, gg = 22 + G0 * .46 + lum * .07, bb = 42 + B0 * .55 + lum * .10;
      const yEnd = Math.min(height, y + step), xEnd = Math.min(width, x + step);
      for (let pY = y; pY < yEnd; pY++) for (let pX = x; pX < xEnd; pX++) { const oi = (pY * width + pX) * 4; od[oi] = rr; od[oi + 1] = gg; od[oi + 2] = bb; od[oi + 3] = 255; }
    }
    ctx.putImageData(out, 0, 0);
    if (request) pumpTiles();
    const g2 = ctx.createRadialGradient(cx - r * .25, cy - r * .3, r * .2, cx, cy, r); g2.addColorStop(0, "rgba(255,255,255,.06)"); g2.addColorStop(.8, "rgba(6,11,22,0)"); g2.addColorStop(1, "rgba(6,11,22,.75)");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    if (relief.anyLoaded) { sphere.attr("fill", "rgba(0,0,0,0)"); landP.attr("fill", "rgba(10,18,34,.14)"); }
  }
  // világcsempék előre (z2: 16, z3: 64) — a visszaesés alapja
  for (let pz = MIN_TILE_Z; pz <= MIN_TILE_Z + 1; pz++) for (let px = 0; px < (1 << pz); px++) for (let py = 0; py < (1 << pz); py++) tilePixels(pz, px, py, true);
  pumpTiles();
  let reliefTO = null; function scheduleRelief() { if (reliefTO || interacting()) return; reliefTO = setTimeout(() => { reliefTO = null; if (!interacting()) render(); }, 80); }

  // ── SVG-váz ──────────────────────────────────────────────────────────────
  const defs = svg.append("defs");
  const sphereGrad = defs.append("radialGradient").attr("id", "tg-sph").attr("cx", "42%").attr("cy", "32%").attr("r", "75%");
  sphereGrad.append("stop").attr("offset", "0%").attr("stop-color", COL.sphere[0]);
  sphereGrad.append("stop").attr("offset", "70%").attr("stop-color", COL.sphere[1]);
  sphereGrad.append("stop").attr("offset", "100%").attr("stop-color", COL.sphere[2]);
  const landGrad = defs.append("radialGradient").attr("id", "tg-lnd").attr("cx", "42%").attr("cy", "32%").attr("r", "80%");
  landGrad.append("stop").attr("offset", "0%").attr("stop-color", COL.land[0]);
  landGrad.append("stop").attr("offset", "100%").attr("stop-color", COL.land[1]);
  const rim = defs.append("radialGradient").attr("id", "tg-rim").attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
  rim.append("stop").attr("offset", "86%").attr("stop-color", "rgba(45,212,191,0)");
  rim.append("stop").attr("offset", "100%").attr("stop-color", "rgba(45,212,191,.35)");
  const glow = defs.append("filter").attr("id", "tg-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", 10);
  const g = svg.append("g");
  const sphere = g.append("path").attr("fill", "url(#tg-sph)");
  const grat = g.append("path").attr("fill", "none").attr("stroke", "rgba(255,255,255,.045)").attr("stroke-width", 1);
  const landP = g.append("path").attr("fill", "url(#tg-lnd)").attr("stroke", "rgba(203,213,225,.22)").attr("stroke-width", .8);
  const rangesG = g.append("g");
  const bord = g.append("path").attr("fill", "none").attr("stroke", "rgba(148,163,184,.28)").attr("stroke-width", .7).attr("stroke-dasharray", "2 3");
  const citiesG = g.append("g"), routeG = g.append("g"), labelsG = g.append("g");
  const rimP = g.append("path").attr("fill", "url(#tg-rim)").attr("pointer-events", "none");

  function visible(ll) { return d3.geoDistance(ll, [-state.rot[0], -state.rot[1]]) < Math.PI / 2 - 0.05; }

  function layout() {
    width = app.clientWidth; height = app.clientHeight;
    // az alsó sáv (idő, évszakok, attribúció) valós magassága — szűk nézetben két-három sorra törik
    const bottomEl = app.querySelector(".tg-bottom"); bottomReserve = Math.max(170, bottomEl ? bottomEl.offsetHeight + 12 : 170);
    app.style.setProperty("--tg-bottom-h", (bottomEl ? bottomEl.offsetHeight : 150) + "px");
    svg.attr("width", width).attr("height", height);
    // analitikus illesztés: a fő túra-bbox (lon 13–21 × lat 46–49.5 ≈ 8° × 4°) kitölti a biztonságos sávot; px/fok a középen ≈ R·π/180
    const rad = Math.PI / 180;
    // alsó korlát: kis vagy még méretezetlen konténerben a sugár nem lehet negatív (negatív SVG r konzolhibát ad)
    baseR = Math.max(1, Math.min((width - 80) / (8 * rad * Math.cos(48 * rad)), (height - 340) / (4.5 * rad)));
    floorR = Math.max(1, Math.min(width - 40, height - 340) / 2);
    if (state.fit) state.scale = floorR / baseR;
    R = Math.max(baseR * state.scale, floorR);
    projection.scale(R).translate([width / 2, height * 0.55]).rotate([state.rot[0] + state.dx, state.rot[1] + state.dy, 0]);
    // az SVG-utak a képernyő szélére vágva: nagy nagyításnál a gömb, a szárazföld és a határok egyébként több tízezer
    // pixeles, képernyőn kívüli poligonok lennének, és a böngésző raszterizálása viszi el a képkockát (S40 zoom-javítás)
    projection.clipExtent([[-40, -40], [width + 40, height + 40]]);
  }

  function drawGeo() {
    const k = R / baseR;
    sphere.attr("d", path({ type: "Sphere" })); rimP.attr("d", path({ type: "Sphere" }));
    grat.attr("d", path(graticule())); landP.attr("d", path(land)); bord.attr("d", path(borders));
    rangesG.selectAll("circle.halo").data(RANGES.filter((r) => visible(r.ll) && r.r * k < 260 && !interacting())).join("circle").attr("class", "halo")
      .attr("cx", (d) => projection(d.ll)[0]).attr("cy", (d) => projection(d.ll)[1]).attr("r", (d) => d.r * k)
      .attr("fill", `rgba(251,191,36,${Math.min(.12, .08 * k)})`).attr("filter", "url(#tg-glow)");
    rangesG.selectAll("circle.core").data(RANGES.filter((r) => visible(r.ll) && r.r * k < 1200)).join("circle").attr("class", "core")
      .attr("cx", (d) => projection(d.ll)[0]).attr("cy", (d) => projection(d.ll)[1]).attr("r", (d) => d.r * k * .45)
      .attr("fill", "none").attr("stroke", "rgba(251,191,36,.35)").attr("stroke-width", 1).attr("stroke-dasharray", "1 4");
    const inChip = (x, y) => chipRects.some((r) => x > r.l && x < r.r && y > r.t && y < r.b);
    citiesG.selectAll("g").data(CITIES.filter((c) => { if (!visible(c.ll) || k <= 0.8) return false; const [x, y] = projection(c.ll); return y > 140 && y < height - bottomReserve && !inChip(x, y); })).join((enter) => { const gg = enter.append("g"); gg.append("circle"); gg.append("text"); return gg; })
      .each(function (d) { const [x, y] = projection(d.ll); const gg = d3.select(this); gg.select("circle").attr("cx", x).attr("cy", y).attr("r", 1.8).attr("fill", "rgba(203,213,225,.6)"); gg.select("text").attr("class", "city").attr("x", x + 5).attr("y", y + 3).text(d.n); });
    const labels = [...RANGES.filter((r) => !r.minK || k > r.minK).map((r) => ({ ...r, cls: "range", dy: r.below ? r.r * k * .5 + 12 : -r.r * k * .5 - 4 }))].filter((l) => visible(l.ll) && k > 0.6).filter((l) => { const [x, y] = projection(l.ll); const yy = y + l.dy; return yy > 140 && yy < height - bottomReserve && !inChip(x, yy); });
    labels.sort((a, b) => (b.r || 0) - (a.r || 0)); const kept = [];
    labels.forEach((l) => { const [x, y] = projection(l.ll); const yy = y + l.dy; if (!kept.some((o) => Math.abs(o.x - x) < (o.n.length + l.n.length) * 3.6 && Math.abs(o.yy - yy) < 14)) kept.push({ ...l, x, yy }); });
    labelsG.selectAll("text").data(kept, (d) => d.n).join("text").attr("class", (d) => "geo-label " + d.cls).attr("text-anchor", "middle")
      .attr("x", (d) => projection(d.ll)[0]).attr("y", (d) => projection(d.ll)[1] + d.dy).text((d) => d.n);
    drawRoute(k);
  }

  // ── útvonal: ráfordulás és ráközelítés úgy, hogy a nyomvonal a kártya mellett/fölött elférjen ──
  function frameRoute(tr) {
    const pts = ROUTES[tr.id];
    const cs = pts ? pts.map((p) => [p[1], p[2]]) : [tr.ll];
    const lons = cs.map((c) => c[0]), lats = cs.map((c) => c[1]);
    state.rot = [-(Math.min(...lons) + Math.max(...lons)) / 2, -(Math.min(...lats) + Math.max(...lats)) / 2, 0];
    if (pts && pts.length > 1) {
      const clat2 = (Math.min(...lats) + Math.max(...lats)) / 2;
      const spanX = (Math.max(...lons) - Math.min(...lons)) * Math.cos(clat2 * Math.PI / 180), spanY = Math.max(...lats) - Math.min(...lats);
      const narrow = width <= 720;
      // szabad terület: széles nézetben a kártya melletti sáv, szűkben a lap fölötti sáv — a kártya valós méretéből
      const hostR = app.getBoundingClientRect(), cr = cardEl.getBoundingClientRect();
      const sheetTop = cr.height ? cr.top - hostR.top : height - bottomReserve - Math.min(height * .45, Math.max(0, height - 340));
      const freeTop = 150;
      const availX = narrow ? Math.max(200, width - 60) : Math.max(240, width - 120 - 340);
      const availY = narrow ? Math.max(90, sheetTop - freeTop) : Math.max(200, height - 320);
      const spanDeg = Math.max(spanX / Math.max(.2, availX / availY), spanY, 0.05);
      const want = availY * (narrow ? .70 : .62);
      state.fit = false; state.scale = Math.max(.12, Math.min(80, (want / (spanDeg * Math.PI / 180)) / baseR));
      const Rn = Math.max(baseR * state.scale, floorR);
      const clon2 = (Math.min(...lons) + Math.max(...lons)) / 2;
      if (narrow) {
        const dLat = ((height * 0.55) - (freeTop + sheetTop) / 2) / Rn * 180 / Math.PI;
        state.rot = [-clon2, -(clat2 - dLat), 0];
      } else {
        const dLon = (170 / Rn) * 180 / Math.PI / Math.max(.2, Math.cos(clat2 * Math.PI / 180));
        state.rot = [-(clon2 + dLon), -clat2, 0];
      }
    }
  }

  function drawRoute(k) {
    const tr = TRIPS.find((t) => t.id === state.selected);
    const pts = tr && ROUTES[tr.id];
    if (!pts) { routeG.selectAll("*").remove(); return; }
    const col = catOf(tr.cat).color;
    const line = { type: "LineString", coordinates: pts.map((p) => [p[1], p[2]]) };
    const sel = routeG.selectAll("g.route").data([tr.id]).join((enter) => {
      const gg = enter.append("g").attr("class", "route");
      gg.append("path").attr("class", "halo"); gg.append("path").attr("class", "core"); gg.append("g").attr("class", "stops");
      return gg;
    });
    sel.select("path.halo").attr("d", path(line)).attr("fill", "none").attr("stroke", col).attr("stroke-opacity", .22)
      .attr("stroke-width", Math.max(4, Math.min(14, 8 * k))).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("filter", "url(#tg-glow)");
    sel.select("path.core").attr("d", path(line)).attr("fill", "none").attr("stroke", col)
      .attr("stroke-width", Math.max(1.6, Math.min(4.5, 2.6 * k))).attr("stroke-linecap", "round").attr("stroke-linejoin", "round")
      .attr("stroke-dasharray", `${Math.max(7, 11 * k)} ${Math.max(5, 7 * k)}`);
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
    sel.select("g.stops").selectAll("g.stop").data(stops, (d) => d.i).join((enter) => {
      const gg = enter.append("g").attr("class", "stop");
      gg.append("circle").attr("class", "ring"); gg.append("circle").attr("class", "dot"); gg.append("text").attr("class", "sl");
      return gg;
    }).each(function (d) {
      const gg = d3.select(this), first = d.i === 0;
      const r = first || d.last ? rBase * 1.35 : rBase;
      gg.select("circle.ring").attr("cx", d.x).attr("cy", d.y).attr("r", r + Math.max(2.5, rBase * .7)).attr("fill", "none").attr("stroke", col).attr("stroke-opacity", first ? .85 : .4).attr("stroke-width", 1.2);
      gg.select("circle.dot").attr("cx", d.x).attr("cy", d.y).attr("r", r).attr("fill", first ? col : COL.stopInk).attr("stroke", col).attr("stroke-width", 1.6);
      gg.select("text.sl").attr("x", d.x).attr("y", d.y - r - Math.max(6, fs * .62)).attr("text-anchor", "middle")
        .attr("font-family", "IBM Plex Mono, monospace").attr("font-size", fs)
        .attr("fill", COL.label).attr("stroke", "rgba(6,11,22,.85)").attr("stroke-width", Math.max(2.5, fs * .28)).attr("paint-order", "stroke")
        .attr("opacity", lset.has(d.i) ? 1 : 0).text(d.n);
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
    vis.forEach((p) => { p.stem = Math.min(90, p.stem); const top = p.y - p.stem - 38; if (top < 140) p.stem = Math.max(12, p.y - 178); const edge = Math.min(300, width * .3); if (p.x < 40) p.hideLabel = true; else if (p.x < edge) p.side = 1; else if (p.x > width - edge) p.side = -1; p.hideLabel = p.hideLabel || p.y - p.stem - 38 > height - bottomReserve - 30 || p.y > height - bottomReserve || (state.scale < .45 && !p.near && !p.sel && d3.geoDistance(p.tr.ll, [-state.rot[0], -state.rot[1]]) < 0.35); });
    const clusterEls = clusters.map((grp) => {
      const cx = d3.mean(grp, (q) => q.x), cy = d3.mean(grp, (q) => q.y), near = grp.some((q) => q.near);
      const uniq = [...new Set(grp.map((q) => q.tr.place.split(",")[0]))]; const names = uniq.slice(0, 2).join(" · ") + (grp.length > 2 ? " · +" + (grp.length - 2) : "");
      const ll = [d3.mean(grp, (q) => q.tr.ll[0]), d3.mean(grp, (q) => q.tr.ll[1])];
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
      pinBtn(el.querySelector(".lbl"), `${label} — ${cl.names}`, () => { state.rot = [-cl.ll[0], -cl.ll[1], 0]; state.fit = false; state.scale = Math.max(state.scale * 2, 2); render(); });
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

  // ── gesztusok: forgatás / csippentés / görgetés ──────────────────────────
  const ptrs = new Map(); let pan = null, pinch = null;
  const globeEl = $("globe");
  globeEl.addEventListener("pointerdown", (e) => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); globeEl.setPointerCapture(e.pointerId); globeEl.classList.add("drag"); state.dragging = true;
    if (ptrs.size === 1) pan = { x: e.clientX, y: e.clientY, rot: [...state.rot], moved: false };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: state.scale }; } });
  globeEl.addEventListener("pointermove", (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; markZooming(); state.fit = false; state.scale = Math.max(.12, Math.min(80, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); render(); }
    else if (ptrs.size === 1 && pan) { const k = 90 / R; const dx = e.clientX - pan.x, dy = e.clientY - pan.y; if (Math.hypot(dx, dy) > 4) pan.moved = true;
      state.rot = [pan.rot[0] + dx * k, Math.max(-85, Math.min(85, pan.rot[1] - dy * k)), 0]; render(); } });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) { if (pan && !pan.moved && state.selected) { state.selected = null; render(); } pan = null; state.dragging = false; globeEl.classList.remove("drag"); render(); } };
  globeEl.addEventListener("pointerup", up); globeEl.addEventListener("pointercancel", up);
  globeEl.addEventListener("wheel", (e) => { e.preventDefault(); markZooming(); state.fit = false; const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; state.scale = Math.max(.12, Math.min(80, state.scale * Math.exp(-Math.max(-120, Math.min(120, dy)) * 0.0016))); /* a görgetés mértékével arányos: trackpadon finom, egérgörgőn ~17%/kattanás */ render(); }, { passive: false });
  // gyro (telefonon a készülék döntése)
  const onOrient = (e) => { if (e.gamma == null) return; state.dx = Math.max(-8, Math.min(8, e.gamma / 4)); state.dy = Math.max(-6, Math.min(6, (e.beta - 45) / 8)); render(); };
  const gyroBtn = $("gyro");
  gyroBtn.addEventListener("click", async function () {
    if (state.gyro) { window.removeEventListener("deviceorientation", onOrient); state.gyro = false; state.dx = state.dy = 0; this.classList.remove("on"); this.setAttribute("aria-pressed", "false"); render(); return; }
    try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { if (await DeviceOrientationEvent.requestPermission() !== "granted") return; } } catch (_) {}
    window.addEventListener("deviceorientation", onOrient); state.gyro = true; this.classList.add("on"); this.setAttribute("aria-pressed", "true");
  });
  $("world").addEventListener("click", () => { state.rot = WORLD_ROT.slice(); state.selected = null; state.fit = true; render(); });
  $("reset").addEventListener("click", () => { state.rot = WORLD_ROT.slice(); state.fit = true; state.selected = null; state.t = 3; render(); }); // vissza a kezdőnézetre

  // Rajzolás képkockánként legfeljebb egyszer (requestAnimationFrame); interakció közben durva felszín,
  // megállás után 160 ms-mal éles felszín és csempekérés.
  let reliefTimer = null, painted = false, zooming = false, zoomTO = null, rafId = 0;
  function interacting() { return state.dragging || scrubbing || zooming; }
  function markZooming() { zooming = true; clearTimeout(zoomTO); zoomTO = setTimeout(() => { zooming = false; render(); }, 160); }
  function renderNow() {
    rafId = 0; if (destroyed || app.clientWidth === 0 || app.clientHeight === 0) return; painted = true; layout();
    const fast = interacting(); projection.precision(fast ? 2.5 : 0.7); drawRelief(fast);
    if (fast && !zooming) { clearTimeout(reliefTimer); reliefTimer = setTimeout(() => { if (!interacting()) render(); }, 160); }
    drawPins(); drawGeo(); renderTime();
  }
  function render() { if (destroyed || rafId) return; rafId = requestAnimationFrame(renderNow); }
  const onVisibility = () => { if (!document.hidden) render(); };
  window.addEventListener("resize", render);
  const ro = new ResizeObserver(() => render()); ro.observe(app);
  renderTokens();
  let tickTO = null; const tick = () => { if (!painted) { render(); tickTO = setTimeout(tick, 100); } }; tick();
  window.addEventListener("load", render); window.addEventListener("pageshow", render); document.addEventListener("visibilitychange", onVisibility);
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) render(); }); io.observe(app);

  return {
    /** A szűrt túrakészlet cseréje újramountolás nélkül (a Discover szűrői, nyelvváltás). */
    update({ trips, routes }) {
      TRIPS = trips.slice(); ROUTES = routes || {}; cardKey = "";
      if (state.selected && !TRIPS.some((t) => t.id === state.selected)) state.selected = null;
      buildDots(); renderTokens(); render();
    },
    frameTrip(id) { const tr = TRIPS.find((t) => t.id === id); if (!tr) return; state.selected = tr.id; state.t = tw(tr); frameRoute(tr); render(); },
    destroy() {
      destroyed = true; tileQueue = []; if (rafId) cancelAnimationFrame(rafId); clearTimeout(zoomTO);
      clearTimeout(tickTO); clearTimeout(reliefTimer); if (reliefTO) clearTimeout(reliefTO);
      ro.disconnect(); io.disconnect();
      window.removeEventListener("resize", render); window.removeEventListener("load", render); window.removeEventListener("pageshow", render);
      window.removeEventListener("deviceorientation", onOrient); document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
