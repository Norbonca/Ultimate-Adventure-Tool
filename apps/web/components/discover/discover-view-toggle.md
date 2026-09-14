# Discover nézetváltó — szerződés

A Felfedezés oldal (`/`, `app/page.tsx`) három nézetben mutatja ugyanazt a
túrakészletet. Ez a fájl rögzíti, hogy a három nézet között mi a szerződés: ki
dönt, hol tárolódik a döntés, és mit garantálunk a felhasználónak.

## A három nézet

| Érték | Mit mutat | Komponens |
|---|---|---|
| `globe` | 3D földgömb a túrák helyszíneivel és útvonalával (Terepgömb) | `components/discover/GlobeDiscover.tsx` + `terepgomb.js` |
| `grid` | Kártyarács | `app/discover-client.tsx` — `.trips-grid` |
| `list` | Egy oszlopos lista | `app/discover-client.tsx` — `.trips-grid.list-view` |

Az értékek forrása: `lib/discover-view.ts` (`DISCOVER_VIEWS`). Új nézet csak ott
vehető fel; a típus onnan származik, így a fordító kényszeríti ki a teljességet.

## Az alapértelmezés: `globe`

Cookie nélküli látogató a gömböt kapja. Indok: a Felfedezés a termék belépő
képernyője, és a gömb az egyetlen nézet, amely egy pillantásra megmutatja, hogy
a túrák földrajzilag hol vannak. A rács ugyanazt a listát adja, amit minden
másik utazási oldal — a gömb az, ami miatt a látogató megjegyzi az oldalt.

A visszaváltás egy kattintás, és megjegyezzük: aki rácsot választ, annak
legközelebb rács jön.

## A cookie

| | |
|---|---|
| Név | `trevu-discover-view` |
| Érték | `globe` \| `grid` \| `list` |
| Élettartam | 1 év (`DISCOVER_VIEW_COOKIE_MAX_AGE`) |
| Útvonal | `/` |
| SameSite | `Lax` |
| httpOnly | **nem** — a váltó a kliensen írja, a szerver csak olvassa |

Ismeretlen vagy hiányzó érték esetén az alapértelmezés lép életbe
(`isDiscoverView()` őrzi). A cookie tartalma megjelenítési preferencia, nem
jogosultság: nem döntünk belőle hozzáférésről, és nem tartalmaz személyes adatot.

## Felelősségek

**Szerver** (`app/page.tsx`): kiolvassa a cookie-t, és `initialView` propként
adja át. Ezért az első festés már a helyes nézettel érkezik — nincs villanás,
amikor a rács egy pillanatra megjelenik, majd gömbre vált.

**Kliens** (`app/discover-client.tsx`): a `changeView()` állítja az állapotot és
írja a cookie-t (`rememberDiscoverView`). A váltás nem tölti újra az oldalt és
nem navigál — a szűrők, a rendezés és a görgetés helyben marad.

**Szűrők:** a rács és a lista a Discover hero-jának szűrősávját használja. A
gömb nézetben a hero és a szűrősáv el van rejtve (Claude Design handoff,
2026-09-14): a gömb a saját szűrőit adja — kategória-tokenek (húzás a gömbre
vagy le róla, koppintás = kapcsol) és az 52 hetes idővonal (évszak-chipek +
csúszka, ±4 hetes ablak). A gömb ezért nem kap `visibleTripIds` propot; a két
szűrőkészlet független, nézetváltáskor nem szinkronizálódik. Ez tudatos: a gömb
a felfedezés eszköze, a rács a pontos szűrésé.

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
| `routes` | `trip_itinerary_days.latitude/longitude` (035), napszám szerint | a kiválasztott túra útvonala (halo + vonal + állomások); csak ≥ 2 koordinátás nap esetén |
| `categories[]` | aktív kategóriák, lokalizált névvel és színnel | tokenek |

A marker `geocodeSource` mezője hordozza, honnan van a koordináta:

- `nominatim` — a helyszínmezőkből feloldott, valódi hely;
- `country_centroid` — a 034 migráció backfillje, csak az ország közepe. Ezek a
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
   határ-atlasz), olvasható hibaüzenet és a rács ajánlása jelenik meg, a
   markerek mögötti túrák pedig billentyűzetről és képernyőolvasóval a
   `.globe-fallback-list` listán keresztül elérhetők.

Ezt az öt pontot a `tests/e2e/discover-view.spec.ts` teszteli.

## Teljesítmény

A `GlobeDiscover` dinamikus importtal töltődik, `ssr: false` mellett, és a
renderert (`terepgomb.js`, d3-geo + topojson) csak akkor tölti be, amikor a
gömb nézet aktív — a rács és a lista nem fizet érte. A renderelés
eseményvezérelt: nincs animációs hurok; a gömb húzásra, görgetésre,
méretváltásra és a lap előtérbe kerülésekor rajzol újra, kigörgetve
(`IntersectionObserver`) és háttérben (`visibilitychange`) nem dolgozik.
Automatikus forgás nincs; a gyro (eszköz-tájolás) csak kérésre kapcsol be.

A felszín Web Mercator csempékből épül (`lib/globe-tiles.ts`,
`NEXT_PUBLIC_GLOBE_TILES=gibs|eox`; alap: NASA GIBS Blue Marble, kulcs nélkül,
max. z8 — ezért erős ráközelítésnél elmosódik; az EOX Sentinel-2 cloudless
élesebb, de kereskedelmi használathoz licenc kell, NyK-13). A csempéket a
böngésző gyorsítótárazza. Az országhatárok a `public/globe/countries-50m.json`
(world-atlas 1:50M) fájlból jönnek. Nyelvváltáskor a gömb újramountol, mert a
markup fordított szövegeket hordoz; a csempék a cache-ből jönnek.

---

*Frissítve: 2026-09-14 (S39b) — a Claude Design Terepgömb-handoff bekötése:
csempés felszín, kategória-tokenek, idővonal, klaszterek, útvonal a napi
programból, dokkolt kártya. Forrás: `handoff/globe/README.md`.*
