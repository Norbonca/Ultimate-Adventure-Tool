#!/usr/bin/env node
/**
 * Seed Sample Data — local dev only.
 *
 * Létrehoz:
 *  - 10 mintafelhasználót (6 egyedi szervező + 4 túraszervező cég)
 *  - 48 minta cover képet (Picsum seed) a trip-covers bucketbe + ref_cover_images
 *  - 24 minta túrát (8 kategória × 3, vegyesen a szervezők között)
 *
 * Idempotens: ha már létezik, frissít/átugrik. Futtatás:
 *    node scripts/seed-sample-data.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ─── env ──────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!SUPABASE_URL.includes("localhost") && !SUPABASE_URL.includes("127.0.0.1")) {
  console.error("✗ Safety abort: .env.local SUPABASE_URL nem local (" + SUPABASE_URL + ")");
  console.error("  Ez a script csak local dev-re való.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── 10 felhasználó ──────────────────────────────────────────────────────────
const PASSWORD = "Mintauser123";
const USERS = [
  // 6 egyedi szervező
  {
    email: "peter.kovacs@sample.trevu.local",
    first_name: "Péter", last_name: "Kovács",
    display_name: "Péter Kovács",
    tier: "pro", verified: false, city: "Budapest", country: "HU",
    bio: "Tapasztalt hegyi vezető, 15 éve rovom a Kárpátok és az Alpok útjait. Kis csoportos hiking és mountain túrák.",
  },
  {
    email: "anna.nagy@sample.trevu.local",
    first_name: "Anna", last_name: "Nagy",
    display_name: "Anna Nagy",
    tier: "pro", verified: false, city: "Pécs", country: "HU",
    bio: "Kerékpáros és ultrafutó. Gravel túrák a Mecsekben, ultra futóversenyek edzőjeként is dolgozom.",
  },
  {
    email: "gabor.toth@sample.trevu.local",
    first_name: "Gábor", last_name: "Tóth",
    display_name: "Gábor Tóth",
    tier: "free", verified: false, city: "Szeged", country: "HU",
    bio: "Kajak-kenu oktató, Tisza és Maros folyó specialistája. Vizes kalandok minden szintre.",
  },
  {
    email: "eszter.szabo@sample.trevu.local",
    first_name: "Eszter", last_name: "Szabó",
    display_name: "Eszter Szabó",
    tier: "pro", verified: true, city: "Innsbruck", country: "AT",
    bio: "Osztrák Alpok specialista. Skitúra, freeride, nyáron hiking vezetés. IVBV-tag hegyi vezető.",
  },
  {
    email: "david.molnar@sample.trevu.local",
    first_name: "Dávid", last_name: "Molnár",
    display_name: "Dávid Molnár",
    tier: "pro", verified: true, city: "Budapest", country: "HU",
    bio: "Expedíciós mászó, magashegyi túrák a Himaláján, Andokban és a Tátrában. 8000+-es csúcsokon is jártam.",
  },
  {
    email: "reka.kiss@sample.trevu.local",
    first_name: "Réka", last_name: "Kiss",
    display_name: "Réka Kiss",
    tier: "free", verified: false, city: "Győr", country: "HU",
    bio: "Motoros és kartinges. Hungaroring trackday oktató, enduro túrák a Bakonyban.",
  },
  // 4 túraszervező cég
  {
    email: "info@alpinkaland.sample.trevu.local",
    first_name: "Alpin", last_name: "Kaland Kft.",
    display_name: "Alpin Kaland Kft.",
    tier: "business", verified: true, city: "Budapest", country: "HU",
    bio: "Alpin Kaland Kft. — 2003 óta szervezünk hegymászó, expedíciós és téli kalandtúrákat. IFMGA-tag vezetők, teljes biztosítás.",
  },
  {
    email: "info@vizipark.sample.trevu.local",
    first_name: "Vízipark", last_name: "Kalandok Zrt.",
    display_name: "Vízipark Kalandok Zrt.",
    tier: "business", verified: true, city: "Balatonfüred", country: "HU",
    bio: "Balaton és Adria vízisportok — SUP, windsurf, kajak, hajóvezetés. Családbarát programok és profi csapatoknak is.",
  },
  {
    email: "info@bikecentrum.sample.trevu.local",
    first_name: "BikeCentrum", last_name: "Magyarország",
    display_name: "BikeCentrum Magyarország",
    tier: "business", verified: true, city: "Budapest", country: "HU",
    bio: "Kerékpáros túrairoda — MTB, gravel és országúti túrák Magyarországon és a környező országokban. Teljes kerékpár flottával.",
  },
  {
    email: "info@adrenalinrush.sample.trevu.local",
    first_name: "AdrenalinRush", last_name: "Kft.",
    display_name: "AdrenalinRush Kft.",
    tier: "business", verified: true, city: "Mogyoród", country: "HU",
    bio: "Motoros és futó kalandprogramok — Hungaroring trackday, karting kupák, ultra-futó tábor. Élmény és adrenalin minden szinten.",
  },
];

async function seedUsers() {
  console.log("\n━━━ USERS ━━━");
  const results = [];
  for (const u of USERS) {
    // Check if exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", u.email)
      .maybeSingle();

    let userId;
    if (existing) {
      userId = existing.id;
      console.log(`  ○ ${u.email} — már létezik (${userId.slice(0, 8)})`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: u.display_name,
          first_name: u.first_name,
          last_name: u.last_name,
        },
      });
      if (error) {
        console.error(`  ✗ ${u.email}: ${error.message}`);
        continue;
      }
      userId = data.user.id;
      console.log(`  ✓ ${u.email} — új (${userId.slice(0, 8)})`);
    }

    // Update profile extras
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        display_name: u.display_name,
        first_name: u.first_name,
        last_name: u.last_name,
        bio: u.bio,
        location_city: u.city,
        country_code: u.country,
        subscription_tier: u.tier,
        verified_organizer: u.verified,
        preferred_language: "hu",
        preferred_currency: "EUR",
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (updateErr) {
      console.error(`    profile update err: ${updateErr.message}`);
    }

    results.push({ ...u, id: userId });
  }
  console.log(`  → ${results.length}/${USERS.length} user kész`);
  return results;
}

// ─── 48 cover kép (kategóriánként 6) ─────────────────────────────────────────
const CATEGORY_SLUG_BY_NAME = {
  Hiking: "hiking",
  Mountain: "mountain",
  "Water Sports": "water",
  Cycling: "cycling",
  Running: "running",
  "Winter Sports": "winter",
  Expedition: "expedition",
  Motorsport: "motorsport",
};

async function seedCoverImages(categories) {
  console.log("\n━━━ COVER IMAGES ━━━");
  const bucket = "trip-covers";
  const perCategory = 6;
  const out = {}; // category_id → [{url, id}]

  for (const cat of categories) {
    const slug = CATEGORY_SLUG_BY_NAME[cat.name] || cat.name.toLowerCase().replace(/\s+/g, "-");
    out[cat.id] = [];

    for (let n = 1; n <= perCategory; n++) {
      const seed = `trevu-sample-${slug}-${n}`;
      const filePath = `samples/${slug}/${seed}.jpg`;

      // Check if already in bucket (idempotens)
      const { data: existingUrl } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const publicUrl = existingUrl.publicUrl;

      // Check if ref_cover_images already has it
      const { data: existingRef } = await supabase
        .from("ref_cover_images")
        .select("id, url")
        .eq("url", publicUrl)
        .maybeSingle();

      if (existingRef) {
        console.log(`  ○ ${slug}/${n} — már létezik`);
        out[cat.id].push({ url: publicUrl, id: existingRef.id });
        continue;
      }

      // Download from Picsum
      const downloadUrl = `https://picsum.photos/seed/${seed}/1200/800`;
      let buffer;
      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buffer = Buffer.from(await res.arrayBuffer());
      } catch (e) {
        console.error(`  ✗ ${seed} letöltés: ${e.message}`);
        continue;
      }

      // Upload to storage
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (upErr) {
        console.error(`  ✗ ${seed} upload: ${upErr.message}`);
        continue;
      }

      // Insert ref_cover_images
      const { data: inserted, error: insErr } = await supabase
        .from("ref_cover_images")
        .insert({
          category_id: cat.id,
          url: publicUrl,
          alt_text: `${cat.name} sample ${n}`,
          alt_text_localized: { hu: `${cat.name} minta ${n}`, en: `${cat.name} sample ${n}` },
          source: "uploaded",
          source_id: seed,
          photographer: "Picsum Photos",
          photographer_url: "https://picsum.photos",
          license: "free",
          tags: [slug, "sample", "seed"],
          orientation: "landscape",
          is_active: true,
          is_featured: n === 1,
          sort_order: n,
        })
        .select("id")
        .single();

      if (insErr) {
        console.error(`  ✗ ${seed} ref insert: ${insErr.message}`);
        continue;
      }

      console.log(`  ✓ ${slug}/${n} — ${(buffer.length / 1024).toFixed(0)}KB`);
      out[cat.id].push({ url: publicUrl, id: inserted.id });
    }
  }

  const total = Object.values(out).reduce((s, a) => s + a.length, 0);
  console.log(`  → ${total} kép kész (${Object.keys(out).length} kategória)`);
  return out;
}

// ─── 24 minta túra ───────────────────────────────────────────────────────────
// Minden kategóriához 3 túra. Mező: cat (név), sub (sub_discipline név), organizer_email,
// title, slug, short_description, description, difficulty (1-5), start/end napok
// múlva (mától), location_city, location_country, max_participants, price_amount,
// price_currency, is_cost_sharing
const TRIPS = [
  // Hiking (Túrázás) — 3
  { cat: "Hiking", sub: "Day Hiking", organizer: "peter.kovacs@sample.trevu.local",
    title: "Börzsöny csúcshódítás — Csóványos", slug: "borzsony-csuchodite-csovanyos",
    short: "Egynapos túra a Börzsöny legmagasabb csúcsára, 938 méter.",
    desc: "Kényelmes tempóban indulunk Nagyirtáspusztáról, majd a Magas-Taxon keresztül érjük el a Csóványos csúcsot (938 m). Visszafelé a Nagy-Hideg-hegyen át, melegedő kunyhóval. Alap szintű túrafelszerelés elég, téli hónapokban hótalp/mászóvas javasolt. Csoport: max 10 fő. Étel-ital saját ellátás.",
    diff: 2, days_ahead: 14, duration: 1, city: "Kismaros", country: "HU", maxp: 10,
    price: 8500, cur: "HUF", sharing: true },
  { cat: "Hiking", sub: "Multi-day Trekking", organizer: "eszter.szabo@sample.trevu.local",
    title: "Mátra körtúra — 2 napos vándorlás", slug: "matra-kortura-2-napos",
    short: "Két napos gerinctúra a Mátra fő csúcsain, kunyhós szállással.",
    desc: "Első nap Galyatető → Kékestető (1014 m) → Ágasvár kunyhó (~20 km, +800 m). Második nap Ágasvár → Világos-hegy → Galya (~18 km). Félpanziós ellátás a kunyhóban. Hálózsák és derékaljra van szükség, további felszerelés lista email-ben. Csoport: max 8 fő.",
    diff: 3, days_ahead: 28, duration: 2, city: "Parádsasvár", country: "HU", maxp: 8,
    price: 32000, cur: "HUF", sharing: false },
  { cat: "Hiking", sub: "Via Ferrata", organizer: "info@alpinkaland.sample.trevu.local",
    title: "Balaton-felvidéki vulkánok — tanúhegy túra", slug: "balaton-felvideki-vulkanok-tanuhegy",
    short: "Badacsony, Szent György-hegy és Csobánc tanúhegyein át.",
    desc: "Vezetett túra a Balaton-felvidéki vulkanikus tanúhegyek közt. Meglátogatjuk a Badacsony basalt-orgonáit, felmászunk a Szent György-hegyre és a Csobáncra. Ebéd a Kisfaludy-háznál. Útközben geológus-idegenvezető magyarázattal.",
    diff: 2, days_ahead: 21, duration: 1, city: "Badacsonytomaj", country: "HU", maxp: 12,
    price: 12000, cur: "HUF", sharing: false },

  // Mountain (Hegymászás) — 3
  { cat: "Mountain", sub: "Mountaineering", organizer: "david.molnar@sample.trevu.local",
    title: "Magas-Tátra — Gerlachfalvi-csúcs (2655 m)", slug: "magas-tatra-gerlachfalvi-csucs",
    short: "Szlovákia legmagasabb csúcsa technikás útvonalon.",
    desc: "A Velický-hágón keresztül indulunk a csúcs felé, II-es fokozatú sziklás szakaszokkal. Kötél, hevederzet, sisak kötelező — az eszközöket bizotsítjuk. Alapmászás szint szükséges. Szállás Sliezsky dom menedékházban az indulás előtti éjszakán. Kötelező hegyi vezető + biztosítás.",
    diff: 5, days_ahead: 45, duration: 3, city: "Starý Smokovec", country: "SK", maxp: 4,
    price: 380, cur: "EUR", sharing: false },
  { cat: "Mountain", sub: "Alpine Climbing", organizer: "info@alpinkaland.sample.trevu.local",
    title: "Mont Blanc megmászás — 7 napos expedíció", slug: "mont-blanc-megmaszas-7-napos",
    short: "Normálúton a nyugati Alpok csúcsára (4810 m).",
    desc: "Akklimatizációs napok Chamonix-ban, utána a Goûter útvonalon megmásszuk a Mont Blanc-t. Kötelező: III-as sziklamászó alapszint, alpin tapasztalat, magashegyi EKG vizsgálat. Ár tartalma: IFMGA vezető, menedékházak, transzfer Genf-ből, biztosítás. Kizárja: repülőjegy, felszerelés bérlés.",
    diff: 5, days_ahead: 90, duration: 7, city: "Chamonix", country: "FR", maxp: 4,
    price: 2850, cur: "EUR", sharing: false },
  { cat: "Mountain", sub: "Via Ferrata", organizer: "peter.kovacs@sample.trevu.local",
    title: "Dolomitok — Via Ferrata kalandok 4 nap", slug: "dolomitok-via-ferrata-4-nap",
    short: "Három via ferrata útvonal a Dolomitokban, középhaladó szint.",
    desc: "Cortina d'Ampezzo-ból indulva 3 klasszikus ferratát járunk be: Tomaselli, Ivano Dibona, Averau. Szállás kényelmes rifugio-kban. Teljes via ferrata-szet (hevederzet, sisak, kantár) bérelhető. Szükséges: fizikai állóképesség, alap mászási tapasztalat.",
    diff: 4, days_ahead: 60, duration: 4, city: "Cortina d'Ampezzo", country: "IT", maxp: 6,
    price: 720, cur: "EUR", sharing: false },

  // Water Sports (Vízi sportok) — 3
  { cat: "Water Sports", sub: "Kayaking", organizer: "gabor.toth@sample.trevu.local",
    title: "Duna-kanyar kajak expedíció — 2 nap", slug: "duna-kanyar-kajak-expedicio-2-nap",
    short: "Nagymaros → Szentendre, sátras éjszakázással.",
    desc: "Kétnapos kajak túra a Duna-kanyarban. Első nap Nagymaros → Visegrád → Dömös (~22 km), éjszaka sátorban a Dunaparton. Második nap Dömös → Szentendre (~25 km). 1 fő kajakok, összes felszerelés biztosítva. Úszástudás szükséges.",
    diff: 2, days_ahead: 30, duration: 2, city: "Nagymaros", country: "HU", maxp: 8,
    price: 28000, cur: "HUF", sharing: false },
  { cat: "Water Sports", sub: "SUP", organizer: "info@vizipark.sample.trevu.local",
    title: "Tisza-tó SUP kaland — hétvége", slug: "tisza-to-sup-kaland-hetvege",
    short: "SUP oktatás + madárles a Tisza-tavi rezervátumban.",
    desc: "Péntek délutáni érkezés Tiszafüredre. Szombat: SUP alapoktatás + 10 km-es túra a tavon. Vasárnap: kora reggeli madárles SUP-ról a Hortobágyi Nemzeti Park szélén. Szállás: faházas kemping. Deszka, evező, mellény mind included.",
    diff: 1, days_ahead: 35, duration: 3, city: "Tiszafüred", country: "HU", maxp: 12,
    price: 42000, cur: "HUF", sharing: false },
  { cat: "Water Sports", sub: "Kitesurfing", organizer: "info@vizipark.sample.trevu.local",
    title: "Horvát tengerparti windsurf hét — Bol", slug: "horvat-tengerparti-windsurf-het-bol",
    short: "Heti windsurf + kitesurf tábor Brač szigeten.",
    desc: "7 napos windsurf tábor a híres Zlatni Rat strandnál (Bol, Brač). Reggeli elmélet, délelőtt oktatás a vízen, délután szabad szörfölés. Oktató csoportonként max 4 fő. Szállás apartman, reggeli. Kezdőknek és haladóknak egyaránt.",
    diff: 3, days_ahead: 120, duration: 7, city: "Bol", country: "HR", maxp: 10,
    price: 890, cur: "EUR", sharing: false },

  // Cycling (Kerékpározás) — 3
  { cat: "Cycling", sub: "Gravel / Adventure", organizer: "anna.nagy@sample.trevu.local",
    title: "Tokaj-hegyi borúti gravel — 2 napos", slug: "tokaj-hegyi-boruti-gravel-2-napos",
    short: "Gravel túra a Tokaji borvidéken, pincelátogatással.",
    desc: "Szombaton Tokaj → Mád → Tállya → Erdőbénye (~65 km, +800 m), pincelátogatás 2 helyen. Este szállás a Mádi Kúria panzióban. Vasárnap Erdőbénye → Tolcsva → Sárazsadány → Tokaj (~55 km). Saját gravel/MTB szükséges. Táskapakolás.",
    diff: 3, days_ahead: 40, duration: 2, city: "Tokaj", country: "HU", maxp: 8,
    price: 48000, cur: "HUF", sharing: false },
  { cat: "Cycling", sub: "Road Cycling", organizer: "info@bikecentrum.sample.trevu.local",
    title: "Balaton-kör 2 napos tempóban", slug: "balaton-kor-2-napos-tempoban",
    short: "Klasszikus Balaton-kör (200 km) két napra elosztva.",
    desc: "Péntek este briefing Balatonfüreden. Szombat: déli part (Siófok → Keszthely, ~95 km). Szállás Keszthelyen. Vasárnap: északi part (Keszthely → Balatonfüred, ~105 km). Tempó: 25-28 km/h átlag, tekerős bringával. Kísérőautó, szervíz, energiagél biztosítva.",
    diff: 4, days_ahead: 50, duration: 2, city: "Balatonfüred", country: "HU", maxp: 12,
    price: 52000, cur: "HUF", sharing: false },
  { cat: "Cycling", sub: "Mountain Biking (Enduro)", organizer: "info@bikecentrum.sample.trevu.local",
    title: "Alpok MTB gravity trip — Leogang/Saalbach", slug: "alpok-mtb-gravity-trip-leogang",
    short: "3 napos enduro MTB tábor az osztrák Alpokban.",
    desc: "Leogang és Saalbach-Hinterglemm bike parkok — liftes bike-os kirándulás kékek és pirosak szintjén. Haladók a fekete vonalakra is. MTB specifikus full-face sisak + protektor javasolt (bérlés lehetséges). Transzfer Budapestről, 3 éjszaka hotel, liftbérlet.",
    diff: 4, days_ahead: 75, duration: 3, city: "Leogang", country: "AT", maxp: 8,
    price: 560, cur: "EUR", sharing: false },

  // Running (Futás) — 3
  { cat: "Running", sub: "Trail Running", organizer: "reka.kiss@sample.trevu.local",
    title: "Budai hegyvidéki trail futás — félmaraton", slug: "budai-hegyvideki-trail-felmaraton",
    short: "21 km-es trail futás a Budai-hegységben.",
    desc: "Hűvösvölgy → Nagy-Hárs-hegy → János-hegy → Hárshegy → Hűvösvölgy (21 km, +700 m). Közepes tempó (6:30-7:30 min/km). Frissítőpont 2 helyen. Minden szinten futókat várunk, útvonal-ismertető a rajt előtt. GPX track előre megküldve.",
    diff: 3, days_ahead: 20, duration: 1, city: "Budapest", country: "HU", maxp: 20,
    price: 9500, cur: "HUF", sharing: false },
  { cat: "Running", sub: "Ultra Running", organizer: "anna.nagy@sample.trevu.local",
    title: "Bakony Ultra — 50 km", slug: "bakony-ultra-50-km",
    short: "Ultra-trail a Bakony sűrű erdeiben, 50 km.",
    desc: "Önellátó 50 km-es ultra Bakonybél → Zirc → Cuha-völgy → Bakonybél, +1800 m. 3 frissítőpont, rajthely és pálya-jelölés. Időkorlát: 9 óra. Kézi GPS javasolt (GPX megkapja). Csomagfelszerelés kötelező (head-light, fóliatakaró, telefon).",
    diff: 5, days_ahead: 55, duration: 1, city: "Bakonybél", country: "HU", maxp: 30,
    price: 18000, cur: "HUF", sharing: false },
  { cat: "Running", sub: "Road Running", organizer: "info@adrenalinrush.sample.trevu.local",
    title: "Adrenalin tábor — sprint és interval 3 nap", slug: "adrenalin-tabor-sprint-interval-3-nap",
    short: "Hétvégi speed-tábor futóknak, egyéni edzéstervvel.",
    desc: "Pénteki érkezés, laktat teszt. Szombat-vasárnap: reggel sprint/pálya edzés, délután regeneráció + elmélet (futóerő, táplálkozás, pihenés). Haladóknak és rekord-vadászoknak. Szállás kétágyas szobában, félpanziós ellátás.",
    diff: 4, days_ahead: 65, duration: 3, city: "Mogyoród", country: "HU", maxp: 15,
    price: 68000, cur: "HUF", sharing: false },

  // Winter Sports (Téli sportok) — 3
  { cat: "Winter Sports", sub: "Freeride Skiing", organizer: "eszter.szabo@sample.trevu.local",
    title: "Osztrák sípálya hét — Schladming", slug: "osztrak-sipalya-het-schladming",
    short: "7 napos síelés a Schladming-Dachstein régióban.",
    desc: "Hotel Schladming központjában, 5 perc sétára a sípályáktól. Szállás félpanzió, 6 napos sípass (Ski amadé, 760 km pálya). Transzfer Budapestről. Haladó és expert síelőknek. Freeride szakasz a Dachstein-gleccseren.",
    diff: 3, days_ahead: 200, duration: 7, city: "Schladming", country: "AT", maxp: 10,
    price: 890, cur: "EUR", sharing: false },
  { cat: "Winter Sports", sub: "Ski Touring", organizer: "info@alpinkaland.sample.trevu.local",
    title: "Magas-Tátra skitúra — 3 napos alpin túra", slug: "magas-tatra-skitura-3-napos",
    short: "Skitúra a szlovák Magas-Tátra backcountry útvonalain.",
    desc: "Helyi hegyi vezetővel 3 skitúra nap a Magas-Tátra kevésbé látogatott völgyeiben. Szállás Téry Chata menedékházban. Lavina-biztonsági briefing, beacon/sonde/ásó bérelhető. Alapos skitúra-tapasztalat szükséges, közepes + fölött.",
    diff: 4, days_ahead: 180, duration: 3, city: "Starý Smokovec", country: "SK", maxp: 6,
    price: 480, cur: "EUR", sharing: false },
  { cat: "Winter Sports", sub: "Backcountry Snowboarding", organizer: "eszter.szabo@sample.trevu.local",
    title: "Mátra snowboard weekend", slug: "matra-snowboard-weekend",
    short: "Hétvégi snowboard tábor a Mátrában, oktatással.",
    desc: "Két napos snowboard tábor a Kékesen. Kezdőknek alapoktatás, haladóknak carving és freestyle workshop. Szállás a Síház szálláshelyen félpanzióval, sípass, oktatás, lift és transzfer included.",
    diff: 2, days_ahead: 210, duration: 2, city: "Mátraháza", country: "HU", maxp: 12,
    price: 48000, cur: "HUF", sharing: false },

  // Expedition (Expedíció) — 3
  { cat: "Expedition", sub: "Wilderness Trekking", organizer: "david.molnar@sample.trevu.local",
    title: "Izlandi trekking — Landmannalaugar 4 nap", slug: "izlandi-trekking-landmannalaugar-4-nap",
    short: "Laugavegur ösvény — Izland legszebb trekking útja.",
    desc: "Landmannalaugar → Þórsmörk, 54 km 4 nap alatt. Kunyhós szállás, félpanzió. Átlagos napi szint: 13-16 km, +400 m. Időjárás kiszámíthatatlan, teljes felszerelés-lista email-ben. Repülőjegy nem tartalmazza.",
    diff: 4, days_ahead: 150, duration: 4, city: "Landmannalaugar", country: "IS", maxp: 8,
    price: 1280, cur: "EUR", sharing: false },
  { cat: "Expedition", sub: "Wilderness Trekking", organizer: "info@alpinkaland.sample.trevu.local",
    title: "Nepál — Annapurna Base Camp trek", slug: "nepal-annapurna-base-camp-trek",
    short: "14 napos klasszikus ABC trek (4130 m).",
    desc: "Pokhara-ból indulva 10 napos trek az Annapurna-szentélybe. Teaházas szállás, kiegészítő oxigén nem szükséges. Helyi sherpa vezetővel. Ár tartalma: minden szállás, félpanzió, helyi repülő, vezető. Nem tartalmazza: nemzetközi repülő, vízum, biztosítás.",
    diff: 4, days_ahead: 240, duration: 14, city: "Pokhara", country: "NP", maxp: 8,
    price: 1890, cur: "EUR", sharing: false },
  { cat: "Expedition", sub: "Wilderness Trekking", organizer: "david.molnar@sample.trevu.local",
    title: "Norvég fjordok expedíció — Preikestolen + Trolltunga", slug: "norveg-fjordok-preikestolen-trolltunga",
    short: "7 napos fjord-túra a két legikonikusabb szikla-kilátón.",
    desc: "Stavanger-ből Preikestolen (Prédikálószék) egynapos túra, majd Odda felé utazás. Onnan Trolltunga-ra 28 km-es, 10-12 órás túra. Ezen felül 2 fiord-túrát és egy gleccser-kirándulást is csinálunk. Alpesi tapasztalat szükséges.",
    diff: 4, days_ahead: 160, duration: 7, city: "Stavanger", country: "NO", maxp: 8,
    price: 1450, cur: "EUR", sharing: false },

  // Motorsport — 3
  { cat: "Motorsport", sub: "Rally", organizer: "reka.kiss@sample.trevu.local",
    title: "Hungaroring trackday — saját autóval", slug: "hungaroring-trackday-sajat-autoval",
    short: "Szabad pályanap a Hungaroringen, oktatóval.",
    desc: "Egész napos pályajárás saját autóval. 3 × 20 perces szesszió, pályaoktatóval kocsiban. Sisak, HANS, kétpontos öv kötelező (bérelhető). Autó technikai vizsga a rajt előtt. Ebéd, frissítő, pálya-video included.",
    diff: 3, days_ahead: 45, duration: 1, city: "Mogyoród", country: "HU", maxp: 15,
    price: 125000, cur: "HUF", sharing: false },
  { cat: "Motorsport", sub: "Quad / ATV", organizer: "info@adrenalinrush.sample.trevu.local",
    title: "Karting kupa — Budapest Ring 5 futam", slug: "karting-kupa-budapest-ring-5-futam",
    short: "Egész napos karting verseny, 5 futam, kupakiosztó.",
    desc: "Egész napos karting kupa a Budapest Ringen. Szabadedzés + időmérő + 3 futam + finálé. Dija: aranykupa + sportital csomag. 200cc-s Sodi kart-ok, teljes verseny-szervezés. 14 év fölött, alap vezetői tapasztalat.",
    diff: 2, days_ahead: 35, duration: 1, city: "Budapest", country: "HU", maxp: 20,
    price: 38000, cur: "HUF", sharing: false },
  { cat: "Motorsport", sub: "Enduro", organizer: "info@adrenalinrush.sample.trevu.local",
    title: "Alpesi enduro motortúra — 5 nap", slug: "alpesi-enduro-motortura-5-nap",
    short: "5 napos enduro túra az osztrák és olasz Alpokban.",
    desc: "Villach-ból indulva 5 napon át enduro útvonalakon keresztül az Alpokban. KTM EXC 350/450 motorok, teljes szerviz-kísérettel. Napi 120-180 km off-road szakasz. Haladó enduro tapasztalat kötelező. Szállás 4 csillagos panziókban, félpanzió.",
    diff: 5, days_ahead: 100, duration: 5, city: "Villach", country: "AT", maxp: 6,
    price: 1680, cur: "EUR", sharing: false },
];

async function seedTrips(categories, subDisciplines, users) {
  console.log("\n━━━ TRIPS ━━━");
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));
  const subByCatAndName = {};
  for (const s of subDisciplines) {
    const key = `${s.category_id}:${s.name}`;
    subByCatAndName[key] = s;
  }
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  // Cover pool per category: Unsplash / stock first (kategória-specifikus),
  // uploaded (Picsum) csak fallback — kevésbé tematikus, csak illusztráció.
  const coverImagesByCategory = {};
  for (const cat of categories) {
    const { data } = await supabase
      .from("ref_cover_images")
      .select("id, url, source, sort_order")
      .eq("category_id", cat.id)
      .eq("is_active", true);
    const rows = data || [];
    const priority = (s) => (s === "unsplash" ? 0 : s === "stock" ? 1 : s === "uploaded" ? 3 : 2);
    rows.sort(
      (a, b) =>
        priority(a.source) - priority(b.source) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    coverImagesByCategory[cat.id] = rows;
  }

  const perCatCounter = {}; // for rotating through cover images

  let ok = 0;
  for (const t of TRIPS) {
    const cat = catByName[t.cat];
    if (!cat) { console.error(`  ✗ ${t.slug}: missing category ${t.cat}`); continue; }
    const organizer = userByEmail[t.organizer];
    if (!organizer) { console.error(`  ✗ ${t.slug}: missing organizer ${t.organizer}`); continue; }
    const sub = subByCatAndName[`${cat.id}:${t.sub}`] || null;

    // Cover image: rotate within category's pool
    const pool = coverImagesByCategory[cat.id] || [];
    if (pool.length === 0) {
      console.error(`  ✗ ${t.slug}: no cover images for category`);
      continue;
    }
    const idx = (perCatCounter[cat.id] || 0) % pool.length;
    perCatCounter[cat.id] = (perCatCounter[cat.id] || 0) + 1;
    const cover = pool[idx];

    const today = new Date();
    const start = new Date(today.getTime() + t.days_ahead * 86400000);
    const end = new Date(start.getTime() + (t.duration - 1) * 86400000);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const publishedAt = new Date(today.getTime() - 2 * 86400000).toISOString();

    // Idempotens: slug-on keresünk
    const { data: existing } = await supabase
      .from("trips")
      .select("id")
      .eq("slug", t.slug)
      .maybeSingle();

    const payload = {
      organizer_id: organizer.id,
      category_id: cat.id,
      sub_discipline_id: sub?.id ?? null,
      title: t.title,
      slug: t.slug,
      short_description: t.short,
      description: t.desc,
      cover_image_url: cover.url,
      cover_image_source: "system",
      card_image_url: cover.url,
      card_image_source: "system",
      difficulty: t.diff,
      start_date: startDate,
      end_date: endDate,
      location_city: t.city,
      location_country: t.country,
      max_participants: t.maxp,
      min_participants: 2,
      price_amount: t.price,
      price_currency: t.cur,
      is_cost_sharing: t.sharing,
      // Business rule (lásd: 00_Rendszerszintu_Funkcionalis_Specifikacio.md, Jelentkezési logika):
      //   max_participants > 15 → auto-approval (require_approval=false)
      //   max_participants <= 15 → kézi jóváhagyás (true)
      require_approval: t.maxp <= 15,
      language: "hu",
      status: "published",
      visibility: "public",
      published_at: publishedAt,
    };

    if (existing) {
      const { error } = await supabase.from("trips").update(payload).eq("id", existing.id);
      if (error) { console.error(`  ✗ ${t.slug} update: ${error.message}`); continue; }
      console.log(`  ○ ${t.slug} — frissítve (${organizer.display_name})`);
    } else {
      const { error } = await supabase.from("trips").insert(payload);
      if (error) { console.error(`  ✗ ${t.slug} insert: ${error.message}`); continue; }
      console.log(`  ✓ ${t.slug} — új (${organizer.display_name})`);
    }
    ok++;
  }
  console.log(`  → ${ok}/${TRIPS.length} trip kész`);
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════╗");
  console.log("║  UAT Sample Data Seeder — LOCAL   ║");
  console.log("╚════════════════════════════════════╝");
  console.log(`  URL: ${SUPABASE_URL}`);

  // Kategóriák
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name")
    .order("display_order");
  if (catErr) throw catErr;
  console.log(`  Kategóriák: ${categories.length}`);

  // Sub-disciplines
  const { data: subDisciplines, error: subErr } = await supabase
    .from("sub_disciplines")
    .select("id, name, category_id");
  if (subErr) throw subErr;

  // 1. Users
  const users = await seedUsers();

  // 2. Cover images (Picsum illusztrációk Storage-ba) — 2× pool a trip-ekhez
  await seedCoverImages(categories);

  // 3. Trips (kategória-specifikus Unsplash cover preferenciával)
  await seedTrips(categories, subDisciplines, users);

  console.log("\n✅ Seed kész!");
}

main().catch((e) => {
  console.error("\n✗ Seed hiba:", e);
  process.exit(1);
});
