import { test, expect, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

// L-1 regresszió (2026-10-31): 1 MB fölötti kép feltöltése a server action törzskorlátja
// miatt korábban elbukott. Most a böngésző aláírt URL-lel közvetlenül a Storage-ba tölt.
// Érvényes 1×1 PNG + 3 MB kitöltés (a böngésző az IEND utáni bájtokat figyelmen kívül hagyja).
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHfoAAAAASUVORK5CYII=", "base64");
const LARGE_PNG = Buffer.concat([PNG_1PX, Buffer.alloc(3 * 1024 * 1024)]);

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);
}

async function storedSizes(bucket: string, userId: string): Promise<number[]> {
  const { data } = await admin.storage.from(bucket).list(userId);
  return (data ?? []).map((o) => Number(o.metadata?.size ?? 0));
}

test("3 MB avatar upload lands in the user's own avatars folder", async ({ page }) => {
  test.setTimeout(90_000);
  const user = await createTestUser("upload-avatar");
  try {
    await login(page, user.email, user.password);
    await page.goto("/settings/profile");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "big.png", mimeType: "image/png", buffer: LARGE_PNG });
    await expect.poll(() => storedSizes("avatars", user.id), { timeout: 30_000 }).toEqual([LARGE_PNG.length]);
    await expect(page.getByText(/a mentés sikertelen|save failed|túl nagy|too large/i)).toHaveCount(0);
  } finally {
    const { data } = await admin.storage.from("avatars").list(user.id);
    if (data?.length) await admin.storage.from("avatars").remove(data.map((o) => `${user.id}/${o.name}`));
    await deleteTestUser(user.id);
  }
});

test("3 MB cover upload in the trip wizard lands in the user's own trip-covers folder", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await createTestUser("upload-cover");
  const next = () => page.getByRole("button", { name: /^(következő|next|tovább)$/i }).last().click();
  try {
    await login(page, user.email, user.password);
    await page.goto("/trips/new");
    await page.getByRole("button", { name: /sablon használata|use a template/i }).click();
    await page.getByRole("button", { name: /hétvégi hegyi túra|weekend hike in the making/i }).click();
    await page.getByRole("button", { name: /nyilvános esemény|public event/i }).click();
    await next();
    await page.locator("#trip-title").fill(`Upload ${Date.now()}`);
    await page.locator('input[type="date"]').nth(0).fill("2027-01-01");
    await page.locator('input[type="date"]').nth(1).fill("2027-01-02");
    await next();
    await next();
    await page.locator('input[type="file"]').first().setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: LARGE_PNG });
    await expect.poll(() => storedSizes("trip-covers", user.id), { timeout: 30_000 }).toEqual([LARGE_PNG.length]);
    await expect(page.getByText(/a mentés sikertelen|save failed|túl nagy|too large/i)).toHaveCount(0);
  } finally {
    const { data } = await admin.storage.from("trip-covers").list(user.id);
    if (data?.length) await admin.storage.from("trip-covers").remove(data.map((o) => `${user.id}/${o.name}`));
    await deleteTestUser(user.id);
  }
});

test("an 11 MB cover is rejected in the browser before any upload", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await createTestUser("upload-toolarge");
  const next = () => page.getByRole("button", { name: /^(következő|next|tovább)$/i }).last().click();
  try {
    await login(page, user.email, user.password);
    await page.goto("/trips/new");
    await page.getByRole("button", { name: /sablon használata|use a template/i }).click();
    await page.getByRole("button", { name: /hétvégi hegyi túra|weekend hike in the making/i }).click();
    await page.getByRole("button", { name: /nyilvános esemény|public event/i }).click();
    await next();
    await page.locator("#trip-title").fill(`Upload ${Date.now()}`);
    await page.locator('input[type="date"]').nth(0).fill("2027-01-01");
    await page.locator('input[type="date"]').nth(1).fill("2027-01-02");
    await next();
    await next();
    await page.locator('input[type="file"]').first().setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: Buffer.concat([PNG_1PX, Buffer.alloc(11 * 1024 * 1024)]) });
    await expect(page.getByText(/túl nagy|too large/i).first()).toBeVisible();
    expect(await storedSizes("trip-covers", user.id)).toEqual([]);
  } finally {
    await deleteTestUser(user.id);
  }
});
