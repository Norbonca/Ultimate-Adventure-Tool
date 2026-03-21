/**
 * Magyar (hu) fordítások — Trevu
 *
 * Struktúra: modul/oldal > szekció > kulcs
 * Konvenció: camelCase kulcsok, nincs HTML a szövegekben
 */
const hu = {
  // ============================================================================
  // Közös (minden oldalon használt)
  // ============================================================================
  common: {
    appName: "Trevu",
    appTagline: "Trek beyond ordinary",
    loading: "Betöltés...",
    save: "Mentés",
    saving: "Mentés...",
    cancel: "Mégse",
    delete: "Törlés",
    edit: "Szerkesztés",
    close: "Bezárás",
    back: "Vissza",
    next: "Tovább",
    previous: "Előző",
    search: "Keresés",
    filter: "Szűrés",
    sort: "Rendezés",
    all: "Összes",
    none: "Egyik sem",
    yes: "Igen",
    no: "Nem",
    or: "vagy",
    and: "és",
    ok: "OK",
    confirm: "Megerősítés",
    required: "Kötelező",
    optional: "Opcionális",
    enabled: "Bekapcsolva",
    disabled: "Kikapcsolva",
    comingSoon: "Hamarosan elérhető",
    noData: "Nincs adat",
    showMore: "Mutass többet",
    showLess: "Kevesebb",
    selectPlaceholder: "-- Válassz --",
    notSpecified: "Nincs megadva",
  },

  // ============================================================================
  // Hibák & Értesítések
  // ============================================================================
  errors: {
    generic: "Hiba történt. Kérjük, próbáld újra.",
    networkError: "Hálózati hiba. Ellenőrizd az internetkapcsolatod.",
    notFound: "Az oldal nem található.",
    unauthorized: "Nincs jogosultságod ehhez a művelethez.",
    forbidden: "Hozzáférés megtagadva.",
    sessionExpired: "A munkamenet lejárt. Kérjük, jelentkezz be újra.",
    validationFailed: "Kérjük, ellenőrizd a megadott adatokat.",
    saveFailed: "A mentés sikertelen.",
    loadFailed: "Az adatok betöltése sikertelen.",
    fileTooLarge: "A fájl túl nagy. Maximum {max} MB megengedett.",
    invalidFormat: "Érvénytelen formátum.",
  },

  toasts: {
    saveSuccess: "Sikeresen mentve!",
    saveError: "Mentés sikertelen.",
    deleteSuccess: "Sikeresen törölve.",
    deleteError: "Törlés sikertelen.",
    copySuccess: "Vágólapra másolva!",
    profileUpdated: "Profil frissítve!",
    profileUpdateError: "Profil frissítése sikertelen.",
    privacyUpdated: "Adatvédelmi beállítások frissítve!",
    privacyUpdateError: "Adatvédelmi beállítások frissítése sikertelen.",
    skillsUpdated: "Készségek frissítve!",
    interestsUpdated: "Érdeklődések frissítve!",
    emergencyContactSaved: "Vészhelyzeti kontakt mentve!",
  },

  // ============================================================================
  // Auth (Bejelentkezés / Regisztráció)
  // ============================================================================
  auth: {
    login: "Bejelentkezés",
    loginTitle: "Bejelentkezés",
    loginSubtitle: "Üdvözlünk a Trevu-ban",
    loginLoading: "Bejelentkezés...",
    loginWithGoogle: "Bejelentkezés Google-lel",
    loginWithGoogleLoading: "Bejelentkezés...",

    register: "Regisztráció",
    registerTitle: "Regisztráció",
    registerSubtitle: "Csatlakozz a Trevu közösségéhez",
    registerLoading: "Regisztráció...",
    registerWithGoogle: "Regisztráció Google-lel",
    registerWithGoogleLoading: "Regisztráció...",

    logout: "Kijelentkezés",
    logoutConfirm: "Biztosan ki szeretnél jelentkezni?",

    email: "Email",
    emailPlaceholder: "nev@email.com",
    password: "Jelszó",
    passwordPlaceholder: "••••••••",
    passwordMin: "Jelszó (min. 6 karakter)",
    fullName: "Teljes név",
    fullNamePlaceholder: "Kovács János",

    noAccount: "Nincs még fiókod?",
    hasAccount: "Már van fiókod?",

    forgotPassword: "Elfelejtetted a jelszavad?",
    resetPassword: "Jelszó visszaállítása",
    resetPasswordSent: "Jelszó-visszaállító link elküldve!",

    confirmEmail: "Erősítsd meg az email címed",
    confirmEmailSent: "Megerősítő email elküldve: {email}",

    termsAgreement: "A regisztrációval elfogadod az",
    termsOfService: "Általános Szerződési Feltételeket",
    privacyPolicy: "Adatvédelmi Irányelveket",
  },

  // ============================================================================
  // Landing Page
  // ============================================================================
  landing: {
    heroTitle: "Trevu",
    heroSubtitle: "Tervezd meg a tökéletes kalandot. Szervezz túrákat, oszd meg a költségeket, és találj helyi túravezetőket.",
    ctaRegister: "Regisztráció",
    ctaLogin: "Bejelentkezés",
    statusLabel: "MVP Státusz",
    statusText: "Infrastruktúra beüzemelve — Supabase + Vercel + Next.js",
  },

  // ============================================================================
  // Dashboard
  // ============================================================================
  dashboard: {
    welcomeMessage: "Üdvözlünk, {name}!",
    welcomeDefault: "Kalandor",

    // Quick action cards
    myTrips: "Túráim",
    myTripsDescription: "Meglévő túrák kezelése",
    newTrip: "Új túra",
    newTripDescription: "Hozz létre egy új kalandot",
    expenses: "Költségek",
    guides: "Túravezetők",

    // Status
    systemStatus: "Rendszer státusz",
    systemStatusText: "MVP infrastruktúra aktív — M01 User Management beüzemelve",
  },

  // ============================================================================
  // Profile
  // ============================================================================
  profile: {
    title: "Profil",
    editProfile: "Profil szerkesztése",
    defaultUser: "Felhasználó",

    // Tabs
    tabs: {
      overview: "Áttekintés",
      settings: "Beállítások",
      skills: "Készségek",
      privacy: "Adatvédelem",
    },

    // Overview
    overview: {
      memberSince: "Tag {date} óta",
      followers: "Követő",
      following: "Követett",
      trips: "Túra",
      reputationPoints: "Reputációs pont",
      level: "Szint {level}",
      verifiedOrganizer: "Hitelesített szervező",
      adventureInterests: "Kaland érdeklődések",
      noInterests: "Még nem adtál meg kaland érdeklődéseket",
      addInterestsFirst: "Előbb add meg a kaland érdeklődéseidet a Készségek fülön",
      skills: "Készségek",
      noSkills: "Még nem adtál meg készségeket",
    },

    // Settings form
    settings: {
      personalInfo: "Személyes adatok",
      firstName: "Keresztnév",
      firstNamePlaceholder: "Keresztnév",
      lastName: "Vezetéknév",
      lastNamePlaceholder: "Vezetéknév",
      phone: "Telefonszám",
      phonePlaceholder: "Telefonszám",
      phoneCodePlaceholder: "--",
      city: "Város",
      cityPlaceholder: "Város",
      country: "Ország",
      countryPlaceholder: "-- Válassz országot --",
      preferredLanguage: "Preferált nyelv",
      languagePlaceholder: "-- Válassz nyelvet --",
      preferredCurrency: "Preferált valuta",
      currencyPlaceholder: "-- Válassz valutát --",
      timezone: "Időzóna",
      timezonePlaceholder: "-- Válassz időzónát --",
      bio: "Bemutatkozás",
      bioPlaceholder: "Írj magadról pár szót...",
      bioCharCount: "{count}/500 karakter",
      saveChanges: "Változtatások mentése",
    },

    // Emergency contacts
    emergency: {
      title: "Vészhelyzeti kontakt",
      name: "Név",
      namePlaceholder: "Név",
      phone: "Telefonszám",
      phonePlaceholder: "Telefonszám",
      relationship: "Kapcsolat",
      isPrimary: "Elsődleges kontakt",
      relationships: {
        spouse: "Házastárs",
        parent: "Szülő",
        sibling: "Testvér",
        friend: "Barát",
        other: "Egyéb",
      },
    },

    // Skills & Interests
    skills: {
      title: "Készségek és érdeklődések",
      adventureInterests: "Kaland érdeklődések",
      editInterests: "Szerkesztés",
      saveInterests: "Mentés",
      skillLevel: "Készségszint",
      saveSkills: "Készségek mentése",
      noCategory: "Válassz egy kategóriát a készségszint megadásához",
    },

    // Skill levels
    skillLevels: {
      any: "Bármely",
      beginner: "Kezdő",
      intermediate: "Haladó",
      advanced: "Tapasztalt",
      expert: "Szakértő",
    },

    // Privacy
    privacy: {
      title: "Adatvédelmi beállítások",
      saveChanges: "Adatvédelmi beállítások mentése",
      profileVisibility: "Profil láthatósága",
      emailVisibility: "Email cím láthatósága",
      phoneVisibility: "Telefonszám láthatósága",
      locationPrecision: "Hely pontossága",
      tripHistoryVisibility: "Túra előzmények láthatósága",
      onlineStatus: "Online státusz láthatósága",
      options: {
        public: "Nyilvános",
        registered: "Csak regisztrált felhasználók",
        private: "Privát",
        hidden: "Rejtett",
        followersOnly: "Csak követők",
        tripCompanionsOnly: "Csak túratársak",
        cityCountry: "Város és ország",
        countryOnly: "Csak ország",
      },
    },

    // Subscription tiers
    subscriptionTiers: {
      free: "Kalandor (ingyenes)",
      pro: "Túravezető (€9.90/hó)",
      business: "Expedíció (€39.90/hó)",
      enterprise: "Bázistábor (egyedi)",
    },
  },

  // ============================================================================
  // Trips (M02)
  // ============================================================================
  trips: {
    title: "Túrák",
    createTrip: "Új túra létrehozása",
    editTrip: "Túra szerkesztése",
    deleteTrip: "Túra törlése",
    publishTrip: "Túra közzététele",
    myTrips: "Saját túráim",
    discover: "Felfedezés",

    // Status
    status: {
      draft: "Vázlat",
      published: "Közzétéve",
      registrationOpen: "Regisztráció nyitva",
      active: "Aktív",
      completed: "Befejezett",
      cancelled: "Lemondva",
      archived: "Archiválva",
    },

    // Wizard steps
    wizard: {
      stepCategory: "Kategória",
      stepBasicInfo: "Alapadatok",
      stepDetails: "Részletek",
      stepPublish: "Közzététel",
    },

    // Fields
    fields: {
      title: "Túra neve",
      description: "Leírás",
      category: "Kategória",
      startDate: "Kezdés",
      endDate: "Befejezés",
      location: "Helyszín",
      country: "Ország",
      region: "Régió",
      city: "Város",
      difficulty: "Nehézség",
      maxParticipants: "Max létszám",
      minParticipants: "Min létszám",
      price: "Ár",
      currency: "Valuta",
      language: "Túra nyelve",
      meetingPoint: "Találkozási pont",
    },

    // Difficulty levels
    difficulty: {
      1: "Könnyű",
      2: "Mérsékelten nehéz",
      3: "Közepes",
      4: "Nehéz",
      5: "Nagyon nehéz",
    },

    // Participant status
    participantStatus: {
      pending: "Függőben",
      approved: "Elfogadva",
      approvedPendingPayment: "Elfogadva, fizetésre vár",
      participant: "Résztvevő",
      rejected: "Elutasítva",
      waitlisted: "Várólistán",
      cancelled: "Lemondva",
    },
  },

  // ============================================================================
  // Categories (8 adventure categories)
  // ============================================================================
  categories: {
    hiking: "Túrázás",
    mountaineering: "Hegymászás",
    waterSports: "Vízi sportok",
    motorsport: "Motorsport",
    cycling: "Kerékpározás",
    running: "Futás",
    winterSports: "Téli sportok",
    expedition: "Expedíció",
  },

  // ============================================================================
  // Expenses (M03)
  // ============================================================================
  expenses: {
    title: "Költségek",
    addExpense: "Költség hozzáadása",
    totalExpenses: "Összköltség",
    yourBalance: "Egyenleged",
    youOwe: "Tartozásod",
    owedToYou: "Neked járó",
    settle: "Elszámolás",
    splitType: {
      equal: "Egyenlően",
      custom: "Egyéni",
      percentage: "Százalékos",
    },
    categories: {
      foodDrinks: "Étel és ital",
      accommodation: "Szállás",
      transportFuel: "Közlekedés és üzemanyag",
      activities: "Tevékenységek",
      gearEquipment: "Felszerelés",
      marinaBerth: "Kikötő/marina",
    },
    offlineNotice: "Offline módban mentve. Szinkronizálás internetkapcsolat helyreállítása után.",
  },

  // ============================================================================
  // Metadata & SEO
  // ============================================================================
  metadata: {
    title: "Trevu — Trek beyond ordinary",
    description: "Tervezd meg a tökéletes kalandot — túrák szervezése, költségmegosztás, helyi túravezetők",
    keywords: "kaland, túra, utazás, költségmegosztás, túravezető, trekking, outdoor",
  },

  // ============================================================================
  // Dátum & Idő formázás
  // ============================================================================
  dateTime: {
    today: "Ma",
    yesterday: "Tegnap",
    tomorrow: "Holnap",
    daysAgo: "{count} napja",
    hoursAgo: "{count} órája",
    minutesAgo: "{count} perce",
    justNow: "Most",
    months: {
      jan: "január",
      feb: "február",
      mar: "március",
      apr: "április",
      may: "május",
      jun: "június",
      jul: "július",
      aug: "augusztus",
      sep: "szeptember",
      oct: "október",
      nov: "november",
      dec: "december",
    },
    daysOfWeek: {
      mon: "hétfő",
      tue: "kedd",
      wed: "szerda",
      thu: "csütörtök",
      fri: "péntek",
      sat: "szombat",
      sun: "vasárnap",
    },
  },

  // ============================================================================
  // Validációs üzenetek
  // ============================================================================
  validation: {
    required: "Ez a mező kötelező",
    emailInvalid: "Érvényes email szükséges",
    passwordMin: "Minimum {min} karakter szükséges",
    nameMin: "Minimum {min} karakter szükséges",
    maxLength: "Maximum {max} karakter engedélyezett",
    numberMin: "Minimum érték: {min}",
    numberMax: "Maximum érték: {max}",
    invalidCountryCode: "Érvénytelen országkód",
    invalidCurrencyCode: "Érvénytelen valutakód",
    invalidLanguageCode: "Érvénytelen nyelvkód",
    invalidTimezone: "Érvénytelen időzóna",
    invalidPhone: "Érvényes nemzetközi telefonszám szükséges (pl. +36201234567)",
    dateInPast: "A dátum nem lehet a múltban",
    endBeforeStart: "A befejezés nem lehet a kezdés előtt",
  },
} as const;

export default hu;

/** Recursive type that maps the structure to string leaves */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? DeepStringify<T[K]> : string;
};

/** Structural type for all locale files — enforces same keys, allows different values */
export type TranslationKeys = DeepStringify<typeof hu>;
