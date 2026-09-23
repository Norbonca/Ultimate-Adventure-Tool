import { expect, test, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);
}

async function expectNightSurface(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator("body")).toHaveAttribute("data-surface", "night");
  await expect.poll(async () => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor))
    .toBe("rgb(15, 23, 42)");

  const lightSurfaces = await page.locator("body *").evaluateAll((elements) =>
    elements.flatMap((element) => {
      if (["IMG", "VIDEO", "CANVAS", "SVG"].includes(element.tagName)) return [];
      const rect = element.getBoundingClientRect();
      if (rect.width * rect.height < 60_000) return [];
      const style = getComputedStyle(element);
      const color = style.backgroundColor.replaceAll(" ", "");
      if (!["rgb(255,255,255)", "rgb(248,250,252)", "rgb(241,245,249)"].includes(color)) return [];
      return [{ tag: element.tagName, className: element.className, color }];
    }),
  );

  expect(lightSurfaces, `${route} contains a large Day surface`).toEqual([]);
}

test("all non-admin route families use the Night surface", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const organizer = await createTestUser("night-organizer");
  const participant = await createTestUser("night-participant");
  const { data: category } = await admin.from("categories").select("id").limit(1).single();
  const slug = `night-surface-${Date.now()}`;
  const { data: trip, error: tripError } = await admin.from("trips").insert({
    organizer_id: organizer.id,
    title: "Night surface regression",
    slug,
    description: "Night surface regression fixture",
    difficulty: 2,
    location_country: "HU",
    max_participants: 8,
    status: "published",
    visibility: "public",
    category_id: category!.id,
    start_date: "2027-05-01",
    end_date: "2027-05-03",
    cover_image_url: "https://example.com/cover.jpg",
    require_approval: false,
  }).select("id").single();
  expect(tripError).toBeNull();
  const { error: participantError } = await admin.from("trip_participants").insert({
    trip_id: trip!.id,
    user_id: participant.id,
    status: "approved",
  });
  expect(participantError).toBeNull();

  try {
    for (const route of ["/", "/get-started", "/pricing", "/login", "/register", `/trips/${slug}`]) {
      await expectNightSurface(page, route);
    }

    await login(page, organizer.email, organizer.password);
    for (const route of [
      "/dashboard",
      "/trips",
      "/community",
      "/profile",
      "/settings/profile",
      "/settings/interests",
      "/settings/skills",
      "/settings/privacy",
      "/settings/social",
      "/settings/password",
      "/trips/new",
      `/trips/${slug}/edit`,
      `/trips/${slug}/manage`,
    ]) {
      await expectNightSurface(page, route);
    }

    const participantContext = await browser.newContext();
    try {
      const participantPage = await participantContext.newPage();
      await login(participantPage, participant.email, participant.password);
      await expectNightSurface(participantPage, `/trips/${slug}/participant`);
    } finally {
      await participantContext.close();
    }
  } finally {
    await deleteTestUser(participant.id);
    await deleteTestUser(organizer.id);
  }
});
