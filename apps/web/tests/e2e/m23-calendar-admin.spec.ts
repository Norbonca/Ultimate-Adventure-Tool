import { mkdirSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

/**
 * M23 — admin calendar (S5 list, S6 editor, S8 tags). K-07, 2026-09-16.
 * A platform admin browses HU periods, searches, switches tabs, opens an existing
 * definition, creates a new one and deactivates it; a signed-in non-admin is kept out.
 */

const SHOTS = process.env.QA_SHOTS_DIR;
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);
}

test("admin manages calendar periods; non-admin is redirected", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-hu", "HU copy, desktop admin");
  test.setTimeout(120_000);
  const operator = await createTestUser("m23-admin");
  const outsider = await createTestUser("m23-outsider");
  const key = `e2e_m23_${Date.now()}`;
  try {
    const { error: roleError } = await admin.from("admin_roles").insert({ user_id: operator.id, role: "operations_admin" });
    expect(roleError).toBeNull();
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, operator.email, operator.password);

    // S5 — list by country and year
    await page.goto("/admin/calendar?country=HU&year=2026");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Naptár");
    await expect(page.getByText(/\d+ definíció/)).toBeVisible();
    await expect(page.getByText("Mindenszentek")).toBeVisible();
    await shot(page, "01-calendar-hu-2026");

    const search = page.getByLabel("Keresés név vagy kulcs szerint");
    await search.fill("karácsony");
    await expect(page.getByText("Karácsony", { exact: true })).toBeVisible();
    await expect(page.getByText("Mindenszentek")).toHaveCount(0);
    await shot(page, "02-calendar-search");
    await search.fill("nincs-ilyen-idoszak");
    await expect(page.getByText("Nincs a szűrőknek megfelelő időszak.")).toBeVisible();
    await search.fill("");

    // S8 — tags tab
    await page.getByRole("tab", { name: "Címkék" }).click();
    await expect(page.getByRole("tab", { name: "Címkék" })).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/tab=tags/);
    await shot(page, "03-calendar-tags");
    await page.getByRole("tab", { name: "Időszakok" }).click();
    await expect(page.getByRole("tab", { name: "Időszakok" })).toHaveAttribute("aria-selected", "true");

    // S6 — open an existing definition
    await page.getByLabel("Keresés név vagy kulcs szerint").fill("hu_christmas_day");
    await page.getByRole("link", { name: "Szerkesztés" }).first().click();
    await expect(page).toHaveURL(/\/admin\/calendar\/periods\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Időszak-definíció szerkesztése");
    await expect(page.getByPlaceholder("pl. hu_school_spring_break")).toHaveValue("hu_christmas_day");
    await shot(page, "04-period-editor-existing");

    // S6 — create a new definition, then deactivate it
    await page.goto("/admin/calendar/periods/new?country=HU");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Új időszak-definíció");
    await page.getByPlaceholder("pl. hu_school_spring_break").fill(key);
    await page.getByLabel("Név (HU)").fill("E2E teszt ünnep");
    await page.getByLabel("Név (EN)").fill("E2E test holiday");
    await page.getByRole("textbox", { name: "Forrás", exact: true }).fill("E2E teszt forrás");
    await shot(page, "05-period-editor-new");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page).toHaveURL(/\/admin\/calendar\/periods\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    const { data: created } = await admin.from("ref_calendar_periods").select("id, country_code, status, rule_kind").eq("key", key).single();
    expect(created).toMatchObject({ country_code: "HU", status: "active", rule_kind: "fixed_annual" });
    const { count: occurrences } = await admin.from("ref_calendar_occurrences").select("id", { count: "exact", head: true }).eq("period_id", created!.id);
    expect(occurrences ?? 0).toBeGreaterThan(0);
    await shot(page, "06-period-saved");

    let confirmText = "";
    page.once("dialog", (dialog) => { confirmText = dialog.message(); void dialog.accept(); });
    await page.getByRole("button", { name: "Inaktiválás" }).click();
    await expect(page.getByRole("button", { name: "Aktiválás" })).toBeVisible();
    expect(confirmText).toContain("Inaktiválod?");
    await expect.poll(async () => (await admin.from("ref_calendar_periods").select("status").eq("id", created!.id).single()).data?.status).toBe("inactive");
    await shot(page, "07-period-deactivated");

    // Non-admin
    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      await login(otherPage, outsider.email, outsider.password);
      await otherPage.goto("/admin/calendar?country=HU");
      await expect(otherPage).not.toHaveURL(/\/admin\/calendar/);
      await expect(otherPage.getByRole("heading", { name: "Naptár" })).toHaveCount(0);
    } finally {
      await other.close();
    }
  } finally {
    await admin.from("ref_calendar_periods").delete().eq("key", key);
    await deleteTestUser(outsider.id);
    await deleteTestUser(operator.id);
  }
});
