// M01 — User Management Business Logic
// TODO: Implementáció az 01_Funkcionalis_Specifikacio.md alapján

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  subscriptionTier: "free" | "pro" | "business" | "enterprise";
}

export const USER_MODULE = "M01" as const;
