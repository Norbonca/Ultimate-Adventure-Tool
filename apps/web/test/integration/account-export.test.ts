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
      const { error: sessionError } = await admin().from('user_sessions').insert(
        Array.from({ length: user.id === own.id ? 501 : 1 }, (_, index) => ({
          user_id: user.id, device_name: `session-${index}`,
          refresh_token_hash: `QA_SECRET_TOKEN_${user.id}_${index}`,
          expires_at: '2027-12-31T00:00:00Z',
        })),
      );
      if (sessionError) throw sessionError;
      const { error: credentialsError } = await admin().from('user_credentials').insert({
        user_id: user.id, provider: 'email', provider_id: user.email,
        credentials_json: { secret: `QA_SECRET_CREDENTIAL_${user.id}` },
      });
      if (credentialsError) throw credentialsError;
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
    expect(text).not.toContain('QA_SECRET_TOKEN_');
    expect(text).not.toContain('QA_SECRET_CREDENTIAL_');
    const sessions = data.sessions as Array<{ id: string }>;
    expect(sessions).toHaveLength(501);
    expect(new Set(sessions.map(session => session.id)).size).toBe(501);
    const ids = sessions.map(session => session.id);
    expect(ids).toEqual([...ids].sort());
  });
  it('rejects anonymous access', async () => {
    const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    await expect(exportOwnAccount(anonymous)).rejects.toThrow('unauthorized');
  });
});
