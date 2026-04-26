/**
 * Integration test setup — local Supabase fixture helpers.
 *
 * Prerequisite: `pnpm local:start` running (Supabase on :55321).
 * Truncate tables before each test so suites don't bleed.
 *
 * NOTE: tests gated behind `INTEGRATION=1` env var; pure-unit `pnpm test`
 * does not run them. Run with: `INTEGRATION=1 pnpm test test/integration`
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:55321';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const INTEGRATION_ENABLED = process.env.INTEGRATION === '1';

let _admin: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  if (!_admin) {
    if (!SERVICE_ROLE) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY missing. Run with INTEGRATION=1 and proper env vars.',
      );
    }
    _admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(prefix = 'int'): Promise<TestUser> {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@trevu.local`;
  const password = 'Test-1234!';
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user!.id, email, password };
}

export async function deleteTestUser(id: string) {
  await admin().auth.admin.deleteUser(id);
}

/**
 * Truncate the listed tables. Use in beforeEach to ensure isolation.
 * Service role bypasses RLS — do NOT call this in production.
 */
export async function truncate(tables: string[]) {
  for (const table of tables) {
    await admin().from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
}

/**
 * Create a minimal trip rekord for the given organizer.
 */
export async function createTestTrip(organizerId: string, overrides: Record<string, unknown> = {}) {
  const slug = `test-trip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await admin()
    .from('trips')
    .insert({
      organizer_id: organizerId,
      title: 'Integration Test Trip',
      slug,
      description: 'Test',
      start_date: '2026-12-01',
      end_date: '2026-12-03',
      max_participants: 10,
      min_participants: 2,
      difficulty: 1,
      status: 'draft',
      visibility: 'public',
      location_country: 'HU',
      ...overrides,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
