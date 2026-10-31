import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  fetchTripTimeline: vi.fn(), fetchTimelineTemplates: vi.fn(), updateMilestone: vi.fn(),
}));
vi.mock("@/app/(app)/trips/timeline-actions", () => actions);
vi.mock("@/lib/i18n/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "hu" }),
}));
import { TripTimelineClient } from "@/components/TripTimelineClient";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  actions.fetchTimelineTemplates.mockResolvedValue({ templates: [] });
  actions.updateMilestone.mockResolvedValue({});
});

it("opens a manually editable empty timeline without returning to template selection", async () => {
  actions.fetchTripTimeline.mockResolvedValue({ phases: [], stats: { total_tasks: 0, completed_tasks: 0, progress_percent: 0 } });
  render(<TripTimelineClient tripId="trip" isOrganizer />);
  fireEvent.click(await screen.findByRole("button", { name: "timeline.emptyTemplate" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /timeline.addPhase/ })).toBeTruthy());
  expect(screen.queryByRole("button", { name: "timeline.emptyTemplate" })).toBeNull();
});

it("sends an explicit empty description when an existing milestone note is cleared", async () => {
  actions.fetchTripTimeline.mockResolvedValue({
    phases: [{ id: "phase", name: "Phase", milestones: [{ id: "milestone", name: "Milestone", description: "Old note", status: "not_started", tasks: [] }] }],
    stats: { total_tasks: 0, completed_tasks: 0, progress_percent: 0 },
  });
  render(<TripTimelineClient tripId="trip" isOrganizer />);
  fireEvent.click(await screen.findByText("Milestone"));
  fireEvent.change(screen.getByLabelText("timeline.milestoneNotes"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "timeline.milestoneSave" }));
  await waitFor(() => expect(actions.updateMilestone).toHaveBeenCalledWith("milestone", expect.objectContaining({ description: "" })));
});
