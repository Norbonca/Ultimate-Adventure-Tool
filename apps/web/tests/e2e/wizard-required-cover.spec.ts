import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser } from "./_setup/seed";

/**
 * WIZARD-COVER — the cover image is required for publication (publishTripSchema + migration 032),
 * so step 4 marks it with an asterisk and a publish attempt without it names the missing field
 * instead of the generic "check the provided data" message (Norbert, 2026-09-15).
 */
test("publishing without a cover image names the missing field", async ({ page }) => {
  test.setTimeout(90_000);
  const user = await createTestUser("wizard-cover");
  const next = () => page.getByRole("button", { name: /^(következő|next|tovább)$/i }).last().click();
  try {
    await page.goto("/login");
    await page.locator("#email").fill(user.email);
    await page.locator("#password").fill(user.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);

    await page.goto("/trips/new");
    await page.getByRole("button", { name: /sablon használata|use a template/i }).click();
    await page.getByRole("button", { name: /hétvégi hegyi túra|weekend hike in the making/i }).click();
    await page.getByRole("button", { name: /nyilvános esemény|public event/i }).click();
    await next();
    await page.locator("#trip-title").fill(`Wizard cover ${Date.now()}`);
    await page.locator('input[type="date"]').nth(0).fill("2027-01-01");
    await page.locator('input[type="date"]').nth(1).fill("2027-01-02");
    await next();
    await next();

    const coverLabel = page.locator("label", { hasText: /borítókép|cover image/i }).first();
    await expect(coverLabel.locator("span.text-coral")).toHaveText("*");

    await page.getByRole("button", { name: /publikál|publish|közzététel/i }).last().click();
    await expect(page.getByRole("alert").filter({ hasText: /hiányzó kötelező mezők: borítókép$|missing required fields: cover image$/i })).toBeVisible();
    await expect(page).toHaveURL(/\/trips\/new/);
  } finally {
    await deleteTestUser(user.id);
  }
});
