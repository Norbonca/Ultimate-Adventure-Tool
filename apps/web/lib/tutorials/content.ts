/**
 * M211 — Útmutatók: a V1 tartalom (ND-07: előre feltöltött tartalom, admin később).
 * Design: D21 `bE4n6` / `t09vs` (lista), `q66Ci` / `N3aUG` (adatlap), `mblRQ` / `Y9gr7` / `e9ero8` (súgó).
 *
 * i18n-skip: ez tartalom-adat (minden szöveg hu + en mezővel), nem UI-felirat — a felület
 * szövegei a `tutorials.*` kulcsokon vannak. A DB-táblás tárolás (`tutorials`, `tutorial_steps`,
 * `tutorial_anchors`, spec gap mátrix) az admin-felülettel együtt jön; addig ez a forrás, a
 * `lib/tutorials/index.ts` lekérdezései mögé zárva, hogy a csere ne érintse a felületet.
 *
 * Fájlok: plakát `public/tutorials/posters/<slug>.jpg`, videó `public/tutorials/videos/<slug>.mp4`
 * (csak ha `hasVideo`), felirat a lépésekből: `/api/v1/tutorials/<slug>/captions/<locale>` (WebVTT).
 * A lépések `at` értéke (mp) a videó időbélyege: a lépés felirata eddig a pillanattól a
 * következő lépésig látszik, és a lépésre kattintva ide ugrik a lejátszás.
 */

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
    anchors: ["trips.new"],
    related: ["uj-idopont", "jelentkezok-elbiralasa"],
    tryHref: "/trips/new",
    updated: "2026-11",
    hasVideo: false,
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
    anchors: ["trip.applications"],
    related: ["uj-idopont", "menetrend-teendok"],
    tryHref: "/trips",
    updated: "2026-11",
    hasVideo: false,
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
        "A Felfedezés a Trevu nyitóoldala. A keresőbe írhatsz túranevet, helyet vagy országot, a szűrőkkel pedig szűkítheted a találatokat kategóriára, időpontra és árra.",
        "A találatokat csempékben, listában vagy a 3D térképen nézheted. A több időpontos túrák egy kártyán jelennek meg, az időpontokkal együtt.",
      ],
      en: [
        "Discover is Trevu’s home page. Type a trip name, place or country into the search, and narrow the results with filters for category, dates and price.",
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
  },
];
