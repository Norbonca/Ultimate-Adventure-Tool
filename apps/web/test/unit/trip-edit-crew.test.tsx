import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
const saveDraft = vi.hoisted(() => vi.fn().mockResolvedValue({ tripId: "trip" }));
const publishTrip = vi.hoisted(() => vi.fn().mockResolvedValue({ slug: "draft-trip" }));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/(app)/trips/actions", () => ({ saveDraft, publishTrip }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key, locale: "hu" }) }));
vi.mock("@/components/trip-forms/BasicInfoSection", () => ({ BasicInfoSection: () => null }));
vi.mock("@/components/trip-forms/CategoryDetailsSection", () => ({ CategoryDetailsSection: () => null }));
vi.mock("@/components/trip-forms/ImagesSection", () => ({ ImagesSection: () => null }));
vi.mock("@/components/trip-forms/SettingsSection", () => ({ SettingsSection: () => null }));
vi.mock("@/components/trip-forms/TripDangerZone", () => ({ TripDangerZone: () => null }));
vi.mock("@/components/trip-forms/StaffSeatsManager", () => ({ StaffSeatsManager: () => null }));
vi.mock("@/components/trip-forms/ApplicationsManager", () => ({ ApplicationsManager: () => null, CrewMembersList: () => null }));
vi.mock("@/components/TripTimelineClient", () => ({ TripTimelineClient: () => null }));
import { EditTripForm } from "@/app/(app)/trips/[slug]/edit/edit-form";
afterEach(cleanup);

it("loads existing positions and preserves them when adding another role", async () => {
  const trip = { id: "trip", title: "Trip", status: "published", max_participants: 4, min_participants: 2, staff_seats: 0, difficulty: 1 } as ComponentProps<typeof EditTripForm>["trip"];
  render(<EditTripForm trip={trip} slug="trip" locale="hu" categoryDisplay={null} categoryParameters={[]} parameterOptions={[]} countries={[]} crewPositions={["Existing leader"]} />);
  fireEvent.click(screen.getByRole("button", { name: "trips.edit.tabs.crew" }));
  expect(screen.getByText("Existing leader")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "trips.wizard.crewPositionPlaceholder" }), { target: { value: "Navigator" } });
  fireEvent.click(screen.getByRole("button", { name: "trips.wizard.addPosition" }));
  fireEvent.click(screen.getByRole("button", { name: "trips.edit.saveChanges" }));
  await waitFor(() => expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ crew_positions: ["Existing leader", "Navigator"] }), "trip"));
});

it("hides the publish action on a published trip", () => {
  const trip = { id: "trip", title: "Trip", status: "published", max_participants: 4, min_participants: 2, staff_seats: 0, difficulty: 1 } as ComponentProps<typeof EditTripForm>["trip"];
  render(<EditTripForm trip={trip} slug="trip" locale="hu" categoryDisplay={null} categoryParameters={[]} parameterOptions={[]} countries={[]} crewPositions={[]} />);
  expect(screen.queryByRole("button", { name: "trips.edit.publish" })).toBeNull();
});

it("names the missing fields instead of publishing an incomplete draft", async () => {
  publishTrip.mockClear();
  const trip = { id: "trip", title: "Draft", status: "draft", max_participants: 4, min_participants: 2, staff_seats: 0, difficulty: 1 } as ComponentProps<typeof EditTripForm>["trip"];
  render(<EditTripForm trip={trip} slug="draft" locale="hu" categoryDisplay={null} categoryParameters={[]} parameterOptions={[]} countries={[]} crewPositions={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "trips.edit.publish" }));
  await waitFor(() => expect(screen.getByText("trips.wizard.missingRequired")).toBeTruthy());
  expect(publishTrip).not.toHaveBeenCalled();
});

it("publishes a complete draft from the editor and opens the trip page", async () => {
  publishTrip.mockClear();
  router.push.mockClear();
  const trip = {
    id: "trip", title: "Draft trip", status: "draft", max_participants: 4, min_participants: 2, staff_seats: 0, difficulty: 1,
    category_id: "7f1c2a3e-1111-4222-8333-944455566677", start_date: "2026-12-10", end_date: "2026-12-13", cover_image_url: "https://example.com/c.jpg",
  } as ComponentProps<typeof EditTripForm>["trip"];
  render(<EditTripForm trip={trip} slug="draft-trip" locale="hu" categoryDisplay={null} categoryParameters={[]} parameterOptions={[]} countries={[]} crewPositions={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "trips.edit.publish" }));
  await waitFor(() => expect(publishTrip).toHaveBeenCalledWith("trip", expect.objectContaining({ title: "Draft trip", start_date: "2026-12-10" })));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/trips/draft-trip"));
});
