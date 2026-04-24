"use client";

import type { WizardFormData } from "@/app/(app)/trips/types";
import { ImagePicker } from "@/components/ImagePicker";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface ImagesSectionProps {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}

export function ImagesSection({ data, onChange }: ImagesSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Cover image */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-3">
          {t("trips.wizard.coverImage")}
        </label>
        <ImagePicker
          type="cover"
          categoryId={data.category_id}
          currentImageUrl={data.cover_image_url || undefined}
          currentSource={data.cover_image_source}
          onSelect={(url, source) =>
            onChange({ cover_image_url: url, cover_image_source: source })
          }
          onClear={() => onChange({ cover_image_url: "", cover_image_source: "system" })}
        />
      </div>

      {/* Card image (for Discover cards) */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-1">
          {t("imagePicker.card.title")}
        </label>
        <p className="text-xs text-navy-400 mb-3">{t("imagePicker.card.subtitle")}</p>
        <ImagePicker
          type="card"
          categoryId={data.category_id}
          currentImageUrl={data.card_image_url || undefined}
          currentSource={data.card_image_source}
          onSelect={(url, source) =>
            onChange({ card_image_url: url, card_image_source: source })
          }
          onClear={() => onChange({ card_image_url: "", card_image_source: "system" })}
        />
      </div>
    </div>
  );
}
