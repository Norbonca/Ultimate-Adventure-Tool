"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { saveDraft } from "../../actions";
import type { CategoryParameterRow, ParameterOptionRow } from "../../types";
import { ImagePicker } from "@/components/ImagePicker";
import { DIFFICULTY_LEVELS } from "@/lib/categories";

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

  // Form state
  const [title, setTitle] = useState(trip.title || "");
  const [shortDescription, setShortDescription] = useState(trip.short_description || "");
  const [description, setDescription] = useState(trip.description || "");
  const [startDate, setStartDate] = useState(trip.start_date || "");
  const [endDate, setEndDate] = useState(trip.end_date || "");
  const [locationCountry, setLocationCountry] = useState(trip.location_country || "HU");
  const [locationRegion, setLocationRegion] = useState(trip.location_region || "");
  const [locationCity, setLocationCity] = useState(trip.location_city || "");
  const [maxParticipants, setMaxParticipants] = useState(trip.max_participants);
  const [minParticipants, setMinParticipants] = useState(trip.min_participants);
  const [difficulty, setDifficulty] = useState(trip.difficulty);
  const [categoryDetails, setCategoryDetails] = useState<Record<string, unknown>>(
    (trip.category_details as Record<string, unknown>) || {}
  );
  const [visibility, setVisibility] = useState(trip.visibility || "public");
  const [requireApproval, setRequireApproval] = useState(trip.require_approval);
  const [registrationDeadline, setRegistrationDeadline] = useState(
    trip.registration_deadline ? String(trip.registration_deadline).slice(0, 10) : ""
  );
  const [priceAmount, setPriceAmount] = useState<number | null>(
    trip.price_amount ? Number(trip.price_amount) : null
  );
  const [priceCurrency, setPriceCurrency] = useState(trip.price_currency || "EUR");
  const [isCostSharing, setIsCostSharing] = useState(trip.is_cost_sharing);
  const [coverImageUrl, setCoverImageUrl] = useState(trip.cover_image_url || "");
  const [coverImageSource, setCoverImageSource] = useState<"system" | "user_upload">(
    (trip.cover_image_source as "system" | "user_upload") || "system"
  );
  const [cardImageUrl, setCardImageUrl] = useState(trip.card_image_url || "");
  const [cardImageSource, setCardImageSource] = useState<"system" | "user_upload">(
    (trip.card_image_source as "system" | "user_upload") || "system"
  );

  // Save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const updateCategoryDetail = useCallback((key: string, value: unknown) => {
    setCategoryDetails((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    setErrorMsg("");

    const result = await saveDraft(
      {
        category_id: trip.category_id || "",
        category_name: "",
        trip_type: visibility === "private" ? "private" : "public",
        title,
        short_description: shortDescription,
        description,
        start_date: startDate,
        end_date: endDate,
        location_country: locationCountry,
        location_region: locationRegion,
        location_city: locationCity,
        max_participants: maxParticipants,
        min_participants: minParticipants,
        difficulty,
        sub_discipline_id: trip.sub_discipline_id || "",
        category_details: categoryDetails,
        visibility: visibility as "public" | "followers_only" | "private",
        require_approval: requireApproval,
        registration_deadline: registrationDeadline,
        price_amount: priceAmount,
        price_currency: priceCurrency,
        is_cost_sharing: isCostSharing,
        cover_image_url: coverImageUrl,
        cover_image_source: coverImageSource,
        card_image_url: cardImageUrl,
        card_image_source: cardImageSource,
        tags: trip.tags || [],
        crew_positions: [],
        show_on_landing: true,
      },
      trip.id
    );

    if (result.error) {
      setSaveStatus("error");
      setErrorMsg(result.error);
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }, [
    trip.id, trip.category_id, trip.sub_discipline_id, trip.tags,
    title, shortDescription, description, startDate, endDate,
    locationCountry, locationRegion, locationCity,
    maxParticipants, minParticipants, difficulty, categoryDetails,
    visibility, requireApproval, registrationDeadline,
    priceAmount, priceCurrency, isCostSharing, coverImageUrl, coverImageSource,
    cardImageUrl, cardImageSource,
  ]);


  const labelClass = "block text-sm font-semibold text-navy-700 mb-1.5";
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-900 text-sm focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-all";

  return (
    <div className="space-y-8">
      {/* Category badge */}
      {categoryDisplay && (
        <div className="flex items-center gap-3">
          <span className="text-2xl">{categoryDisplay.emoji}</span>
          <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ backgroundColor: categoryDisplay.bgColor, color: categoryDisplay.color }}>
            {effectiveLocale === "en" ? categoryDisplay.nameEn : categoryDisplay.nameHu}
          </span>
        </div>
      )}

      {/* ── Section 1: Basic Info ── */}
      <section className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-navy-900">{t("trips.edit.sectionBasicInfo")}</h2>

        <div>
          <label className={labelClass}>{t("trips.fields.title")} *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            maxLength={200}
          />
          <span className="text-xs text-navy-400 mt-1 block">{title.length}/200</span>
        </div>

        <div>
          <label className={labelClass}>{t("trips.fields.shortDescription")}</label>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className={inputClass}
            maxLength={300}
          />
        </div>

        <div>
          <label className={labelClass}>{t("trips.fields.description")} *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y`}
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("trips.fields.startDate")} *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("trips.fields.endDate")} *</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{t("trips.fields.country")}</label>
            <select value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} className={inputClass}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag_emoji} {effectiveLocale === "en" ? c.name_en : c.name_hu}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("trips.fields.region")}</label>
            <input type="text" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("trips.fields.city")}</label>
            <input type="text" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{t("trips.fields.difficulty")}</label>
            <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className={inputClass}>
              {[1, 2, 3, 4, 5].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl} — {effectiveLocale === "en" ? (DIFFICULTY_LEVELS.find(d => d.value === lvl)?.labelEn ?? lvl) : (DIFFICULTY_LEVELS.find(d => d.value === lvl)?.label ?? lvl)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("trips.fields.maxParticipants")}</label>
            <input type="number" min={1} max={500} value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("trips.fields.minParticipants")}</label>
            <input type="number" min={1} max={500} value={minParticipants} onChange={(e) => setMinParticipants(Number(e.target.value))} className={inputClass} />
          </div>
        </div>
      </section>

      {/* ── Section 2: Category Details ── */}
      {categoryParameters.length > 0 && (
        <section className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-navy-900">{t("trips.edit.sectionCategoryDetails")}</h2>

          {categoryParameters.map((param) => {
            const value = categoryDetails[param.parameter_key] ?? param.default_value ?? "";
            const label = effectiveLocale === "en"
              ? (param.label_localized?.en || param.label)
              : (param.label_localized?.hu || param.label);
            const options = parameterOptions.filter((o) => o.parameter_id === param.id);

            if (param.field_type === "boolean") {
              return (
                <label key={param.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => updateCategoryDetail(param.parameter_key, e.target.checked)}
                    className="w-5 h-5 rounded border-navy-300 text-trevu-600 focus:ring-trevu-500"
                  />
                  <span className="text-sm text-navy-700">{label}</span>
                  {param.unit && <span className="text-xs text-navy-400">({param.unit})</span>}
                </label>
              );
            }

            if (param.field_type === "select") {
              return (
                <div key={param.id}>
                  <label className={labelClass}>
                    {label} {param.unit && <span className="font-normal text-navy-400">({param.unit})</span>}
                  </label>
                  <select
                    value={String(value)}
                    onChange={(e) => updateCategoryDetail(param.parameter_key, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {effectiveLocale === "en" ? (opt.label_localized?.en || opt.label) : (opt.label_localized?.hu || opt.label)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (param.field_type === "number" || param.field_type === "range") {
              return (
                <div key={param.id}>
                  <label className={labelClass}>
                    {label} {param.unit && <span className="font-normal text-navy-400">({param.unit})</span>}
                  </label>
                  <input
                    type="number"
                    value={value !== "" && value !== null && value !== undefined ? Number(value) : ""}
                    onChange={(e) => updateCategoryDetail(param.parameter_key, e.target.value ? Number(e.target.value) : null)}
                    min={param.validation?.min}
                    max={param.validation?.max}
                    step={param.validation?.step || 1}
                    className={inputClass}
                  />
                </div>
              );
            }

            if (param.field_type === "textarea") {
              return (
                <div key={param.id}>
                  <label className={labelClass}>{label}</label>
                  <textarea
                    value={String(value)}
                    onChange={(e) => updateCategoryDetail(param.parameter_key, e.target.value)}
                    className={`${inputClass} min-h-[80px] resize-y`}
                    rows={3}
                  />
                </div>
              );
            }

            // Default: text
            return (
              <div key={param.id}>
                <label className={labelClass}>
                  {label} {param.unit && <span className="font-normal text-navy-400">({param.unit})</span>}
                </label>
                <input
                  type="text"
                  value={String(value)}
                  onChange={(e) => updateCategoryDetail(param.parameter_key, e.target.value)}
                  className={inputClass}
                  placeholder={param.placeholder || ""}
                />
              </div>
            );
          })}
        </section>
      )}

      {/* ── Cover Image ── */}
      <section className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-navy-900">{t("imagePicker.cover.title")}</h2>
        <ImagePicker
          type="cover"
          categoryId={trip.category_id || undefined}
          currentImageUrl={coverImageUrl || undefined}
          currentSource={coverImageSource}
          onSelect={(url, source) => {
            setCoverImageUrl(url);
            setCoverImageSource(source);
          }}
          onClear={() => {
            setCoverImageUrl("");
            setCoverImageSource("system");
          }}
        />
      </section>

      {/* ── Card Image (Discover kártyákhoz) ── */}
      <section className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-navy-900">{t("imagePicker.card.title")}</h2>
        <p className="text-sm text-navy-400">{t("imagePicker.card.subtitle")}</p>
        <ImagePicker
          type="card"
          categoryId={trip.category_id || undefined}
          currentImageUrl={cardImageUrl || undefined}
          currentSource={cardImageSource}
          onSelect={(url, source) => {
            setCardImageUrl(url);
            setCardImageSource(source);
          }}
          onClear={() => {
            setCardImageUrl("");
            setCardImageSource("system");
          }}
        />
      </section>

      {/* ── Section 3: Settings ── */}
      <section className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-navy-900">{t("trips.edit.sectionSettings")}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("trips.edit.visibility")}</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputClass}>
              <option value="public">{t("trips.edit.visibilityPublic")}</option>
              <option value="followers_only">{t("trips.edit.visibilityFollowers")}</option>
              <option value="private">{t("trips.edit.visibilityPrivate")}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("trips.edit.registrationDeadline")}</label>
            <input type="date" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className={inputClass} />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(e) => setRequireApproval(e.target.checked)}
            className="w-5 h-5 rounded border-navy-300 text-trevu-600 focus:ring-trevu-500"
          />
          <span className="text-sm text-navy-700">{t("trips.edit.requireApproval")}</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isCostSharing}
            onChange={(e) => setIsCostSharing(e.target.checked)}
            className="w-5 h-5 rounded border-navy-300 text-trevu-600 focus:ring-trevu-500"
          />
          <span className="text-sm text-navy-700">{t("trips.edit.costSharing")}</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("trips.fields.price")}</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={priceAmount ?? ""}
              onChange={(e) => setPriceAmount(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("trips.fields.currency")}</label>
            <select value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value)} className={inputClass}>
              <option value="EUR">EUR</option>
              <option value="HUF">HUF</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Save Footer ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-navy-200 shadow-sm p-4">
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600 font-medium">✓ {t("trips.edit.saved")}</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-500">{errorMsg || t("trips.edit.errorSaving")}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/trips/${slug}`}
            className="px-5 py-2.5 text-sm font-medium text-navy-600 bg-white border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors"
          >
            {t("trips.wizard.cancel")}
          </a>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="px-6 py-2.5 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saveStatus === "saving" ? t("trips.edit.saving") : t("trips.edit.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
