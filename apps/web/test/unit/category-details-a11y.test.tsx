import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { CategoryParameterRow, WizardFormData } from "@/app/(app)/trips/types";

vi.mock("@/lib/i18n/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "hu" }),
}));

import { CategoryDetailsSection } from "@/components/trip-forms/CategoryDetailsSection";

function param(overrides: Partial<CategoryParameterRow>): CategoryParameterRow {
  return {
    id: "p1", category_id: "c1", sub_discipline_id: null, parameter_key: "key",
    label: "Label", label_localized: {}, description: null, placeholder: null, icon_name: null,
    field_type: "text", unit: null, is_required: false, default_value: null, validation: null,
    group_key: null, group_label: null, group_label_localized: null, display_order: 1,
    is_filterable: false, show_on_card: false, status: "active",
    ...overrides,
  };
}

// UX-015: minden kategóriamezőnek programozott neve van, a kapcsoló állapota felolvasható
it("names boolean switches and text fields from their labels", () => {
  const onChange = vi.fn();
  const data = { category_details: { marina: false } } as unknown as WizardFormData;
  render(
    <CategoryDetailsSection
      data={data}
      onChange={onChange}
      parameters={[
        param({ id: "b1", parameter_key: "marina", field_type: "boolean", label_localized: { hu: "Kikötői hely" } }),
        param({ id: "t1", parameter_key: "note", field_type: "text", label_localized: { hu: "Megjegyzés" } }),
      ]}
      paramOptions={[]}
    />,
  );
  const control = screen.getByRole("switch", { name: "Kikötői hely" });
  expect(control.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(control);
  expect(onChange).toHaveBeenCalledWith({ category_details: { marina: true } });
  expect(screen.getByRole("textbox", { name: "Megjegyzés" })).toBeTruthy();
});
