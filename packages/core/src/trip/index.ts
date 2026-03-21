// M02 — Trip Management Business Logic
// TODO: Implementáció az 01_Funkcionalis_Specifikacio.md alapján

export type TripCategory =
  | "hiking"
  | "mountain"
  | "water"
  | "motorsport"
  | "cycling"
  | "running"
  | "winter"
  | "expedition";

export interface CreateTripInput {
  title: string;
  description: string;
  category: TripCategory;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  organizerId: string;
}

export const TRIP_MODULE = "M02" as const;
