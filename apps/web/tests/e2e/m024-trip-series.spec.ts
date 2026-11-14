import { test, expect, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

/**
 * M024 Túrasorozat — Norbert, 2026-11-01: „a több időponttal is rendelkező túrákat … csak a kártyán összevonva,
 * … a jelentkezésnél is tudni kell jelezni, hogy melyik időpontra … ettől még mindegyik túra önálló túra”.
 * Spec: modules/02_Trip_Management/024_Trip_Series/00_Uzleti_Specifikacio.md · Design: D09 X5GF9/a9sRR1, D02 s9YQ4F/OUuEB/vcfZO.
 * Migration 063.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);
}

/** Opcionális képernyőképek a tervvel való összevetéshez (M024_SHOTS=<mappa>). */
async function shot(page: Page, name: string) {
  if (process.env.M024_SHOTS) await page.screenshot({ path: `${process.env.M024_SHOTS}/${name}.png` });
}

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function seedSeries(organizerId: string, title: string) {
  const { data: category } = await admin.from("categories").select("id").limit(1).single();
  const { data: series, error: seriesError } = await admin
    .from("trip_series").insert({ organizer_id: organizerId, title }).select("id").single();
  expect(seriesError).toBeNull();
  const dates: Array<[string, string, number, number]> = [
    ["2028-05-10", "2028-05-17", 8, 450],
    ["2028-06-07", "2028-06-14", 8, 490],
    ["2028-07-05", "2028-07-12", 8, 450],
    ["2028-08-02", "2028-08-09", 8, 450],
    ["2028-09-06", "2028-09-13", 8, 450],
  ];
  const rows = dates.map(([start, end, max, price]) => ({
    organizer_id: organizerId, title, slug: `e2e-m024-${suffix()}`, description: "E2E M024", difficulty: 2,
    location_country: "HR", max_participants: max, status: "published", visibility: "public", category_id: category!.id,
    start_date: start, end_date: end, price_amount: price, price_currency: "EUR", require_approval: true,
    cover_image_url: "https://example.com/cover.jpg", series_id: series!.id, published_at: new Date().toISOString(),
  }));
  const { data, error } = await admin.from("trips").insert(rows).select("id, slug, start_date").order("start_date");
  expect(error).toBeNull();
  return { seriesId: series!.id, trips: data! };
}

test("M024: one Discover card per series, date choice on apply, organizer adds and detaches a date", async ({ page }) => {
  test.setTimeout(150_000);
  const organizer = await createTestUser("m024-org");
  const guest = await createTestUser("m024-guest");
  const title = `M024 Sorozat ${suffix()}`;
  try {
    const { seriesId, trips } = await seedSeries(organizer.id, title);

    // K-1/K-5/K-9: egy kártya, max 3 időpontsor, „+2 további”, a sor a saját túrájára visz
    const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.context().addCookies([{ name: "trevu-discover-view-v3", value: "grid", url: base }]);
    await page.goto("/");
    await page.getByTestId("discover-search-query").fill(title);
    await page.getByTestId("discover-search-submit").click();
    const cards = page.getByTestId("trip-tile");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("data-series", "true");
    await expect(cards.first().getByTestId("series-row")).toHaveCount(3);
    await expect(cards.first().getByTestId("series-more")).toContainText(/2/);
    await expect(page.getByTestId("discover-count")).toContainText("1");
    await cards.first().getByTestId("series-row").nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${trips[1].slug}$`));
    await expect(page.getByTestId("series-date-row").filter({ has: page.locator('[aria-current="page"]') })).toHaveCount(1);

    // BR-M024-004: jelentkezés a választott időpontra — a jelentkezés a választott (önálló) túrára jön létre
    await login(page, guest.email, guest.password);
    await page.goto(`/trips/${trips[0].slug}`);
    await page.locator("#trip-apply").getByRole("button", { name: /jelentkezem|apply/i }).first().click();
    const options = page.getByTestId("apply-series-options");
    await expect(options.locator('input[type="radio"]')).toHaveCount(5);
    await expect(options.locator('input[type="radio"]').first()).toBeChecked();
    await options.locator('input[type="radio"]').nth(2).check();
    await options.scrollIntoViewIfNeeded();
    await shot(page, "apply-options");
    await page.getByTestId("apply-submit").click();
    await expect(page.getByTestId("apply-success")).toBeVisible();
    await expect(page.getByTestId("apply-success-date")).toBeVisible();
    await shot(page, "apply-success");
    const { data: applications } = await admin.from("trip_participants").select("trip_id").eq("user_id", guest.id);
    expect(applications!.map((a) => a.trip_id)).toEqual([trips[2].id]);

    // ND-09: másik időpontra is jelentkezhet, a választó jelzi a meglévőt
    await page.goto(`/trips/${trips[0].slug}`);
    await page.locator("#trip-apply").getByRole("button", { name: /jelentkezem|apply/i }).first().click();
    await expect(page.getByTestId("apply-series-already")).toBeVisible();
    await expect(page.getByTestId("apply-series-options").locator('input[type="radio"]').nth(2)).toBeDisabled();

    // BR-M024-006/008: a szervező új időpontot ad (piszkozat), majd egyet leválaszt
    await page.context().clearCookies();
    await login(page, organizer.email, organizer.password);
    await page.goto(`/trips/${trips[0].slug}`);
    await page.getByTestId("series-add-date").click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#series-start").fill("2028-10-04");
    await expect(dialog.locator("#series-end")).toHaveValue("2028-10-11");
    await shot(page, "add-date-dialog");
    await dialog.getByTestId("series-create-draft").click();
    await expect(dialog).toContainText(/elkészült|has been created/i);
    const { data: created } = await admin.from("trips").select("status, series_id, current_participants").eq("series_id", seriesId).eq("start_date", "2028-10-04").single();
    expect(created).toEqual({ status: "draft", series_id: seriesId, current_participants: 0 });
    await dialog.getByRole("button", { name: /bezárás|close/i }).click();

    await page.reload();
    await page.getByTestId("trip-series-dates").scrollIntoViewIfNeeded();
    await shot(page, "organizer-dates");
    await page.getByTestId("series-detach").nth(4).click();
    await page.getByTestId("series-detach-confirm").click();
    await expect(page.getByTestId("series-date-row")).toHaveCount(5);
    const { count } = await admin.from("trips").select("id", { count: "exact", head: true }).eq("series_id", seriesId);
    expect(count).toBe(5);
  } finally {
    await admin.from("trip_participants").delete().eq("user_id", guest.id);
    await admin.from("trips").delete().eq("organizer_id", organizer.id);
    await admin.from("trip_series").delete().eq("organizer_id", organizer.id);
    await deleteTestUser(organizer.id);
    await deleteTestUser(guest.id);
  }
});
