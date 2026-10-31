import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "guest", user_metadata: {} } } }) } }) }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string) => key }), getServerLocale: async () => "en" }));
vi.mock("@/components/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("@/app/(app)/trips/actions", () => ({
  fetchTripBySlug: async () => ({ id: "trip", organizer_id: "owner", title: "Trip", price_currency: "EUR", price_amount: 10, max_participants: 4 }),
  fetchTripParticipants: async () => [{ id: "member", user_id: "guest", status: "approved_pending_payment" }],
  fetchCrewPositions: async () => [], fetchTripItinerary: async () => [],
}));
import ParticipantDashboardPage from "@/app/(app)/trips/[slug]/participant/page";
afterEach(cleanup);

it("marks unavailable payment and experience flows disabled and explains each limitation", async () => {
  render(await ParticipantDashboardPage({ params: Promise.resolve({ slug: "trip" }) }));
  expect(screen.getByRole("button", { name: "trips.participant.payNow" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "trips.participant.payNow" })).toHaveAccessibleDescription("trips.participant.paymentUnavailable");
  expect(screen.getByRole("button", { name: "trips.participant.fillForm" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "trips.participant.fillForm" })).toHaveAccessibleDescription("trips.participant.experienceFormUnavailable");
});
