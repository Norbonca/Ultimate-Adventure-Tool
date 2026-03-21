// M03 — Expense Sharing Business Logic
// TODO: Implementáció az 01_Funkcionalis_Specifikacio.md alapján

export interface CreateExpenseInput {
  tripId: string;
  paidById: string;
  amount: number;
  currency: string;
  description: string;
  splitType: "equal" | "exact" | "percentage";
}

export const EXPENSE_MODULE = "M03" as const;
