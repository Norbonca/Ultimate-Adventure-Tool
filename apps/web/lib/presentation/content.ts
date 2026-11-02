/**
 * M211b — Promó bemutató (nyilvános): a jóváhagyott szervezői prezentáció (2026-11-02, 19 dia)
 * szövege. A magyar szöveg a jóváhagyott változat — nem módosítható; mellette az angol fordítás.
 * Design: design/D09_Search_Discover.pen „M211b — Bemutató lejátszó” (1440 / 390).
 */

export type Lang = "hu" | "en";
export type L = Record<Lang, string>;

export interface Card {
  n?: string;
  icon?: "lock" | "users" | "clock" | "badge-check";
  title: L;
  text: L;
}

interface Base {
  id: string;
  tone: "dark" | "light";
  eyebrow: L;
  title: L;
}

export interface CoverSlide extends Base {
  kind: "cover" | "closing";
  lead: L;
  image: string;
}

export interface CardsSlide extends Base {
  kind: "cards";
  columns: 2 | 3 | 5;
  cards: Card[];
}

export interface SplitSlide extends Base {
  kind: "split";
  lead: L;
  bullets: L[];
  image: string;
  phone?: string;
  badge?: L;
}

export interface PhonesSlide extends Base {
  kind: "phones";
  lead: L;
  bullets: L[];
  phones: { src: string; alt: L }[];
}

export type Slide = CoverSlide | CardsSlide | SplitSlide | PhonesSlide;

const img = (f: string) => `/presentation/${f}`;
const l = (hu: string, en: string): L => ({ hu, en });

export const SLIDES: Slide[] = [
  {
    id: "cover",
    kind: "cover",
    tone: "dark",
    eyebrow: l("trevu", "trevu"),
    title: l("A kalandtúrád szervezése egy helyen", "Organize your adventure trip in one place"),
    lead: l(
      "Meghirdetés, jelentkezők, teendők és közös költségek – egy felületen.",
      "Listing, applicants, tasks and shared costs – on one platform.",
    ),
    image: "/discover/hero.jpg",
  },
  {
    id: "miert",
    kind: "cards",
    tone: "dark",
    columns: 5,
    eyebrow: l("Mi a Trevu a szervezőnek?", "What is Trevu for organizers?"),
    title: l("Egy felület a meghirdetéstől az elszámolásig", "One platform from listing to settling up"),
    cards: [
      { n: "1", title: l("Meghirdetés", "Listing"), text: l("Varázsló, több időpont, a helyszín ideje", "Wizard, multiple dates, local time at the destination") },
      { n: "2", title: l("Jelentkezők", "Applicants"), text: l("Üzenet, elbírálás, várólista", "Message, review, waitlist") },
      { n: "3", title: l("Csapat", "Crew"), text: l("Szerepek, stábhelyek, check-in", "Roles, crew seats, check-in") },
      { n: "4", title: l("Teendők", "Tasks"), text: l("Fázisok, mérföldkövek, feladatok", "Phases, milestones, tasks") },
      { n: "5", title: l("Költségek", "Costs"), text: l("Több pénznem, kiegyenlítés", "Multiple currencies, settling up") },
    ],
  },
  {
    id: "terkep",
    kind: "cards",
    tone: "light",
    columns: 3,
    eyebrow: l("Egy felület, kilenc szolgáltatás", "One platform, nine services"),
    title: l("Minden, ami egy túra szervezéséhez kell", "Everything you need to organize a trip"),
    cards: [
      { title: l("Felfedezés és 3D térkép", "Discover and 3D map"), text: l("Itt talál rád a résztvevő", "Where participants find you") },
      { title: l("Meghirdetés varázslóval", "Listing with a wizard"), text: l("Négy lépés, sablonból is", "Four steps, from a template too") },
      { title: l("Túrasorozat", "Trip series"), text: l("Egy túra, több időpont", "One trip, multiple dates") },
      { title: l("Jelentkezők", "Applicants"), text: l("Üzenet, elbírálás, várólista", "Message, review, waitlist") },
      { title: l("Csapat", "Crew"), text: l("Szerepek, stábhelyek, check-in", "Roles, crew seats, check-in") },
      { title: l("Menetrend", "Timeline"), text: l("Fázisok, mérföldkövek, feladatok", "Phases, milestones, tasks") },
      { title: l("Közös költségek", "Shared costs"), text: l("Több pénznem, kiegyenlítés", "Multiple currencies, settling up") },
      { title: l("Naptár és időzóna", "Calendar and time zone"), text: l("Ünnepek és időeltérés előre jelezve", "Holidays and time differences flagged in advance") },
      { title: l("Ötletbörze", "Idea board"), text: l("Látod, mire várnak a kalandorok", "See what adventurers are waiting for") },
    ],
  },
  {
    id: "varazslo",
    kind: "split",
    tone: "light",
    eyebrow: l("Túraszervezés", "Trip organizing"),
    title: l("Túra létrehozása varázslóval", "Create a trip with the wizard"),
    lead: l(
      "Sablonból vagy nulláról, négy lépésben: kategória, alapadatok, részletek, közzététel.",
      "From a template or from scratch, in four steps: category, basics, details, publish.",
    ),
    bullets: [
      l("8 kalandkategória, saját paraméterekkel", "8 adventure categories with their own parameters"),
      l("Privát túra vagy nyilvános esemény", "Private trip or public event"),
      l("Jelentkezési határidő a helyszín idejében", "Application deadline in the destination's local time"),
    ],
    image: img("04-varazslo.jpg"),
  },
  {
    id: "sorozat",
    kind: "split",
    tone: "light",
    eyebrow: l("Túrasorozat", "Trip series"),
    title: l("Ugyanaz a túra, több időpontban", "The same trip on multiple dates"),
    lead: l(
      "Az új időpontnál csak a dátumot, a létszámot és az árat adod meg. A leírás, a program és a képek átjönnek.",
      "For a new date you only set the dates, group size and price. The description, itinerary and photos carry over.",
    ),
    bullets: [
      l("A Felfedezésben egy kártya, „5 időpont”", "One card in Discover: “5 dates”"),
      l("Időpontonként saját létszám és ár", "Group size and price per date"),
      l("A jelentkező választ időpontot", "Applicants pick their date"),
    ],
    image: img("05b-uj-idopont.jpg"),
  },
  {
    id: "csapat",
    kind: "split",
    tone: "light",
    eyebrow: l("Csapat és jelentkezők", "Crew and applicants"),
    title: l("Te döntöd el, ki jön a túrára", "You decide who joins the trip"),
    lead: l(
      "Minden jelentkezést az üzenetével együtt látsz, és egy kattintással döntesz.",
      "You see every application with its message and decide with one click.",
    ),
    bullets: [
      l("Elfogadás, várólista, elutasítás indoklással", "Accept, waitlist, or decline with a reason"),
      l("Szerepek: skipper, elsősegélynyújtó…", "Roles: skipper, first aider…"),
      l("Stábhelyek és check-in a túrán", "Crew seats and check-in on the trip"),
    ],
    image: img("06-jelentkezok.jpg"),
  },
  {
    id: "idovonal",
    kind: "split",
    tone: "light",
    eyebrow: l("Menetrend", "Timeline"),
    title: l("Minden teendő a helyén", "Every task in its place"),
    lead: l(
      "Fázisok, mérföldkövek és feladatok sablonból, a meghirdetéstől a túra napjáig.",
      "Phases, milestones and tasks from a template, from listing to the day of the trip.",
    ),
    bullets: [
      l("Haladás feladatonként és összesen", "Progress per task and overall"),
      l("A csapat állapota egy pillantással", "Crew status at a glance"),
      l("Betöltött és szabad pozíciók", "Filled and open positions"),
    ],
    image: img("07-idovonal.jpg"),
  },
  {
    id: "koltsegek",
    kind: "split",
    tone: "light",
    eyebrow: l("Költségmegosztás", "Cost sharing"),
    title: l("Közös költségek, vita nélkül", "Shared costs, no arguments"),
    lead: l(
      "Ki mit fizetett, és ki kinek mennyivel tartozik – a túra pénznemében.",
      "Who paid for what, and who owes whom how much – in the trip's currency.",
    ),
    bullets: [
      l("Bármilyen pénznem, hivatalos EKB-árfolyammal", "Any currency, at the official ECB rate"),
      l("Egyenlő, egyéni vagy százalékos elosztás", "Equal, custom or percentage split"),
      l("A lehető legkevesebb utalás, mindkét fél megerősítésével", "The fewest possible transfers, confirmed by both sides"),
    ],
    image: img("08a-koltsegek.jpg"),
    phone: img("08c-koltseg-mobil.jpg"),
  },
  {
    id: "naptar",
    kind: "split",
    tone: "light",
    eyebrow: l("Naptár és időzóna", "Calendar and time zone"),
    title: l("Ünnepek és időzónák, előre jelezve", "Holidays and time zones, flagged in advance"),
    lead: l(
      "A túraoldal a néző saját naptára szerint mutatja, mire számíthat.",
      "The trip page shows what to expect based on the viewer's own calendar.",
    ),
    bullets: [
      l("Iskolai szünet, munkaszünet, hosszú hétvége", "School holidays, public holidays, long weekends"),
      l("Időeltérés a helyszín és a néző között", "Time difference between destination and viewer"),
      l("A néző saját országának naptára szerint", "Based on the viewer's own country calendar"),
    ],
    image: img("09b-naptar-figyelmeztetes.jpg"),
  },
  {
    id: "otletborze",
    kind: "split",
    tone: "light",
    eyebrow: l("Ötletbörze", "Idea board"),
    title: l("Megmutatja, mire várnak a kalandorok", "Shows what adventurers are waiting for"),
    lead: l(
      "A közösség kitűzi az elképzelését, mások csatlakoznak, te elvállalod és túrává alakítod.",
      "The community posts an idea, others join, and you take it on and turn it into a trip.",
    ),
    bullets: [
      l("Célterület, időablak, időtartam", "Destination, time window, duration"),
      l("Látszik, hányan csatlakoztak", "You can see how many have joined"),
      l("Túráim → „Mire várnak” fül", "My trips → “Waiting for” tab"),
    ],
    image: img("10a-otletborze.jpg"),
    phone: img("10b-otlet-mobil.jpg"),
  },
  {
    id: "felfedezes",
    kind: "split",
    tone: "light",
    eyebrow: l("Felfedezés", "Discover"),
    title: l("Itt talál rád a résztvevő", "Where participants find you"),
    lead: l(
      "„Hova, mikor, mire vágysz?” Hely, idő és túratípus egyetlen keresőmezőben.",
      "“Where, when, what do you fancy?” Place, time and trip type in a single search box.",
    ),
    bullets: [
      l("8 kategória, szűrők, rendezés", "8 categories, filters, sorting"),
      l("Csempe-, lista- és 3D-nézet", "Tile, list and 3D views"),
      l("Szabad helyek és ár a kártyán", "Open spots and price on the card"),
    ],
    image: img("11-felfedezes-csempek.jpg"),
  },
  {
    id: "terkep3d",
    kind: "split",
    tone: "dark",
    eyebrow: l("3D térkép", "3D map"),
    title: l("A túrád a földgömbön", "Your trip on the globe"),
    lead: l("A résztvevő helyszín és évszak szerint böngészik.", "Participants browse by location and season."),
    bullets: [
      l("Idővonal hónapokkal és évszakokkal", "Timeline with months and seasons"),
      l("Kategória húzással szűrhető", "Filter categories by dragging"),
      l("Műholdas felszín, valódi helyszínek", "Satellite imagery, real locations"),
    ],
    image: img("12-3d-terkep.jpg"),
  },
  {
    id: "turaoldal",
    kind: "split",
    tone: "light",
    eyebrow: l("Túraoldal és jelentkezés", "Trip page and applying"),
    title: l("Jelentkezés a választott időpontra", "Apply for the chosen date"),
    lead: l(
      "Időpontok, ár, nehézség és szabad helyek; a résztvevő időpontot választ, és üzen neked.",
      "Dates, price, difficulty and open spots; participants pick a date and send you a message.",
    ),
    bullets: [
      l("Betelt időpont: várólista", "Full date: waitlist"),
      l("Állapot a túra oldalán: „Függőben”", "Status on the trip page: “Pending”"),
      l("Dátumok a helyszín idejében", "Dates in the destination's local time"),
    ],
    image: img("13b-jelentkezes.jpg"),
  },
  {
    id: "profil",
    kind: "split",
    tone: "light",
    eyebrow: l("Profil", "Profile"),
    title: l("Érdeklődés és tapasztalat a profilban", "Interests and experience in your profile"),
    lead: l("Kategóriánként és alkategóriánként, kezdőtől profiig.", "By category and subcategory, from beginner to pro."),
    bullets: [
      l("Gyors regisztráció e-mail-címmel", "Quick sign-up with your email address"),
      l("Ország és időzóna a saját naptárhoz", "Country and time zone for your own calendar"),
      l("Saját adatvédelmi beállítások", "Your own privacy settings"),
    ],
    image: img("14-keszsegek.jpg"),
  },
  {
    id: "mobil",
    kind: "phones",
    tone: "dark",
    eyebrow: l("Mobil és nyelvek", "Mobile and languages"),
    title: l("Mobilböngészőben is teljes értékű", "Fully featured in a mobile browser"),
    lead: l(
      "Minden oldal telefonra igazodik; az ár és a fő gomb mindig látható.",
      "Every page adapts to your phone; the price and the main button are always visible.",
    ),
    bullets: [l("Magyar és angol felület", "Hungarian and English interface"), l("Böngészőből, telepítés nélkül", "In the browser, no installation")],
    phones: [
      { src: img("15a-mobil-turaoldal.jpg"), alt: l("Telefonon a Split vitorlás túra oldala, alul ár és Jelentkezem gomb", "The Split sailing trip page on a phone, with price and Apply button at the bottom") },
      { src: img("15b-mobil-allapot.jpg"), alt: l("Telefonon a jelentkezés állapota: Függőben, a résztvevő megjegyzésével", "Application status on a phone: Pending, with the participant's note") },
      { src: img("15c-mobil-koltsegek.jpg"), alt: l("Telefonon a résztvevő költségnézete: tartozás és tételek", "The participant's cost view on a phone: balance and items") },
    ],
  },
  {
    id: "biztonsag",
    kind: "cards",
    tone: "light",
    columns: 2,
    eyebrow: l("Biztonság és adatkezelés", "Security and data handling"),
    title: l("Minden adatot csak az lát, akire tartozik", "Every piece of data is visible only to those it concerns"),
    cards: [
      { icon: "lock", title: l("Mindenki csak a sajátját látja", "Everyone sees only their own"), text: l("A jelentkezéseket, a költségeket és a kiegyenlítéseket csak a túra szervezője és résztvevői látják.", "Applications, costs and settlements are visible only to the trip's organizer and participants.") },
      { icon: "users", title: l("A szervező dönt", "The organizer decides"), text: l("Kézi elbírálás, várólista, eltávolítás; költséget alapbeállításban csak a szervező rögzít.", "Manual review, waitlist, removal; by default only the organizer records costs.") },
      { icon: "clock", title: l("Visszavonható törlés", "Reversible deletion"), text: l("Fióktörlés 30 napos türelmi idővel; a jelentkező nélküli törölt túra visszaállítható.", "Account deletion with a 30-day grace period; a deleted trip without applicants can be restored.") },
      { icon: "badge-check", title: l("Rendszeres biztonsági ellenőrzés", "Regular security reviews"), text: l("Havonta átnézzük a rendszert, és frissítjük az összetevőit; minden változtatás tesztelés után kerül ki.", "We review the system monthly and update its components; every change ships only after testing.") },
    ],
  },
  {
    id: "kovetkezik",
    kind: "cards",
    tone: "light",
    columns: 3,
    eyebrow: l("Fejlesztési terv", "Roadmap"),
    title: l("Ami még jön", "What's coming next"),
    cards: [
      { title: l("Online fizetés és előleg", "Online payment and deposits"), text: l("A résztvevő a Trevun fizet; előleg és részletfizetés", "Participants pay on Trevu; deposits and instalments") },
      { title: l("Túragaléria", "Trip gallery"), text: l("Hivatalos képek tőled, közös album a résztvevőktől", "Official photos from you, a shared album from participants") },
      { title: l("Értékelések", "Reviews"), text: l("Vélemények a túráról és a szervezőről", "Reviews of the trip and the organizer") },
      { title: l("Rugalmas dátum", "Flexible dates"), text: l("„2027. január–március, 8 nap”: a pontos dátumot az érdeklődés után rögzíted", "“January–March 2027, 8 days”: you fix the exact dates once interest is in") },
      { title: l("Saját arculatú oldal", "Your own branded page"), text: l("A te színeid és logód, a Trevu oldalszerkezetén", "Your colours and logo on Trevu's page structure") },
      { title: l("Értesítések", "Notifications"), text: l("E-mail és jelzés a felületen", "Email and in-app alerts") },
    ],
  },
  {
    id: "csomagok",
    kind: "split",
    tone: "light",
    badge: l("Most minden funkció ingyenes", "Every feature is free right now"),
    eyebrow: l("Csomagok", "Plans"),
    title: l("Személyes használatra ingyenes", "Free for personal use"),
    lead: l(
      "Előfizetést az fizet, aki üzletszerűen szervez. Költségmegosztó túrákhoz a Trevu ingyenes.",
      "Only those who organize commercially pay a subscription. For cost-sharing trips Trevu is free.",
    ),
    bullets: [
      l("Kalandor: ingyen", "Adventurer: free"),
      l("Túravezető: 9,90 €/hó", "Guide: €9.90/month"),
      l("Expedíció: 39,90 €/hó", "Expedition: €39.90/month"),
      l("Bázistábor: egyedi ár", "Basecamp: custom pricing"),
    ],
    image: img("20-arazas.jpg"),
  },
  {
    id: "zaras",
    kind: "closing",
    tone: "dark",
    eyebrow: l("Próbáld ki", "Try it"),
    title: l("Hirdesd meg az első túrádat", "List your first trip"),
    lead: l(
      "Regisztrálj, és a varázsló végigvezet az első meghirdetésen. Ma minden funkció ingyenes.",
      "Sign up and the wizard walks you through your first listing. Every feature is free today.",
    ),
    image: "/discover/hero.jpg",
  },
];

/** Automatikus léptetés diánként (mp). */
export const SLIDE_SECONDS = 7;
