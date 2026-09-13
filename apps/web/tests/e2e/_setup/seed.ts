import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:55321';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!["localhost", "127.0.0.1"].includes(new URL(SUPABASE_URL).hostname)) {
  throw new Error("E2E fixtures require a local Supabase URL");
}
const fixtureIds = new Set<string>();
export function trackFixtureUser(id: string) { fixtureIds.add(id); }

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
  trackFixtureUser(data.user!.id);
  return { email, password, id: data.user!.id };
}

export async function deleteTestUser(id: string) {
  if (!fixtureIds.has(id)) throw new Error("Refusing to delete non-fixture user");
  const { error: tripError } = await admin.from("trips").delete().eq("organizer_id", id);
  if (tripError) throw tripError;
  const { data: images, error: listError } = await admin.storage.from("trip-covers").list(id);
  if (listError) throw listError;
  if (images?.length) {
    const { error } = await admin.storage.from("trip-covers").remove(images.map(image => `${id}/${image.name}`));
    if (error) throw error;
  }
  const { error } = await admin.from("profiles").delete().eq("id", id);
  if (error) throw error;
  await admin.auth.admin.deleteUser(id);
  fixtureIds.delete(id);
}
