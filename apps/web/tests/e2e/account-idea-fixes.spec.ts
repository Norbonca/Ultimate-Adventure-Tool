import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { admin, createTestUser, deleteTestUser } from './_setup/seed';

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function seedIdea(ownerId: string, label: string) {
  const { data: category, error: categoryError } = await admin.from('categories').select('id')
    .eq('status', 'active').limit(1).single();
  if (categoryError) throw categoryError;
  const { data, error } = await admin.from('trip_ideas').insert({
    owner_id: ownerId, slug: `fix-idea-${Date.now()}-${label}`, title: `Ötlet mentési regresszió ${label}`,
    description: 'Saját helyi tesztadat az ötletből indított túra ellenőrzéséhez.',
    category_id: category.id, intent: 'will_organize', visibility: 'public',
    window_start_month: 8, window_end_month: 8, window_year: 2027,
    window_start_date: '2027-08-01', window_end_date: '2027-08-31', expires_at: '2027-09-01T00:00:00Z',
  }).select('id,title').single();
  if (error) throw error;
  const { error: destinationError } = await admin.from('trip_idea_destinations').insert({
    idea_id: data.id, name: 'Budapest', country_codes: ['HU'], sort_order: 0,
  });
  if (destinationError) throw destinationError;
  return data;
}

for (const mode of ['manual', 'next-only'] as const) {
  test(`F05: idea wizard ${mode} preserves one linked draft through publication`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const user = await createTestUser('fix-idea-wizard');
    let ideaId: string | undefined;
    const next = () => page.getByRole('button', { name: /^(következő|next|tovább)$/i }).last().click();
    try {
      const idea = await seedIdea(user.id, mode);
      ideaId = idea.id;
      await login(page, user);
      await page.goto(`/trips/new?idea=${idea.id}`);
      await page.getByRole('button', { name: /nyilvános esemény|public event/i }).click();
      await next();
      await expect(page.locator('#trip-title')).toHaveValue(idea.title);
      await page.locator('#trip-start-date').fill('2027-08-01');
      await page.locator('#trip-end-date').fill('2027-08-02');
      const draftButton = page.getByRole('button', { name: /piszkozat mentése|save draft/i });
      if (mode === 'manual') await draftButton.click();
      else await next();

      const linkedIds = async () => {
        const { data, error } = await admin.from('trip_idea_trips').select('trip_id').eq('idea_id', idea.id);
        if (error) throw error;
        return data!.map(row => row.trip_id);
      };
      await expect.poll(linkedIds).toHaveLength(1);
      const [draftId] = await linkedIds();
      const ownedTrips = async () => (await admin.from('trips').select('id,status').eq('organizer_id', user.id)).data;
      expect(await ownedTrips()).toEqual([{ id: draftId, status: 'draft' }]);
      if (mode === 'manual') {
        // Saving again must update the same draft, not insert another one.
        await draftButton.click();
        await expect(draftButton).toBeEnabled();
        expect(await linkedIds()).toEqual([draftId]);
        expect(await ownedTrips()).toEqual([{ id: draftId, status: 'draft' }]);
        await next();
      }
      await next();
      await page.locator('input[type="file"]').first().setInputFiles({
        name: 'linked-draft.png', mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHfoAAAAASUVORK5CYII=', 'base64'),
      });
      // Upload is asynchronous; publication must use the completed cover selection.
      await expect(page.locator('input[type="file"]')).toHaveCount(1);
      await expect(page.locator('div[style*="trip-covers"]')).toBeVisible();
      await page.getByRole('button', { name: /publikál|publish|közzététel/i }).last().click();
      await expect(page).toHaveURL(/\/trips\/(?!new(?:\?|$))[^/?]+$/);
      expect(await linkedIds()).toEqual([draftId]);
      expect(await ownedTrips()).toEqual([{ id: draftId, status: 'published' }]);
      await testInfo.attach(`idea-${mode}-readback`, { body: JSON.stringify({ ideaId: idea.id, tripId: draftId, linkedTrips: await linkedIds(), ownedTrips: await ownedTrips() }), contentType: 'application/json' });
    } finally {
      if (ideaId) {
        const { error } = await admin.from('trip_ideas').delete().eq('id', ideaId).eq('owner_id', user.id);
        if (error) throw error;
      }
      await deleteTestUser(user.id);
    }
  });
}

test('F09: privacy downloads own JSON, rejects anonymous access and shows export failures', async ({ page, request }, testInfo) => {
  const user = await createTestUser('fix-account-export');
  try {
    const anonymous = await request.get('/api/v1/account/export');
    expect(anonymous.status()).toBe(401);
    await login(page, user);
    await page.goto('/settings/privacy');
    const button = page.getByRole('button', { name: /adatok exportálása|export data/i });
    const downloadPromise = page.waitForEvent('download');
    await button.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('trevu-account.json');
    const path = await download.path();
    expect(path).not.toBeNull();
    const data = JSON.parse(await readFile(path!, 'utf8'));
    expect(data.schema_version).toBe(1);
    expect(data.profile.id).toBe(user.id);
    expect(Array.isArray(data.organized_trips)).toBe(true);
    expect(data).not.toHaveProperty('access_token');
    await testInfo.attach('export-readback', { body: JSON.stringify({ filename: download.suggestedFilename(), profileId: data.profile.id, datasets: Object.keys(data) }), contentType: 'application/json' });
    await page.route('**/api/v1/account/export', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"export_failed"}' }));
    await button.click();
    const locale = await page.locator('html').getAttribute('lang');
    await expect(page.locator('main').getByRole('alert')).toHaveText(locale === 'hu' ? 'Az adatok betöltése sikertelen.' : 'Failed to load data.');
    await expect(button).toBeEnabled();
  } finally { await deleteTestUser(user.id); }
});

test('F10: public profile slug and id respect public, registered and private visibility', async ({ page, browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const owner = await createTestUser('fix-profile-route');
  const viewer = await createTestUser('fix-profile-viewer');
  const anonymous = await browser.newContext({ baseURL });
  const other = await browser.newContext({ baseURL });
  const slug = `profile-route-${Date.now()}`;
  const name = `Visible Profile ${Date.now()}`;
  const results: Array<{ role: string; visibility: string; status: number }> = [];
  try {
    const { error } = await admin.from('profiles').update({ display_name: name, slug, profile_visibility: 'public' }).eq('id', owner.id);
    if (error) throw error;
    const publicPage = await anonymous.newPage();
    for (const key of [slug, owner.id]) {
      const response = await publicPage.goto(`/u/${key}`);
      expect(response!.status()).toBe(200);
      await expect(publicPage.getByRole('heading', { level: 1, name })).toBeVisible();
      results.push({ role: `anonymous/${key === slug ? 'slug' : 'id'}`, visibility: 'public', status: response!.status() });
    }
    await admin.from('profiles').update({ profile_visibility: 'registered' }).eq('id', owner.id);
    let response = await publicPage.goto(`/u/${slug}`);
    expect(response!.status()).toBe(404);
    results.push({ role: 'anonymous', visibility: 'registered', status: response!.status() });
    const viewerPage = await other.newPage();
    await login(viewerPage, viewer);
    response = await viewerPage.goto(`/u/${slug}`);
    expect(response!.status()).toBe(200);
    await expect(viewerPage.getByRole('heading', { level: 1, name })).toBeVisible();
    results.push({ role: 'other-user', visibility: 'registered', status: response!.status() });
    await admin.from('profiles').update({ profile_visibility: 'private' }).eq('id', owner.id);
    response = await viewerPage.goto(`/u/${slug}`);
    expect(response!.status()).toBe(404);
    results.push({ role: 'other-user', visibility: 'private', status: response!.status() });
    await login(page, owner);
    response = await page.goto(`/u/${slug}`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    results.push({ role: 'self', visibility: 'private', status: response!.status() });
    await testInfo.attach('profile-visibility-readback', { body: JSON.stringify(results), contentType: 'application/json' });
  } finally {
    await anonymous.close(); await other.close();
    await deleteTestUser(viewer.id); await deleteTestUser(owner.id);
  }
});
