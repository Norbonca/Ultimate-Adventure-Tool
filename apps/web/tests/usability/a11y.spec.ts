import { test, expect } from '@playwright/test';
import { runAxe, expectNoCriticalA11y } from './_axe';

const ROUTES = [
  { path: '/', name: 'Discover' },
  { path: '/get-started', name: 'Landing' },
  { path: '/signup', name: 'Signup' },
  { path: '/login', name: 'Login' },
];

for (const { path, name } of ROUTES) {
  test.describe(`A11y — ${name}`, () => {
    test(`${path} — no critical/serious violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoCriticalA11y(page);
    });

    test(`${path} — moderate violations under threshold`, async ({ page }) => {
      await page.goto(path);
      const { violations } = await runAxe(page, { impacts: ['moderate'] });
      expect(violations.length, `Moderate issues:\n${violations.map((v) => v.id).join(', ')}`).toBeLessThanOrEqual(5);
    });
  });
}
