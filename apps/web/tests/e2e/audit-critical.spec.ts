import { test, expect } from "@playwright/test";
import { admin, createTestUser, deleteTestUser, trackFixtureUser } from "./_setup/seed";

test("signup, template wizard publication, public discovery, login and application", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const email = `audit-browser-${Date.now()}@trevu.local`;
  const password = "Test-1234!";
  let ownerId: string | undefined;
  let applicantId: string | undefined;
  const next = () => page.getByRole("button", { name: /^(következő|next|tovább)$/i }).last().click();
  try {
    await page.goto("/register");
    await page.locator("#firstName").fill("Audit");
    await page.locator("#lastName").fill("Browser");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator("#terms").check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard|trips)(\/|$)/);
    const { data: owner } = await admin.from("profiles").select("id").eq("email", email).single();
    ownerId = owner!.id;
    trackFixtureUser(ownerId!);
    await page.goto("/trips/new");
    await page.getByRole("button", { name: /sablon használata|use a template/i }).click();
    await page.getByRole("button", { name: /hétvégi hegyi túra|weekend hike in the making/i }).click();
    await expect(page.getByRole("heading", { name: /milyen kalandot|what.*adventure/i })).toBeVisible();
    await page.getByRole("button", { name: /nyilvános esemény|public event/i }).click();
    await next();
    await expect(page.locator("#trip-title")).not.toHaveValue("");
    await page.locator("#trip-title").fill(`Audit browser ${Date.now()}`);
    await page.locator('input[type="date"]').nth(0).fill("2027-01-01");
    await page.locator('input[type="date"]').nth(1).fill("2027-01-02");
    await next();
    await next();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "audit.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHfoAAAAASUVORK5CYII=", "base64"),
    });
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await page.getByRole("button", { name: /publikál|publish|közzététel/i }).last().click();
    await expect(page).toHaveURL(/\/trips\/(?!new$)[^/]+$/);
    const tripUrl = page.url();
    const slug = tripUrl.split("/").pop()!;
    const { data: trip } = await admin.from("trips").select("id,status").eq("slug", slug).single();
    expect(trip!.status).toBe("published");
    const visitor = await browser.newContext();
    try {
      const publicPage = await visitor.newPage();
      await publicPage.goto(tripUrl);
      await expect(publicPage.getByRole("heading", { level: 1 })).toContainText("Audit browser");
      const applicant = await createTestUser("audit-applicant");
      applicantId = applicant.id;
      await publicPage.goto(new URL("/login", tripUrl).href);
      await publicPage.locator("#email").fill(applicant.email);
      await publicPage.locator("#password").fill(applicant.password);
      await publicPage.locator('button[type="submit"]').click();
      await expect(publicPage).toHaveURL(/\/(dashboard|trips)(\/|$)/);
      await publicPage.goto(tripUrl);
      await publicPage.getByRole("button", { name: /jelentkezem|apply/i }).first().click();
      await publicPage.getByRole("button", { name: /jelentkezés beküldése|submit application|csatlakoz|join trip/i }).click();
      await expect.poll(async () => {
        const { data } = await admin.from("trip_participants").select("status")
          .eq("trip_id", trip!.id).eq("user_id", applicant.id).maybeSingle();
        return data?.status;
      }).toBe("pending");
      await publicPage.setViewportSize({ width: 390, height: 844 });
      await publicPage.getByRole("button", { name: /navigációs menü|navigation menu/i }).click();
      await expect(publicPage.getByRole("link", { name: /túratervező|trip planner/i })).toBeVisible();
    } finally { await visitor.close(); }
  } finally {
    if (!ownerId) {
      const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (data) { ownerId = data.id; trackFixtureUser(ownerId!); }
    }
    if (applicantId) await deleteTestUser(applicantId);
    if (ownerId) await deleteTestUser(ownerId);
  }
});
