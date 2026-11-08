"use client";

/**
 * A Kezelés oldal (/trips/[slug]/manage) „Link megosztása” gombja — ugyanazt a megosztási panelt nyitja,
 * mint a túraoldal (FR-M02-010; terv: design/D02_Trip_Management.pen#bXK2G).
 */

import { useTranslation } from "@/lib/i18n/useTranslation";
import { ShareButton } from "@/components/share/ShareButton";

export function TripShareButton({
  slug,
  title,
  isPublic = true,
  imageUrl,
  metaLine,
}: {
  slug: string;
  title: string;
  isPublic?: boolean;
  imageUrl?: string | null;
  metaLine?: string;
}) {
  const { t } = useTranslation();
  return (
    <ShareButton
      variant="block"
      slug={slug}
      title={title}
      isPublic={isPublic}
      imageUrl={imageUrl}
      metaLine={metaLine}
      label={t("trips.manage.shareLink")}
    />
  );
}
