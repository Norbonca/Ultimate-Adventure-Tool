"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@uat/i18n";

export type PlanningMode = "template" | "ai" | "scratch";

interface TemplateData {
  id: string;
  title: string;
  descriptionHu: string;
  descriptionEn: string;
  image: string;
  categoryEmoji: string;
  categoryKey: string;
  organizerName: string;
  spots: number;
  duration: string;
}

const SAMPLE_TEMPLATES: TemplateData[] = [
  {
    id: "tmpl-1",
    title: "Weekend Hike in the Making",
    descriptionHu: "Egy hétvégi túra az erdélyi hegyekbe, 3 napos túra szállással és közös étkezéssel.",
    descriptionEn: "A weekend hike in the Carpathian mountains with accommodation and group meals.",
    image: "",
    categoryEmoji: "🥾",
    categoryKey: "hiking",
    organizerName: "Fanni",
    spots: 3,
    duration: "4-7",
  },
  {
    id: "tmpl-2",
    title: "Adriatic Sailing Adventure",
    descriptionHu: "Vitorlás kaland a dalmát partok mentén, a legszebb öblökkel és kikötőkkel.",
    descriptionEn: "Sailing adventure along the Dalmatian coast with stunning bays and harbors.",
    image: "",
    categoryEmoji: "⛵",
    categoryKey: "waterSports",
    organizerName: "Marko",
    spots: 6,
    duration: "5-8",
  },
  {
    id: "tmpl-3",
    title: "Alpine Ski Trip Weekend",
    descriptionHu: "Síelős hétvége az osztrák Alpokban, szállással és síbérlettel.",
    descriptionEn: "Ski trip weekend in the Austrian Alps with accommodation and ski passes.",
    image: "",
    categoryEmoji: "⛷️",
    categoryKey: "winterSports",
    organizerName: "Stefan",
    spots: 8,
    duration: "3-4",
  },
];

const TEMPLATE_GRADIENTS = [
  "from-orange-400 via-rose-400 to-purple-500",
  "from-cyan-400 via-blue-500 to-indigo-500",
  "from-sky-300 via-blue-400 to-indigo-400",
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
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-2">
          {t("trips.wizard.templateTitle")}
        </h2>
        <p className="text-navy-500 text-sm">
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
          className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-md ${
            selectedMode === "template"
              ? "border-trevu-500 bg-trevu-50/50 shadow-sm"
              : "border-navy-200 bg-white hover:border-navy-300"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-lg mb-4">
            📋
          </div>
          <h3 className="font-semibold text-navy-900 mb-2">
            {t("trips.wizard.useTemplate")}
          </h3>
          <p className="text-sm text-navy-500 leading-relaxed mb-4">
            {t("trips.wizard.useTemplateDesc")}
          </p>
          <span className="text-sm font-medium text-trevu-600">
            {t("trips.wizard.browseTemplates")} →
          </span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={() => onSelectMode("ai")}
          className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-md ${
            selectedMode === "ai"
              ? "border-trevu-500 bg-trevu-50/50 shadow-sm"
              : "border-navy-200 bg-white hover:border-navy-300"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-trevu-100 flex items-center justify-center text-lg mb-4">
            ✨
          </div>
          <h3 className="font-semibold text-navy-900 mb-2">
            {t("trips.wizard.aiAssistant")}
          </h3>
          <p className="text-sm text-navy-500 leading-relaxed mb-4">
            {t("trips.wizard.aiAssistantDesc")}
          </p>
          <span className="inline-flex items-center px-4 py-1.5 bg-trevu-600 text-white text-sm font-medium rounded-lg">
            {t("trips.wizard.startAi")}
          </span>
        </button>

        {/* Start from Scratch */}
        <button
          onClick={() => onSelectMode("scratch")}
          className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-md ${
            selectedMode === "scratch"
              ? "border-trevu-500 bg-trevu-50/50 shadow-sm"
              : "border-navy-200 bg-white hover:border-navy-300"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-lg mb-4">
            ✏️
          </div>
          <h3 className="font-semibold text-navy-900 mb-2">
            {t("trips.wizard.startFromScratch")}
          </h3>
          <p className="text-sm text-navy-500 leading-relaxed mb-4">
            {t("trips.wizard.startFromScratchDesc")}
          </p>
          <span className="text-sm font-medium text-trevu-600">
            {t("trips.wizard.startFromScratchLink")} →
          </span>
        </button>
      </div>

      {/* Popular Templates (visible when template mode selected or always) */}
      {(isTemplateMode || showTemplates) && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-navy-900">
              {t("trips.wizard.popularTemplates")}
            </h3>
            <button className="text-sm font-medium text-trevu-600 hover:text-trevu-700 transition-colors">
              {t("trips.wizard.viewAll")}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SAMPLE_TEMPLATES.map((tmpl, idx) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-xl border border-navy-200 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
                onClick={() => onSelectTemplate(tmpl.id)}
              >
                {/* Image / gradient placeholder */}
                <div
                  className={`h-40 bg-gradient-to-br ${TEMPLATE_GRADIENTS[idx]} relative`}
                >
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-md text-xs font-medium text-navy-700">
                    {tmpl.categoryEmoji} {t(`categories.${tmpl.categoryKey}` as TranslationKey)}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-navy-900 mb-1 group-hover:text-trevu-700 transition-colors">
                    {tmpl.title}
                  </h4>
                  <p className="text-xs text-navy-500 mb-3 line-clamp-2">
                    {locale === "en" ? tmpl.descriptionEn : tmpl.descriptionHu}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-navy-400">
                      <span>👤 {tmpl.organizerName}</span>
                      <span>·</span>
                      <span>
                        {tmpl.duration} {t("trips.detail.days")}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-trevu-600">
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
