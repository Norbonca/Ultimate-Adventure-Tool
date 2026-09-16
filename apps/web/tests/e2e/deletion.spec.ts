import { test, expect, type Page } from "@playwright/test";
import { admin, createTestUser, deleteTestUser } from "./_setup/seed";

/**
 * DELETION — Norbert, 2026-09-15: „a felhasználó nem tudja törölni magát / a túráját”.
 * Design: D01 `RbzSn`, D02 `v54yy` + `XKV28` dangerSec. Migration 041.
 */

async function login(page: Page, email: string, password: string, expected = /\/(dashboard|trips)(\/|$)/) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(expected);
}

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function insertTrip(organizerId: string, status: "draft" | "published", title: string) {
  const { data: category } = await admin.from("categories").select("id").limit(1).single();
  const { data, error } = await admin
    .from("trips")
    .insert({
      organizer_id: organizerId, title, slug: `e2e-del-${suffix()}`, description: "E2E deletion", difficulty: 2,
      location_country: "HU", max_participants: 8, status, visibility: "public", category_id: category!.id,
      start_date: "2027-05-01", end_date: "2027-05-03", cover_image_url: "https://example.com/cover.jpg",
      require_approval: false,
    })
    .select("id, slug")
    .single();
  expect(error).toBeNull();
  return data!;
}

test("organiser deletes a draft, soft-deletes and restores a trip, cancels one with an applicant", async ({ page }) => {
  test.setTimeout(120_000);
  const organizer = await createTestUser("del-org");
  const guest = await createTestUser("del-guest");
  try {
    const draft = await insertTrip(organizer.id, "draft", `Draft ${suffix()}`);
    const lonely = await insertTrip(organizer.id, "published", `Lonely ${suffix()}`);
    const busy = await insertTrip(organizer.id, "published", `Busy ${suffix()}`);
    const { error: applyError } = await admin.from("trip_participants").insert({ trip_id: busy.id, user_id: guest.id, status: "approved" });
    expect(applyError).toBeNull();

    await login(page, organizer.email, organizer.password);
    const openDanger = async (slug: string) => {
      await page.goto(`/trips/${slug}/edit`);
      await page.getByRole("button", { name: /beállítások|settings/i }).first().click();
      await page.getByRole("button", { name: /túra törlése…|delete trip…/i }).click();
      return page.getByRole("dialog");
    };

    let dialog = await openDanger(draft.slug);
    await expect(dialog).toContainText(/piszkozat|draft/i);
    await dialog.getByRole("button", { name: /végleges törlés|delete permanently/i }).click();
    await expect(page).toHaveURL(/\/trips$/);
    expect((await admin.from("trips").select("id").eq("id", draft.id)).data).toHaveLength(0);

    dialog = await openDanger(lonely.slug);
    await expect(dialog).toContainText(/visszaállítható eddig|restorable until/i);
    await dialog.getByRole("button", { name: /^túra törlése$|^delete trip$/i }).click();
    await expect(page).toHaveURL(/\/trips$/);
    const deletedSection = page.getByRole("region", { name: /törölt túrák|deleted trips/i });
    await expect(deletedSection).toContainText("Lonely");
    await deletedSection.getByRole("button", { name: /visszaállítás|restore/i }).click();
    await expect(page.getByRole("region", { name: /törölt túrák|deleted trips/i })).toHaveCount(0);
    expect((await admin.from("trips").select("deleted_at").eq("id", lonely.id).single()).data!.deleted_at).toBeNull();

    dialog = await openDanger(busy.slug);
    await expect(dialog).toContainText(/1 jelentkező|1 people/i);
    const confirm = dialog.getByRole("button", { name: /túra lemondása|cancel trip/i });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/a lemondás oka|reason for cancelling/i).selectOption("weather");
    await dialog.getByLabel(/üzenet a jelentkezőknek|message to applicants/i).fill("Viharriasztás");
    await confirm.click();
    await expect(page).toHaveURL(new RegExp(`/trips/${busy.slug}$`));
    const { data: cancelled } = await admin.from("trips").select("status, cancelled_reason, cancellation_message").eq("id", busy.id).single();
    expect(cancelled).toEqual({ status: "cancelled", cancelled_reason: "weather", cancellation_message: "Viharriasztás" });
    const { data: participation } = await admin.from("trip_participants").select("status").eq("trip_id", busy.id).single();
    expect(participation!.status).toBe("cancelled");
  } finally {
    await deleteTestUser(guest.id);
    await deleteTestUser(organizer.id);
  }
});

test("user deletes the account, is blocked while organising, restores it within the grace period", async ({ page }) => {
  test.setTimeout(120_000);
  const user = await createTestUser("del-account");
  try {
    const active = await insertTrip(user.id, "published", `Active ${suffix()}`);
    await login(page, user.email, user.password);

    const openDialog = async () => {
      await page.goto("/settings/privacy");
      await page.getByRole("button", { name: /^fiók törlése$|^delete account$/i }).click();
      return page.getByRole("dialog");
    };

    let dialog = await openDialog();
    await dialog.getByLabel(/jelszó a megerősítéshez|password to confirm/i).fill("wrong-password");
    await dialog.getByRole("button", { name: /^fiók törlése$|^delete account$/i }).click();
    await expect(dialog.getByRole("alert")).toContainText(/hibás jelszó|incorrect password/i);

    await dialog.getByLabel(/jelszó a megerősítéshez|password to confirm/i).fill(user.password);
    await dialog.getByRole("button", { name: /^fiók törlése$|^delete account$/i }).click();
    await expect(page.getByRole("dialog")).toContainText(/szervezett túráidat|trips you organise/i);
    await expect(page.getByRole("dialog")).toContainText("Active");

    await admin.from("trips").update({ status: "completed" }).eq("id", active.id);
    dialog = await openDialog();
    await dialog.getByLabel(/jelszó a megerősítéshez|password to confirm/i).fill(user.password);
    await dialog.getByRole("button", { name: /^fiók törlése$|^delete account$/i }).click();
    await expect(page).toHaveURL(/\/login\?account=deletion-scheduled/);
    await expect(page.getByRole("status")).toContainText(/törlését rögzítettük|deletion has been recorded/i);

    const { data: profile } = await admin.from("profiles").select("deleted_at, deletion_requested_at").eq("id", user.id).single();
    expect(profile!.deleted_at).not.toBeNull();
    expect(profile!.deletion_requested_at).not.toBeNull();

    await login(page, user.email, user.password, /\/account-restore$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/törlésre vár|scheduled for deletion/i);
    await page.getByRole("button", { name: /fiók visszaállítása|restore account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    const { data: restored } = await admin.from("profiles").select("deleted_at, deletion_requested_at").eq("id", user.id).single();
    expect(restored).toEqual({ deleted_at: null, deletion_requested_at: null });
  } finally {
    await deleteTestUser(user.id);
  }
});
