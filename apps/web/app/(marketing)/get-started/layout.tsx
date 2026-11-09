import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getServerT } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";

// A „Mi a Trevu?” oldal kliensoldali; a metaadat ezért a szegmens layoutjában van.
export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerT();
  return pageMeta({
    locale,
    title: t("metadata.pages.getStarted.title"),
    description: t("metadata.pages.getStarted.description"),
    path: "/get-started",
  });
}

export default function GetStartedLayout({ children }: { children: ReactNode }) {
  return children;
}
