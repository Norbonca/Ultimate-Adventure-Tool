import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { TripShareButton } from "@/components/TripShareButton";
afterEach(cleanup);

it("copies the public detail URL, not the current organizer dashboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<TripShareButton slug="my-trip" title="My trip" />);
  fireEvent.click(screen.getByRole("button", { name: "trips.manage.shareLink" }));
  expect(await screen.findByRole("status")).toHaveTextContent("trips.manage.linkCopied");
  expect(writeText).toHaveBeenCalledWith(new URL("/trips/my-trip", window.location.origin).href);
});

it("offers a selectable link when clipboard permission is denied", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  render(<TripShareButton slug="my-trip" title="My trip" />);
  fireEvent.click(screen.getByRole("button", { name: "trips.manage.shareLink" }));
  const input = await screen.findByRole("textbox", { name: "trips.manage.tripLink: My trip" });
  expect(input).toHaveValue(new URL("/trips/my-trip", window.location.origin).href);
  expect(screen.getByRole("status")).toHaveTextContent("trips.manage.copyLinkManually");
});
