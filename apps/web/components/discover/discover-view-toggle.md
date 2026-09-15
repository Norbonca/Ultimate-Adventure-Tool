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
| `routes` | `trip_itinerary_days.latitude/longitude` (035), napszám szerint — a koordinátákat a részletes túratervező trip timeline beállításában adja meg a felhasználó (M20, még nincs UI; ma tesztadat) | a kiválasztott túra útvonala (halo + vonal + állomások); csak ≥ 2 koordinátás nap esetén |
| `categories[]` | aktív kategóriák, lokalizált névvel és színnel | tokenek |

**Láthatóság — ugyanaz, mint a rácsé.** A végpont pontosan azokat a túrákat adja,
amelyeket a rács listáz (`app/page.tsx` `fetchPublishedTrips`): `status = published`,
`visibility = public`, `show_on_landing = true`, nem törölt — és ezek közül azokat,
amelyeknek van koordinátája. Mock- vagy rögzített túralista a kliensben nincs;
a rendererben rögzítve csak a tájékozódási feliratok (városok, vizek, hegységek)
vannak. A `DISCOVER-VIEW-7` e2e teszt ellenőrzi, hogy minden marker kártyaként is
szerepel. Gömb nézetben a találatszám a szűretlen készletet mutatja, mert a gömb a
rács szűrőit nem használja.

**Múltbeli túrák.** A rács a lezajlott publikált túrát is listázza, ezért a gömb is
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
   határ-atlasz), olvasható hibaüzenet és a rács ajánlása jelenik meg, a
   markerek mögötti túrák pedig billentyűzetről és képernyőolvasóval a
   `.globe-fallback-list` listán keresztül elérhetők.

6. A gömb pontosan a rács túráit mutatja (láthatósági szerződés, fent).

Ezt a hat garanciát a `tests/e2e/discover-view.spec.ts` hét tesztje fedi (DISCOVER-VIEW-1…7).

**Mobil (≤ 720 px):** a gömb a telefonon a lap szélétől szélig fut; a fejsor gombjai
és az évszak-chipek vízszintesen görgethetők, a tokensor a keretben görget, minden
második hónapfelirat rejtett, a gesztus-tipp elmarad; a zászló- és klaszterfeliratok
a keret szélén belül maradnak, egyedi zászló és klaszterchip nem fedi egymást, az
alsó lap az idősáv fölött áll meg (`--tg-bottom-h`). Színek: kizárólag `globals.css`
tokenek (PLAN-011).

## Teljesítmény

A `GlobeDiscover` dinamikus importtal töltődik, `ssr: false` mellett, és a
renderert (`terepgomb.js`, d3-geo + topojson) csak akkor tölti be, amikor a
gömb nézet aktív — a rács és a lista nem fizet érte. A renderelés
eseményvezérelt: nincs animációs hurok; a gömb húzásra, görgetésre,
méretváltásra és a lap előtérbe kerülésekor rajzol újra, kigörgetve
(`IntersectionObserver`) és háttérben (`visibilitychange`) nem dolgozik.
Automatikus forgás nincs; a gyro (eszköz-tájolás) csak kérésre kapcsol be.

A felszín Web Mercator csempékből épül (`lib/globe-tiles.ts`,
`NEXT_PUBLIC_GLOBE_TILES=eox|gibs`; alap: **EOX Sentinel-2 cloudless**, max.
z13 — ráközelítve élesedik; Norbert döntése 2026-09-14, NyK-13; pontosítva
2026-09-15: az oldal jelenlegi állapotában nem kereskedelmi, ezért az EOX a
CC-BY-NC-SA 4.0 feltételeivel, attribúcióval élesben is használható — a
kereskedelmi licenc akkor kell, amikor az oldal kereskedelmi működésre vált). Tartalék a NASA GIBS Blue Marble (kulcs és licenc nélkül, max. z8,
ráközelítve elmosódik). A csempéket a böngésző gyorsítótárazza. Az országhatárok a `public/globe/countries-50m.json`
(world-atlas 1:50M) fájlból jönnek. Nyelvváltáskor a gömb újramountol, mert a
markup fordított szövegeket hordoz; a csempék a cache-ből jönnek.

---

*Frissítve: 2026-09-15 (S40) — láthatósági egyezés a ráccsal, múltbeli túrák,
geokódolás szerkesztéskor és országközéppont-tartalékkal, mobil 390 px, tokenek.
Korábban: 2026-09-14 (S39b) — a Claude Design Terepgömb-handoff bekötése:
csempés felszín, kategória-tokenek, idővonal, klaszterek, útvonal a napi
programból, dokkolt kártya. Forrás: `handoff/globe/README.md`.*
