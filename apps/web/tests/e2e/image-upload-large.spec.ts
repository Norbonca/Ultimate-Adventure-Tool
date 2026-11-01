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

// 2026-11-01 (Norbert hibajelzése): a behúzás nem működött (nem volt drop-kezelő, a böngésző
// megnyitotta a fájlt), és egy elbukott próbálkozás után a feltöltés nem indult újra.
async function openWizardStep4(page: Page) {
  const next = () => page.getByRole("button", { name: /^(következő|next|tovább)$/i }).last().click();
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
}

test("a cover dropped onto the zone is uploaded (drag & drop)", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await createTestUser("upload-drop");
  try {
    await login(page, user.email, user.password);
    await openWizardStep4(page);
    const zone = page.getByTestId("image-drop-zone-cover");
    const dataTransfer = await page.evaluateHandle((b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], "dropped.png", { type: "image/png" }));
      return dt;
    }, LARGE_PNG.toString("base64"));
    await zone.dispatchEvent("dragenter", { dataTransfer });
    await zone.dispatchEvent("dragover", { dataTransfer });
    await zone.dispatchEvent("drop", { dataTransfer });
    await expect.poll(() => storedSizes("trip-covers", user.id), { timeout: 30_000 }).toEqual([LARGE_PNG.length]);
    await expect(page.getByText(/a mentés sikertelen|save failed/i)).toHaveCount(0);
  } finally {
    const { data } = await admin.storage.from("trip-covers").list(user.id);
    if (data?.length) await admin.storage.from("trip-covers").remove(data.map((o) => `${user.id}/${o.name}`));
    await deleteTestUser(user.id);
  }
});

test("after a rejected file the next pick still uploads", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await createTestUser("upload-retry");
  try {
    await login(page, user.email, user.password);
    await openWizardStep4(page);
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: Buffer.concat([PNG_1PX, Buffer.alloc(11 * 1024 * 1024)]) });
    await expect(page.getByText(/túl nagy|too large/i).first()).toBeVisible();
    await expect(input).toBeEnabled();
    await input.setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: LARGE_PNG });
    await expect.poll(() => storedSizes("trip-covers", user.id), { timeout: 30_000 }).toEqual([LARGE_PNG.length]);
  } finally {
    const { data } = await admin.storage.from("trip-covers").list(user.id);
    if (data?.length) await admin.storage.from("trip-covers").remove(data.map((o) => `${user.id}/${o.name}`));
    await deleteTestUser(user.id);
  }
});
