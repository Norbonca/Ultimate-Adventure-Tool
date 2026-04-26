import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface AxeOptions {
  /** Limit violation reporting to selected impact levels. */
  impacts?: Array<'minor' | 'moderate' | 'serious' | 'critical'>;
  /** WCAG tags to include, e.g. ['wcag2a', 'wcag2aa']. */
  tags?: string[];
}

export async function runAxe(page: Page, opts: AxeOptions = {}) {
  const builder = new AxeBuilder({ page });
  if (opts.tags?.length) builder.withTags(opts.tags);
  const results = await builder.analyze();
  const filtered = opts.impacts
    ? results.violations.filter((v) => opts.impacts!.includes(v.impact as any))
    : results.violations;
  return { results, violations: filtered };
}

export async function expectNoCriticalA11y(page: Page) {
  const { violations } = await runAxe(page, { impacts: ['critical', 'serious'] });
  if (violations.length) {
    const summary = violations
      .map((v) => `  - [${v.impact}] ${v.id}: ${v.description}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
      .join('\n');
    throw new Error(`A11y critical/serious violations:\n${summary}`);
  }
}
