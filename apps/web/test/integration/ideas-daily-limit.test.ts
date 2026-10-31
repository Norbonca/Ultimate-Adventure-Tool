import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, clientFor, createTestUser, deleteTestUser, INTEGRATION_ENABLED, type TestUser } from './_setup';

(INTEGRATION_ENABLED ? describe : describe.skip)('idea daily creation limit', () => {
  let owner: TestUser;
  beforeAll(async () => { owner = await createTestUser('fix-daily-limit'); });
  afterAll(async () => { if (owner) await deleteTestUser(owner.id); });

  it('allows only one concurrent creation for the last daily slot, then rejects another', async () => {
    const client = await clientFor(owner);
    const { data: category, error } = await admin().from('categories').select('id').limit(1).single();
    expect(error).toBeNull();
    const { data: setting } = await admin().from('system_settings').select('value').eq('key', 'trip_idea_daily_create_limit').single();
    const limit = Number(setting?.value ?? 3);
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThan(20);
    const insert = (index: number) => client.from('trip_ideas').insert({
      owner_id: owner.id, slug: `limit-${owner.id}-${index}`, title: 'Daily limit regression',
      category_id: category!.id, window_start_month: 3, window_end_month: 5, window_year: 2027,
      window_start_date: '2027-03-01', window_end_date: '2027-05-31', expires_at: '2027-06-01T00:00:00Z',
    });
    for (let i = 0; i < limit - 1; i++) expect((await insert(i)).error).toBeNull();
    const concurrent = await Promise.all([insert(limit), insert(limit + 1)]);
    expect(concurrent.filter(result => !result.error)).toHaveLength(1);
    expect(concurrent.find(result => result.error)?.error?.message).toContain('daily_limit');
    expect((await insert(limit + 2)).error?.message).toContain('daily_limit');
    const { count } = await admin().from('trip_ideas').select('id', { head: true, count: 'exact' }).eq('owner_id', owner.id);
    expect(count).toBe(limit);
  });
});
