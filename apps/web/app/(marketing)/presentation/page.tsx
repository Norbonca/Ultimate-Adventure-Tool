/**
 * M211b — Nyilvános promó bemutató `/presentation` (a szervezői prezentáció animált változata).
 * Design: design/D09_Search_Discover.pen „M211b — Bemutató lejátszó” 1440 / MOBIL 390.
 */

import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n/server";
import { PresentationPlayerClient } from "@/components/presentation/PresentationPlayerClient";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return {
    title: t("presentation.metaTitle"),
    description: t("presentation.metaDescription"),
    openGraph: { images: ["/presentation/01-felfedezes.jpg"] },
  };
}

export default function PresentationPage() {
  return <PresentationPlayerClient />;
}
