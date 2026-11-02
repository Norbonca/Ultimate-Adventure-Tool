"use client";

/**
 * A lejátszó csak kliensoldalon renderel: a nyelv és a kezdő dia (URL #n) a böngészőből jön,
 * így nincs hidratálási eltérés. Betöltés közben a Night vászon látszik.
 */

import dynamic from "next/dynamic";

export const PresentationPlayerClient = dynamic(
  () => import("./PresentationPlayer").then((m) => m.PresentationPlayer),
  { ssr: false, loading: () => <div data-surface="night" className="h-dvh bg-canvas" /> },
);
