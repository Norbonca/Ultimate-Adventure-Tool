import { test, expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { admin, createTestUser, deleteTestUser } from './_setup/seed';

/**
 * FLOW-CORE-5 — M03 költségelszámolás: rögzítés → egyenleg → kiegyenlítés.
 *
 * Severity: 🔴 release-blocker (M03 + §14 devizakezelés).
 * Terv: modules/03_Expense_Sharing/08_Megvalositasi_Terv.md · D04 (BtZ02, fxd4X, Hpeqs, ACfdz, X60Jf, JQ22A).
 *
 * 1. Szervező: első költség a túra pénznemében (HUF), majd egy EUR-s költség — az átváltási sáv
 *    jelez, de a mentést nem tiltja (Norbert, 2026-10-31).
 * 2. Résztvevő: nem rögzíthet (alapértelmezés), a kiegyenlítésnél „Kifizettem” → függőben.
 * 3. Szervező (kedvezményezett): megerősíti → teljesítve. Az összeg a szerver számítása.
 * 4. Vitatás: a kedvezményezett jelzi az eltérést → vitatott; a fizető nem módosíthat semmit.
 *
 * Képernyőképek: SHOT_DIR=<mappa> környezeti változóval 1440 és 390 px-en.
 */

const SHOT_DIR = process.env.SHOT_DIR;
const DESKTOP: BrowserContextOptions = { viewport: { width: 1440, height: 900 } };
const MOBILE: BrowserContextOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const locale = () => test.info().project.use.locale ?? 'hu-HU';
const uniq = (p: string) => `${p}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

type User = Awaited<ReturnType<typeof createTestUser>>;

async function seedTrip(organizer: User, participant: User, prefix: string) {
  const { data: category, error } = await admin.from('categories').select('id').eq('status', 'active').limit(1).single();
  if (error) throw error;
  await admin.from('profiles').update({ display_name: 'E2E Anna' }).eq('id', organizer.id);
  await admin.from('profiles').update({ display_name: 'E2E Bence' }).eq('id', participant.id);
  const slug = `${prefix}-koltseg`.toLowerCase();
  const { data: trip, error: tripError } = await admin.from('trips').insert({
    organizer_id: organizer.id, title: `${prefix} Költségtúra`, slug,
    description: 'M03 e2e fixture', category_id: category.id, difficulty: 1,
    location_country: 'HU', location_city: 'Budapest', max_participants: 8,
    status: 'published', visibility: 'public', show_on_landing: false,
    cover_image_url: 'http://localhost:3001/discover/hero.jpg',
    start_date: '2027-08-01', end_date: '2027-08-03', price_amount: 1000, price_currency: 'HUF',
  }).select('id, slug, settlement_currency, expenses_participants_can_add').single();
  if (tripError) throw tripError;
  const { error: pErr } = await admin.from('trip_participants').insert({ trip_id: trip.id, user_id: participant.id, status: 'approved' });
  if (pErr) throw pErr;
  return trip;
}

async function login(browser: Browser, user: User, options: BrowserContextOptions, baseURL?: string) {
  const context = await browser.newContext({ ...options, locale: locale(), baseURL });
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
  return { context, page };
}

async function shot(page: Page, name: string) {
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${locale().slice(0, 2)}-${name}.png`, fullPage: true });
}

async function addExpense(page: Page, { title, amount, currency, onlyUserId, viewerId }: { title: string; amount: string; currency?: string; onlyUserId?: string; viewerId: string }) {
  await page.getByTestId('expense-add').filter({ visible: true }).first().click();
  const sheet = page.getByTestId('expense-sheet');
  await expect(sheet).toBeVisible();
  await sheet.locator('#exp-title').fill(title);
  await sheet.locator('#exp-amount').fill(amount);
  if (currency) await sheet.locator('#exp-currency').selectOption(currency);
  if (onlyUserId) await sheet.locator(`#exp-p-${viewerId}`).uncheck();
  return sheet;
}

async function overflowFree(page: Page) {
  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

test.describe('FLOW-CORE-5 — költségek és kiegyenlítés', () => {
  test.describe.configure({ mode: 'serial' });

  test('rögzítés HUF + EUR, résztvevő kifizeti, szervező megerősíti', async ({ browser, baseURL }) => {
    test.setTimeout(150_000);
    const anna = await createTestUser('m03-org');
    const bence = await createTestUser('m03-part');
    const contexts: { close(): Promise<void> }[] = [];
    try {
      const trip = await seedTrip(anna, bence, uniq('M03e2e'));
      expect(trip.settlement_currency).toBe('HUF');
      expect(trip.expenses_participants_can_add).toBe(false);

      // 1. Szervező — két költség
      const a = await login(browser, anna, DESKTOP, baseURL);
      contexts.push(a.context);
      await a.page.goto(`/trips/${trip.slug}/expenses`);
      await expect(a.page.getByTestId('expenses-empty')).toBeVisible();
      await overflowFree(a.page);
      await shot(a.page, '1440-01-ures');

      let sheet = await addExpense(a.page, { title: 'Szállás', amount: '30000', viewerId: anna.id });
      await expect(sheet.getByTestId('fx-band')).toHaveAttribute('data-quality', 'same');
      await sheet.getByTestId('expense-save').click();
      await expect(sheet).toBeHidden();
      await expect(a.page.getByTestId('expense-row')).toHaveCount(1);

      sheet = await addExpense(a.page, { title: 'Benzin', amount: '50,00', currency: 'EUR', viewerId: anna.id });
      const band = sheet.getByTestId('fx-band');
      await expect(band).toHaveAttribute('data-quality', /^(exact|backfill|stale|trip|peg)$/);
      await shot(a.page, '1440-02-eur-atvaltasi-sav');
      await sheet.getByTestId('expense-save').click();
      await expect(sheet).toBeHidden();
      await expect(a.page.getByTestId('expense-row')).toHaveCount(2);
      await expect(a.page.getByTestId('expenses-balances')).toBeVisible();
      await shot(a.page, '1440-03-lista-egyenleg');

      const { data: expenses } = await admin.from('expenses')
        .select('title, currency, amount, fx_rate, fx_quality, amount_settlement, created_by')
        .eq('trip_id', trip.id).order('title');
      expect(expenses).toHaveLength(2);
      const eur = expenses!.find((e) => e.currency === 'EUR')!;
      expect(eur.fx_quality).not.toBe('none');
      expect(Number(eur.amount_settlement)).toBeGreaterThan(0);
      expect(expenses!.every((e) => e.created_by === anna.id)).toBe(true);

      // 2. Résztvevő — nem rögzíthet, kifizeti a tartozását
      const b = await login(browser, bence, MOBILE, baseURL);
      contexts.push(b.context);
      await b.page.goto(`/trips/${trip.slug}/expenses`);
      await expect(b.page.getByTestId('expense-row')).toHaveCount(2);
      await expect(b.page.getByTestId('expense-add')).toHaveCount(0);
      await overflowFree(b.page);
      await shot(b.page, '390-01-resztvevo-lista');

      await b.page.goto(`/trips/${trip.slug}/expenses/settle`);
      const myRow = b.page.getByTestId('settle-row').filter({ has: b.page.getByTestId('settle-mark-paid') });
      await expect(myRow).toHaveCount(1);
      await overflowFree(b.page);
      await shot(b.page, '390-02-kiegyenlites-nyitott');
      await myRow.getByTestId('settle-mark-paid').click();
      await expect(b.page.getByTestId('settle-sheet-pay')).toBeVisible();
      await shot(b.page, '390-03-fizetesi-mod');
      await b.page.getByTestId('settle-pay-bank_transfer').click();
      await expect(b.page.getByTestId('settle-sheet-pay')).toBeHidden();
      await expect(b.page.getByTestId('settle-row').filter({ has: b.page.getByTestId('settle-dispute') })).toHaveCount(1);
      await expect(b.page.getByTestId('settle-confirm')).toHaveCount(0);

      const { data: splits } = await admin.from('expense_splits')
        .select('amount_settlement, expenses!inner(trip_id)').eq('user_id', bence.id).eq('expenses.trip_id', trip.id);
      const owed = splits!.reduce((s, r) => s + Math.round(Number(r.amount_settlement) * 100), 0);
      const { data: pending } = await admin.from('settlements').select('id, status, amount, currency, payer_id, receiver_id').eq('trip_id', trip.id);
      expect(pending).toHaveLength(1);
      expect(pending![0]).toMatchObject({ status: 'pending', currency: 'HUF', payer_id: bence.id, receiver_id: anna.id });
      expect(Math.round(Number(pending![0].amount) * 100)).toBe(owed);

      // 3. Szervező megerősíti
      await a.page.goto(`/trips/${trip.slug}/expenses/settle`);
      await expect(a.page.getByTestId('settle-confirm')).toBeVisible();
      await shot(a.page, '1440-04-kiegyenlites-fuggoben');
      await a.page.getByTestId('settle-confirm').click();
      await a.page.getByTestId('settle-confirm-ok').click();
      await expect(a.page.getByTestId('settle-sheet-confirm')).toBeHidden();
      await expect(a.page.getByTestId('settle-row').filter({ visible: true }).first()).toHaveAttribute('data-status', 'completed');
      await shot(a.page, '1440-05-kiegyenlites-teljesitve');
      const { data: done } = await admin.from('settlements').select('status, confirmed_by_payee').eq('id', pending![0].id).single();
      expect(done).toMatchObject({ status: 'completed', confirmed_by_payee: true });
    } finally {
      for (const c of contexts) await c.close();
      await deleteTestUser(anna.id);
      await deleteTestUser(bence.id);
    }
  });

  test('vitatás: a kedvezményezett jelzi, a fizető nem módosíthat', async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const anna = await createTestUser('m03-org');
    const bence = await createTestUser('m03-part');
    const contexts: { close(): Promise<void> }[] = [];
    try {
      const trip = await seedTrip(anna, bence, uniq('M03vita'));
      const a = await login(browser, anna, DESKTOP, baseURL);
      contexts.push(a.context);
      await a.page.goto(`/trips/${trip.slug}/expenses`);
      const sheet = await addExpense(a.page, { title: 'Hajójegy', amount: '12345,67', onlyUserId: bence.id, viewerId: anna.id });
      await sheet.getByTestId('expense-save').click();
      await expect(sheet).toBeHidden();

      const b = await login(browser, bence, MOBILE, baseURL);
      contexts.push(b.context);
      await b.page.goto(`/trips/${trip.slug}/expenses/settle`);
      await b.page.getByTestId('settle-mark-paid').click();
      await b.page.getByTestId('settle-pay-cash').click();
      await expect(b.page.getByTestId('settle-sheet-pay')).toBeHidden();

      await a.page.goto(`/trips/${trip.slug}/expenses/settle`);
      await a.page.getByTestId('settle-dispute').click();
      await a.page.getByTestId('settle-sheet-dispute').locator('textarea').fill('Nem érkezett meg a pénz.');
      await a.page.getByTestId('settle-dispute-ok').click();
      await expect(a.page.getByTestId('settle-sheet-dispute')).toBeHidden();
      // A vitatott kiegyenlítés megmarad (nem módosítható); a tartozás újra nyitott — feloldás a tételek
      // javításával és új kiegyenlítéssel (08_Megvalositasi_Terv §9, 14:03).
      const disputedRow = a.page.locator('[data-testid="settle-row"][data-status="disputed"]').first();
      await expect(disputedRow).toBeVisible();
      await expect(disputedRow).toContainText('Nem érkezett meg a pénz.');
      // GAP-012: a 2 tizedes a kiegyenlítésnél is látszik (nem kerekít 12 346-ra).
      await expect(disputedRow).toContainText(/12[\s\u00a0\u202f,]345[.,]67/);
      await expect(a.page.locator('[data-testid="settle-row"][data-status="open"]').first()).toBeVisible();
      await shot(a.page, '1440-06-vitatott');

      const { data: s } = await admin.from('settlements').select('status, amount, disputed_by, dispute_note').eq('trip_id', trip.id).single();
      expect(s).toMatchObject({ status: 'disputed', disputed_by: anna.id, dispute_note: 'Nem érkezett meg a pénz.' });
      expect(Number(s!.amount)).toBeCloseTo(12345.67, 2);

      await b.page.reload();
      const bDisputed = b.page.locator('[data-testid="settle-row"][data-status="disputed"]').first();
      await expect(bDisputed).toBeVisible();
      await expect(bDisputed.getByRole('button')).toHaveCount(0);
      await expect(b.page.getByTestId('settle-dispute')).toHaveCount(0);
      await expect(b.page.getByTestId('settle-confirm')).toHaveCount(0);
      await shot(b.page, '390-04-vitatott-fizeto');
    } finally {
      for (const c of contexts) await c.close();
      await deleteTestUser(anna.id);
      await deleteTestUser(bence.id);
    }
  });
});
