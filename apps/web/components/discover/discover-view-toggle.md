# Discover nézetváltó — szerződés

A Felfedezés oldal (`/`, `app/page.tsx`) két nézetben mutatja ugyanazt a
túrakészletet. Ez a fájl rögzíti, hogy a két nézet között mi a szerződés: ki
dönt, hol tárolódik a döntés, és mit garantálunk a felhasználónak.

**2026-09-15 — Brand Guide v2 „Éjszakai túra” (1b):** a kártyarács megszűnt, a lista
borítós sávokból áll (`components/discover/TripBand.tsx`), a váltó „Gömb nézet | Lista
nézet”; terv: `design/D02_Trip_Management.pen#H1rRQE` (1440), `#l87Il` (390). Az egész oldal
Night felület (`data-surface="night"`), az alsó CTA-sáv az egyetlen Day-régió.

## A két nézet

| Érték | Mit mutat | Komponens |
|---|---|---|
| `globe` | 3D földgömb a túrák helyszíneivel és útvonalával (Terepgömb) | `components/discover/GlobeDiscover.tsx` + `terepgomb.js` |
| `list` | Borítós sávok listája, lapozva (10-esével) | `app/discover-client.tsx` + `components/discover/TripBand.tsx` |

Az értékek forrása: `lib/discover-view.ts` (`DISCOVER_VIEWS`). Új nézet csak ott
vehető fel; a típus onnan származik, így a fordító kényszeríti ki a teljességet.

## Az alapértelmezés: `globe`

Cookie nélküli látogató a gömböt kapja. Indok: a Felfedezés a termék belépő
képernyője, és a gömb az egyetlen nézet, amely egy pillantásra megmutatja, hogy
a túrák földrajzilag hol vannak. A lista ugyanazt adja, amit minden
másik utazási oldal — a gömb az, ami miatt a látogató megjegyzi az oldalt.

A visszaváltás egy kattintás, és megjegyezzük: aki listát választ, annak
legközelebb lista jön.

## A cookie

| | |
|---|---|
| Név | `trevu-discover-view` |
| Érték | `globe` \| `list` (a korábbi `grid` a listára esik: `parseDiscoverView`) |
| Élettartam | 1 év (`DISCOVER_VIEW_COOKIE_MAX_AGE`) |
| Útvonal | `/` |
| SameSite | `Lax` |
| httpOnly | **nem** — a váltó a kliensen írja, a szerver csak olvassa |

Ismeretlen vagy hiányzó érték esetén az alapértelmezés lép életbe
(`parseDiscoverView()` őrzi; a régi `grid` a lista). A cookie tartalma megjelenítési preferencia, nem
jogosultság: nem döntünk belőle hozzáférésről, és nem tartalmaz személyes adatot.

## Felelősségek

**Szerver** (`app/page.tsx`): kiolvassa a cookie-t, és `initialView` propként
adja át. Ezért az első festés már a helyes nézettel érkezik — nincs villanás,
amikor a lista egy pillanatra megjelenik, majd gömbre vált.

**Kliens** (`app/discover-client.tsx`): a `changeView()` állítja az állapotot és
írja a cookie-t (`rememberDiscoverView`). A váltás nem tölti újra az oldalt és
nem navigál — a szűrők, a rendezés és a görgetés helyben marad.

**Szűrők:** a lista a hero pirula-keresőjét (hely és idő egy mezőben, `createTripSearch`), a kategória-pirulákat és a szűrőlapot (`components/ui/FilterSheet.tsx`; asztalin panel, mobilon alsó lap — terv `#W9Kgy`, `#RTE9l`) használja. A
gömb nézetben a hero és a szűrősáv el van rejtve (Claude Design handoff,
2026-09-14): a gömb a saját szűrőit adja — kategória-tokenek (húzás a gömbre
vagy le róla, koppintás = kapcsol) és az 52 hetes idővonal (évszak-chipek +
csúszka, ±4 hetes ablak). A gömb ezért nem kap `visibleTripIds` propot; a két
szűrőkészlet független, nézetváltáskor nem szinkronizálódik. Ez tudatos: a gömb
a felfedezés eszköze, a lista a pontos szűrésé.

## A gömb adatai

A gömb nem a kártyák adatait használja, hanem a `/api/v1/trips/globe` végpontot,
mert a kártyalekérdezés nem kéri le a koordinátákat. A szerződés:
`components/discover/terepgomb.d.ts` (`GlobePayload`); a tiszta segédfüggvények
(`weeksFrom`, `tripDays`, `buildRoute`) a `lib/globe-payload.ts`-ben vannak, és
a `test/unit/globe-payload.test.ts` fedi őket.

| Mező | Forrás | Mire kell |
|---|---|---|
| `markers[]` | `trips.location_lat/lng` (034), `profiles.display_name`, kategória | marker, kártya |
| `markers[].week`, `days` | `start_date`, `end_date` a `week0`-hoz képest | idővonal (52 hét), láthatósági ablak |
| `week0` | a szerver mai napja (`YYYY-MM-DD`) | a 0. hét kezdete |
| `routes` | `trip_itinerary_days.latitude/longitude` (035), napszám szerint — a koordinátákat a részletes túratervező trip timeline beállításában adja meg a felhasználó (M20, még nincs UI; ma tesztadat) | a kiválasztott túra útvonala (halo + vonal + állomások); csak ≥ 2 koordinátás nap esetén |
| `categories[]` | aktív kategóriák, lokalizált névvel és színnel | tokenek |

**Láthatóság — ugyanaz, mint a listáé.** A végpont pontosan azokat a túrákat adja,
amelyeket a lista mutat (`app/page.tsx` `fetchPublishedTrips`): `status = published`,
`visibility = public`, `show_on_landing = true`, nem törölt — és ezek közül azokat,
amelyeknek van koordinátája. Mock- vagy rögzített túralista a kliensben nincs;
a rendererben rögzítve csak a tájékozódási feliratok (városok, vizek, hegységek)
vannak. A `DISCOVER-VIEW-7` e2e teszt ellenőrzi, hogy minden marker kártyaként is
szerepel. Gömb nézetben a találatszám a szűretlen készletet mutatja, mert a gömb a
lista szűrőit nem használja.

**Múltbeli túrák.** A lista a lezajlott publikált túrát is mutatja, ezért a gömb is
megtartja: a `markers[].past` (utolsó nap < `week0`) jelöli, a renderer az
idővonal elejére teszi, halványan rajzolja, az ablak darabszámába nem számolja, a
kártya pedig kiírja: „Lezajlott túra”. Az 52 héten túli túra az idővonal végére
kerül (`timelineWeek`).

**Geokódolás mentéskor.** A varázsló és a szerkesztő ugyanazt a `saveDraft`
actiont hívja, amely a `lib/geocoding.ts`-en át geokódol (3 mp-es keret, sosem
blokkol): változatlan, már feloldott helyszínnél nincs hívás; változott helyszínnél
újra feloldja, és ha nem sikerül, az ország középpontjára teszi (`country_centroid`)
— a régi hely pontja sosem marad. A provider a `LOCATION_GEOCODER` környezeti
változóból jön (alap: `nominatim`), a teljes regiszter az M121 1b lépése. A
varázsló előnézete a Nominatim-szabályzat miatt csak a véglegesített helyszínre
kérdez (országváltás, mező elhagyása), gépelés közben nem.

A marker `geocodeSource` mezője hordozza, honnan van a koordináta:

- `nominatim` — a helyszínmezőkből feloldott, valódi hely;
- `country_centroid` — csak az ország közepe: a 034 migráció backfillje, a mentés tartaléka (`countryCentroid`), vagy országszintű Nominatim-találat. Ezek a
  markerek szaggatott zászlót kapnak, a kártya pedig kiírja, hogy hozzávetőleges.
  Egy országközéppontra ült túráról nem állítjuk, hogy ott van.

Egymáshoz közel eső túrák klaszterbe (pirulába) kerülnek — a pirula a darabszámot
és az első helyneveket mutatja, koppintásra ráközelít. A `routes` ma nincs
egyszerűsítve (a napi program legfeljebb néhány tucat pont); a
`lib/location/route.ts` szerződésre (Douglas–Peucker, ≤ 50 pont) az M121 1d
fázisában áll át.

## Amit garantálunk

1. Cookie nélkül a gömb jön.
2. A váltás azonnali, és a következő látogatásra is megmarad.
3. Újratöltés után a szerver rendereli a megjegyzett nézetet.
4. Hibás cookie-érték nem törhet el semmit — az alapértelmezésre esünk vissza.
5. A gömb sosem zsákutca: ha a renderer nem indul (nincs canvas, nem tölt le a
   határ-atlasz), olvasható hibaüzenet és a lista ajánlása jelenik meg, a
   markerek mögötti túrák pedig billentyűzetről és képernyőolvasóval a
   `.globe-fallback-list` listán keresztül elérhetők.

6. A gömb pontosan a lista túráit mutatja (láthatósági szerződés, fent).
7. **A 3D térképen a görgetés sosem viszi el az oldalt** (2026-09-19, Norbert). A keret
   (`.terepgomb`) nem passzív, capture fázisú görgetésfigyelője (`globe-wheel.ts`) minden
   görgetést elkap, a betöltés alatt is; a rétegek (zászló, klaszter, idősáv, gombok,
   attribúció) fölötti görgetést a MapLibre vásznára küldi, így az is nagyít. Kivétel a
   görgethető belső elem, amíg van hová görgetnie (a kártya szövege, a tokensor); a
   kártya nem nagyít. A befelé görgetés kikapcsolja a teljes bolygó illesztést — enélkül
   a görgős nagyítás a teljes bolygó nézetből visszaugrott (a MapLibre 5 görgős
   `zoomstart`-ja `originalEvent` nélkül jön).

8. **A 3D térkép kitölti a képernyőt, és az oldal nem görgethető alatta** (2026-09-26, Norbert).
   A keret magassága a saját helyéből jön (`--tg-frame-h`, a `GlobeDiscover` méri és méretváltáskor
   újraszámolja; tartalék: `calc(100dvh - 128px)`), így az idősáv, a tippsor és az attribúció soha nem
   csúszik a képernyő alá. Ebben a nézetben az alsó CTA-sáv nem jelenik meg — csempés és lista nézetben igen.

A felületen a nézet neve **3D térkép** (EN: 3D map); a kódbeli `globe` / `terepgomb` azonosítók maradnak.

Ezeket a garanciákat a `tests/e2e/discover-view.spec.ts` fedi (DISCOVER-VIEW-1…10; a 7. pontot a DISCOVER-VIEW-9, a 8-at a DISCOVER-VIEW-10 asztali és mobil mérete).

**Mobil (≤ 720 px):** a gömb a telefonon a lap szélétől szélig fut; a fejsor gombjai
és az évszak-chipek vízszintesen görgethetők, a tokensor a keretben görget, minden
második hónapfelirat rejtett, a gesztus-tipp elmarad; a zászló- és klaszterfeliratok
a keret szélén belül maradnak, egyedi zászló és klaszterchip nem fedi egymást, az
alsó lap az idősáv fölött áll meg (`--tg-bottom-h`). Színek: kizárólag `globals.css`
tokenek (PLAN-011).

## Teljesítmény

A `GlobeDiscover` dinamikus importtal töltődik, `ssr: false` mellett, és a
renderert (`terepgomb.js`, MapLibre GL JS + topojson) csak akkor tölti be, amikor a
gömb nézet aktív — a lista nézet nem fizet érte. A renderelés
eseményvezérelt: nincs animációs hurok; a gömb húzásra, görgetésre,
méretváltásra és a lap előtérbe kerülésekor rajzol újra, kigörgetve
(`IntersectionObserver`) és háttérben (`visibilitychange`) nem dolgozik.
Automatikus forgás nincs; a gyro (eszköz-tájolás) csak kérésre kapcsol be.

**Oldalháttér gömb nézetben** (Norbert, 2026-09-15): a Felfedezés oldal a gömb éjszakai hátterét veszi fel (`--globe-space-bottom`), a gömb a fejléc alatt szélétől szélig fut, lekerekítés és világos keret nélkül; a találatszám és a nézetváltó sötét változatot kap. Lista és lista nézetben az oldal világos marad.

**Kezdőnézet: a teljes bolygó** (Norbert, 2026-09-15): a gömb a teljes földgolyóval indul (Európa–Afrika középpel), mert a közép-európai ráközelítés induláskor nem érthető. A „Teljes bolygó” és a „Nézet vissza” gomb is ide tér vissza; a „Nézet vissza” a kiválasztást és az idővonalat is alaphelyzetbe teszi.

**Motor: MapLibre GL JS 5, gömbvetítés (2026-09-15, Norbert: „az engine változik, a design nem”).** A felszínt (csempék), a szárazföldet, a partvonalat, a határokat és a fokhálózatot a GPU rajzolja; a csempék éjszakai tónusa csempénként egyszer, betöltéskor készül (`addProtocol`). Fölötte változatlan DOM/SVG-réteg: zászlók, klaszterek, kártya, tokenek, idővonal, hegység- és városfeliratok, útvonal és a gömb árnyéka/pereme; ezek a `map.project` szerint követik a gömböt. A forgatás, a csippentés és a görgetés a MapLibre kezelőié (forgatás a függőleges tengely körül és döntés kikapcsolva). A korábbi CPU-s renderer (pixelenkénti inverz vetítés) alább, történeti leírásként.

A felszín Web Mercator csempékből épül (`lib/globe-tiles.ts`,
`NEXT_PUBLIC_GLOBE_TILES=eox|gibs`; alap: **EOX Sentinel-2 cloudless**, max.
z13 — ráközelítve élesedik; Norbert döntése 2026-09-14, NyK-13; pontosítva
2026-09-15: az oldal jelenlegi állapotában nem kereskedelmi, ezért az EOX a
CC-BY-NC-SA 4.0 feltételeivel, attribúcióval élesben is használható — a
kereskedelmi licenc akkor kell, amikor az oldal kereskedelmi működésre vált). Tartalék a NASA GIBS Blue Marble (kulcs és licenc nélkül, max. z8,
ráközelítve elmosódik). A csempéket a böngésző gyorsítótárazza. **Zoom-teljesítmény (2026-09-15):** a csempe pixelei betöltéskor egyszer dekódolódnak; legfeljebb 8 csempekérés fut egyszerre, az elavult zoomszint kérése kiesik, a hibás csempe újrapróbálódik (korábban lyuk maradt); a z2–z3 világcsempék előre töltődnek, a hiányzó csempe helyén a szülő csempe látszik; a rajzolás `requestAnimationFrame`-mel képkockánként egyszer fut, interakció közben durvább mintavétellel; az ortografikus inverz vetítés kézzel számolódik; az SVG-utak a képernyő szélére vágódnak (`clipExtent`) — nagy nagyításnál ez vitte el a képkockát; a görgetés a görgetés mértékével arányosan nagyít. Mérés (1440×900, 60 görgetési lépés): hosszú feladatok 71 db / 8,2 s → 0. Az országhatárok a `public/globe/countries-50m.json`
(world-atlas 1:50M) fájlból jönnek. Nyelvváltáskor a gömb újramountol, mert a
markup fordított szövegeket hordoz; a csempék a cache-ből jönnek.

---

*Frissítve: 2026-09-15 (S41) — Brand Guide v2: rács helyett sávos lista, Night felület, pirula-kereső, szűrőlap. Korábban: 2026-09-15 (S40) — láthatósági egyezés a ráccsal, múltbeli túrák,
geokódolás szerkesztéskor és országközéppont-tartalékkal, mobil 390 px, tokenek.
Korábban: 2026-09-14 (S39b) — a Claude Design Terepgömb-handoff bekötése:
csempés felszín, kategória-tokenek, idővonal, klaszterek, útvonal a napi
programból, dokkolt kártya. Forrás: `handoff/globe/README.md`.*
