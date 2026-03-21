// ============================================================================
// Seed Data: Categories, Sub-disciplines, Environments, Experience Levels
// ============================================================================
// All 8 adventure categories with localized names, sub-disciplines,
// environment types, and category-specific experience level descriptions.
// ============================================================================

// Drizzle ORM jsonb columns need explicit typing for seed data
// Using generic record types to avoid strict inference issues with jsonb fields

// ============================================================================
// 1. CATEGORIES — 8 adventure categories
// ============================================================================

interface CategorySeed {
  name: string;
  nameLocalized: Record<string, string>;
  description: string;
  descriptionLocalized: Record<string, string>;
  iconName: string;
  colorHex: string;
  status: 'active' | 'draft' | 'deprecated';
  displayOrder: number;
  parameterSchema?: Record<string, unknown>;
}

export const categoriesData: CategorySeed[] = [
  {
    name: 'Hiking',
    nameLocalized: {
      hu: 'Túrázás',
      en: 'Hiking',
      de: 'Wandern',
      sk: 'Turistika',
      hr: 'Planinarenje',
      sl: 'Pohodništvo',
      ro: 'Drumeție',
      cs: 'Turistika',
    },
    description:
      'Explore trails and paths through diverse landscapes, from gentle day walks to challenging multi-day treks across mountains, forests, and coastlines.',
    descriptionLocalized: {
      hu: 'Fedezd fel az ösvényeket és utakat változatos tájakon, a könnyű napi sétáktól a kihívást jelentő többnapos túrákig hegyeken, erdőkön és tengerpartokon keresztül.',
      en: 'Explore trails and paths through diverse landscapes, from gentle day walks to challenging multi-day treks across mountains, forests, and coastlines.',
    },
    iconName: 'footprints',
    colorHex: '#22C55E',
    status: 'active',
    displayOrder: 1,
  },
  {
    name: 'Mountaineering',
    nameLocalized: {
      hu: 'Hegymászás',
      en: 'Mountaineering',
      de: 'Bergsteigen',
      sk: 'Horolezectvo',
      hr: 'Planinarstvo',
      sl: 'Alpinizem',
      ro: 'Alpinism',
      cs: 'Horolezectví',
    },
    description:
      'Scale peaks and rock faces with technical climbing, from bouldering and sport routes to high-altitude alpine expeditions requiring specialized gear and skills.',
    descriptionLocalized: {
      hu: 'Hódítsd meg a csúcsokat és sziklafalakat technikai mászással, a boulderingtől és sportmászástól a magashegyi alpesi expedíciókig, amelyek speciális felszerelést és tudást igényelnek.',
      en: 'Scale peaks and rock faces with technical climbing, from bouldering and sport routes to high-altitude alpine expeditions requiring specialized gear and skills.',
    },
    iconName: 'mountain',
    colorHex: '#F97316',
    status: 'active',
    displayOrder: 2,
  },
  {
    name: 'Water Sports',
    nameLocalized: {
      hu: 'Vízi sportok',
      en: 'Water Sports',
      de: 'Wassersport',
      sk: 'Vodné športy',
      hr: 'Vodeni sportovi',
      sl: 'Vodni športi',
      ro: 'Sporturi nautice',
      cs: 'Vodní sporty',
    },
    description:
      'Adventure on the water — from sailing and kayaking to surfing, kitesurfing, and diving. Explore coastlines, open seas, rivers, and lakes.',
    descriptionLocalized: {
      hu: 'Kaland a vízen — vitorlázástól és kajakozástól a szörfözésen, kiteszörfön át a búvárkodásig. Fedezd fel a tengerpartokat, nyílt vizeket, folyókat és tavakat.',
      en: 'Adventure on the water — from sailing and kayaking to surfing, kitesurfing, and diving. Explore coastlines, open seas, rivers, and lakes.',
    },
    iconName: 'waves',
    colorHex: '#3B82F6',
    status: 'active',
    displayOrder: 3,
  },
  {
    name: 'Motorsport',
    nameLocalized: {
      hu: 'Motorsport',
      en: 'Motorsport',
      de: 'Motorsport',
      sk: 'Motorsport',
      hr: 'Motorsport',
      sl: 'Motošport',
      ro: 'Motorsport',
      cs: 'Motorsport',
    },
    description:
      'Off-road adrenaline with motorcycles, ATVs, and 4x4 vehicles. Conquer enduro trails, motocross tracks, desert rallies, and mountain off-road routes.',
    descriptionLocalized: {
      hu: 'Terepen az adrenalin motorokkal, ATV-kkel és 4x4 járművekkel. Hódítsd meg az enduro ösvényeket, motocross pályákat, sivatagi rallykat és hegyi terepeket.',
      en: 'Off-road adrenaline with motorcycles, ATVs, and 4x4 vehicles. Conquer enduro trails, motocross tracks, desert rallies, and mountain off-road routes.',
    },
    iconName: 'gauge',
    colorHex: '#B91C1C',
    status: 'active',
    displayOrder: 4,
  },
  {
    name: 'Cycling',
    nameLocalized: {
      hu: 'Kerékpározás',
      en: 'Cycling',
      de: 'Radfahren',
      sk: 'Cyklistika',
      hr: 'Biciklizam',
      sl: 'Kolesarjenje',
      ro: 'Ciclism',
      cs: 'Cyklistika',
    },
    description:
      'Two-wheeled adventures across road, mountain, and gravel terrain. From scenic road cycling tours to technical mountain biking and multi-day bikepacking trips.',
    descriptionLocalized: {
      hu: 'Két keréken a kaland közúton, hegyben és terepen. Festői országúti túráktól a technikai mountain bikingtól a többnapos bikepacking utakig.',
      en: 'Two-wheeled adventures across road, mountain, and gravel terrain. From scenic road cycling tours to technical mountain biking and multi-day bikepacking trips.',
    },
    iconName: 'bike',
    colorHex: '#EAB308',
    status: 'active',
    displayOrder: 5,
  },
  {
    name: 'Running',
    nameLocalized: {
      hu: 'Futás',
      en: 'Running',
      de: 'Laufen',
      sk: 'Beh',
      hr: 'Trčanje',
      sl: 'Tek',
      ro: 'Alergare',
      cs: 'Běh',
    },
    description:
      'Push your limits on trails and roads. From scenic trail runs and obstacle courses to demanding ultra marathons through mountains and wilderness.',
    descriptionLocalized: {
      hu: 'Feszítsd a határaidat ösvényeken és utakon. Festői terepfutásoktól és akadálypályáktól a megterhelő ultra maratonokig hegyeken és vadonban.',
      en: 'Push your limits on trails and roads. From scenic trail runs and obstacle courses to demanding ultra marathons through mountains and wilderness.',
    },
    iconName: 'person-standing',
    colorHex: '#EF4444',
    status: 'active',
    displayOrder: 6,
  },
  {
    name: 'Winter Sports',
    nameLocalized: {
      hu: 'Téli sportok',
      en: 'Winter Sports',
      de: 'Wintersport',
      sk: 'Zimné športy',
      hr: 'Zimski sportovi',
      sl: 'Zimski športi',
      ro: 'Sporturi de iarnă',
      cs: 'Zimní sporty',
    },
    description:
      'Snow and ice adventures — alpine and cross-country skiing, snowboarding, ski touring, and winter hiking through frozen landscapes.',
    descriptionLocalized: {
      hu: 'Hó és jég kalandok — alpesi és sífutás, snowboard, sítura és téli túrázás fagyott tájakon.',
      en: 'Snow and ice adventures — alpine and cross-country skiing, snowboarding, ski touring, and winter hiking through frozen landscapes.',
    },
    iconName: 'snowflake',
    colorHex: '#06B6D4',
    status: 'active',
    displayOrder: 7,
  },
  {
    name: 'Expedition',
    nameLocalized: {
      hu: 'Expedíció',
      en: 'Expedition',
      de: 'Expedition',
      sk: 'Expedícia',
      hr: 'Ekspedicija',
      sl: 'Odprava',
      ro: 'Expediție',
      cs: 'Expedice',
    },
    description:
      'Multi-day, multi-sport journeys into remote and challenging environments. Desert crossings, arctic treks, jungle explorations, and overland adventures.',
    descriptionLocalized: {
      hu: 'Többnapos, több sportágat ötvöző utak távoli és kihívást jelentő környezetekbe. Sivatagi átkelések, sarkvidéki túrák, dzsungel felfedezések és szárazföldi kalandok.',
      en: 'Multi-day, multi-sport journeys into remote and challenging environments. Desert crossings, arctic treks, jungle explorations, and overland adventures.',
    },
    iconName: 'compass',
    colorHex: '#8B5CF6',
    status: 'active',
    displayOrder: 8,
  },
];

// ============================================================================
// 2. SUB-DISCIPLINES
// ============================================================================
// categoryName is used as a lookup key to link to the parent category at seed time.
// The actual categoryId (UUID) will be resolved during the seeding process.

interface SubDisciplineSeed {
  categoryName: string;
  name: string;
  nameLocalized: Record<string, string>;
  description?: string;
  status: 'active' | 'draft' | 'deprecated';
  displayOrder: number;
}

export const subDisciplinesData: SubDisciplineSeed[] = [
  // ── Hiking ────────────────────────────────────────────────────────────
  {
    categoryName: 'Hiking',
    name: 'Day Hiking',
    nameLocalized: { hu: 'Napi túra', en: 'Day Hiking', de: 'Tageswanderung' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Hiking',
    name: 'Multi-day Trekking',
    nameLocalized: { hu: 'Többnapos túra', en: 'Multi-day Trekking', de: 'Mehrtageswanderung' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Hiking',
    name: 'Trail Running',
    nameLocalized: { hu: 'Terepfutás', en: 'Trail Running', de: 'Trailrunning' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Hiking',
    name: 'Nordic Walking',
    nameLocalized: { hu: 'Nordic walking', en: 'Nordic Walking', de: 'Nordic Walking' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Hiking',
    name: 'Pilgrim Walk',
    nameLocalized: { hu: 'Zarándokút', en: 'Pilgrim Walk', de: 'Pilgerweg' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Hiking',
    name: 'Via Ferrata',
    nameLocalized: { hu: 'Via ferrata', en: 'Via Ferrata', de: 'Klettersteig' },
    status: 'active',
    displayOrder: 6,
  },
  {
    categoryName: 'Hiking',
    name: 'Snowshoeing',
    nameLocalized: { hu: 'Hócipős túra', en: 'Snowshoeing', de: 'Schneeschuhwandern' },
    status: 'active',
    displayOrder: 7,
  },

  // ── Mountain ──────────────────────────────────────────────────────────
  {
    categoryName: 'Mountaineering',
    name: 'Sport Climbing',
    nameLocalized: { hu: 'Sportmászás', en: 'Sport Climbing', de: 'Sportklettern' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Mountaineering',
    name: 'Alpine Climbing',
    nameLocalized: { hu: 'Alpesi mászás', en: 'Alpine Climbing', de: 'Alpinklettern' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Mountaineering',
    name: 'Bouldering',
    nameLocalized: { hu: 'Boulderezés', en: 'Bouldering', de: 'Bouldern' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Mountaineering',
    name: 'Ice Climbing',
    nameLocalized: { hu: 'Jégmászás', en: 'Ice Climbing', de: 'Eisklettern' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Mountaineering',
    name: 'Ski Mountaineering',
    nameLocalized: { hu: 'Sí-hegymászás', en: 'Ski Mountaineering', de: 'Skibergsteigen' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Mountaineering',
    name: 'High Altitude',
    nameLocalized: { hu: 'Magashegyi mászás', en: 'High Altitude', de: 'Höhenbergsteigen' },
    status: 'active',
    displayOrder: 6,
  },

  // ── Water Sports ──────────────────────────────────────────────────────
  {
    categoryName: 'Water Sports',
    name: 'Sailing',
    nameLocalized: { hu: 'Vitorlázás', en: 'Sailing', de: 'Segeln' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Water Sports',
    name: 'Kayaking & Canoeing',
    nameLocalized: { hu: 'Kajakozás és kenuzás', en: 'Kayaking & Canoeing', de: 'Kanu & Kajak' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Water Sports',
    name: 'Surfing',
    nameLocalized: { hu: 'Szörfözés', en: 'Surfing', de: 'Surfen' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Water Sports',
    name: 'Kitesurfing',
    nameLocalized: { hu: 'Kiteszörf', en: 'Kitesurfing', de: 'Kitesurfen' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Water Sports',
    name: 'Stand-Up Paddling',
    nameLocalized: { hu: 'SUP', en: 'Stand-Up Paddling', de: 'Stand-Up-Paddling' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Water Sports',
    name: 'Rafting',
    nameLocalized: { hu: 'Rafting', en: 'Rafting', de: 'Rafting' },
    status: 'active',
    displayOrder: 6,
  },
  {
    categoryName: 'Water Sports',
    name: 'Diving',
    nameLocalized: { hu: 'Búvárkodás', en: 'Diving', de: 'Tauchen' },
    status: 'active',
    displayOrder: 7,
  },
  {
    categoryName: 'Water Sports',
    name: 'Snorkeling',
    nameLocalized: { hu: 'Snorkelezés', en: 'Snorkeling', de: 'Schnorcheln' },
    status: 'active',
    displayOrder: 8,
  },

  // ── Motorsport ────────────────────────────────────────────────────────
  {
    categoryName: 'Motorsport',
    name: 'Enduro',
    nameLocalized: { hu: 'Enduro', en: 'Enduro', de: 'Enduro' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Motorsport',
    name: 'Motocross',
    nameLocalized: { hu: 'Motocross', en: 'Motocross', de: 'Motocross' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Motorsport',
    name: 'ATV / Quad',
    nameLocalized: { hu: 'ATV / Quad', en: 'ATV / Quad', de: 'ATV / Quad' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Motorsport',
    name: '4x4 Off-road',
    nameLocalized: { hu: '4x4 terepjárózás', en: '4x4 Off-road', de: '4x4 Offroad' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Motorsport',
    name: 'Rally',
    nameLocalized: { hu: 'Rally', en: 'Rally', de: 'Rallye' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Motorsport',
    name: 'Snow Motoring',
    nameLocalized: { hu: 'Hómotoros túra', en: 'Snow Motoring', de: 'Schneemobil' },
    status: 'active',
    displayOrder: 6,
  },

  // ── Cycling ───────────────────────────────────────────────────────────
  {
    categoryName: 'Cycling',
    name: 'Road Cycling',
    nameLocalized: { hu: 'Országúti kerékpározás', en: 'Road Cycling', de: 'Rennradfahren' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Cycling',
    name: 'Mountain Biking',
    nameLocalized: { hu: 'Mountain bike', en: 'Mountain Biking', de: 'Mountainbiking' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Cycling',
    name: 'Gravel',
    nameLocalized: { hu: 'Gravel', en: 'Gravel', de: 'Gravel' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Cycling',
    name: 'Bikepacking',
    nameLocalized: { hu: 'Bikepacking', en: 'Bikepacking', de: 'Bikepacking' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Cycling',
    name: 'Downhill',
    nameLocalized: { hu: 'Downhill', en: 'Downhill', de: 'Downhill' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Cycling',
    name: 'E-bike Touring',
    nameLocalized: { hu: 'E-bike túra', en: 'E-bike Touring', de: 'E-Bike-Touren' },
    status: 'active',
    displayOrder: 6,
  },

  // ── Running ───────────────────────────────────────────────────────────
  {
    categoryName: 'Running',
    name: 'Trail Running',
    nameLocalized: { hu: 'Terepfutás', en: 'Trail Running', de: 'Trailrunning' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Running',
    name: 'Ultra Running',
    nameLocalized: { hu: 'Ultra futás', en: 'Ultra Running', de: 'Ultra Running' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Running',
    name: 'Road Running',
    nameLocalized: { hu: 'Közúti futás', en: 'Road Running', de: 'Straßenlauf' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Running',
    name: 'Obstacle Course',
    nameLocalized: { hu: 'Akadályfutás', en: 'Obstacle Course', de: 'Hindernislauf' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Running',
    name: 'Orienteering',
    nameLocalized: { hu: 'Tájfutás', en: 'Orienteering', de: 'Orientierungslauf' },
    status: 'active',
    displayOrder: 5,
  },

  // ── Winter Sports ─────────────────────────────────────────────────────
  {
    categoryName: 'Winter Sports',
    name: 'Alpine Skiing',
    nameLocalized: { hu: 'Alpesi síelés', en: 'Alpine Skiing', de: 'Alpinski' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Winter Sports',
    name: 'Cross-country Skiing',
    nameLocalized: { hu: 'Sífutás', en: 'Cross-country Skiing', de: 'Langlauf' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Winter Sports',
    name: 'Snowboarding',
    nameLocalized: { hu: 'Snowboard', en: 'Snowboarding', de: 'Snowboarden' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Winter Sports',
    name: 'Ski Touring',
    nameLocalized: { hu: 'Sítura', en: 'Ski Touring', de: 'Skitour' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Winter Sports',
    name: 'Ice Skating',
    nameLocalized: { hu: 'Korcsolyázás', en: 'Ice Skating', de: 'Eislaufen' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Winter Sports',
    name: 'Winter Hiking',
    nameLocalized: { hu: 'Téli túra', en: 'Winter Hiking', de: 'Winterwandern' },
    status: 'active',
    displayOrder: 6,
  },

  // ── Expedition ────────────────────────────────────────────────────────
  {
    categoryName: 'Expedition',
    name: 'Multi-sport',
    nameLocalized: { hu: 'Multisport', en: 'Multi-sport', de: 'Multisport' },
    status: 'active',
    displayOrder: 1,
  },
  {
    categoryName: 'Expedition',
    name: 'Desert Crossing',
    nameLocalized: { hu: 'Sivatagi átkelés', en: 'Desert Crossing', de: 'Wüstendurchquerung' },
    status: 'active',
    displayOrder: 2,
  },
  {
    categoryName: 'Expedition',
    name: 'Arctic / Antarctic',
    nameLocalized: { hu: 'Sarkvidéki', en: 'Arctic / Antarctic', de: 'Arktis / Antarktis' },
    status: 'active',
    displayOrder: 3,
  },
  {
    categoryName: 'Expedition',
    name: 'Jungle / Rainforest',
    nameLocalized: { hu: 'Dzsungel / Esőerdő', en: 'Jungle / Rainforest', de: 'Dschungel / Regenwald' },
    status: 'active',
    displayOrder: 4,
  },
  {
    categoryName: 'Expedition',
    name: 'Cave Exploration',
    nameLocalized: { hu: 'Barlangi felfedezés', en: 'Cave Exploration', de: 'Höhlenforschung' },
    status: 'active',
    displayOrder: 5,
  },
  {
    categoryName: 'Expedition',
    name: 'Overland Journey',
    nameLocalized: { hu: 'Szárazföldi út', en: 'Overland Journey', de: 'Überlandreise' },
    status: 'active',
    displayOrder: 6,
  },
];

// ============================================================================
// 3. ENVIRONMENTS — terrain/environment types per sub-discipline
// ============================================================================
// subDisciplineName is used as a lookup key to link to the parent sub-discipline.

interface EnvironmentSeed {
  subDisciplineName: string;
  name: string;
  nameLocalized: Record<string, string>;
  sortOrder: number;
};

export const environmentsData: EnvironmentSeed[] = [
  // ── Hiking: Day Hiking ────────────────────────────────────────────────
  { subDisciplineName: 'Day Hiking', name: 'Forest trails', nameLocalized: { hu: 'Erdei ösvények', en: 'Forest trails', de: 'Waldwege' }, sortOrder: 1 },
  { subDisciplineName: 'Day Hiking', name: 'Alpine meadows', nameLocalized: { hu: 'Alpesi rétek', en: 'Alpine meadows', de: 'Almwiesen' }, sortOrder: 2 },
  { subDisciplineName: 'Day Hiking', name: 'Coastal paths', nameLocalized: { hu: 'Tengerparti ösvények', en: 'Coastal paths', de: 'Küstenwege' }, sortOrder: 3 },
  { subDisciplineName: 'Day Hiking', name: 'River valleys', nameLocalized: { hu: 'Folyóvölgyek', en: 'River valleys', de: 'Flusstäler' }, sortOrder: 4 },
  { subDisciplineName: 'Day Hiking', name: 'Hill country', nameLocalized: { hu: 'Dombvidék', en: 'Hill country', de: 'Hügelland' }, sortOrder: 5 },

  // ── Hiking: Multi-day Trekking ────────────────────────────────────────
  { subDisciplineName: 'Multi-day Trekking', name: 'Mountain hut routes', nameLocalized: { hu: 'Menedékház-túrák', en: 'Mountain hut routes', de: 'Hüttenwanderungen' }, sortOrder: 1 },
  { subDisciplineName: 'Multi-day Trekking', name: 'High altitude traverse', nameLocalized: { hu: 'Magashegyi átkelés', en: 'High altitude traverse', de: 'Höhenwanderung' }, sortOrder: 2 },
  { subDisciplineName: 'Multi-day Trekking', name: 'Wilderness camping', nameLocalized: { hu: 'Vadon kempingezés', en: 'Wilderness camping', de: 'Wildniscamping' }, sortOrder: 3 },
  { subDisciplineName: 'Multi-day Trekking', name: 'Long-distance trails', nameLocalized: { hu: 'Távolsági útvonalak', en: 'Long-distance trails', de: 'Fernwanderwege' }, sortOrder: 4 },

  // ── Hiking: Trail Running ─────────────────────────────────────────────
  { subDisciplineName: 'Trail Running', name: 'Forest singletrack', nameLocalized: { hu: 'Erdei ösvény', en: 'Forest singletrack', de: 'Wald-Singletrail' }, sortOrder: 1 },
  { subDisciplineName: 'Trail Running', name: 'Mountain trails', nameLocalized: { hu: 'Hegyi ösvények', en: 'Mountain trails', de: 'Bergpfade' }, sortOrder: 2 },
  { subDisciplineName: 'Trail Running', name: 'Coastal trails', nameLocalized: { hu: 'Tengerparti terepek', en: 'Coastal trails', de: 'Küstentrails' }, sortOrder: 3 },

  // ── Hiking: Nordic Walking ────────────────────────────────────────────
  { subDisciplineName: 'Nordic Walking', name: 'Park paths', nameLocalized: { hu: 'Park ösvények', en: 'Park paths', de: 'Parkwege' }, sortOrder: 1 },
  { subDisciplineName: 'Nordic Walking', name: 'Forest tracks', nameLocalized: { hu: 'Erdei utak', en: 'Forest tracks', de: 'Forstwege' }, sortOrder: 2 },
  { subDisciplineName: 'Nordic Walking', name: 'Flat terrain', nameLocalized: { hu: 'Sík terep', en: 'Flat terrain', de: 'Flachland' }, sortOrder: 3 },

  // ── Hiking: Pilgrim Walk ──────────────────────────────────────────────
  { subDisciplineName: 'Pilgrim Walk', name: 'Historic routes', nameLocalized: { hu: 'Történelmi útvonalak', en: 'Historic routes', de: 'Historische Wege' }, sortOrder: 1 },
  { subDisciplineName: 'Pilgrim Walk', name: 'Rural paths', nameLocalized: { hu: 'Vidéki ösvények', en: 'Rural paths', de: 'Ländliche Wege' }, sortOrder: 2 },
  { subDisciplineName: 'Pilgrim Walk', name: 'Mixed terrain', nameLocalized: { hu: 'Vegyes terep', en: 'Mixed terrain', de: 'Mischgelände' }, sortOrder: 3 },

  // ── Hiking: Via Ferrata ───────────────────────────────────────────────
  { subDisciplineName: 'Via Ferrata', name: 'Alpine rock', nameLocalized: { hu: 'Alpesi szikla', en: 'Alpine rock', de: 'Alpiner Fels' }, sortOrder: 1 },
  { subDisciplineName: 'Via Ferrata', name: 'Canyon routes', nameLocalized: { hu: 'Szurdok útvonalak', en: 'Canyon routes', de: 'Schluchtrouten' }, sortOrder: 2 },
  { subDisciplineName: 'Via Ferrata', name: 'Dolomite faces', nameLocalized: { hu: 'Dolomit falak', en: 'Dolomite faces', de: 'Dolomitwände' }, sortOrder: 3 },

  // ── Hiking: Snowshoeing ───────────────────────────────────────────────
  { subDisciplineName: 'Snowshoeing', name: 'Snow-covered trails', nameLocalized: { hu: 'Havas ösvények', en: 'Snow-covered trails', de: 'Verschneite Wege' }, sortOrder: 1 },
  { subDisciplineName: 'Snowshoeing', name: 'Alpine terrain', nameLocalized: { hu: 'Alpesi terep', en: 'Alpine terrain', de: 'Alpines Gelände' }, sortOrder: 2 },
  { subDisciplineName: 'Snowshoeing', name: 'Forest snowfields', nameLocalized: { hu: 'Erdei hómezők', en: 'Forest snowfields', de: 'Waldschneeflächen' }, sortOrder: 3 },

  // ── Mountaineering: Sport Climbing ────────────────────────────────────
  { subDisciplineName: 'Sport Climbing', name: 'Indoor gym', nameLocalized: { hu: 'Mászóterem', en: 'Indoor gym', de: 'Kletterhalle' }, sortOrder: 1 },
  { subDisciplineName: 'Sport Climbing', name: 'Outdoor crag', nameLocalized: { hu: 'Szabadtéri szikla', en: 'Outdoor crag', de: 'Klettergarten' }, sortOrder: 2 },
  { subDisciplineName: 'Sport Climbing', name: 'Limestone walls', nameLocalized: { hu: 'Mészkő falak', en: 'Limestone walls', de: 'Kalksteinwände' }, sortOrder: 3 },

  // ── Mountaineering: Alpine Climbing ───────────────────────────────────
  { subDisciplineName: 'Alpine Climbing', name: 'Mixed terrain', nameLocalized: { hu: 'Vegyes terep', en: 'Mixed terrain', de: 'Mischgelände' }, sortOrder: 1 },
  { subDisciplineName: 'Alpine Climbing', name: 'Ridge climbing', nameLocalized: { hu: 'Gerincmászás', en: 'Ridge climbing', de: 'Gratklettern' }, sortOrder: 2 },
  { subDisciplineName: 'Alpine Climbing', name: 'North face routes', nameLocalized: { hu: 'Északi fal útvonalak', en: 'North face routes', de: 'Nordwandrouten' }, sortOrder: 3 },

  // ── Mountaineering: Bouldering ────────────────────────────────────────
  { subDisciplineName: 'Bouldering', name: 'Indoor wall', nameLocalized: { hu: 'Falmászás', en: 'Indoor wall', de: 'Boulderhalle' }, sortOrder: 1 },
  { subDisciplineName: 'Bouldering', name: 'Outdoor boulders', nameLocalized: { hu: 'Szabadtéri sziklák', en: 'Outdoor boulders', de: 'Felsbrocken' }, sortOrder: 2 },
  { subDisciplineName: 'Bouldering', name: 'River boulders', nameLocalized: { hu: 'Folyóparti sziklák', en: 'River boulders', de: 'Flussboulder' }, sortOrder: 3 },

  // ── Mountaineering: Ice Climbing ──────────────────────────────────────
  { subDisciplineName: 'Ice Climbing', name: 'Frozen waterfalls', nameLocalized: { hu: 'Befagyott vízesések', en: 'Frozen waterfalls', de: 'Gefrorene Wasserfälle' }, sortOrder: 1 },
  { subDisciplineName: 'Ice Climbing', name: 'Glacier ice', nameLocalized: { hu: 'Gleccser jég', en: 'Glacier ice', de: 'Gletschereis' }, sortOrder: 2 },
  { subDisciplineName: 'Ice Climbing', name: 'Mixed ice & rock', nameLocalized: { hu: 'Vegyes jég és szikla', en: 'Mixed ice & rock', de: 'Mixed Eis & Fels' }, sortOrder: 3 },

  // ── Mountaineering: Ski Mountaineering ────────────────────────────────
  { subDisciplineName: 'Ski Mountaineering', name: 'Glaciated peaks', nameLocalized: { hu: 'Gleccseres csúcsok', en: 'Glaciated peaks', de: 'Vergletscherte Gipfel' }, sortOrder: 1 },
  { subDisciplineName: 'Ski Mountaineering', name: 'Couloirs', nameLocalized: { hu: 'Kuloárok', en: 'Couloirs', de: 'Couloirs' }, sortOrder: 2 },
  { subDisciplineName: 'Ski Mountaineering', name: 'Alpine bowls', nameLocalized: { hu: 'Alpesi katlanok', en: 'Alpine bowls', de: 'Alpine Kessel' }, sortOrder: 3 },

  // ── Mountaineering: High Altitude ─────────────────────────────────────
  { subDisciplineName: 'High Altitude', name: '6000m+ peaks', nameLocalized: { hu: '6000m+ csúcsok', en: '6000m+ peaks', de: '6000m+ Gipfel' }, sortOrder: 1 },
  { subDisciplineName: 'High Altitude', name: '8000m peaks', nameLocalized: { hu: '8000m csúcsok', en: '8000m peaks', de: '8000m Gipfel' }, sortOrder: 2 },
  { subDisciplineName: 'High Altitude', name: 'Expedition base camps', nameLocalized: { hu: 'Expedíciós alaptáborok', en: 'Expedition base camps', de: 'Expeditions-Basislager' }, sortOrder: 3 },

  // ── Water Sports: Sailing ─────────────────────────────────────────────
  { subDisciplineName: 'Sailing', name: 'Coastal / inshore', nameLocalized: { hu: 'Parti / partmenti', en: 'Coastal / inshore', de: 'Küsten / Inshore' }, sortOrder: 1 },
  { subDisciplineName: 'Sailing', name: 'Open sea', nameLocalized: { hu: 'Nyílt tenger', en: 'Open sea', de: 'Hochsee' }, sortOrder: 2 },
  { subDisciplineName: 'Sailing', name: 'Lake sailing', nameLocalized: { hu: 'Tavi vitorlázás', en: 'Lake sailing', de: 'Binnensee-Segeln' }, sortOrder: 3 },
  { subDisciplineName: 'Sailing', name: 'River sailing', nameLocalized: { hu: 'Folyami vitorlázás', en: 'River sailing', de: 'Fluss-Segeln' }, sortOrder: 4 },

  // ── Water Sports: Kayaking & Canoeing ─────────────────────────────────
  { subDisciplineName: 'Kayaking & Canoeing', name: 'Whitewater', nameLocalized: { hu: 'Vadvíz', en: 'Whitewater', de: 'Wildwasser' }, sortOrder: 1 },
  { subDisciplineName: 'Kayaking & Canoeing', name: 'Sea kayaking', nameLocalized: { hu: 'Tengeri kajakozás', en: 'Sea kayaking', de: 'Seekajakfahren' }, sortOrder: 2 },
  { subDisciplineName: 'Kayaking & Canoeing', name: 'Lake paddling', nameLocalized: { hu: 'Tavi evezés', en: 'Lake paddling', de: 'See-Paddeln' }, sortOrder: 3 },
  { subDisciplineName: 'Kayaking & Canoeing', name: 'River touring', nameLocalized: { hu: 'Folyami evezés', en: 'River touring', de: 'Flusstour' }, sortOrder: 4 },

  // ── Water Sports: Surfing ─────────────────────────────────────────────
  { subDisciplineName: 'Surfing', name: 'Beach breaks', nameLocalized: { hu: 'Parti hullámok', en: 'Beach breaks', de: 'Beachbreaks' }, sortOrder: 1 },
  { subDisciplineName: 'Surfing', name: 'Reef breaks', nameLocalized: { hu: 'Zátonyhullámok', en: 'Reef breaks', de: 'Reefbreaks' }, sortOrder: 2 },
  { subDisciplineName: 'Surfing', name: 'Point breaks', nameLocalized: { hu: 'Ponttörések', en: 'Point breaks', de: 'Pointbreaks' }, sortOrder: 3 },

  // ── Water Sports: Kitesurfing ─────────────────────────────────────────
  { subDisciplineName: 'Kitesurfing', name: 'Flat lagoon', nameLocalized: { hu: 'Lapos lagúna', en: 'Flat lagoon', de: 'Flache Lagune' }, sortOrder: 1 },
  { subDisciplineName: 'Kitesurfing', name: 'Wave riding', nameLocalized: { hu: 'Hullámokon', en: 'Wave riding', de: 'Wellenreiten' }, sortOrder: 2 },
  { subDisciplineName: 'Kitesurfing', name: 'Open sea', nameLocalized: { hu: 'Nyílt víz', en: 'Open sea', de: 'Offenes Meer' }, sortOrder: 3 },

  // ── Water Sports: Stand-Up Paddling ───────────────────────────────────
  { subDisciplineName: 'Stand-Up Paddling', name: 'Calm lake', nameLocalized: { hu: 'Nyugodt tó', en: 'Calm lake', de: 'Ruhiger See' }, sortOrder: 1 },
  { subDisciplineName: 'Stand-Up Paddling', name: 'River SUP', nameLocalized: { hu: 'Folyami SUP', en: 'River SUP', de: 'Fluss-SUP' }, sortOrder: 2 },
  { subDisciplineName: 'Stand-Up Paddling', name: 'Coastal SUP', nameLocalized: { hu: 'Tengerparti SUP', en: 'Coastal SUP', de: 'Küsten-SUP' }, sortOrder: 3 },

  // ── Water Sports: Rafting ─────────────────────────────────────────────
  { subDisciplineName: 'Rafting', name: 'Class II-III rapids', nameLocalized: { hu: 'II-III. osztály zuhatag', en: 'Class II-III rapids', de: 'Klasse II-III Stromschnellen' }, sortOrder: 1 },
  { subDisciplineName: 'Rafting', name: 'Class IV-V rapids', nameLocalized: { hu: 'IV-V. osztály zuhatag', en: 'Class IV-V rapids', de: 'Klasse IV-V Stromschnellen' }, sortOrder: 2 },
  { subDisciplineName: 'Rafting', name: 'Scenic float', nameLocalized: { hu: 'Tájkép evezés', en: 'Scenic float', de: 'Genuss-Rafting' }, sortOrder: 3 },

  // ── Water Sports: Diving ──────────────────────────────────────────────
  { subDisciplineName: 'Diving', name: 'Reef diving', nameLocalized: { hu: 'Zátonybúvárkodás', en: 'Reef diving', de: 'Rifftauchen' }, sortOrder: 1 },
  { subDisciplineName: 'Diving', name: 'Wreck diving', nameLocalized: { hu: 'Roncs búvárkodás', en: 'Wreck diving', de: 'Wracktauchen' }, sortOrder: 2 },
  { subDisciplineName: 'Diving', name: 'Cave diving', nameLocalized: { hu: 'Barlangbúvárkodás', en: 'Cave diving', de: 'Höhlentauchen' }, sortOrder: 3 },

  // ── Water Sports: Snorkeling ──────────────────────────────────────────
  { subDisciplineName: 'Snorkeling', name: 'Shallow reef', nameLocalized: { hu: 'Sekély zátony', en: 'Shallow reef', de: 'Flaches Riff' }, sortOrder: 1 },
  { subDisciplineName: 'Snorkeling', name: 'Bay snorkeling', nameLocalized: { hu: 'Öböl snorkelezés', en: 'Bay snorkeling', de: 'Buchtschnorcheln' }, sortOrder: 2 },
  { subDisciplineName: 'Snorkeling', name: 'Open water', nameLocalized: { hu: 'Nyílt víz', en: 'Open water', de: 'Offenes Wasser' }, sortOrder: 3 },

  // ── Motorsport: Enduro ────────────────────────────────────────────────
  { subDisciplineName: 'Enduro', name: 'Forest tracks', nameLocalized: { hu: 'Erdei utak', en: 'Forest tracks', de: 'Forstwege' }, sortOrder: 1 },
  { subDisciplineName: 'Enduro', name: 'Rocky terrain', nameLocalized: { hu: 'Sziklás terep', en: 'Rocky terrain', de: 'Felsgelände' }, sortOrder: 2 },
  { subDisciplineName: 'Enduro', name: 'Mountain trails', nameLocalized: { hu: 'Hegyi ösvények', en: 'Mountain trails', de: 'Bergpfade' }, sortOrder: 3 },

  // ── Motorsport: Motocross ─────────────────────────────────────────────
  { subDisciplineName: 'Motocross', name: 'Dirt track', nameLocalized: { hu: 'Földes pálya', en: 'Dirt track', de: 'Erdstrecke' }, sortOrder: 1 },
  { subDisciplineName: 'Motocross', name: 'Sand circuit', nameLocalized: { hu: 'Homokpálya', en: 'Sand circuit', de: 'Sandstrecke' }, sortOrder: 2 },
  { subDisciplineName: 'Motocross', name: 'MX park', nameLocalized: { hu: 'MX park', en: 'MX park', de: 'MX-Park' }, sortOrder: 3 },

  // ── Motorsport: ATV / Quad ────────────────────────────────────────────
  { subDisciplineName: 'ATV / Quad', name: 'Mud trails', nameLocalized: { hu: 'Sáros ösvények', en: 'Mud trails', de: 'Schlammstrecken' }, sortOrder: 1 },
  { subDisciplineName: 'ATV / Quad', name: 'Desert terrain', nameLocalized: { hu: 'Sivatagi terep', en: 'Desert terrain', de: 'Wüstengelände' }, sortOrder: 2 },
  { subDisciplineName: 'ATV / Quad', name: 'Hill trails', nameLocalized: { hu: 'Dombos ösvények', en: 'Hill trails', de: 'Hügeltrails' }, sortOrder: 3 },

  // ── Motorsport: 4x4 Off-road ─────────────────────────────────────────
  { subDisciplineName: '4x4 Off-road', name: 'Mountain passes', nameLocalized: { hu: 'Hegyi hágók', en: 'Mountain passes', de: 'Gebirgspässe' }, sortOrder: 1 },
  { subDisciplineName: '4x4 Off-road', name: 'River crossings', nameLocalized: { hu: 'Folyóátkelések', en: 'River crossings', de: 'Flussdurchquerungen' }, sortOrder: 2 },
  { subDisciplineName: '4x4 Off-road', name: 'Desert dunes', nameLocalized: { hu: 'Sivatagi dűnék', en: 'Desert dunes', de: 'Wüstendünen' }, sortOrder: 3 },

  // ── Motorsport: Rally ─────────────────────────────────────────────────
  { subDisciplineName: 'Rally', name: 'Gravel stages', nameLocalized: { hu: 'Kavicsos szakaszok', en: 'Gravel stages', de: 'Schotterpisten' }, sortOrder: 1 },
  { subDisciplineName: 'Rally', name: 'Tarmac stages', nameLocalized: { hu: 'Aszfalt szakaszok', en: 'Tarmac stages', de: 'Asphaltabschnitte' }, sortOrder: 2 },
  { subDisciplineName: 'Rally', name: 'Snow stages', nameLocalized: { hu: 'Havas szakaszok', en: 'Snow stages', de: 'Schneeetappen' }, sortOrder: 3 },

  // ── Motorsport: Snow Motoring ─────────────────────────────────────────
  { subDisciplineName: 'Snow Motoring', name: 'Frozen lakes', nameLocalized: { hu: 'Befagyott tavak', en: 'Frozen lakes', de: 'Gefrorene Seen' }, sortOrder: 1 },
  { subDisciplineName: 'Snow Motoring', name: 'Snow trails', nameLocalized: { hu: 'Havas ösvények', en: 'Snow trails', de: 'Schneetrails' }, sortOrder: 2 },
  { subDisciplineName: 'Snow Motoring', name: 'Arctic tundra', nameLocalized: { hu: 'Sarkvidéki tundra', en: 'Arctic tundra', de: 'Arktische Tundra' }, sortOrder: 3 },

  // ── Cycling: Road Cycling ─────────────────────────────────────────────
  { subDisciplineName: 'Road Cycling', name: 'Mountain passes', nameLocalized: { hu: 'Hegyi hágók', en: 'Mountain passes', de: 'Gebirgspässe' }, sortOrder: 1 },
  { subDisciplineName: 'Road Cycling', name: 'Coastal roads', nameLocalized: { hu: 'Tengerparti utak', en: 'Coastal roads', de: 'Küstenstraßen' }, sortOrder: 2 },
  { subDisciplineName: 'Road Cycling', name: 'Rolling hills', nameLocalized: { hu: 'Hullámos dombok', en: 'Rolling hills', de: 'Hügellandschaft' }, sortOrder: 3 },
  { subDisciplineName: 'Road Cycling', name: 'Flat plains', nameLocalized: { hu: 'Sík alföld', en: 'Flat plains', de: 'Flachland' }, sortOrder: 4 },

  // ── Cycling: Mountain Biking ──────────────────────────────────────────
  { subDisciplineName: 'Mountain Biking', name: 'Cross-country (XC)', nameLocalized: { hu: 'Cross-country (XC)', en: 'Cross-country (XC)', de: 'Cross-Country (XC)' }, sortOrder: 1 },
  { subDisciplineName: 'Mountain Biking', name: 'Enduro trails', nameLocalized: { hu: 'Enduro ösvények', en: 'Enduro trails', de: 'Enduro-Trails' }, sortOrder: 2 },
  { subDisciplineName: 'Mountain Biking', name: 'Downhill park', nameLocalized: { hu: 'Downhill park', en: 'Downhill park', de: 'Downhill-Park' }, sortOrder: 3 },
  { subDisciplineName: 'Mountain Biking', name: 'Singletrack', nameLocalized: { hu: 'Singletrack', en: 'Singletrack', de: 'Singletrail' }, sortOrder: 4 },

  // ── Cycling: Gravel ───────────────────────────────────────────────────
  { subDisciplineName: 'Gravel', name: 'Dirt roads', nameLocalized: { hu: 'Földutak', en: 'Dirt roads', de: 'Feldwege' }, sortOrder: 1 },
  { subDisciplineName: 'Gravel', name: 'Forest tracks', nameLocalized: { hu: 'Erdei utak', en: 'Forest tracks', de: 'Forstwege' }, sortOrder: 2 },
  { subDisciplineName: 'Gravel', name: 'Mixed surface', nameLocalized: { hu: 'Vegyes felület', en: 'Mixed surface', de: 'Mischbelag' }, sortOrder: 3 },

  // ── Cycling: Bikepacking ──────────────────────────────────────────────
  { subDisciplineName: 'Bikepacking', name: 'Remote trails', nameLocalized: { hu: 'Távoli ösvények', en: 'Remote trails', de: 'Abgelegene Wege' }, sortOrder: 1 },
  { subDisciplineName: 'Bikepacking', name: 'Mixed terrain touring', nameLocalized: { hu: 'Vegyes tereptúra', en: 'Mixed terrain touring', de: 'Mischgelände-Touring' }, sortOrder: 2 },
  { subDisciplineName: 'Bikepacking', name: 'Wilderness routes', nameLocalized: { hu: 'Vadon útvonalak', en: 'Wilderness routes', de: 'Wildnisrouten' }, sortOrder: 3 },

  // ── Cycling: Downhill ─────────────────────────────────────────────────
  { subDisciplineName: 'Downhill', name: 'Bike park', nameLocalized: { hu: 'Bike park', en: 'Bike park', de: 'Bikepark' }, sortOrder: 1 },
  { subDisciplineName: 'Downhill', name: 'Natural terrain', nameLocalized: { hu: 'Természetes terep', en: 'Natural terrain', de: 'Naturgelände' }, sortOrder: 2 },
  { subDisciplineName: 'Downhill', name: 'Freeride', nameLocalized: { hu: 'Freeride', en: 'Freeride', de: 'Freeride' }, sortOrder: 3 },

  // ── Cycling: E-bike Touring ───────────────────────────────────────────
  { subDisciplineName: 'E-bike Touring', name: 'Scenic routes', nameLocalized: { hu: 'Festői útvonalak', en: 'Scenic routes', de: 'Panoramastrecken' }, sortOrder: 1 },
  { subDisciplineName: 'E-bike Touring', name: 'Wine country', nameLocalized: { hu: 'Borvidék', en: 'Wine country', de: 'Weinland' }, sortOrder: 2 },
  { subDisciplineName: 'E-bike Touring', name: 'Mountain villages', nameLocalized: { hu: 'Hegyi falvak', en: 'Mountain villages', de: 'Bergdörfer' }, sortOrder: 3 },

  // ── Running: Trail Running ────────────────────────────────────────────
  { subDisciplineName: 'Trail Running', name: 'Technical mountain trails', nameLocalized: { hu: 'Technikai hegyi ösvények', en: 'Technical mountain trails', de: 'Technische Bergpfade' }, sortOrder: 1 },
  { subDisciplineName: 'Trail Running', name: 'Forest singletrack', nameLocalized: { hu: 'Erdei singletrack', en: 'Forest singletrack', de: 'Wald-Singletrail' }, sortOrder: 2 },
  { subDisciplineName: 'Trail Running', name: 'Alpine ridges', nameLocalized: { hu: 'Alpesi gerincek', en: 'Alpine ridges', de: 'Alpengrate' }, sortOrder: 3 },

  // ── Running: Ultra Running ────────────────────────────────────────────
  { subDisciplineName: 'Ultra Running', name: 'Mountain ultra', nameLocalized: { hu: 'Hegyi ultra', en: 'Mountain ultra', de: 'Berg-Ultra' }, sortOrder: 1 },
  { subDisciplineName: 'Ultra Running', name: 'Desert ultra', nameLocalized: { hu: 'Sivatagi ultra', en: 'Desert ultra', de: 'Wüsten-Ultra' }, sortOrder: 2 },
  { subDisciplineName: 'Ultra Running', name: 'Multi-day stage race', nameLocalized: { hu: 'Többnapos verseny', en: 'Multi-day stage race', de: 'Mehretappenrennen' }, sortOrder: 3 },

  // ── Running: Road Running ─────────────────────────────────────────────
  { subDisciplineName: 'Road Running', name: 'City marathon', nameLocalized: { hu: 'Városi maraton', en: 'City marathon', de: 'Stadtmarathon' }, sortOrder: 1 },
  { subDisciplineName: 'Road Running', name: 'Half marathon', nameLocalized: { hu: 'Félmaraton', en: 'Half marathon', de: 'Halbmarathon' }, sortOrder: 2 },
  { subDisciplineName: 'Road Running', name: 'Fun run / 10K', nameLocalized: { hu: 'Fun run / 10K', en: 'Fun run / 10K', de: 'Volkslauf / 10K' }, sortOrder: 3 },

  // ── Running: Obstacle Course ──────────────────────────────────────────
  { subDisciplineName: 'Obstacle Course', name: 'Mud run', nameLocalized: { hu: 'Sárfutás', en: 'Mud run', de: 'Schlammlauf' }, sortOrder: 1 },
  { subDisciplineName: 'Obstacle Course', name: 'Spartan / OCR', nameLocalized: { hu: 'Spartan / OCR', en: 'Spartan / OCR', de: 'Spartan / OCR' }, sortOrder: 2 },
  { subDisciplineName: 'Obstacle Course', name: 'Military-style', nameLocalized: { hu: 'Katonai stílus', en: 'Military-style', de: 'Militärstil' }, sortOrder: 3 },

  // ── Running: Orienteering ─────────────────────────────────────────────
  { subDisciplineName: 'Orienteering', name: 'Forest orienteering', nameLocalized: { hu: 'Erdei tájfutás', en: 'Forest orienteering', de: 'Wald-OL' }, sortOrder: 1 },
  { subDisciplineName: 'Orienteering', name: 'Sprint / urban', nameLocalized: { hu: 'Sprint / városi', en: 'Sprint / urban', de: 'Sprint / Urban' }, sortOrder: 2 },
  { subDisciplineName: 'Orienteering', name: 'Night orienteering', nameLocalized: { hu: 'Éjszakai tájfutás', en: 'Night orienteering', de: 'Nacht-OL' }, sortOrder: 3 },

  // ── Winter: Alpine Skiing ─────────────────────────────────────────────
  { subDisciplineName: 'Alpine Skiing', name: 'Groomed piste', nameLocalized: { hu: 'Preparált pálya', en: 'Groomed piste', de: 'Präparierte Piste' }, sortOrder: 1 },
  { subDisciplineName: 'Alpine Skiing', name: 'Off-piste', nameLocalized: { hu: 'Pályán kívüli', en: 'Off-piste', de: 'Abseits der Piste' }, sortOrder: 2 },
  { subDisciplineName: 'Alpine Skiing', name: 'Moguls', nameLocalized: { hu: 'Buckás terep', en: 'Moguls', de: 'Buckelpiste' }, sortOrder: 3 },
  { subDisciplineName: 'Alpine Skiing', name: 'Ski park', nameLocalized: { hu: 'Sípark', en: 'Ski park', de: 'Snowpark' }, sortOrder: 4 },

  // ── Winter: Cross-country Skiing ──────────────────────────────────────
  { subDisciplineName: 'Cross-country Skiing', name: 'Classic tracks', nameLocalized: { hu: 'Klasszikus nyomvonal', en: 'Classic tracks', de: 'Klassische Loipe' }, sortOrder: 1 },
  { subDisciplineName: 'Cross-country Skiing', name: 'Skating technique', nameLocalized: { hu: 'Korcsolyázó technika', en: 'Skating technique', de: 'Skating-Technik' }, sortOrder: 2 },
  { subDisciplineName: 'Cross-country Skiing', name: 'Backcountry XC', nameLocalized: { hu: 'Terepsífutás', en: 'Backcountry XC', de: 'Backcountry-Langlauf' }, sortOrder: 3 },

  // ── Winter: Snowboarding ──────────────────────────────────────────────
  { subDisciplineName: 'Snowboarding', name: 'Groomed runs', nameLocalized: { hu: 'Preparált pálya', en: 'Groomed runs', de: 'Präparierte Abfahrten' }, sortOrder: 1 },
  { subDisciplineName: 'Snowboarding', name: 'Freeride powder', nameLocalized: { hu: 'Freeride por', en: 'Freeride powder', de: 'Freeride-Pulver' }, sortOrder: 2 },
  { subDisciplineName: 'Snowboarding', name: 'Terrain park', nameLocalized: { hu: 'Terrain park', en: 'Terrain park', de: 'Terrain-Park' }, sortOrder: 3 },

  // ── Winter: Ski Touring ───────────────────────────────────────────────
  { subDisciplineName: 'Ski Touring', name: 'Alpine touring', nameLocalized: { hu: 'Alpesi sítura', en: 'Alpine touring', de: 'Alpines Skitourengehen' }, sortOrder: 1 },
  { subDisciplineName: 'Ski Touring', name: 'Forest touring', nameLocalized: { hu: 'Erdei sítura', en: 'Forest touring', de: 'Waldskitour' }, sortOrder: 2 },
  { subDisciplineName: 'Ski Touring', name: 'Glacier touring', nameLocalized: { hu: 'Gleccser túra', en: 'Glacier touring', de: 'Gletschertour' }, sortOrder: 3 },

  // ── Winter: Ice Skating ───────────────────────────────────────────────
  { subDisciplineName: 'Ice Skating', name: 'Natural ice', nameLocalized: { hu: 'Természetes jég', en: 'Natural ice', de: 'Natureis' }, sortOrder: 1 },
  { subDisciplineName: 'Ice Skating', name: 'Frozen lake', nameLocalized: { hu: 'Befagyott tó', en: 'Frozen lake', de: 'Gefrorener See' }, sortOrder: 2 },
  { subDisciplineName: 'Ice Skating', name: 'Canal skating', nameLocalized: { hu: 'Csatorna korcsolya', en: 'Canal skating', de: 'Grachteneis' }, sortOrder: 3 },

  // ── Winter: Winter Hiking ─────────────────────────────────────────────
  { subDisciplineName: 'Winter Hiking', name: 'Cleared paths', nameLocalized: { hu: 'Kitakarított utak', en: 'Cleared paths', de: 'Geräumte Wege' }, sortOrder: 1 },
  { subDisciplineName: 'Winter Hiking', name: 'Snow-covered trails', nameLocalized: { hu: 'Havas ösvények', en: 'Snow-covered trails', de: 'Verschneite Wege' }, sortOrder: 2 },
  { subDisciplineName: 'Winter Hiking', name: 'Frozen landscape', nameLocalized: { hu: 'Fagyott táj', en: 'Frozen landscape', de: 'Gefrorene Landschaft' }, sortOrder: 3 },

  // ── Expedition: Multi-sport ───────────────────────────────────────────
  { subDisciplineName: 'Multi-sport', name: 'Combined disciplines', nameLocalized: { hu: 'Kombinált sportágak', en: 'Combined disciplines', de: 'Kombinierte Disziplinen' }, sortOrder: 1 },
  { subDisciplineName: 'Multi-sport', name: 'Adventure racing', nameLocalized: { hu: 'Kaland verseny', en: 'Adventure racing', de: 'Abenteuerrennen' }, sortOrder: 2 },
  { subDisciplineName: 'Multi-sport', name: 'Transition zones', nameLocalized: { hu: 'Átmeneti zónák', en: 'Transition zones', de: 'Übergangszonen' }, sortOrder: 3 },

  // ── Expedition: Desert Crossing ───────────────────────────────────────
  { subDisciplineName: 'Desert Crossing', name: 'Sand dunes', nameLocalized: { hu: 'Homokdűnék', en: 'Sand dunes', de: 'Sanddünen' }, sortOrder: 1 },
  { subDisciplineName: 'Desert Crossing', name: 'Rocky desert', nameLocalized: { hu: 'Sziklás sivatag', en: 'Rocky desert', de: 'Felsenwüste' }, sortOrder: 2 },
  { subDisciplineName: 'Desert Crossing', name: 'Salt flats', nameLocalized: { hu: 'Sós síkság', en: 'Salt flats', de: 'Salzpfannen' }, sortOrder: 3 },

  // ── Expedition: Arctic / Antarctic ────────────────────────────────────
  { subDisciplineName: 'Arctic / Antarctic', name: 'Ice cap', nameLocalized: { hu: 'Jégsapka', en: 'Ice cap', de: 'Eiskappe' }, sortOrder: 1 },
  { subDisciplineName: 'Arctic / Antarctic', name: 'Tundra', nameLocalized: { hu: 'Tundra', en: 'Tundra', de: 'Tundra' }, sortOrder: 2 },
  { subDisciplineName: 'Arctic / Antarctic', name: 'Pack ice', nameLocalized: { hu: 'Jégmező', en: 'Pack ice', de: 'Packeis' }, sortOrder: 3 },

  // ── Expedition: Jungle / Rainforest ───────────────────────────────────
  { subDisciplineName: 'Jungle / Rainforest', name: 'Tropical lowland', nameLocalized: { hu: 'Trópusi alföld', en: 'Tropical lowland', de: 'Tropisches Tiefland' }, sortOrder: 1 },
  { subDisciplineName: 'Jungle / Rainforest', name: 'Cloud forest', nameLocalized: { hu: 'Ködfelhős erdő', en: 'Cloud forest', de: 'Nebelwald' }, sortOrder: 2 },
  { subDisciplineName: 'Jungle / Rainforest', name: 'River jungle', nameLocalized: { hu: 'Folyóparti dzsungel', en: 'River jungle', de: 'Flussdschungel' }, sortOrder: 3 },

  // ── Expedition: Cave Exploration ──────────────────────────────────────
  { subDisciplineName: 'Cave Exploration', name: 'Show caves', nameLocalized: { hu: 'Turista barlangok', en: 'Show caves', de: 'Schauhöhlen' }, sortOrder: 1 },
  { subDisciplineName: 'Cave Exploration', name: 'Wild caves', nameLocalized: { hu: 'Vadon barlangok', en: 'Wild caves', de: 'Wildhöhlen' }, sortOrder: 2 },
  { subDisciplineName: 'Cave Exploration', name: 'Underground rivers', nameLocalized: { hu: 'Föld alatti folyók', en: 'Underground rivers', de: 'Unterirdische Flüsse' }, sortOrder: 3 },

  // ── Expedition: Overland Journey ──────────────────────────────────────
  { subDisciplineName: 'Overland Journey', name: 'Cross-continental', nameLocalized: { hu: 'Kontinenseken át', en: 'Cross-continental', de: 'Transkontinental' }, sortOrder: 1 },
  { subDisciplineName: 'Overland Journey', name: 'Remote highlands', nameLocalized: { hu: 'Távoli felföldek', en: 'Remote highlands', de: 'Abgelegene Hochländer' }, sortOrder: 2 },
  { subDisciplineName: 'Overland Journey', name: 'Historic trade routes', nameLocalized: { hu: 'Történelmi kereskedelmi utak', en: 'Historic trade routes', de: 'Historische Handelsrouten' }, sortOrder: 3 },
];

// ============================================================================
// 4. EXPERIENCE LEVELS — per category (L1-L5)
// ============================================================================

interface ExperienceLevelSeed {
  categoryName: string;
  level: number;
  label: string;
  description: string;
  descriptionLocalized: Record<string, string>;
}

export const experienceLevelsData: ExperienceLevelSeed[] = [
  // ── Hiking ────────────────────────────────────────────────────────────
  {
    categoryName: 'Hiking',
    level: 1,
    label: 'Beginner',
    description: 'Easy marked trails, up to 10km, max 500m elevation gain. No special equipment needed.',
    descriptionLocalized: {
      hu: 'Könnyű jelzett ösvények, max 10 km, max 500 m szintemelkedés. Különleges felszerelés nem szükséges.',
      en: 'Easy marked trails, up to 10km, max 500m elevation gain. No special equipment needed.',
    },
  },
  {
    categoryName: 'Hiking',
    level: 2,
    label: 'Intermediate',
    description: 'Moderate trails, 10-20km, up to 1000m elevation, some scrambling. Good fitness required.',
    descriptionLocalized: {
      hu: 'Közepes ösvények, 10-20 km, max 1000 m szintemelkedés, némi sziklamászás. Jó fizikai állapot szükséges.',
      en: 'Moderate trails, 10-20km, up to 1000m elevation, some scrambling. Good fitness required.',
    },
  },
  {
    categoryName: 'Hiking',
    level: 3,
    label: 'Advanced',
    description: 'Challenging terrain, 20-30km, 1000-1500m elevation, exposure sections. Navigation skills needed.',
    descriptionLocalized: {
      hu: 'Kihívást jelentő terep, 20-30 km, 1000-1500 m szintemelkedés, kitett szakaszok. Navigációs készség szükséges.',
      en: 'Challenging terrain, 20-30km, 1000-1500m elevation, exposure sections. Navigation skills needed.',
    },
  },
  {
    categoryName: 'Hiking',
    level: 4,
    label: 'Expert',
    description: 'Demanding alpine routes, multi-day, high altitude, technical sections. Self-sufficiency required.',
    descriptionLocalized: {
      hu: 'Igényes alpesi útvonalak, többnapos, nagy magasság, technikai szakaszok. Önellátás szükséges.',
      en: 'Demanding alpine routes, multi-day, high altitude, technical sections. Self-sufficiency required.',
    },
  },
  {
    categoryName: 'Hiking',
    level: 5,
    label: 'Master',
    description: 'Extreme conditions, arctic/desert, high altitude mountaineering crossover. Expedition-level endurance.',
    descriptionLocalized: {
      hu: 'Szélsőséges körülmények, sarkvidéki/sivatagi, magashegyi átfedés. Expedíciós szintű állóképesség.',
      en: 'Extreme conditions, arctic/desert, high altitude mountaineering crossover. Expedition-level endurance.',
    },
  },

  // ── Mountaineering ────────────────────────────────────────────────────
  {
    categoryName: 'Mountaineering',
    level: 1,
    label: 'Beginner',
    description: 'Indoor climbing, top-rope and bouldering basics. Understanding of safety systems and belaying.',
    descriptionLocalized: {
      hu: 'Terem mászás, felső biztosítás és bouldering alapok. Biztonsági rendszerek és biztosítás ismerete.',
      en: 'Indoor climbing, top-rope and bouldering basics. Understanding of safety systems and belaying.',
    },
  },
  {
    categoryName: 'Mountaineering',
    level: 2,
    label: 'Intermediate',
    description: 'Outdoor sport climbing up to UIAA V, lead climbing. Basic knowledge of route selection and anchor building.',
    descriptionLocalized: {
      hu: 'Szabadtéri sportmászás UIAA V-ig, elő mászás. Útvonalválasztás és standépítés alapjai.',
      en: 'Outdoor sport climbing up to UIAA V, lead climbing. Basic knowledge of route selection and anchor building.',
    },
  },
  {
    categoryName: 'Mountaineering',
    level: 3,
    label: 'Advanced',
    description: 'Multi-pitch climbing, trad climbing, alpine routes. Competent with rope systems and self-rescue.',
    descriptionLocalized: {
      hu: 'Több kötélhossz mászás, hagyományos mászás, alpesi útvonalak. Kötélrendszerek és önmentés ismerete.',
      en: 'Multi-pitch climbing, trad climbing, alpine routes. Competent with rope systems and self-rescue.',
    },
  },
  {
    categoryName: 'Mountaineering',
    level: 4,
    label: 'Expert',
    description: 'Technical alpine routes, mixed climbing, ice. Capable of leading in complex terrain and managing risk.',
    descriptionLocalized: {
      hu: 'Technikai alpesi útvonalak, vegyes mászás, jég. Képes vezetni komplex terepen és kockázatot kezelni.',
      en: 'Technical alpine routes, mixed climbing, ice. Capable of leading in complex terrain and managing risk.',
    },
  },
  {
    categoryName: 'Mountaineering',
    level: 5,
    label: 'Master',
    description: 'High altitude expeditions (6000m+), extreme alpine routes, first ascents. Full expedition management capability.',
    descriptionLocalized: {
      hu: 'Magashegyi expedíciók (6000m+), extrém alpesi útvonalak, első megmászások. Teljes expedícióvezetési képesség.',
      en: 'High altitude expeditions (6000m+), extreme alpine routes, first ascents. Full expedition management capability.',
    },
  },

  // ── Water Sports ──────────────────────────────────────────────────────
  {
    categoryName: 'Water Sports',
    level: 1,
    label: 'Beginner',
    description: 'Basic swimming, calm water activities, introductory courses. Comfortable in shallow water with guidance.',
    descriptionLocalized: {
      hu: 'Alapszintű úszás, nyugodt vízi aktivitások, bevezető tanfolyamok. Kényelmes sekély vízben kísérővel.',
      en: 'Basic swimming, calm water activities, introductory courses. Comfortable in shallow water with guidance.',
    },
  },
  {
    categoryName: 'Water Sports',
    level: 2,
    label: 'Intermediate',
    description: 'Confident swimmer, basic boat handling/sailing, moderate conditions. Familiar with weather and tide awareness.',
    descriptionLocalized: {
      hu: 'Magabiztos úszó, alapszintű hajókezelés/vitorlázás, közepes körülmények. Időjárás és árapály ismeret.',
      en: 'Confident swimmer, basic boat handling/sailing, moderate conditions. Familiar with weather and tide awareness.',
    },
  },
  {
    categoryName: 'Water Sports',
    level: 3,
    label: 'Advanced',
    description: 'Skilled in chosen discipline, offshore/open water capable. Can handle rough conditions and emergencies.',
    descriptionLocalized: {
      hu: 'Jártas a választott sportágban, nyílt vízre alkalmas. Képes kezelni durva körülményeket és vészhelyzeteket.',
      en: 'Skilled in chosen discipline, offshore/open water capable. Can handle rough conditions and emergencies.',
    },
  },
  {
    categoryName: 'Water Sports',
    level: 4,
    label: 'Expert',
    description: 'Can skipper vessels, lead groups in challenging conditions. Advanced navigation, safety, and rescue skills.',
    descriptionLocalized: {
      hu: 'Képes hajót vezetni, csoportot irányítani kihívó körülmények közt. Haladó navigáció, biztonság és mentés.',
      en: 'Can skipper vessels, lead groups in challenging conditions. Advanced navigation, safety, and rescue skills.',
    },
  },
  {
    categoryName: 'Water Sports',
    level: 5,
    label: 'Master',
    description: 'Ocean crossings, extreme conditions, expedition-level seamanship. Professional certifications, instructor capability.',
    descriptionLocalized: {
      hu: 'Óceáni átkelések, szélsőséges körülmények, expedíciós hajózás. Professzionális minősítések, oktatói képesség.',
      en: 'Ocean crossings, extreme conditions, expedition-level seamanship. Professional certifications, instructor capability.',
    },
  },

  // ── Motorsport ────────────────────────────────────────────────────────
  {
    categoryName: 'Motorsport',
    level: 1,
    label: 'Beginner',
    description: 'Valid driving license, basic vehicle control. Comfortable on easy gravel roads with guidance.',
    descriptionLocalized: {
      hu: 'Érvényes jogosítvány, alapvető járműkezelés. Könnyű kavicsos utakon való magabiztos vezetés kísérettel.',
      en: 'Valid driving license, basic vehicle control. Comfortable on easy gravel roads with guidance.',
    },
  },
  {
    categoryName: 'Motorsport',
    level: 2,
    label: 'Intermediate',
    description: 'Off-road experience, moderate terrain handling. Basic recovery techniques and trail navigation.',
    descriptionLocalized: {
      hu: 'Terepen szerzett tapasztalat, közepes terep kezelése. Alapvető mentési technikák és terep navigáció.',
      en: 'Off-road experience, moderate terrain handling. Basic recovery techniques and trail navigation.',
    },
  },
  {
    categoryName: 'Motorsport',
    level: 3,
    label: 'Advanced',
    description: 'Technical off-road driving, challenging terrain. Vehicle recovery, mechanical knowledge, group navigation.',
    descriptionLocalized: {
      hu: 'Technikai terepjárás, kihívó terep. Jármű mentés, műszaki ismeretek, csoportos navigáció.',
      en: 'Technical off-road driving, challenging terrain. Vehicle recovery, mechanical knowledge, group navigation.',
    },
  },
  {
    categoryName: 'Motorsport',
    level: 4,
    label: 'Expert',
    description: 'Extreme terrain mastery, multi-day off-road expeditions. Capable of field repairs and leading convoys.',
    descriptionLocalized: {
      hu: 'Szélsőséges terep uralása, többnapos terep expedíciók. Képes helyszíni javításokra és konvojvezetésre.',
      en: 'Extreme terrain mastery, multi-day off-road expeditions. Capable of field repairs and leading convoys.',
    },
  },
  {
    categoryName: 'Motorsport',
    level: 5,
    label: 'Master',
    description: 'Competition-level skills, desert/arctic crossings, rally experience. Professional-grade vehicle preparation.',
    descriptionLocalized: {
      hu: 'Versenyszintű készségek, sivatagi/sarkvidéki átkelések, rally tapasztalat. Profi jármű-előkészítés.',
      en: 'Competition-level skills, desert/arctic crossings, rally experience. Professional-grade vehicle preparation.',
    },
  },

  // ── Cycling ───────────────────────────────────────────────────────────
  {
    categoryName: 'Cycling',
    level: 1,
    label: 'Beginner',
    description: 'Comfortable cycling on flat bike paths, up to 30km. Basic bike handling and road awareness.',
    descriptionLocalized: {
      hu: 'Kényelmes kerékpározás sík kerékpárutakon, max 30 km. Alapvető kerékpárkezelés és közúti figyelem.',
      en: 'Comfortable cycling on flat bike paths, up to 30km. Basic bike handling and road awareness.',
    },
  },
  {
    categoryName: 'Cycling',
    level: 2,
    label: 'Intermediate',
    description: 'Regular cyclist, 30-80km rides, moderate hills. Group riding skills and basic maintenance knowledge.',
    descriptionLocalized: {
      hu: 'Rendszeres kerékpáros, 30-80 km távok, közepes emelkedők. Csoportos kerékpározás és alapvető karbantartás.',
      en: 'Regular cyclist, 30-80km rides, moderate hills. Group riding skills and basic maintenance knowledge.',
    },
  },
  {
    categoryName: 'Cycling',
    level: 3,
    label: 'Advanced',
    description: 'Strong cyclist, 80-150km rides, mountain passes. Competent in varied terrain and weather conditions.',
    descriptionLocalized: {
      hu: 'Erős kerékpáros, 80-150 km távok, hegyi hágók. Jártas változatos terepen és időjárási körülmények közt.',
      en: 'Strong cyclist, 80-150km rides, mountain passes. Competent in varied terrain and weather conditions.',
    },
  },
  {
    categoryName: 'Cycling',
    level: 4,
    label: 'Expert',
    description: 'High-performance cyclist, 150km+ rides, extreme elevation. Technical MTB skills or competitive road racing.',
    descriptionLocalized: {
      hu: 'Magas teljesítményű kerékpáros, 150km+ távok, extrém szintemelkedés. Technikai MTB vagy versenyszerű országúti.',
      en: 'High-performance cyclist, 150km+ rides, extreme elevation. Technical MTB skills or competitive road racing.',
    },
  },
  {
    categoryName: 'Cycling',
    level: 5,
    label: 'Master',
    description: 'Elite cyclist, multi-day stage races, expedition bikepacking. Self-sufficient in remote environments.',
    descriptionLocalized: {
      hu: 'Elit kerékpáros, többnapos versenyek, expedíciós bikepacking. Önellátó távoli környezetben.',
      en: 'Elite cyclist, multi-day stage races, expedition bikepacking. Self-sufficient in remote environments.',
    },
  },

  // ── Running ───────────────────────────────────────────────────────────
  {
    categoryName: 'Running',
    level: 1,
    label: 'Beginner',
    description: 'Can run 5-10km continuously on flat terrain. Regular jogging habit, comfortable on easy paths.',
    descriptionLocalized: {
      hu: 'Képes 5-10 km-t folyamatosan futni sík terepen. Rendszeres kocogás, kényelmes könnyű ösvényeken.',
      en: 'Can run 5-10km continuously on flat terrain. Regular jogging habit, comfortable on easy paths.',
    },
  },
  {
    categoryName: 'Running',
    level: 2,
    label: 'Intermediate',
    description: 'Half-marathon distance, moderate trail running. Can handle technical terrain and mild elevation changes.',
    descriptionLocalized: {
      hu: 'Félmaraton táv, közepes terepfutás. Képes kezelni technikai terepet és enyhe szintkülönbségeket.',
      en: 'Half-marathon distance, moderate trail running. Can handle technical terrain and mild elevation changes.',
    },
  },
  {
    categoryName: 'Running',
    level: 3,
    label: 'Advanced',
    description: 'Marathon distance, technical trail running with significant elevation. Night running and navigation capable.',
    descriptionLocalized: {
      hu: 'Maraton táv, technikai terepfutás jelentős szintemelkedéssel. Éjszakai futás és navigáció.',
      en: 'Marathon distance, technical trail running with significant elevation. Night running and navigation capable.',
    },
  },
  {
    categoryName: 'Running',
    level: 4,
    label: 'Expert',
    description: 'Ultra-marathon (50-100km), extreme mountain trails. Self-sufficient nutrition and gear management.',
    descriptionLocalized: {
      hu: 'Ultra-maraton (50-100 km), extrém hegyi ösvények. Önálló táplálkozás és felszerelés kezelés.',
      en: 'Ultra-marathon (50-100km), extreme mountain trails. Self-sufficient nutrition and gear management.',
    },
  },
  {
    categoryName: 'Running',
    level: 5,
    label: 'Master',
    description: '100km+ ultra races, multi-day stage races, extreme altitude/desert running. Elite-level endurance.',
    descriptionLocalized: {
      hu: '100km+ ultra versenyek, többnapos verseny, szélsőséges magassági/sivatagi futás. Elit szintű állóképesség.',
      en: '100km+ ultra races, multi-day stage races, extreme altitude/desert running. Elite-level endurance.',
    },
  },

  // ── Winter Sports ─────────────────────────────────────────────────────
  {
    categoryName: 'Winter Sports',
    level: 1,
    label: 'Beginner',
    description: 'First time on snow, learning basic turns on gentle slopes. Can use ski lifts and stop safely.',
    descriptionLocalized: {
      hu: 'Első alkalom havon, alapvető kanyarok tanulása enyhe lejtőn. Képes sílifteket használni és biztonságosan megállni.',
      en: 'First time on snow, learning basic turns on gentle slopes. Can use ski lifts and stop safely.',
    },
  },
  {
    categoryName: 'Winter Sports',
    level: 2,
    label: 'Intermediate',
    description: 'Confident on blue/red pistes, parallel turns. Can handle varied snow conditions and moderate steepness.',
    descriptionLocalized: {
      hu: 'Magabiztos kék/piros pályákon, párhuzamos kanyarok. Változatos hóviszonyok és közepes meredekség kezelése.',
      en: 'Confident on blue/red pistes, parallel turns. Can handle varied snow conditions and moderate steepness.',
    },
  },
  {
    categoryName: 'Winter Sports',
    level: 3,
    label: 'Advanced',
    description: 'All pistes including black runs, off-piste in controlled conditions. Avalanche awareness basics.',
    descriptionLocalized: {
      hu: 'Minden pálya beleértve fekete lejtőket, pályán kívüli kontrollált körülmények közt. Lavina tudatosság alapjai.',
      en: 'All pistes including black runs, off-piste in controlled conditions. Avalanche awareness basics.',
    },
  },
  {
    categoryName: 'Winter Sports',
    level: 4,
    label: 'Expert',
    description: 'Expert off-piste and backcountry, ski touring, steep terrain. Full avalanche rescue training.',
    descriptionLocalized: {
      hu: 'Szakértő pályán kívüli és háttérterületi, sítura, meredek terep. Teljes lavina mentési képzés.',
      en: 'Expert off-piste and backcountry, ski touring, steep terrain. Full avalanche rescue training.',
    },
  },
  {
    categoryName: 'Winter Sports',
    level: 5,
    label: 'Master',
    description: 'Extreme couloirs, ski mountaineering, glacier skiing. Competition-level freeride or instructor qualifications.',
    descriptionLocalized: {
      hu: 'Extrém kuloárok, sí-hegymászás, gleccser síelés. Versenyszintű freeride vagy oktatói minősítés.',
      en: 'Extreme couloirs, ski mountaineering, glacier skiing. Competition-level freeride or instructor qualifications.',
    },
  },

  // ── Expedition ────────────────────────────────────────────────────────
  {
    categoryName: 'Expedition',
    level: 1,
    label: 'Beginner',
    description: 'Guided group trips, basic camping and outdoor skills. Comfortable with multi-day activities with support.',
    descriptionLocalized: {
      hu: 'Vezetett csoportos túrák, alapvető kempingezés és szabadtéri készségek. Többnapos aktivitás támogatással.',
      en: 'Guided group trips, basic camping and outdoor skills. Comfortable with multi-day activities with support.',
    },
  },
  {
    categoryName: 'Expedition',
    level: 2,
    label: 'Intermediate',
    description: 'Independent multi-day trips, navigation skills, varied terrain. Can handle basic remote camping.',
    descriptionLocalized: {
      hu: 'Önálló többnapos túrák, navigációs készségek, változatos terep. Alapszintű távoli kempingezés.',
      en: 'Independent multi-day trips, navigation skills, varied terrain. Can handle basic remote camping.',
    },
  },
  {
    categoryName: 'Expedition',
    level: 3,
    label: 'Advanced',
    description: 'Remote wilderness experience, multiple disciplines, expedition logistics. First aid and survival skills.',
    descriptionLocalized: {
      hu: 'Távoli vadon tapasztalat, több sportág, expedíciós logisztika. Elsősegély és túlélési készségek.',
      en: 'Remote wilderness experience, multiple disciplines, expedition logistics. First aid and survival skills.',
    },
  },
  {
    categoryName: 'Expedition',
    level: 4,
    label: 'Expert',
    description: 'Extended expeditions in harsh environments. Can lead groups, manage logistics, and handle emergencies.',
    descriptionLocalized: {
      hu: 'Hosszú expedíciók zord környezetben. Képes csoportvezetésre, logisztikára és vészhelyzet kezelésre.',
      en: 'Extended expeditions in harsh environments. Can lead groups, manage logistics, and handle emergencies.',
    },
  },
  {
    categoryName: 'Expedition',
    level: 5,
    label: 'Master',
    description: 'Polar, high-altitude, or extreme desert expeditions. Full expedition planning, leadership, and emergency management.',
    descriptionLocalized: {
      hu: 'Sarki, magashegyi vagy extrém sivatagi expedíciók. Teljes expedíciótervezés, vezetés és vészhelyzetkezelés.',
      en: 'Polar, high-altitude, or extreme desert expeditions. Full expedition planning, leadership, and emergency management.',
    },
  },
];
