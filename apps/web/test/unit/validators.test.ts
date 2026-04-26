/**
 * Unit tests for `@uat/validators` Zod schemas.
 *
 * Coverage targets (TEST_CASES.md UNIT-validators):
 *   - loginSchema, registerSchema (M01 User)
 *   - createTripSchema (M02 Trip)
 *   - createExpenseSchema (M03 Expense)
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  createTripSchema,
  createExpenseSchema,
} from '@uat/validators';

describe('loginSchema', () => {
  it('accepts valid email + password', () => {
    const result = loginSchema.safeParse({ email: 'norbi@trevu.local', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(true);
    }
  });

  it('rejects password shorter than 6 chars', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('password'))).toBe(true);
    }
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid signup payload', () => {
    const result = registerSchema.safeParse({
      email: 'norbi@trevu.local',
      password: 'secret123',
      fullName: 'Norbert J.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects fullName under 2 chars', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'secret123',
      fullName: 'A',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('fullName'))).toBe(true);
    }
  });
});

describe('createTripSchema', () => {
  const validPayload = {
    title: 'Mátrai gerinctúra',
    description: 'Két napos kalandtúra',
    category: 'hiking' as const,
    startDate: '2026-06-01T08:00:00.000Z',
    endDate: '2026-06-02T18:00:00.000Z',
    maxParticipants: 10,
  };

  it('accepts valid trip payload', () => {
    expect(createTripSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects title shorter than 3 chars', () => {
    const result = createTripSchema.safeParse({ ...validPayload, title: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 120 chars', () => {
    const result = createTripSchema.safeParse({ ...validPayload, title: 'A'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('rejects unknown category', () => {
    const result = createTripSchema.safeParse({ ...validPayload, category: 'space-tourism' });
    expect(result.success).toBe(false);
  });

  it('rejects maxParticipants outside 1-500', () => {
    expect(createTripSchema.safeParse({ ...validPayload, maxParticipants: 0 }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...validPayload, maxParticipants: 501 }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...validPayload, maxParticipants: 1.5 }).success).toBe(false); // int only
  });

  it('rejects bad date format', () => {
    const result = createTripSchema.safeParse({ ...validPayload, startDate: '2026-06-01' });
    expect(result.success).toBe(false);
  });
});

describe('createExpenseSchema', () => {
  const validPayload = {
    tripId: '00000000-0000-0000-0000-000000000001',
    amount: 15000,
    currency: 'HUF',
    description: 'Bejárati díj',
    splitType: 'equal' as const,
  };

  it('accepts valid expense payload', () => {
    expect(createExpenseSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects non-positive amount', () => {
    expect(createExpenseSchema.safeParse({ ...validPayload, amount: 0 }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...validPayload, amount: -100 }).success).toBe(false);
  });

  it('rejects currency != 3 chars', () => {
    expect(createExpenseSchema.safeParse({ ...validPayload, currency: 'HU' }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...validPayload, currency: 'HUFD' }).success).toBe(false);
  });

  it('rejects non-uuid tripId', () => {
    expect(createExpenseSchema.safeParse({ ...validPayload, tripId: 'abc' }).success).toBe(false);
  });

  it('rejects unknown splitType', () => {
    const result = createExpenseSchema.safeParse({ ...validPayload, splitType: 'random' });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    expect(createExpenseSchema.safeParse({ ...validPayload, description: '' }).success).toBe(false);
  });
});
