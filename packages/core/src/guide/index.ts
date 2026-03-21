// M17 — Local Guides Marketplace Business Logic
// TODO: Implementáció az 01_Funkcionalis_Specifikacio.md alapján

export interface GuideProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  languages: string[];
  specialties: string[];
  rating: number;
  verified: boolean;
}

export const GUIDE_MODULE = "M17" as const;
