/**
 * M211 — az útmutatók csoportjai és címkéi (Norbert 2026-11-02 17:29: „rendezd csoportokba,
 * tageld be őket és lehessen szűrni”). Design: D21 `bE4n6` Tag Filter `Pfr9d` + jegyzet `MsQJJ`.
 * A feliratok az i18n-ben: `tutorials.groups.<kulcs>`, `tutorials.tags.<kulcs>`.
 */

/** A lista szakaszai, ebben a sorrendben. */
export const TUTORIAL_GROUPS = ["listing", "crew", "timeline", "costs", "discover", "ideas", "profile"] as const;
export type TutorialGroup = (typeof TUTORIAL_GROUPS)[number];

export const TUTORIAL_TAGS = ["firstSteps", "dates", "money", "team", "settings", "map", "community", "tasks"] as const;
export type TutorialTag = (typeof TUTORIAL_TAGS)[number];

export const TUTORIAL_META: Record<string, { group: TutorialGroup; tags: TutorialTag[] }> = {
  "elso-tura-meghirdetese": { group: "listing", tags: ["firstSteps", "dates"] },
  "uj-idopont": { group: "listing", tags: ["dates"] },
  boritokep: { group: "listing", tags: ["settings"] },
  "tura-beallitasok": { group: "listing", tags: ["settings", "money", "dates"] },
  "tura-lemondasa": { group: "listing", tags: ["settings"] },
  "jelentkezok-elbiralasa": { group: "crew", tags: ["team"] },
  "szerepek-es-stabhelyek": { group: "crew", tags: ["team"] },
  "check-in": { group: "crew", tags: ["team", "tasks"] },
  "menetrend-teendok": { group: "timeline", tags: ["tasks"] },
  "resztvevoi-menetrend": { group: "timeline", tags: ["tasks", "team"] },
  "kozos-koltseg": { group: "costs", tags: ["money"] },
  kiegyenlites: { group: "costs", tags: ["money"] },
  "koltseg-beallitasok": { group: "costs", tags: ["money", "settings"] },
  "kereses-es-szures": { group: "discover", tags: ["firstSteps", "map"] },
  "3d-terkep": { group: "discover", tags: ["map"] },
  "jelentkezes-idopontra": { group: "discover", tags: ["firstSteps", "dates"] },
  "jelentkezes-allapota": { group: "discover", tags: ["dates"] },
  "naptar-es-idozona": { group: "discover", tags: ["dates"] },
  "otlet-kituzese": { group: "ideas", tags: ["community"] },
  "otlet-csatlakozas": { group: "ideas", tags: ["community"] },
  "mire-varnak": { group: "ideas", tags: ["community"] },
  "keszsegek-es-erdeklodes": { group: "profile", tags: ["firstSteps", "settings"] },
};

export const isTutorialTag = (v: string | null | undefined): v is TutorialTag => !!v && (TUTORIAL_TAGS as readonly string[]).includes(v);
export const tutorialGroup = (slug: string): TutorialGroup => TUTORIAL_META[slug]?.group ?? "discover";
export const tutorialTags = (slug: string): TutorialTag[] => TUTORIAL_META[slug]?.tags ?? [];
