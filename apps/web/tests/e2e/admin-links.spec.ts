import { test, expect, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

/**
 * ADMIN-LINKS — the admin lists' links must not end in a 404 (Norbert, 2026-09-15):
 *  1. /admin/users → "Részletek" opens /admin/users/[id] (D15 `CMUG6`)
 *  2. /admin/trips → "Megtekintés" opens non-public trips (draft, private) for an admin,
 *     while the same URL stays 404 for any other signed-in user.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);
}

test("admin user detail and non-public trip links resolve", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const organizer = await createTestUser("admin-links-owner");
  const operator = await createTestUser("admin-links-admin");
  const outsider = await createTestUser("admin-links-outsider");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const slug = `admin-links-draft-${suffix}`;
  const title = `Admin links draft ${suffix}`;
  try {
    await admin.from("profiles").update({ display_name: "Admin Links Owner" }).eq("id", organizer.id);
    const { error: roleError } = await admin.from("admin_roles").insert({ user_id: operator.id, role: "operations_admin" });
    expect(roleError).toBeNull();
    const { error: tripError } = await admin.from("trips").insert({
      organizer_id: organizer.id, title, slug, description: "Draft for the admin link test", difficulty: 2, location_country: "HU", max_participants: 8, status: "draft", visibility: "private",
    });
    expect(tripError).toBeNull();

    await login(page, operator.email, operator.password);

    await page.goto("/admin/users");
    await page.goto(`/admin/users/${organizer.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin Links Owner");
    await expect(page.getByRole("link", { name: title })).toHaveAttribute("href", `/trips/${slug}`);

    const tripResponse = await page.goto(`/trips/${slug}`);
    expect(tripResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);

    const bogus = await page.goto("/admin/users/not-a-uuid");
    expect(bogus?.status()).toBe(404);

    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      await login(otherPage, outsider.email, outsider.password);
      const hidden = await otherPage.goto(`/trips/${slug}`);
      expect(hidden?.status()).toBe(404);
    } finally {
      await other.close();
    }
  } finally {
    await deleteTestUser(outsider.id);
    await deleteTestUser(operator.id);
    await deleteTestUser(organizer.id);
  }
});
