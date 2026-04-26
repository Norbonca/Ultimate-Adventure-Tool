import { test, expect } from '@playwright/test';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const ROUTES = [
  { path: '/', name: 'Discover', perfMin: 70 },
  { path: '/get-started', name: 'Landing', perfMin: 80 },
  { path: '/login', name: 'Login', perfMin: 80 },
];

for (const r of ROUTES) {
  test(`Lighthouse — ${r.name} (${r.path})`, async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    try {
      const result = await lighthouse(`http://localhost:3000${r.path}`, {
        port: chrome.port,
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false },
      });
      const lhr = result!.lhr;
      const perf = (lhr.categories.performance.score ?? 0) * 100;
      const a11y = (lhr.categories.accessibility.score ?? 0) * 100;
      console.log(`${r.name}: perf=${perf}, a11y=${a11y}`);
      expect(perf, `Performance < ${r.perfMin}`).toBeGreaterThanOrEqual(r.perfMin);
      expect(a11y, 'A11y < 95').toBeGreaterThanOrEqual(95);
    } finally {
      await chrome.kill();
    }
  });
}
