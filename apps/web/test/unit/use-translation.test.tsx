import { act, render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTranslation } from "@/lib/i18n/useTranslation";

function Probe({ id }: { id: string }) {
  const { t, locale, switchLocale } = useTranslation();
  return (
    <div>
      <span data-testid={`locale-${id}`}>{locale}</span>
      <span data-testid={`text-${id}`}>{t("common.loading")}</span>
      <button onClick={() => switchLocale(locale === "hu" ? "en" : "hu")}>{`switch-${id}`}</button>
    </div>
  );
}

describe("useTranslation — useSyncExternalStore (D12)", () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.setItem !== "function") {
      const mem = new Map<string, string>();
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
          getItem: (k: string) => mem.get(k) ?? null,
          setItem: (k: string, v: string) => void mem.set(k, String(v)),
          removeItem: (k: string) => void mem.delete(k),
          clear: () => mem.clear(),
        },
      });
    }
    document.cookie = "trevu-locale=hu;path=/";
    localStorage.setItem("trevu-locale", "hu");
  });

  it("két példány együtt vált, cookie + localStorage + <html lang> frissül", async () => {
    render(
      <>
        <Probe id="a" />
        <Probe id="b" />
      </>,
    );
    await act(async () => {
      await Promise.resolve(); // bootstrap microtask
    });
    expect(screen.getByTestId("locale-a").textContent).toBe("hu");
    const huText = screen.getByTestId("text-a").textContent;

    await act(async () => {
      fireEvent.click(screen.getByText("switch-a"));
    });
    expect(screen.getByTestId("locale-a").textContent).toBe("en");
    expect(screen.getByTestId("locale-b").textContent).toBe("en");
    expect(screen.getByTestId("text-b").textContent).not.toBe(huText);
    expect(document.cookie).toContain("trevu-locale=en");
    expect(localStorage.getItem("trevu-locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");

    await act(async () => {
      fireEvent.click(screen.getByText("switch-b"));
    });
    expect(screen.getByTestId("locale-a").textContent).toBe("hu");
  });
});
