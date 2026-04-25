"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { saveDraft } from "../../actions";
import type {
  CategoryParameterRow,
  ParameterOptionRow,
  WizardFormData,
} from "../../types";
import { BasicInfoSection } from "@/components/trip-forms/BasicInfoSection";
import { CategoryDetailsSection } from "@/components/trip-forms/CategoryDetailsSection";
import { ImagesSection } from "@/components/trip-forms/ImagesSection";
import { SettingsSection } from "@/components/trip-forms/SettingsSection";
import { CrewSection } from "@/components/trip-forms/CrewSection";
import { StaffSeatsManager } from "@/components/trip-forms/StaffSeatsManager";
import { TripTimelineClient } from "@/components/TripTimelineClient";

type TabKey = "basic" | "category" | "images" | "settings" | "timeline" | "crew";

interface CategoryDisplayInfo {
  emoji: string;
  nameHu: string;
  nameEn: string;
  colorHex?: string;
  colorBg?: string;
  colorText?: string;
  color?: string;
  bgColor?: string;
}

interface TripData {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location_country: string | null;
  location_region: string | null;
  location_city: string | null;
  max_participants: number;
  min_participants: number;
  staff_seats: number;
  difficulty: number;
  category_id: string | null;
  sub_discipline_id: string | null;
  category_details: Record<string, unknown> | null;
  visibility: string;
  require_approval: boolean;
  registration_deadline: string | null;
  price_amount: number | string | null;
  price_currency: string;
  is_cost_sharing: boolean;
  cover_image_url: string | null;
  cover_image_source: string | null;
  card_image_url: string | null;
  card_image_source: string | null;
  tags: string[] | null;
  status: string;
}

interface EditTripFormProps {
  trip: TripData;
  slug: string;
  locale: string;
  categoryDisplay: CategoryDisplayInfo | null;
  categoryParameters: CategoryParameterRow[];
  parameterOptions: ParameterOptionRow[];
  countries: { code: string; name_hu: string; name_en: string; flag_emoji: string }[];
}

const TAB_DEFS: { key: TabKey; icon: string; labelKey: string }[] = [
  { key: "basic", icon: "📝", labelKey: "trips.edit.tabs.basicInfo" },
  { key: "category", icon: "⚙️", labelKey: "trips.edit.tabs.categoryDetails" },
  { key: "images", icon: "🖼️", labelKey: "trips.edit.tabs.images" },
  { key: "settings", icon: "🔒", labelKey: "trips.edit.tabs.settings" },
  { key: "timeline", icon: "📅", labelKey: "trips.edit.tabs.timeline" },
  { key: "crew", icon: "👥", labelKey: "trips.edit.tabs.crew" },
];

export function EditTripForm({
  trip,
  slug,
  locale,
  categoryDisplay,
  categoryParameters,
  parameterOptions,
  countries,
}: EditTripFormProps) {
  const { t, locale: clientLocale } = useTranslation();
  const effectiveLocale = clientLocale || locale;

  // Single WizardFormData state — shared form components consume this.
  const [formData, setFormData] = useState<WizardFormData>(() => ({
    category_id: trip.category_id || "",
    category_name: "",
    trip_type: trip.visibility === "private" ? "private" : "public",
    title: trip.title || "",
    short_description: trip.short_description || "",
    description: trip.description || "",
    start_date: trip.start_date || "",
    end_date: trip.end_date || "",
    location_country: trip.location_country || "HU",
    location_region: trip.location_region || "",
    location_city: trip.location_city || "",
    max_participants: trip.max_participants,
    min_participants: trip.min_participants,
    staff_seats: trip.staff_seats ?? 0,
    difficulty: trip.difficulty,
    sub_discipline_id: trip.sub_discipline_id || "",
    category_details: (trip.category_details as Record<string, unknown>) || {},
    visibility: (trip.visibility as WizardFormData["visibility"]) || "public",
    require_approval: trip.require_approval,
    registration_deadline: trip.registration_deadline
      ? String(trip.registration_deadline).slice(0, 10)
      : "",
    price_amount: trip.price_amount ? Number(trip.price_amount) : null,
    price_currency: trip.price_currency || "EUR",
    is_cost_sharing: trip.is_cost_sharing,
    cover_image_url: trip.cover_image_url || "",
    cover_image_source: (trip.cover_image_source as WizardFormData["cover_image_source"]) || "system",
    card_image_url: trip.card_image_url || "",
    card_image_source: (trip.card_image_source as WizardFormData["card_image_source"]) || "system",
    tags: trip.tags || [],
    crew_positions: [],
    show_on_landing: true,
  }));

  const updateForm = useCallback((updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    setErrorMsg("");

    const result = await saveDraft(formData, trip.id);

    if (result.error) {
      setSaveStatus("error");
      setErrorMsg(result.error);
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }, [formData, trip.id]);

  const isPublished = trip.status === "published";
  const statusLabel = isPublished
    ? t("trips.edit.statusPublished")
    : t("trips.edit.statusDraft");
  const categoryName = categoryDisplay
    ? effectiveLocale === "en"
      ? categoryDisplay.nameEn
      : categoryDisplay.nameHu
    : "";

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "basic":
        return (
          <BasicInfoSection
            data={formData}
            onChange={updateForm}
            countries={countries}
          />
        );
      case "category":
        return (
          <CategoryDetailsSection
            data={formData}
            onChange={updateForm}
            parameters={categoryParameters}
            paramOptions={parameterOptions}
          />
        );
      case "images":
        return <ImagesSection data={formData} onChange={updateForm} />;
      case "settings":
        return <SettingsSection data={formData} onChange={updateForm} />;
      case "timeline":
        return <TripTimelineClient tripId={trip.id} isOrganizer={true} />;
      case "crew":
        return (
          <CrewSection
            data={formData}
            onChange={updateForm}
            staffSeatsSlot={
              <StaffSeatsManager tripId={trip.id} totalSeats={formData.staff_seats || 0} />
            }
          />
        );
    }
  }, [activeTab, formData, updateForm, countries, categoryParameters, parameterOptions, trip.id]);

  return (
    <div className="bg-[#F8FAFC]">
      {/* ── Title Section ── */}
      <section className="px-6 sm:px-12 lg:px-[120px] pt-8">
        <Link
          href={`/trips/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy-500 hover:text-navy-700 transition-colors mb-4"
        >
          <span>←</span>
          <span>{t("trips.edit.backToTrip")}</span>
        </Link>

        <div className="flex items-center gap-3 mb-3">
          {categoryDisplay && (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span>{categoryDisplay.emoji}</span>
              <span>{categoryName}</span>
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              isPublished
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPublished ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{statusLabel}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">
          {t("trips.edit.pageTitle")}
        </h1>
        <p className="text-sm text-navy-500 mt-1">{trip.title}</p>
      </section>

      {/* ── Tab Bar ── */}
      <nav className="px-6 sm:px-12 lg:px-[120px] pt-6 border-b border-navy-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TAB_DEFS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 pb-3 text-sm transition-colors relative ${
                  isActive
                    ? "text-trevu-600 font-semibold"
                    : "text-navy-500 hover:text-navy-700 font-medium"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{t(tab.labelKey as Parameters<typeof t>[0])}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-trevu-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Form area ── */}
      <section className="px-6 sm:px-12 lg:px-[120px] py-8 pb-32">
        <div className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 sm:p-8">
          {tabContent}
        </div>
      </section>

      {/* ── Sticky Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-200 z-30">
        <div className="px-6 sm:px-12 lg:px-[120px] py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-h-[20px]">
            {saveStatus === "saved" && (
              <>
                <span className="text-trevu-600 font-bold">✓</span>
                <span className="text-sm text-navy-500">
                  {t("trips.edit.draftSaved")}
                </span>
              </>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-500">
                {errorMsg || t("trips.edit.errorSaving")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/trips/${slug}`}
              className="px-5 py-2.5 text-sm font-semibold text-navy-700 bg-white border border-navy-300 rounded-xl hover:bg-navy-50 transition-colors"
            >
              {t("trips.wizard.cancel")}
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors disabled:opacity-50"
            >
              <span>💾</span>
              <span>
                {saveStatus === "saving"
                  ? t("trips.edit.saving")
                  : t("trips.edit.saveChanges")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
