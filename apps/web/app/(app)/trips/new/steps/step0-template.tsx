"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@uat/i18n";
import { Icon } from "@/components/Icon";

export type PlanningMode = "template" | "ai" | "scratch";

interface TemplateData {
  id: string;
  title: string;
  titleHu: string;
  categoryName: string;
  descriptionHu: string;
  descriptionEn: string;
  image: string;
  categoryIcon: string;
  categoryKey: string;
  organizerName: string;
  spots: number;
  duration: string;
}

export const SAMPLE_TEMPLATES: TemplateData[] = [
  {
    id: "tmpl-1",
    title: "Weekend Hike in the Making",
    titleHu: "Hétvégi hegyi túra",
    categoryName: "Hiking",
    descriptionHu: "Egy hétvégi túra az erdélyi hegyekbe, 3 napos túra szállással és közös étkezéssel.",
    descriptionEn: "A weekend hike in the Carpathian mountains with accommodation and group meals.",
    image: "",
    categoryIcon: "footprints",
    categoryKey: "hiking",
    organizerName: "Fanni",
    spots: 3,
    duration: "4-7",
  },
  {
    id: "tmpl-2",
    title: "Adriatic Sailing Adventure",
    titleHu: "Adriai vitorláskaland",
    categoryName: "Water Sports",
    descriptionHu: "Vitorlás kaland a dalmát partok mentén, a legszebb öblökkel és kikötőkkel.",
    descriptionEn: "Sailing adventure along the Dalmatian coast with stunning bays and harbors.",
    image: "",
    categoryIcon: "waves",
    categoryKey: "waterSports",
    organizerName: "Marko",
    spots: 6,
    duration: "5-8",
  },
  {
    id: "tmpl-3",
    title: "Alpine Ski Trip Weekend",
    titleHu: "Alpesi síhétvége",
    categoryName: "Winter Sports",
    descriptionHu: "Síelős hétvége az osztrák Alpokban, szállással és síbérlettel.",
    descriptionEn: "Ski trip weekend in the Austrian Alps with accommodation and ski passes.",
    image: "",
    categoryIcon: "snowflake",
    categoryKey: "winterSports",
    organizerName: "Stefan",
    spots: 8,
    duration: "3-4",
  },
];

const TEMPLATE_GRADIENTS = [
  "bg-accent",
  "bg-ink",
  "bg-[var(--color-info)]",
];

interface Step0TemplateProps {
  onSelectMode: (mode: PlanningMode) => void;
  onSelectTemplate: (templateId: string) => void;
  selectedMode: PlanningMode | null;
}

export function Step0Template({
  onSelectMode,
  onSelectTemplate,
  selectedMode,
}: Step0TemplateProps) {
  const { t, locale } = useTranslation();
  const [showTemplates, setShowTemplates] = useState(false);

  const isTemplateMode = selectedMode === "template";

  return (
    <div>
      {/* Title */}
      <div className="mb-8 border-l-4 border-accent pl-5">
        <h2 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink sm:text-5xl">
          {t("trips.wizard.templateTitle")}
        </h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          {t("trips.wizard.templateSubtitle")}
        </p>
      </div>

      {/* 3 Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {/* Use a Template */}
        <button
          onClick={() => {
            onSelectMode("template");
            setShowTemplates(true);
          }}
          className={`text-left p-6 border-2 transition-colors ${
            selectedMode === "template"
              ? "border-accent bg-[var(--color-primary-subtle)]"
              : "border-line bg-surface hover:border-line-strong"
          }`}
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center border border-line-strong text-ink">
            <Icon name="clipboard-list" size={20} />
          </div>
          <h3 className="mb-2 font-display text-2xl font-extrabold text-ink">
            {t("trips.wizard.useTemplate")}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            {t("trips.wizard.useTemplateDesc")}
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-accent">
            {t("trips.wizard.browseTemplates")} <Icon name="arrow-right" size={14} />
          </span>
        </button>

        {/* AI Assistant */}
        <button
          disabled
          aria-disabled="true"
          className={`text-left p-6 border-2 transition-colors ${
            selectedMode === "ai"
              ? "border-accent bg-[var(--color-primary-subtle)]"
              : "border-line bg-surface"
          }`}
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center border border-accent text-accent">
            <Icon name="sparkles" size={20} />
          </div>
          <h3 className="mb-2 font-display text-2xl font-extrabold text-ink">
            {t("trips.wizard.aiAssistant")}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            {t("trips.wizard.aiAssistantDesc")}
          </p>
          <span className="inline-flex items-center bg-line px-4 py-1.5 text-sm font-medium text-ink-muted">
            {t("common.comingSoon")}
          </span>
        </button>

        {/* Start from Scratch */}
        <button
          onClick={() => onSelectMode("scratch")}
          className={`text-left p-6 border-2 transition-colors ${
            selectedMode === "scratch"
              ? "border-accent bg-[var(--color-primary-subtle)]"
              : "border-line bg-surface hover:border-line-strong"
          }`}
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center border border-line-strong text-ink">
            <Icon name="pencil" size={20} />
          </div>
          <h3 className="mb-2 font-display text-2xl font-extrabold text-ink">
            {t("trips.wizard.startFromScratch")}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            {t("trips.wizard.startFromScratchDesc")}
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-accent">
            {t("trips.wizard.startFromScratchLink")} <Icon name="arrow-right" size={14} />
          </span>
        </button>
      </div>

      {/* Popular Templates (visible when template mode selected or always) */}
      {(isTemplateMode || showTemplates) && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl font-extrabold text-ink">
              {t("trips.wizard.popularTemplates")}
            </h3>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SAMPLE_TEMPLATES.map((tmpl, idx) => (
              <div
                key={tmpl.id}
                className="group cursor-pointer overflow-hidden border border-line bg-surface transition-colors hover:border-accent"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectTemplate(tmpl.id);
                  }
                }}
                onClick={() => onSelectTemplate(tmpl.id)}
              >
                {/* Image / gradient placeholder */}
                <div
                  className={`relative h-40 ${TEMPLATE_GRADIENTS[idx]}`}
                >
                  <div className="absolute left-3 top-3 flex items-center gap-1 bg-surface/90 px-2 py-1 text-xs font-medium text-ink backdrop-blur-sm">
                    <Icon name={tmpl.categoryIcon} size={13} /> {t(`categories.${tmpl.categoryKey}` as TranslationKey)}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="mb-1 font-semibold text-ink transition-colors group-hover:text-accent">
                    {locale === "en" ? tmpl.title : tmpl.titleHu}
                  </h4>
                  <p className="mb-3 line-clamp-2 text-xs text-ink-muted">
                    {locale === "en" ? tmpl.descriptionEn : tmpl.descriptionHu}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1"><Icon name="user-check" size={12} /> {tmpl.organizerName}</span>
                      <span>·</span>
                      <span>
                        {tmpl.duration} {t("trips.detail.days")}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-accent">
                      {t("trips.wizard.useThisTemplate")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
