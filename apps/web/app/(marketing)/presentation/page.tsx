/**
 * M211b — Nyilvános promó bemutató `/presentation` (a szervezői prezentáció animált változata).
 * Design: design/D09_Search_Discover.pen „M211b — Bemutató lejátszó” 1440 / MOBIL 390.
 */

import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n/server";
import { PresentationPlayerClient } from "@/components/presentation/PresentationPlayerClient";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerT();
  return pageMeta({
    locale,
    title: t("presentation.metaTitle"),
    description: t("presentation.metaDescription"),
    path: "/presentation",
    image: { url: "/videos/trevu-bemutato-poster.jpg", width: 1280, height: 720, alt: t("presentation.metaTitle") },
  });
}

export default function PresentationPage() {
  return <PresentationPlayerClient />;
}
