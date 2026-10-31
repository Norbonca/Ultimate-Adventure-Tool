import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { exportOwnAccount } from '@/lib/account/export';
import { admin, clientFor, createTestUser, deleteTestUser, INTEGRATION_ENABLED, type TestUser } from './_setup';

(INTEGRATION_ENABLED ? describe : describe.skip)('account data export', () => {
  let own: TestUser, other: TestUser;
  beforeAll(async () => {
    own = await createTestUser('export-own'); other = await createTestUser('export-other');
    for (const user of [own, other]) {
      const { error } = await admin().from('emergency_contacts').insert({ user_id: user.id, name: user.email, phone: '+361234567', relationship: 'friend', is_primary: true });
      if (error) throw error;
    }
  });
  afterAll(async () => { if (own) await deleteTestUser(own.id); if (other) await deleteTestUser(other.id); });
  it('exports only the authenticated account and excludes authentication secrets', async () => {
    const data = await exportOwnAccount(await clientFor(own));
    const text = JSON.stringify(data);
    expect(data.profile.id).toBe(own.id);
    expect(text).toContain(own.email);
    expect(text).not.toContain(other.email);
    expect(text).not.toContain('refresh_token_hash');
    expect(text).not.toContain('credentials_json');
  });
  it('rejects anonymous access', async () => {
    const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    await expect(exportOwnAccount(anonymous)).rejects.toThrow('unauthorized');
  });
});
