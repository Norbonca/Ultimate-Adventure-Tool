/**
 * M211 — Útmutatók: a V1 tartalom (ND-07: előre feltöltött tartalom, admin később).
 * Design: D21 `bE4n6` / `t09vs` (lista), `q66Ci` / `N3aUG` (adatlap), `mblRQ` / `Y9gr7` / `e9ero8` (súgó).
 *
 * i18n-skip: ez tartalom-adat (minden szöveg hu + en mezővel), nem UI-felirat — a felület
 * szövegei a `tutorials.*` kulcsokon vannak. A DB-táblás tárolás (`tutorials`, `tutorial_steps`,
 * `tutorial_anchors`, spec gap mátrix) az admin-felülettel együtt jön; addig ez a forrás, a
 * `lib/tutorials/index.ts` lekérdezései mögé zárva, hogy a csere ne érintse a felületet.
 *
 * Fájlok: képes bemutató `public/tutorials/slides/<slug>/<n>.jpg` (n = lépés, 1-től), plakát `public/tutorials/posters/<slug>.jpg`, videó `public/tutorials/videos/<slug>.mp4`
 * (csak ha `hasVideo`), felirat a lépésekből: `/api/v1/tutorials/<slug>/captions/<locale>` (WebVTT).
 * A lépések `at` értéke (mp) a videó időbélyege: a lépés felirata eddig a pillanattól a
 * következő lépésig látszik, és a lépésre kattintva ide ugrik a lejátszás.
 */
import { BRAND } from "@uat/config";

export type TutorialLocale = "hu" | "en";
export type Localized = Record<TutorialLocale, string>;
export type TutorialRole = "organizer" | "traveler";

export interface TutorialStep {
  /** Időbélyeg a videóban, másodpercben. */
  at: number;
  text: Localized;
}

export interface Tutorial {
  slug: string;
  role: TutorialRole;
  /** Témakör — szemöldökcím és súgó-fejléc. */
  topic: Localized;
  title: Localized;
  summary: Localized;
  body: Record<TutorialLocale, string[]>;
  tip?: Localized;
  steps: TutorialStep[];
  /** A videó hossza másodpercben. */
  duration: number;
  /** Funkció-horgonyok: ahol a „Hogyan működik?” link megjelenik (pl. `expenses`). */
  anchors: string[];
  related: string[];
  /** A „Kipróbálom” gomb célja az adatlapon. */
  tryHref: string;
  /** Utolsó frissítés (ÉÉÉÉ-HH). */
  updated: string;
  featured?: boolean;
  /** Van-e már feltöltött videó; ha nincs, a lépések szövege és a plakát látszik. */
  hasVideo: boolean;
  /** Képes bemutató (lépésenként egy kép: public/tutorials/slides/<slug>/<n>.jpg) — a videó helyett (2026-11-02). */
  hasSlides: boolean;
}

export const TUTORIALS: Tutorial[] = [
  {
    slug: "elso-tura-meghirdetese",
    role: "organizer",
    featured: true,
    topic: { hu: "Túraszervezés", en: "Trip planning" },
    title: { hu: "Az első túrád meghirdetése", en: "Publishing your first trip" },
    summary: {
      hu: "A varázsló négy lépésben végigvezet: kategória, alapadatok, részletek, közzététel.",
      en: "The wizard walks you through four steps: category, basics, details and publishing.",
    },
    body: {
      hu: [
        "Az új túrát a Túráim oldalon indítod. Kezdhetsz nulláról, vagy egy kipróbált sablonból, amelyet utána a saját túrádra szabsz.",
        "A varázsló menet közben piszkozatot ment, így bármikor abbahagyhatod és később folytathatod. A túra csak a „Túra publikálása” gombbal lesz látható a Felfedezésben.",
      ],
      en: [
        "Start a new trip from My Trips. You can start from scratch or from a proven template that you then tailor to your trip.",
        "The wizard saves a draft as you go, so you can stop at any time and continue later. The trip only appears in Discover once you press “Publish Trip”.",
      ],
    },
    tip: {
      hu: "Privát túránál a túra nem jelenik meg a Felfedezésben: a résztvevőket linkkel hívod meg.",
      en: "A private trip does not appear in Discover — you invite participants with a link.",
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a Túráim oldalt, és indíts új túrát", en: "Open My Trips and start a new trip" } },
      { at: 6, text: { hu: "Válaszd a „Kezdés nulláról” lehetőséget vagy egy sablont", en: "Choose “Start from Scratch” or a template" } },
      { at: 13, text: { hu: "Válaszd ki a túra kategóriáját", en: "Pick the trip category" } },
      { at: 21, text: { hu: "Add meg az alapadatokat: cím, dátum, helyszín, létszám, ár", en: "Fill in the basics: title, dates, location, group size, price" } },
      { at: 36, text: { hu: "Egészítsd ki a kategóriához tartozó részleteket", en: "Add the details for the category" } },
      { at: 45, text: { hu: "Nézd át, és nyomd meg a „Túra publikálása” gombot", en: "Review it and press “Publish Trip”" } },
    ],
    duration: 54,
    anchors: ["trips.new", "trips.list"],
    related: ["uj-idopont", "jelentkezok-elbiralasa"],
    tryHref: "/trips/new",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "uj-idopont",
    role: "organizer",
    topic: { hu: "Túrasorozat", en: "Trip series" },
    title: { hu: "Új időpont hozzáadása", en: "Adding a new date" },
    summary: {
      hu: "Ugyanaz a túra több időpontban: minden időpont önálló túra, a Felfedezésben egy kártyán.",
      en: "The same trip on several dates: each date is its own trip, shown on one card in Discover.",
    },
    body: {
      hu: [
        "Az új időpont a meglévő túra másolata: a leírás, a program, a képek és a beállítások átkerülnek, a jelentkezők, a várólista és a stáb nem.",
        "Az időpont piszkozatként jön létre, így publikálás előtt még módosíthatod az árat vagy a létszámot.",
      ],
      en: [
        "A new date is a copy of the existing trip: description, programme, images and settings are copied — applicants, waitlist and crew are not.",
        "The date is created as a draft, so you can still adjust the price or group size before publishing.",
      ],
    },
    tip: {
      hu: "Egy időpontot bármikor leválaszthatsz a sorozatról; onnantól önálló túraként él tovább.",
      en: "You can detach a date from the series at any time; it then continues as a standalone trip.",
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túrád oldalát, és görgess az Időpontok szakaszhoz", en: "Open your trip page and scroll to the Dates section" } },
      { at: 7, text: { hu: "Nyomd meg az „Új időpont” gombot", en: "Press “New date”" } },
      { at: 12, text: { hu: "Add meg a kezdést, a befejezést, a létszámot és az árat", en: "Enter the start, end, group size and price" } },
      { at: 24, text: { hu: "Nézd át, mit másolunk az új időpontba", en: "Check what is copied into the new date" } },
      { at: 31, text: { hu: "Hozd létre piszkozatként, majd publikáld", en: "Create it as a draft, then publish it" } },
    ],
    duration: 40,
    anchors: ["series.addDate"],
    related: ["elso-tura-meghirdetese", "jelentkezok-elbiralasa"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "jelentkezok-elbiralasa",
    role: "organizer",
    topic: { hu: "Csapat", en: "Team" },
    title: { hu: "Jelentkezők elbírálása", en: "Reviewing applications" },
    summary: {
      hu: "Elfogadás, várólista vagy elutasítás indoklással — a jelentkező a túraoldalon látja.",
      en: "Approve, waitlist or reject with a reason — the applicant sees it on the trip page.",
    },
    body: {
      hu: [
        "A függő jelentkezések a túrád oldalán, a Csapat részben gyűlnek. Minden jelentkezésnél látod, melyik pozícióra jelentkezett, és ha írt, az üzenetét is.",
        "Ha a túra betelt, a jelentkezőt várólistára teheted; ha felszabadul egy hely, onnan veheted fel.",
      ],
      en: [
        "Pending applications collect on your trip page, in the Team section. For each one you see the position applied for and the applicant’s message, if any.",
        "If the trip is full, you can put the applicant on the waitlist and take them from there when a place frees up.",
      ],
    },
    tip: {
      hu: "Az elutasítás indoklása nem kötelező, de a jelentkező a státusza mellett látja — egy mondat sokat segít.",
      en: "A reason for declining is optional, but the applicant sees it next to their status — one sentence helps a lot.",
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túrád oldalán a függő jelentkezéseket", en: "Open the pending applications on your trip page" } },
      { at: 8, text: { hu: "Olvasd el, melyik pozícióra jelentkezett, és az üzenetét", en: "Read the position applied for and the message" } },
      { at: 17, text: { hu: "Az „Elfogad” gombbal bekerül a csapatba", en: "“Approve” adds them to the team" } },
      { at: 25, text: { hu: "Betelt túránál tedd „Várólistára”", en: "If the trip is full, use “Waitlist”" } },
      { at: 32, text: { hu: "Elutasításnál írj rövid indoklást", en: "When rejecting, add a short reason" } },
    ],
    duration: 41,
    anchors: ["trip.applications", "trip.crew"],
    related: ["uj-idopont", "menetrend-teendok"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "menetrend-teendok",
    role: "organizer",
    topic: { hu: "Menetrend", en: "Schedule" },
    title: { hu: "Menetrend és teendők", en: "Schedule and tasks" },
    summary: {
      hu: "Fázisok, mérföldkövek időponttal és helyszínnel, kiosztott feladatok — húzással rendezve.",
      en: "Phases, milestones with time and place, assigned tasks — reordered by dragging.",
    },
    body: {
      hu: [
        "A Menetrend a túraszerkesztő egyik füle. A túrát fázisokra bontod, a fázisokon belül mérföldkövek vannak, azokon belül feladatok.",
        "A mérföldkőhöz időpontot és helyszínt is adhatsz (például indulás 8:00, találkozó a parkolóban). Az időpont a túra helyi idejében értendő.",
        "A résztvevők a saját menetrend-nézetükben látják a fázisokat és a nekik kiosztott feladatokat.",
      ],
      en: [
        "The schedule is a tab of the trip editor. You split the trip into phases; phases hold milestones, milestones hold tasks.",
        "A milestone can have a time and a place (for example departure at 8:00, meeting at the car park). Times are in the trip’s local time.",
        "Participants see the phases and the tasks assigned to them in their own schedule view.",
      ],
    },
    tip: {
      hu: "Billentyűzettel is átrendezhetsz: a fogantyún szóköz, majd a nyilak.",
      en: "You can reorder with the keyboard too: space on the handle, then the arrow keys.",
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túraszerkesztő Menetrend fülét", en: "Open the Schedule tab in the trip editor" } },
      { at: 7, text: { hu: "Adj hozzá fázist", en: "Add a phase" } },
      { at: 15, text: { hu: "Adj hozzá mérföldkövet időponttal és helyszínnel", en: "Add a milestone with a time and a place" } },
      { at: 30, text: { hu: "Adj hozzá feladatot, és oszd ki valakinek", en: "Add a task and assign it" } },
      { at: 42, text: { hu: "Húzással rendezd át a sorrendet", en: "Drag to reorder" } },
    ],
    duration: 52,
    anchors: ["trip.timeline"],
    related: ["jelentkezok-elbiralasa", "kozos-koltseg"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "kozos-koltseg",
    role: "organizer",
    topic: { hu: "Költségmegosztás", en: "Cost sharing" },
    title: { hu: "Közös költség rögzítése", en: "Recording a shared cost" },
    summary: {
      hu: "Szállás, üzemanyag, élelmiszer: ki fizetett, mennyit, és kik között oszlik meg.",
      en: "Accommodation, fuel, food: who paid, how much, and who shares it.",
    },
    body: {
      hu: [
        "A közös költséget az rögzíti, aki fizetett valamit a csoportért: szállás, üzemanyag, élelmiszer. Megadod, ki fizetett, mennyit és milyen pénznemben, majd kiválasztod, kik között oszlik meg.",
        "Mentés után a Kiegyenlítés megmutatja, ki kinek mennyivel tartozik — a lehető legkevesebb utalással.",
      ],
      en: [
        "Whoever paid something for the group records it: accommodation, fuel, food. Enter who paid, how much and in which currency, then choose who shares it.",
        "After saving, Settle up shows who owes whom and how much — with as few transfers as possible.",
      ],
    },
    tip: {
      hu: "Eltérő pénznemű tételeket is rögzíthetsz; az egyenleg a túra elszámolási pénznemében számol.",
      en: "You can record items in different currencies; balances are calculated in the trip’s settlement currency.",
    },
    steps: [
      { at: 4, text: { hu: "Nyisd meg a túra Költségek oldalát", en: "Open the trip’s Expenses page" } },
      { at: 12, text: { hu: "Koppints a „Költség hozzáadása” gombra", en: "Tap “Add expense”" } },
      { at: 19, text: { hu: "Add meg a megnevezést, az összeget és a pénznemet", en: "Enter the description, the amount and the currency" } },
      { at: 30, text: { hu: "Válaszd ki, kik között oszlik meg", en: "Choose who shares it" } },
      { at: 40, text: { hu: "Mentsd el — az egyenlegek azonnal frissülnek", en: "Save — balances update right away" } },
    ],
    duration: 45,
    anchors: ["expenses"],
    related: ["kiegyenlites", "menetrend-teendok"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "kiegyenlites",
    role: "organizer",
    topic: { hu: "Költségmegosztás", en: "Cost sharing" },
    title: { hu: "Kiegyenlítés és utalások", en: "Settling up" },
    summary: {
      hu: "Ki kinek mennyivel tartozik; a fizető jelez, a kedvezményezett megerősít.",
      en: "Who owes whom; the payer marks it paid, the recipient confirms.",
    },
    body: {
      hu: [
        "A Kiegyenlítés a költségekből kiszámolja, kinek kell kinek fizetnie, a lehető legkevesebb utalással.",
        "Aki fizetett, a „Kifizettem” gombbal jelzi, és megadja, hogyan. A kedvezményezett megerősíti; a megerősített tétel lezárul.",
      ],
      en: [
        "Settle up works out from the expenses who has to pay whom, with as few transfers as possible.",
        "The payer marks it with “I’ve paid” and says how. The recipient confirms; a confirmed item is closed.",
      ],
    },
    tip: {
      hu: "Az összeget senki nem írhatja át. Ha valami nem stimmel, a „Nem értek egyet” jelzés a szervezőhöz kerül.",
      en: "Nobody can change the amount. If something is wrong, “I disagree” goes to the organizer.",
    },
    steps: [
      { at: 0, text: { hu: "A Költségek oldalon nyisd meg a Kiegyenlítést", en: "Open Settle up from the Expenses page" } },
      { at: 7, text: { hu: "Nézd meg, kinek mennyit kell fizetned", en: "See how much you owe and to whom" } },
      { at: 15, text: { hu: "Utalás után nyomd meg a „Kifizettem” gombot", en: "After paying, press “I’ve paid”" } },
      { at: 23, text: { hu: "A kedvezményezett megerősíti: „Megerősítem — megkaptam”", en: "The recipient confirms: “Confirm — I received it”" } },
      { at: 31, text: { hu: "Ha nem stimmel, jelezd: „Nem értek egyet”", en: "If it’s wrong, flag it: “I disagree”" } },
    ],
    duration: 38,
    anchors: ["expenses.settle"],
    related: ["kozos-koltseg"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "kereses-es-szures",
    role: "traveler",
    topic: { hu: "Felfedezés", en: "Discover" },
    title: { hu: "Keresés és szűrés", en: "Search and filters" },
    summary: {
      hu: "Kategória, időpont, ár és ország szerint — csempén, listában vagy a 3D térképen.",
      en: "By category, dates, price and country — as tiles, a list or on the 3D map.",
    },
    body: {
      hu: [
        `A Felfedezés a ${BRAND.name} nyitóoldala. A keresőbe írhatsz túranevet, helyet vagy országot, a szűrőkkel pedig szűkítheted a találatokat kategóriára, időpontra és árra.`,
        "A találatokat csempékben, listában vagy a 3D térképen nézheted. A több időpontos túrák egy kártyán jelennek meg, az időpontokkal együtt.",
      ],
      en: [
        `Discover is ${BRAND.name}’s home page. Type a trip name, place or country into the search, and narrow the results with filters for category, dates and price.`,
        "View the results as tiles, a list or on the 3D map. Trips with several dates show on one card, together with the dates.",
      ],
    },
    tip: {
      hu: "Ha nem találsz kedvedre valót, dobd be ötletként: a szervezők látják, mire van igény.",
      en: "If nothing fits, post it as an idea: organizers see what people are looking for.",
    },
    steps: [
      { at: 0, text: { hu: "Írd be a keresőbe, mit vagy hová keresel", en: "Type what or where you are looking for" } },
      { at: 8, text: { hu: "Nyisd meg a Szűrőket: kategória, időpont, ár", en: "Open Filters: category, dates, price" } },
      { at: 18, text: { hu: "Válts Csempék és Lista nézet között", en: "Switch between Tiles and List view" } },
      { at: 26, text: { hu: "Koppints egy kártyára a túra részleteiért", en: "Tap a card for the trip details" } },
    ],
    duration: 35,
    anchors: ["discover"],
    related: ["3d-terkep", "jelentkezes-idopontra"],
    tryHref: "/",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "3d-terkep",
    role: "traveler",
    topic: { hu: "Felfedezés", en: "Discover" },
    title: { hu: "Túrák a 3D térképen", en: "Trips on the 3D map" },
    summary: {
      hu: "Forgasd, nagyíts, és koppints egy jelölőre: hol vannak a túrák.",
      en: "Rotate, zoom and tap a marker: see where the trips are.",
    },
    body: {
      hu: [
        "A 3D térkép a Felfedezés egyik nézete: a szűrőknek megfelelő túrák a helyszínükön jelennek meg.",
        "Húzással forgatod, görgetéssel vagy két ujjal nagyítasz. Egy jelölőre koppintva megnyílik a túra rövid adatlapja.",
      ],
      en: [
        "The 3D map is one of the Discover views: trips matching your filters appear at their locations.",
        "Drag to rotate, scroll or pinch to zoom. Tap a marker to open a short trip card.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "A Felfedezésben válaszd a „3D térkép” nézetet", en: "In Discover, choose the “3D map” view" } },
      { at: 7, text: { hu: "Húzd a forgatáshoz, görgess a nagyításhoz", en: "Drag to rotate, scroll to zoom" } },
      { at: 16, text: { hu: "Koppints egy jelölőre", en: "Tap a marker" } },
      { at: 23, text: { hu: "Nyisd meg a túra részleteit", en: "Open the trip details" } },
    ],
    duration: 30,
    anchors: ["discover.map"],
    related: ["kereses-es-szures", "jelentkezes-idopontra"],
    tryHref: "/",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "jelentkezes-idopontra",
    role: "traveler",
    topic: { hu: "Jelentkezés", en: "Applying" },
    title: { hu: "Jelentkezés egy időpontra", en: "Applying for a date" },
    summary: {
      hu: "Időpont, pozíció, üzenet a szervezőnek — a jelentkezésed a Túráim között látszik.",
      en: "Date, position, a message to the organizer — your application shows in My Trips.",
    },
    body: {
      hu: [
        "A túraoldalon a „Jelentkezem” gombbal indul a jelentkezés. Több időpontos túránál először az időpontot választod; a betelt időpontra várólistára kerülhetsz.",
        "A szervező elbírálja a jelentkezést; a döntést a túraoldalon, a státuszod mellett látod.",
      ],
      en: [
        "Start from the “Apply” button on the trip page. For trips with several dates you first choose the date; for a full date you can join the waitlist.",
        "The organizer reviews your application; you see the decision on the trip page, next to your status.",
      ],
    },
    tip: {
      hu: "Néhány mondat magadról és a tapasztalatodról sokat segít a szervezőnek.",
      en: "A few sentences about yourself and your experience help the organizer a lot.",
    },
    steps: [
      { at: 0, text: { hu: "A túraoldalon nyomd meg a „Jelentkezem” gombot", en: "Press “Apply” on the trip page" } },
      { at: 8, text: { hu: "Válassz időpontot (betelt időpontnál várólista)", en: "Choose a date (waitlist if it is full)" } },
      { at: 17, text: { hu: "Válassz pozíciót, és írj pár sort a szervezőnek", en: "Choose a position and write a few lines to the organizer" } },
      { at: 28, text: { hu: "Küldd el — a jelentkezésed a Túráim között látszik", en: "Send it — your application shows in My Trips" } },
    ],
    duration: 40,
    anchors: ["trip.apply"],
    related: ["kereses-es-szures", "otlet-kituzese"],
    tryHref: "/",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "otlet-kituzese",
    role: "traveler",
    topic: { hu: "Ötletbörze", en: "Trip ideas" },
    title: { hu: "Ötlet kitűzése", en: "Posting a trip idea" },
    summary: {
      hu: "Nincs kedvedre való túra? Dobd be ötletként, mások csatlakozhatnak, egy szervező felveheti.",
      en: "No trip that fits? Post it as an idea; others can join and an organizer can pick it up.",
    },
    body: {
      hu: [
        "Az Ötletbörzén azt írod le, milyen túrára mennél: mit, hová, nagyjából mikor. Ez érdeklődés, nem jelentkezés.",
        "Aki ugyanerre vágyik, csatlakozhat; a szervezők látják, hányan érdeklődnek, és vállalhatják a megszervezését.",
      ],
      en: [
        "On Trip ideas you describe the trip you would go on: what, where and roughly when. It is interest, not an application.",
        "Anyone who wants the same can join; organizers see how many are interested and can offer to organise it.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg az Ötletbörzét", en: "Open Trip ideas" } },
      { at: 6, text: { hu: "Nyomd meg a „Dobd be ötletként” gombot", en: "Press “Pin an idea”" } },
      { at: 12, text: { hu: "Add meg a címet, a kategóriát, az időablakot és a célterületet", en: "Enter the title, category, time window and destination" } },
      { at: 27, text: { hu: "Küldd be: „Beküldöm az ötletet”", en: "Submit it: “Submit idea”" } },
    ],
    duration: 38,
    anchors: ["ideas"],
    related: ["kereses-es-szures", "jelentkezes-idopontra"],
    tryHref: "/ideas/new",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "szerepek-es-stabhelyek",
    role: "organizer",
    topic: { hu: "Csapat", en: "Team" },
    title: { hu: "Szerepek és szervezői helyek", en: "Roles and staff seats" },
    summary: {
      hu: "Pozíciók a jelentkezőknek (skipper, elsősegélynyújtó), szervezői helyek a stábnak.",
      en: "Positions for applicants (skipper, first aider) and staff seats for your crew.",
    },
    body: {
      hu: [
        "A túraszerkesztő Csapat fülén két dolgot állítasz be. A pozíciók azok a szerepek, amelyekre a résztvevők jelentkezhetnek, például skipper vagy elsősegélynyújtó.",
        "A szervezői helyek a stábé: ezeket nem a jelentkezők foglalják el. Magadat a „Felveszem magam” gombbal teszed be, a többi stábtagot név szerint adod hozzá.",
      ],
      en: [
        "On the Team tab of the trip editor you set two things. Positions are the roles participants can apply for, such as skipper or first aider.",
        "Staff seats belong to your crew and are not taken by applicants. Add yourself with “Assign myself” and the other crew members by name.",
      ],
    },
    tip: {
      hu: "A szervezői helyek nem csökkentik a jelentkezőknek szánt helyek számát.",
      en: "Staff seats do not reduce the places available to applicants.",
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túraszerkesztő Csapat fülét", en: "Open the Team tab in the trip editor" } },
      { at: 6, text: { hu: "A Pozíciók résznél adj hozzá szerepet", en: "Add a role under Positions" } },
      { at: 14, text: { hu: "A szervezői helyeknél vedd fel magad", en: "Assign yourself to a staff seat" } },
      { at: 22, text: { hu: "A csapattagok listájában látod, ki milyen szerepben van", en: "The member list shows who is in which role" } },
    ],
    duration: 30,
    anchors: ["trip.crew"],
    related: ["jelentkezok-elbiralasa", "check-in"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "check-in",
    role: "organizer",
    topic: { hu: "Csapat", en: "Team" },
    title: { hu: "Check-in a túra napján", en: "Check-in on the day" },
    summary: {
      hu: "Egy koppintással jelölöd, ki érkezett meg a gyülekezőre.",
      en: "Mark who has arrived at the meeting point with one tap.",
    },
    body: {
      hu: [
        "A túra napján a Csapat fülön a csapattagok mellett megjelenik a Check-in gomb. Aki megérkezett, annál megnyomod; így egy pillantással látod, kire vártok még.",
      ],
      en: [
        "On the day of the trip a Check-in button appears next to each member on the Team tab. Press it for everyone who has arrived, and you see at a glance who you are still waiting for.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túraszerkesztő Csapat fülét", en: "Open the Team tab in the trip editor" } },
      { at: 6, text: { hu: "Görgess a csapattagok listájához", en: "Scroll to the member list" } },
      { at: 12, text: { hu: "Aki megérkezett, annál nyomd meg a Check-in gombot", en: "Press Check-in for everyone who has arrived" } },
    ],
    duration: 20,
    anchors: ["trip.crew"],
    related: ["szerepek-es-stabhelyek", "menetrend-teendok"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "boritokep",
    role: "organizer",
    topic: { hu: "Túraoldal", en: "Trip page" },
    title: { hu: "Borítókép és kártyakép", en: "Cover and card image" },
    summary: {
      hu: "A borítókép a túraoldal tetején, a kártyakép a Felfedezésben jelenik meg.",
      en: "The cover appears at the top of the trip page, the card image in Discover.",
    },
    body: {
      hu: [
        "A túraszerkesztő Képek fülén töltöd fel a túra képeit. Behúzhatod a fájlt, vagy tallózással választod ki; a nagy képeket a rendszer maga kicsinyíti.",
        "A borítókép a túraoldal tetején látszik, a kártyakép a Felfedezés kártyáin. Ha kártyaképet nem adsz meg, a borítókép látszik ott is.",
      ],
      en: [
        "Upload the trip’s images on the Images tab of the trip editor. Drag the file in or browse for it; large images are resized automatically.",
        "The cover shows at the top of the trip page, the card image on the Discover cards. Without a card image, the cover is used there too.",
      ],
    },
    tip: {
      hu: "Fekvő, világos kép mutat a legjobban a kártyán; a szöveg ráfér a kép alsó harmadára.",
      en: "A bright landscape image works best on the card; the text fits over its lower third.",
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túraszerkesztő Képek fülét", en: "Open the Images tab in the trip editor" } },
      { at: 6, text: { hu: "Húzd be vagy tallózd be a borítóképet", en: "Drag in or browse for the cover image" } },
      { at: 14, text: { hu: "Ha kell, adj meg külön kártyaképet a Felfedezéshez", en: "Optionally add a separate card image for Discover" } },
      { at: 22, text: { hu: "Mentsd el a változtatásokat", en: "Save your changes" } },
    ],
    duration: 30,
    anchors: ["trip.images"],
    related: ["tura-beallitasok", "elso-tura-meghirdetese"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "tura-beallitasok",
    role: "organizer",
    topic: { hu: "Túraszervezés", en: "Trip planning" },
    title: { hu: "Láthatóság, jóváhagyás, létszám, ár", en: "Visibility, approval, group size, price" },
    summary: {
      hu: "Ki látja a túrát, kell-e jóváhagyás, hány hely van és mennyibe kerül.",
      en: "Who sees the trip, whether approval is needed, how many places and what it costs.",
    },
    body: {
      hu: [
        "A túraszerkesztő Beállítások fülén döntöd el, hogy a túra nyilvános vagy privát, és hogy a jelentkezéseket jóvá kell-e hagynod.",
        "Itt állítod a létszámot (résztvevők és szervezői helyek), az árat, a pénznemet és a jelentkezési határidőt. A határidő a túra helyszínének idejében, a nap végén zár.",
      ],
      en: [
        "On the Settings tab of the trip editor you decide whether the trip is public or private, and whether applications need your approval.",
        "Here you also set the group size (participants and staff seats), price, currency and application deadline. The deadline closes at the end of the day in the trip’s local time.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túraszerkesztő Beállítások fülét", en: "Open the Settings tab in the trip editor" } },
      { at: 6, text: { hu: "Válaszd ki a láthatóságot és azt, kell-e jóváhagyás", en: "Choose visibility and whether approval is required" } },
      { at: 14, text: { hu: "Add meg a létszámot", en: "Set the group size" } },
      { at: 22, text: { hu: "Állítsd be az árat, a pénznemet és a határidőt", en: "Set the price, currency and deadline" } },
    ],
    duration: 30,
    anchors: ["trip.settings"],
    related: ["koltseg-beallitasok", "boritokep"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "koltseg-beallitasok",
    role: "organizer",
    topic: { hu: "Költségmegosztás", en: "Cost sharing" },
    title: { hu: "Elszámolási pénznem és árfolyam", en: "Settlement currency and exchange rates" },
    summary: {
      hu: "Milyen pénznemben számoltok el, milyen árfolyamon, és ki rögzíthet költséget.",
      en: "Which currency you settle in, at which rate, and who can add expenses.",
    },
    body: {
      hu: [
        "A Beállítások fül Költségek részében adod meg az elszámolási pénznemet és az átváltás módját: a költés napján, a kiegyenlítés napján vagy rögzített árfolyamon.",
        "Itt engedheted meg, hogy a résztvevők is rögzítsenek költséget. Az első tétel után a pénznem és az átváltási mód zárolódik.",
      ],
      en: [
        "In the Expenses part of the Settings tab you set the settlement currency and how amounts are converted: on the expense date, on the settlement date, or at a fixed rate.",
        "Here you can also let participants add expenses. After the first item, the currency and conversion mode are locked.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "A Beállítások fülön görgess a Költségek részhez", en: "On the Settings tab, scroll to Expenses" } },
      { at: 7, text: { hu: "Válaszd ki az elszámolási pénznemet és az árfolyam módját", en: "Choose the settlement currency and rate mode" } },
      { at: 16, text: { hu: "Döntsd el, rögzíthetnek-e költséget a résztvevők", en: "Decide whether participants can add expenses" } },
    ],
    duration: 25,
    anchors: ["expenses.settings"],
    related: ["kozos-koltseg", "kiegyenlites"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "tura-lemondasa",
    role: "organizer",
    topic: { hu: "Túraszervezés", en: "Trip planning" },
    title: { hu: "Túra lemondása vagy törlése", en: "Cancelling or deleting a trip" },
    summary: {
      hu: "Jelentkezővel rendelkező túrát indoklással mondasz le; a résztvevők látják az okot.",
      en: "A trip with applicants is cancelled with a reason; participants see it.",
    },
    body: {
      hu: [
        "A Beállítások fül alján található a túra törlése. Piszkozatot és jelentkező nélküli túrát törölhetsz; a törölt túra egy ideig visszaállítható.",
        "Ha már vannak jelentkezők, a túrát nem törlöd, hanem lemondod: megadod az okát és egy üzenetet, a résztvevők pedig a túraoldalon látják.",
      ],
      en: [
        "Deleting a trip is at the bottom of the Settings tab. Drafts and trips without applicants can be deleted, and a deleted trip can be restored for a while.",
        "If there are applicants, you cancel the trip instead: give a reason and a message, and participants see it on the trip page.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "A Beállítások fül alján keresd a túra törlését", en: "Find trip deletion at the bottom of the Settings tab" } },
      { at: 7, text: { hu: "Nyomd meg a „Túra törlése…” gombot", en: "Press “Delete trip…”" } },
      { at: 13, text: { hu: "Jelentkezők esetén add meg a lemondás okát és az üzenetet", en: "With applicants, enter the reason and a message" } },
    ],
    duration: 25,
    anchors: ["trip.cancel"],
    related: ["tura-beallitasok"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "mire-varnak",
    role: "organizer",
    topic: { hu: "Ötletbörze", en: "Trip ideas" },
    title: { hu: "Ötletből túra: „Mire várnak”", en: "From idea to trip: “In demand”" },
    summary: {
      hu: "A Túráim „Mire várnak” fülén látod a kategóriáidba eső ötleteket, és túrává alakíthatod őket.",
      en: "The “In demand” tab of My Trips shows ideas in your categories, ready to turn into trips.",
    },
    body: {
      hu: [
        "A „Mire várnak” fülön az Ötletbörze azon ötletei jelennek meg, amelyek a te kategóriáidba esnek, a csatlakozók száma szerint rendezve.",
        "A „Megszervezem” gombbal vállalod az ötletet; a varázsló ekkor az ötlet adataival indul, így a túra alapjai már kitöltve várnak.",
      ],
      en: [
        "The “In demand” tab shows Trip ideas in your categories, sorted by the number of people who joined.",
        "With “I'll organize it” you take on the idea; the wizard then starts with the idea’s details already filled in.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a Túráim oldalt", en: "Open My Trips" } },
      { at: 5, text: { hu: "Válaszd a „Mire várnak” fület", en: "Choose the “In demand” tab" } },
      { at: 11, text: { hu: "Nézd meg, hányan csatlakoztak az ötlethez", en: "See how many people joined the idea" } },
      { at: 17, text: { hu: "Nyomd meg a „Megszervezem” gombot", en: "Press “I'll organize it”" } },
    ],
    duration: 25,
    anchors: ["trips.list"],
    related: ["otlet-kituzese", "elso-tura-meghirdetese"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "keszsegek-es-erdeklodes",
    role: "traveler",
    topic: { hu: "Profil", en: "Profile" },
    title: { hu: "Készségek és érdeklődés", en: "Skills and interests" },
    summary: {
      hu: "Kategóriánként megadod, mi érdekel és milyen szinten vagy, kezdőtől profiig.",
      en: "Per category, set what interests you and your level, from beginner to pro.",
    },
    body: {
      hu: [
        `A Beállítások Érdeklődés oldalán kiválasztod, milyen kalandok érdekelnek. Ebből tudja a ${BRAND.name}, milyen ötleteket és túrákat mutasson neked.`,
        "A Készségek oldalon kategóriánként megadod a tapasztalatodat. A szervező ebből látja, illik-e hozzád a túra.",
      ],
      en: [
        `On the Interests page of Settings you choose which adventures interest you. ${BRAND.name} uses this to show you matching ideas and trips.`,
        "On the Skills page you set your experience per category, so organizers can see whether a trip suits you.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a Beállítások Érdeklődés oldalát", en: "Open Interests in Settings" } },
      { at: 6, text: { hu: "Jelöld be a kategóriákat, amelyek érdekelnek", en: "Select the categories you are interested in" } },
      { at: 13, text: { hu: "A Készségek oldalon add meg a szintedet kategóriánként", en: "On Skills, set your level per category" } },
    ],
    duration: 25,
    anchors: ["settings.skills"],
    related: ["mire-varnak"],
    tryHref: "/settings/interests",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "jelentkezes-allapota",
    role: "traveler",
    topic: { hu: "Jelentkezés", en: "Applying" },
    title: { hu: "A jelentkezésed állapota", en: "Your application status" },
    summary: {
      hu: "A túraoldalon, a Jelentkezem gomb helyén látod, hol tart a jelentkezésed.",
      en: "On the trip page, where the Apply button was, you see where your application stands.",
    },
    body: {
      hu: [
        "Jelentkezés után a túraoldalon a Jelentkezem gomb helyén az állapotod látszik: függőben, elfogadva, várólistán vagy elutasítva. Alatta a szervezőnek írt megjegyzésed is ott van.",
        "Ha a szervező elutasítja a jelentkezést, az indoklását is itt látod. Elfogadás után a túraoldalról jutsz el a menetrendhez és a feladataidhoz.",
      ],
      en: [
        "After applying, the trip page shows your status where the Apply button was: pending, approved, waitlisted or rejected. Your note to the organizer is shown below it.",
        "If the organizer rejects the application, you see the reason here too. Once approved, the trip page leads you to the schedule and your tasks.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túra oldalát, amelyre jelentkeztél", en: "Open the page of the trip you applied for" } },
      { at: 6, text: { hu: "A jelentkezés dobozában látod az állapotodat", en: "The application box shows your status" } },
      { at: 12, text: { hu: "Alatta a szervezőnek írt megjegyzésed", en: "Below it, your note to the organizer" } },
    ],
    duration: 20,
    anchors: ["trip.apply"],
    related: ["jelentkezes-idopontra", "resztvevoi-menetrend"],
    tryHref: "/",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },

  {
    slug: "resztvevoi-menetrend",
    role: "traveler",
    topic: { hu: "Menetrend", en: "Schedule" },
    title: { hu: "Feladataim és a menetrend résztvevőként", en: "My tasks and the schedule as a participant" },
    summary: {
      hu: "Látod a neked kiosztott feladatokat és a túra menetrendjét időponttal, helyszínnel.",
      en: "See the tasks assigned to you and the trip schedule with times and places.",
    },
    body: {
      hu: [
        "Az elfogadott résztvevők a túraoldalról a „Menetrend és teendők” oldalra jutnak. Fent a Feladataim: amit elvégeztél, kipipálod; a lejárt határidejűek kiemelve jelennek meg.",
        "Alatta a menetrend fázisonként, időponttal és helyszínnel; a helyszín térképen is megnyitható.",
      ],
      en: [
        "Approved participants reach the “Schedule and tasks” page from the trip page. At the top are My Tasks: tick off what you have done; overdue ones are highlighted.",
        "Below is the schedule by phase, with times and places; places open in a map too.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg a túra Menetrend és teendők oldalát", en: "Open the trip’s Schedule and tasks page" } },
      { at: 6, text: { hu: "A Feladataim résznél pipáld ki, amit elvégeztél", en: "Tick off what you have done under My Tasks" } },
      { at: 13, text: { hu: "Lent a menetrend időponttal és helyszínnel", en: "Below, the schedule with times and places" } },
    ],
    duration: 22,
    anchors: ["trip.participant"],
    related: ["jelentkezes-allapota", "menetrend-teendok"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "naptar-es-idozona",
    role: "traveler",
    topic: { hu: "Túraoldal", en: "Trip page" },
    title: { hu: "Ünnepek és időzóna a túraoldalon", en: "Holidays and time zone on the trip page" },
    summary: {
      hu: "A túraoldal a te naptárad szerint jelzi a szüneteket, ünnepeket és az időeltérést.",
      en: "The trip page flags breaks, holidays and the time difference based on your own calendar.",
    },
    body: {
      hu: [
        "A túraoldal tetején jelvények mutatják, ha a túra iskolai szünetre, munkaszüneti napra vagy hosszú hétvégére esik — a profilodban megadott ország szerint.",
        "A Naptár és időzóna részben látod az időeltérést a helyszín és a te időzónád között, és a dátumokat mindkét idő szerint.",
      ],
      en: [
        "Badges at the top of the trip page show when the trip falls on a school break, public holiday or long weekend — based on the country in your profile.",
        "The Calendar and time zone section shows the time difference between the destination and your time zone, with dates in both.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nézd meg a jelvényeket a túraoldal tetején", en: "Check the badges at the top of the trip page" } },
      { at: 7, text: { hu: "Görgess a Naptár és időzóna részhez", en: "Scroll to Calendar and time zone" } },
      { at: 13, text: { hu: "Itt látod az időeltérést és a figyelmeztetéseket", en: "Here you see the time difference and alerts" } },
    ],
    duration: 22,
    anchors: ["trip.calendar"],
    related: ["keszsegek-es-erdeklodes", "jelentkezes-idopontra"],
    tryHref: "/",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
  {
    slug: "otlet-csatlakozas",
    role: "traveler",
    topic: { hu: "Ötletbörze", en: "Trip ideas" },
    title: { hu: "Csatlakozás egy ötlethez", en: "Joining a trip idea" },
    summary: {
      hu: "Jelzed, hogy te is mennél — létszámmal, hónapokkal, akár névtelenül.",
      en: "Show that you would go too — with group size, months, even anonymously.",
    },
    body: {
      hu: [
        "Az ötlet adatlapján a „Csatlakozom” gombbal jelzed az érdeklődésedet. Megadhatod, hányan jönnétek, melyik hónapok jók, és írhatsz egy megjegyzést.",
        "A csatlakozás nem jelentkezés: semmire nem kötelez, és bármikor visszavonhatod. Ha egy szervező túrát hirdet belőle, a túraoldalon jelentkezhetsz.",
      ],
      en: [
        "Press “I'm in” on the idea page to show your interest. You can say how many of you would come, which months suit you, and add a note.",
        "Joining is not applying: it commits you to nothing and you can withdraw at any time. If an organizer turns it into a trip, you apply on the trip page.",
      ],
    },
    steps: [
      { at: 0, text: { hu: "Nyisd meg egy ötlet adatlapját", en: "Open an idea’s page" } },
      { at: 6, text: { hu: "Nyomd meg a „Csatlakozom” gombot", en: "Press “I'm in”" } },
      { at: 12, text: { hu: "Add meg a létszámot, a hónapokat és a megjegyzést", en: "Set the group size, months and a note" } },
    ],
    duration: 20,
    anchors: ["idea.detail"],
    related: ["otlet-kituzese", "kereses-es-szures"],
    tryHref: "/ideas",
    updated: "2026-11",
    hasVideo: false,
    hasSlides: true,
  },
];
