import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Toggle } from "@/components/ui/Toggle";
it("names a switch from its visible label and supports activation", () => {
  const change = vi.fn();
  render(<Toggle checked={false} label="Email visibility" onChange={change} />);
  const control = screen.getByRole("switch", { name: "Email visibility" });
  fireEvent.click(control);
  expect(change).toHaveBeenCalledWith(true);
});
