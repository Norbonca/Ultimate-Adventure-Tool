import type { ReactNode } from "react";
import { pageMeta } from "@/lib/seo";

// A „Mi a Trevu?” oldal kliensoldali; a metaadat ezért a szegmens layoutjában van.
export const metadata = pageMeta({
  title: "Mi a Trevu?",
  description:
    "Meghirdetés, jelentkezők, teendők és közös költségek – egy felületen. Ismerd meg, hogyan szervezhetsz kis csoportos kalandtúrákat a Trevuval.",
  path: "/get-started",
});

export default function GetStartedLayout({ children }: { children: ReactNode }) {
  return children;
}
