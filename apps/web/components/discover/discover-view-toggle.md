# Discover nézetváltó — szerződés

A Felfedezés oldal (`/`, `app/page.tsx`) három nézetben mutatja ugyanazt a
túrakészletet. Ez a fájl rögzíti, hogy a három nézet között mi a szerződés: ki
dönt, hol tárolódik a döntés, és mit garantálunk a felhasználónak.

## A három nézet

| Érték | Mit mutat | Komponens |
|---|---|---|
| `globe` | 3D földgömb a túrák helyszíneivel (Terepgömb) | `components/discover/GlobeDiscover.tsx` |
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

**Szűrők:** mindhárom nézet ugyanazt a szűrt halmazt mutatja. A gömb a
`visibleTripIds` propból tudja, mely túrák maradtak a szűrés után, és a saját
marker-készletét ehhez metszi.

## A gömb adatai

A gömb nem a kártyák adatait használja, hanem a `/api/v1/trips/globe` végpontot,
mert a kártyalekérdezés nem kéri le a koordinátákat. A markerek koordinátája a
`trips.location_lat/lng` mezőkből jön (034 migráció).

A marker `geocodeSource` mezője hordozza, honnan van a koordináta:

- `nominatim` — a helyszínmezőkből feloldott, valódi hely;
- `country_centroid` — a 034 migráció backfillje, csak az ország közepe. Ezek a
  markerek halványabbak és kisebbek, a buboréknál pedig kiírjuk, hogy
  hozzávetőleges. Egy országközéppontra ült túráról nem állítjuk, hogy ott van.

Azonos koordinátára eső túrákat determinisztikusan legyezőszerűen szétszórjuk
(aranyszög-spirál), hogy ne fedjék egymást teljesen.

## Amit garantálunk

1. Cookie nélkül a gömb jön.
2. A váltás azonnali, és a következő látogatásra is megmarad.
3. Újratöltés után a szerver rendereli a megjegyzett nézetet.
4. Hibás cookie-érték nem törhet el semmit — az alapértelmezésre esünk vissza.
5. A gömb sosem zsákutca: WebGL nélkül olvasható üzenet és a rács ajánlása
   jelenik meg, a markerek mögötti túrák pedig billentyűzetről és
   képernyőolvasóval a `.globe-fallback-list` listán keresztül elérhetők.

Ezt az öt pontot a `tests/e2e/discover-view.spec.ts` teszteli.

## Teljesítmény

A `GlobeDiscover` (és vele a three.js) dinamikus importtal töltődik, `ssr: false`
mellett — a rács és a lista nézet nem fizet érte. A gömb renderelése leáll, ha a
vászon kigörgetett a képből vagy a lap háttérbe kerül, és `prefers-reduced-motion`
esetén nincs automatikus forgás. A mutató alatt a gömb sosem forog magától.
