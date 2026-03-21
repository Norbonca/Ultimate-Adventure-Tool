export const APP_NAME = "Ultimate Adventure Tool";
export const APP_VERSION = "0.1.0";

export const LIMITS = {
  MAX_TRIP_PARTICIPANTS: 500,
  MAX_EXPENSE_AMOUNT: 100_000,
  MAX_FILE_SIZE_MB: 10,
  MAX_IMAGES_PER_TRIP: 50,
  FREE_TIER_TRIPS: 5,
  PRO_TIER_TRIPS: 50,
} as const;

export const SUBSCRIPTION_TIERS = ["free", "pro", "business", "enterprise"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];
