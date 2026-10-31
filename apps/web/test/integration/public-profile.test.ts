import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { fetchPublicProfile } from '@/lib/profile/public-profile';
import { admin, clientFor, createTestUser, deleteTestUser, INTEGRATION_ENABLED, type TestUser } from './_setup';

(INTEGRATION_ENABLED ? describe : describe.skip)('public profile visibility', () => {
  let owner: TestUser, visitor: TestUser;
  beforeAll(async () => { owner = await createTestUser('public-profile'); visitor = await createTestUser('profile-visitor'); });
  afterAll(async () => { if (owner) await deleteTestUser(owner.id); if (visitor) await deleteTestUser(visitor.id); });
  it('respects public, registered and private visibility without exposing contact fields', async () => {
    const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const signedIn = await clientFor(visitor);
    const self = await clientFor(owner);
    const visibility = async (value: string) => {
      const { error } = await admin().from('profiles').update({ profile_visibility: value }).eq('id', owner.id);
      expect(error).toBeNull();
    };
    await visibility('public');
    const profile = await fetchPublicProfile(anonymous, owner.id);
    expect(profile?.id).toBe(owner.id);
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('phone');
    if (profile?.slug) expect((await fetchPublicProfile(anonymous, profile.slug))?.id).toBe(owner.id);
    await visibility('registered');
    expect(await fetchPublicProfile(anonymous, owner.id)).toBeNull();
    expect((await fetchPublicProfile(signedIn, owner.id))?.id).toBe(owner.id);
    await visibility('private');
    expect(await fetchPublicProfile(anonymous, owner.id)).toBeNull();
    expect(await fetchPublicProfile(signedIn, owner.id)).toBeNull();
    expect((await fetchPublicProfile(self, owner.id))?.id).toBe(owner.id);
    const { error: deleteError } = await admin().from('profiles').update({
      profile_visibility: 'public', deleted_at: new Date().toISOString(),
    }).eq('id', owner.id);
    expect(deleteError).toBeNull();
    expect(await fetchPublicProfile(anonymous, owner.id)).toBeNull();
    expect(await fetchPublicProfile(signedIn, owner.id)).toBeNull();
    expect(await fetchPublicProfile(self, owner.id)).toBeNull();
  });
});
