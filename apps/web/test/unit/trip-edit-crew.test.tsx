import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
const saveDraft = vi.hoisted(() => vi.fn().mockResolvedValue({ tripId: "trip" }));
vi.mock("@/app/(app)/trips/actions", () => ({ saveDraft }));
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
