import { Page, Locator, expect } from '@playwright/test';

/**
 * AppHeader Page Object Model.
 *
 * Reflects the actual `apps/web/components/AppHeader.tsx` + `LanguageSwitcher.tsx`
 * implementation, NOT a hypothetical dropdown design:
 *
 *   - Logo: <Link href="/"><span>Tre</span><span>vu</span></Link>
 *     → accessible name is "Trevu" (children concatenated)
 *
 *   - LanguageSwitcher (compact variant) is a TOGGLE button:
 *     <button title={LABEL[nextLocale]}>🇭🇺 HU</button>
 *     → no dropdown menu, single click flips locale.
 *     → in HU mode, button shows "🇭🇺 HU" with title="English"
 *     → in EN mode, button shows "🇬🇧 EN" with title="Magyar"
 *
 *   - Anonymous user CTAs: <Link href="/login">{t('nav.logIn')}</Link>
 *     → HU: "Bejelentkezés", EN: "Log in"
 */
export class AppHeaderPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The "Trevu" home link in the BAL ZÓNA. */
  get logo(): Locator {
    return this.page.getByRole('link', { name: /trevu/i });
  }

  /**
   * The language toggle button. In HU it shows "HU" + flag; in EN it shows "EN".
   * Match by the visible locale code (case-insensitive).
   */
  get languageSwitcher(): Locator {
    return this.page.getByRole('button', { name: /\b(hu|en)\b/i });
  }

  /**
   * Toggle the locale. Idempotent w.r.t. target — if already in `target`, no-op.
   * Uses the button's title attribute to detect current locale (title shows the
   * NEXT locale label, e.g. title="Magyar" means current is EN).
   */
  async switchLocale(target: 'hu' | 'en') {
    const button = this.languageSwitcher;
    await expect(button).toBeVisible();

    // Read the visible code text from the button to determine current locale.
    const currentText = (await button.textContent())?.trim().toLowerCase() ?? '';
    const currentLocale: 'hu' | 'en' = currentText.includes('en') ? 'en' : 'hu';
    if (currentLocale === target) return; // already there

    await button.click();
    // Cookie + page state should sync; wait for either a navigation or the
    // <html lang> to flip.
    await this.page.waitForFunction(
      (lang) => document.documentElement.lang.startsWith(lang),
      target,
      { timeout: 5_000 },
    );
  }

  /** Logged-in user — avatar pill (text = display name initials) is visible. */
  async expectLogged(displayName: string | RegExp) {
    await expect(this.page.getByRole('link', { name: displayName })).toBeVisible();
  }

  /**
   * Anonymous user — Login + Register links visible, no avatar.
   * Accept both HU ("Bejelentkezés" / "Regisztráció") and EN ("Log in" / "Sign up").
   */
  async expectAnonymous() {
    const loginLink = this.page.getByRole('link', {
      name: /bejelentkezés|belépés|log\s*in|sign\s*in/i,
    });
    await expect(loginLink).toBeVisible();
    const registerLink = this.page.getByRole('link', {
      name: /regisztráció|sign\s*up|register/i,
    });
    await expect(registerLink).toBeVisible();
  }
}
