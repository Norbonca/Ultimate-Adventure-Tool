import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { TripShareButton } from "@/components/TripShareButton";
import { ShareButton } from "@/components/share/ShareButton";
import {
  isTripPublic,
  plainExcerpt,
  platformShareHref,
  tripDays,
  tripOgImagePath,
  tripShareUrl,
} from "@/lib/share/trip-share";

afterEach(cleanup);

const origin = window.location.origin;
const canonical = new URL("/trips/my-trip", origin).href;

describe("trip-share helpers", () => {
  it("adds UTM parameters to the canonical trip URL", () => {
    const url = new URL(tripShareUrl("https://www.ttvk.hu", "split-tura", "whatsapp"));
    expect(url.origin + url.pathname).toBe("https://www.ttvk.hu/trips/split-tura");
    expect(url.searchParams.get("utm_source")).toBe("whatsapp");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("trip_share");
  });

  it("builds the public share address of every platform", () => {
    const u = "https://www.ttvk.hu/trips/a?utm_source=x";
    expect(platformShareHref("facebook", u, "T")).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`);
    expect(platformShareHref("whatsapp", u, "T")).toBe(`https://wa.me/?text=${encodeURIComponent(`T ${u}`)}`);
    expect(platformShareHref("x", u, "T")).toBe(`https://x.com/intent/post?url=${encodeURIComponent(u)}&text=T`);
    expect(platformShareHref("telegram", u, "T")).toBe(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=T`);
    expect(platformShareHref("email", u, "T", "S")).toBe(`mailto:?subject=S&body=${encodeURIComponent(`T\n\n${u}`)}`);
  });

  it("mirrors the public RLS rule", () => {
    expect(isTripPublic({ status: "published", visibility: "public" })).toBe(true);
    expect(isTripPublic({ status: "registration_open", visibility: "public" })).toBe(true);
    expect(isTripPublic({ status: "draft", visibility: "public" })).toBe(false);
    expect(isTripPublic({ status: "cancelled", visibility: "public" })).toBe(false);
    expect(isTripPublic({ status: "published", visibility: "private" })).toBe(false);
    expect(isTripPublic({ status: "published", visibility: "public", deleted_at: "2026-11-01" })).toBe(false);
  });

  it("strips markup and cuts the excerpt on a word boundary", () => {
    expect(plainExcerpt("**Hétvégi** <b>túra</b> [Ausztriába](https://x.y)\n\n3 nap")).toBe("Hétvégi túra Ausztriába 3 nap");
    const long = plainExcerpt("szó ".repeat(80), 50);
    expect(long.length).toBeLessThanOrEqual(50);
    expect(long.endsWith("…")).toBe(true);
    expect(plainExcerpt(null)).toBe("");
  });

  it("versions the OG image path with the update time", () => {
    expect(tripOgImagePath("a b", "2026-11-02T08:13:39Z")).toBe(`/og/trips/a%20b?v=${Date.parse("2026-11-02T08:13:39Z") / 1000}`);
    expect(tripOgImagePath("a", null)).toBe("/og/trips/a");
  });

  it("counts inclusive trip days", () => {
    expect(tripDays("2026-12-07", "2026-12-16")).toBe(10);
    expect(tripDays("2026-12-07", null)).toBe(1);
    expect(tripDays("2026-12-07", "2026-12-01")).toBeNull();
    expect(tripDays(null, null)).toBeNull();
  });
});

describe("ShareSheet via the share buttons", () => {
  it("opens the panel with UTM-tagged platform links and a new-tab target", () => {
    render(<ShareButton slug="my-trip" title="My trip" />);
    fireEvent.click(screen.getByRole("button", { name: "trips.share.button" }));
    expect(screen.getByRole("dialog", { name: "trips.share.title" })).toBeInTheDocument();
    const fb = document.querySelector<HTMLAnchorElement>('[data-share-target="facebook"]')!;
    expect(fb.getAttribute("target")).toBe("_blank");
    expect(fb.getAttribute("rel")).toBe("noopener noreferrer");
    expect(decodeURIComponent(fb.href)).toContain("utm_source=facebook");
    const mail = document.querySelector<HTMLAnchorElement>('[data-share-target="email"]')!;
    expect(mail.getAttribute("target")).toBeNull();
    expect(mail.href.startsWith("mailto:")).toBe(true);
    // jsdom: nincs navigator.share → nincs „Továbbiak”
    expect(document.querySelector('[data-share-target="native"]')).toBeNull();
  });

  it("copies the UTM-tagged public detail URL and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<TripShareButton slug="my-trip" title="My trip" />);
    fireEvent.click(screen.getByRole("button", { name: "trips.manage.shareLink" }));
    fireEvent.click(screen.getByTestId("share-copy"));
    expect(await screen.findByText("trips.share.copiedStatus")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(tripShareUrl(origin, "my-trip", "copy"));
    expect(screen.getByTestId("share-copy")).toHaveTextContent("trips.share.copied");
  });

  it("offers the selectable canonical link when clipboard permission is denied", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<TripShareButton slug="my-trip" title="My trip" />);
    fireEvent.click(screen.getByRole("button", { name: "trips.manage.shareLink" }));
    fireEvent.click(screen.getByTestId("share-copy"));
    expect(await screen.findByText("trips.share.copyFailed")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "trips.share.linkLabel" })).toHaveValue(canonical);
  });

  it("tells the organizer when the trip is not public yet", () => {
    render(<TripShareButton slug="my-trip" title="My trip" isPublic={false} />);
    fireEvent.click(screen.getByRole("button", { name: "trips.manage.shareLink" }));
    expect(screen.getByRole("status")).toHaveTextContent("trips.share.notPublicHint");
  });

  it("closes on Escape and returns focus to the button", () => {
    render(<ShareButton slug="my-trip" title="My trip" />);
    const btn = screen.getByRole("button", { name: "trips.share.button" });
    btn.focus();
    fireEvent.click(btn);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(btn);
  });
});
