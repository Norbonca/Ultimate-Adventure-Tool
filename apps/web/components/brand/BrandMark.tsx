import { BRAND } from "@uat/config";
import { HEAD, WORDMARK } from "./paths";

type MarkProps = {
  /** Magasság px-ben; a szélesség az arányból jön. */
  height: number;
  className?: string;
  /** Díszítő használatnál (a név mellette szövegként is szerepel) rejtett a felolvasó elől. */
  decorative?: boolean;
};

/** A márka szójele (ZHO) — egyszínű, `currentColor`. */
export function BrandWordmark({ height, className, decorative = false }: MarkProps) {
  const width = Math.round((height * WORDMARK.width) / WORDMARK.height);
  return (
    <svg
      viewBox={WORDMARK.viewBox}
      width={width}
      height={height}
      className={className}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": BRAND.name })}
      style={{ display: "block", flex: "none" }}
    >
      <path d={WORDMARK.d} fill="currentColor" fillRule={WORDMARK.fillRule} />
    </svg>
  );
}

/** A márka fej-ikonja (a zho feje) — egyszínű, `currentColor`; mindig díszítő. */
export function BrandHead({ height, className }: Omit<MarkProps, "decorative">) {
  const width = Math.round((height * HEAD.width) / HEAD.height);
  return (
    <svg
      viewBox={HEAD.viewBox}
      width={width}
      height={height}
      className={className}
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      <path d={HEAD.d} fill="currentColor" fillRule={HEAD.fillRule} />
    </svg>
  );
}
