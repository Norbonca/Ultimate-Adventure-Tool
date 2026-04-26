import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:55321';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function createTestUser(emailPrefix = 'e2e') {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@trevu.local`;
  const password = 'Test-1234!';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { email, password, id: data.user!.id };
}

export async function deleteTestUser(id: string) {
  await admin.auth.admin.deleteUser(id);
}
