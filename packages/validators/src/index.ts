import { z } from "zod";

// M01 - User validators
export const loginSchema = z.object({
  email: z.string().email("Érvényes email szükséges"),
  password: z.string().min(6, "Minimum 6 karakter"),
});

export const registerSchema = z.object({
  email: z.string().email("Érvényes email szükséges"),
  password: z.string().min(6, "Minimum 6 karakter"),
  fullName: z.string().min(2, "Minimum 2 karakter"),
});

// M02 - Trip validators
export const createTripSchema = z.object({
  title: z.string().min(3, "Minimum 3 karakter").max(120),
  description: z.string().max(5000).optional(),
  category: z.enum(["hiking", "mountain", "water", "motorsport", "cycling", "running", "winter", "expedition"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  maxParticipants: z.number().int().min(1).max(500),
});

// M03 - Expense validators
export const createExpenseSchema = z.object({
  tripId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1).max(500),
  splitType: z.enum(["equal", "exact", "percentage"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
