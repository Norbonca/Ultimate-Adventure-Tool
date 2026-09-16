import { describe, it, expect } from "vitest";
import { tripDeletionMode, CANCELLATION_REASONS, CANCELLATION_REASON_LABEL } from "@/lib/trip-deletion";

describe("tripDeletionMode (BR-M02-009)", () => {
  it("deletes drafts immediately, whatever the applicant count", () => {
    expect(tripDeletionMode("draft", 0)).toBe("draft");
    expect(tripDeletionMode("draft", 3)).toBe("draft");
  });
  it.each(["published", "registration_open", "active"])("soft-deletes %s without applicants, cancels with", (status) => {
    expect(tripDeletionMode(status, 0)).toBe("soft");
    expect(tripDeletionMode(status, 1)).toBe("cancel");
  });
  it.each(["completed", "cancelled", "archived"])("does not offer deletion for %s", (status) => {
    expect(tripDeletionMode(status, 0)).toBeNull();
  });
  it("labels every cancellation reason", () => {
    expect(Object.keys(CANCELLATION_REASON_LABEL).sort()).toEqual([...CANCELLATION_REASONS].sort());
  });
});
