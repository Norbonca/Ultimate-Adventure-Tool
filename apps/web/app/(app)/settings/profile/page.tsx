"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import type { TranslationKey } from "@uat/i18n";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ImagePicker } from "@/components/ImagePicker";
import {
  autoTimezoneForCountry,
  isTimezoneOfCountry,
  suggestCountryAndTimezone,
  timezonesForCountry,
} from "@/lib/profile/country-timezone";

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  bio: string;
  location_city: string;
  country_code: string;
  preferred_language: string;
  preferred_currency: string;
  timezone: string;
  avatar_url: string;
  avatar_source: "system" | "user_upload" | "oauth";
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// Reference tables (ref_countries, ref_languages, ref_currencies, ref_timezones) —
// only the columns this screen actually renders are declared.
interface RefCountry {
  code: string;
  is_active?: boolean | null;
  flag_emoji?: string | null;
  name_en?: string | null;
  name_hu?: string | null;
}

interface RefLanguage {
  code: string;
  name_native?: string | null;
}

interface RefCurrency {
  code: string;
  symbol?: string | null;
  name_en?: string | null;
  name_hu?: string | null;
}

interface RefTimezone {
  tz_id: string;
  country_code: string;
  display_name?: string | null;
  utc_offset_text?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

const RELATIONSHIP_OPTIONS = ["spouse", "parent", "sibling", "friend", "other"];

// A 040-es trigger hibakulcsai → i18n; minden más hiba általános mentési hiba (nyers üzenet nem jelenik meg).
const PROFILE_DB_ERROR_KEYS: Record<string, TranslationKey> = {
  profile_country_inactive: "profile.settings.errors.countryInactive",
  profile_timezone_required: "profile.settings.errors.timezoneRequired",
  profile_timezone_country_mismatch: "profile.settings.errors.timezoneMismatch",
  profile_timezone_invalid: "profile.settings.errors.timezoneInvalid",
};

function profileSaveErrorKey(error: { message?: string | null } | null): TranslationKey {
  const message = error?.message ?? "";
  const match = Object.keys(PROFILE_DB_ERROR_KEYS).find((key) => message.includes(key));
  return match ? PROFILE_DB_ERROR_KEYS[match] : "errors.saveFailed";
}

// Böngésző-adatok a javaslathoz: szerveren és hidratáláskor `null`/üres (nincs hydration mismatch),
// utána a kliens valós értéke. Nem változó értékek, ezért a feliratkozás üres.
const subscribeNoop = () => () => {};
function readBrowserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
function readBrowserLanguages(): string {
  if (typeof navigator === "undefined") return "";
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.filter(Boolean).join(",");
}

/** Betöltéskor: az ország zónája marad, ha az országé; egyzónásnál automatikus; különben üres (választani kell). */
function normalizeTimezoneForCountry(countryCode: string, timezone: string, timezones: RefTimezone[]): string {
  if (!countryCode) return timezone;
  if (isTimezoneOfCountry(countryCode, timezone, timezones)) return timezone;
  return autoTimezoneForCountry(countryCode, timezones) ?? "";
}

export default function ProfileSettingsPage() {
  const { t, locale } = useTranslation();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Profile>({
    first_name: "", last_name: "", phone: "", bio: "",
    location_city: "", country_code: "", preferred_language: "hu",
    preferred_currency: "HUF", timezone: "",
    avatar_url: "", avatar_source: "system",
  });
  const [emergency, setEmergency] = useState<EmergencyContact>({ name: "", phone: "", relationship: "" });
  const [refCountries, setRefCountries] = useState<RefCountry[]>([]);
  const [refLanguages, setRefLanguages] = useState<RefLanguage[]>([]);
  const [refCurrencies, setRefCurrencies] = useState<RefCurrency[]>([]);
  const [refTimezones, setRefTimezones] = useState<RefTimezone[]>([]);
  const [timezoneError, setTimezoneError] = useState<TranslationKey | null>(null);
  const [saveError, setSaveError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, emergencyRes, countriesRes, languagesRes, currenciesRes, timezonesRes] = await Promise.all([
        supabase.rpc("get_my_profile"),
        supabase.from("emergency_contacts").select("*").eq("user_id", user.id).limit(1).single(),
        supabase.from("ref_countries").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("ref_languages").select("*").eq("is_active", true).eq("is_app_supported", true).order("sort_order"),
        supabase.from("ref_currencies").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("ref_timezones").select("*").eq("is_active", true).order("sort_order"),
      ]);

      const loadedTimezones: RefTimezone[] = timezonesRes.data || [];
      if (profileRes.data) {
        const p = profileRes.data;
        const countryCode: string = p.country_code || "";
        setForm({
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          phone: p.phone || "",
          bio: p.bio || "",
          location_city: p.location_city || "",
          country_code: countryCode,
          preferred_language: p.preferred_language || "hu",
          preferred_currency: p.preferred_currency || "HUF",
          timezone: normalizeTimezoneForCountry(countryCode, p.timezone || "", loadedTimezones),
          avatar_url: p.avatar_url || "",
          avatar_source: p.avatar_source || "system",
        });
      }
      if (emergencyRes.data) {
        setEmergency({
          name: emergencyRes.data.name || "",
          phone: emergencyRes.data.phone || "",
          relationship: emergencyRes.data.relationship || "",
        });
      }
      setRefCountries(countriesRes.data || []);
      setRefLanguages(languagesRes.data || []);
      setRefCurrencies(currenciesRes.data || []);
      setRefTimezones(loadedTimezones);
      setLoading(false);
    }
    load();
  }, [supabase]);

  // Böngésző alapú javaslat ország nélküli profilhoz — csak kliensoldalon, betöltés (hidratálás) után.
  const browserTimeZone = useSyncExternalStore(subscribeNoop, readBrowserTimeZone, () => null);
  const browserLanguages = useSyncExternalStore(subscribeNoop, readBrowserLanguages, () => "");
  const suggestion = useMemo(
    () =>
      loading || form.country_code
        ? null
        : suggestCountryAndTimezone({
            browserTimeZone,
            browserLanguages: browserLanguages ? browserLanguages.split(",") : [],
            countries: refCountries,
            timezones: refTimezones,
          }),
    [loading, form.country_code, browserTimeZone, browserLanguages, refCountries, refTimezones],
  );

  const countryTimezones = useMemo(
    () => timezonesForCountry(form.country_code, refTimezones),
    [form.country_code, refTimezones],
  );
  const timezoneMissing = !!form.country_code && !isTimezoneOfCountry(form.country_code, form.timezone, refTimezones);

  const handleCountryChange = (countryCode: string) => {
    setTimezoneError(null);
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      country_code: countryCode,
      timezone: countryCode ? autoTimezoneForCountry(countryCode, refTimezones) ?? "" : "",
    }));
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setTimezoneError(null);
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      country_code: suggestion.countryCode,
      timezone: suggestion.timezone ?? autoTimezoneForCountry(suggestion.countryCode, refTimezones) ?? "",
    }));
  };

  const suggestionCountry = suggestion ? refCountries.find((c) => c.code === suggestion.countryCode) : undefined;
  const suggestionTimezone = suggestion?.timezone ? refTimezones.find((tz) => tz.tz_id === suggestion.timezone) : undefined;

  const handleSave = async () => {
    setSaved(false);
    setSaveError(null);
    if (timezoneMissing) {
      setTimezoneError("profile.settings.errors.timezoneRequired");
      return;
    }
    setTimezoneError(null);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setSaveError("errors.sessionExpired");
      return;
    }

    // Fetch current slug so upsert doesn't violate NOT NULL
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("slug")
      .eq("id", user.id)
      .single();

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email || "",
      slug: currentProfile?.slug || user.email?.split("@")[0] || "user",
      first_name: form.first_name,
      last_name: form.last_name,
      display_name: `${form.first_name} ${form.last_name}`.trim() || user.email?.split("@")[0] || "User",
      phone: form.phone || null,
      bio: form.bio || null,
      location_city: form.location_city || null,
      country_code: form.country_code || null,
      preferred_language: form.preferred_language,
      preferred_currency: form.preferred_currency,
      // Ország nélkül a zónaválasztó tiltott és üres, ezért zónát sem mentünk.
      timezone: form.country_code ? (form.timezone || null) : null,
      avatar_url: form.avatar_url || null,
      avatar_source: form.avatar_source,
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile save error:", profileError);
      const key = profileSaveErrorKey(profileError);
      if (key === "profile.settings.errors.timezoneRequired" || key === "profile.settings.errors.timezoneMismatch" || key === "profile.settings.errors.timezoneInvalid") {
        setTimezoneError(key);
      } else {
        setSaveError(key);
      }
      setSaving(false);
      return;
    }

    if (emergency.name && emergency.phone) {
      const { error: emergencyError } = await supabase.from("emergency_contacts").upsert({
        user_id: user.id,
        name: emergency.name,
        phone: emergency.phone,
        relationship: emergency.relationship || "other",
        is_primary: true,
      }, { onConflict: "user_id,is_primary" });
      if (emergencyError) {
        console.error("Emergency contact save error:", emergencyError);
        setSaveError("errors.saveFailed");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-navy-200 bg-white p-8 text-center text-navy-500">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-navy-200 bg-white p-8">
      <h1 className="text-[22px] font-bold text-navy-900 mb-2">
        {t('profile.editProfile')}
      </h1>
      <p className="text-sm text-navy-500 mb-8">
        {t('profile.settings.personalInfo')}
      </p>

      <div className="space-y-6">
        {/* Avatar Picker */}
        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-3">
            {t('imagePicker.avatar.title')}
          </label>
          <p className="text-xs text-navy-400 mb-3">
            {t('imagePicker.avatar.subtitle')}
          </p>
          <ImagePicker
            type="avatar"
            currentImageUrl={form.avatar_url || undefined}
            currentSource={form.avatar_source}
            onSelect={(url, source) =>
              setForm({ ...form, avatar_url: url, avatar_source: source })
            }
            onClear={() =>
              setForm({ ...form, avatar_url: "", avatar_source: "system" })
            }
          />
        </div>

        <hr className="border-navy-100" />

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first-name" className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.firstName')}
            </label>
            <input
              id="first-name"
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="input-trevu"
              placeholder={t('profile.settings.firstNamePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="last-name" className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.lastName')}
            </label>
            <input
              id="last-name"
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="input-trevu"
              placeholder={t('profile.settings.lastNamePlaceholder')}
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-navy-700 mb-1.5">
            {t('profile.settings.phone')}
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-trevu"
            placeholder={t('profile.settings.phonePlaceholder')}
          />
        </div>

        {/* City + Country */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.city')}
            </label>
            <input
              id="city"
              type="text"
              value={form.location_city}
              onChange={(e) => setForm({ ...form, location_city: e.target.value })}
              className="input-trevu"
              placeholder={t('profile.settings.cityPlaceholder')}
            />
          </div>
          {/*
            A profil országa egyben az M23 naptár-ország (BR-M23-006, S4; Norbert döntése, 2026-09-15):
            csak aktív ország választható, üresen nincs országspecifikus naptár.
            DESIGN-FIRST kivétel: az S4 a meglévő mezőre épül, külön Pencil-terv nem készül (Norbert kérése;
            tervhivatkozás: D01 `oeWBG`).
            040 (Norbert döntései, 2026-09-15): országhoz kötelező az országhoz tartozó időzóna (egyzónásnál
            automatikus, többzónásnál választani kell); ország nélkül böngésző alapú javaslat (csak kitölt,
            nem ment). Szintén DESIGN-FIRST kivétel, a meglévő mezők és stílus bővítése.
          */}
          <div>
            <label htmlFor="country" className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.country')}
            </label>
            {suggestion && suggestionCountry && !form.country_code && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-trevu-200 bg-trevu-50 px-3 py-2">
                <p className="text-xs text-navy-700">
                  {suggestionTimezone
                    ? t('profile.settings.suggestionLabel', {
                        country: `${suggestionCountry.flag_emoji ?? ""} ${(locale === "en" ? suggestionCountry.name_en : suggestionCountry.name_hu) ?? suggestionCountry.code}`.trim(),
                        timezone: suggestionTimezone.display_name ?? suggestionTimezone.tz_id,
                      })
                    : t('profile.settings.suggestionLabelCountryOnly', {
                        country: `${suggestionCountry.flag_emoji ?? ""} ${(locale === "en" ? suggestionCountry.name_en : suggestionCountry.name_hu) ?? suggestionCountry.code}`.trim(),
                      })}
                </p>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="shrink-0 rounded-lg bg-trevu-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-trevu-700 transition-colors"
                >
                  {t('profile.settings.suggestionApply')}
                </button>
              </div>
            )}
            <select
              id="country"
              value={form.country_code}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="input-trevu"
            >
              <option value="">{t('profile.settings.countryPlaceholder')}</option>
              {refCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag_emoji} {locale === "en" ? c.name_en : c.name_hu}
                </option>
              ))}
            </select>
            <p className="text-xs text-navy-400 mt-1">
              {t('profile.settings.countryCalendarHint')}
            </p>
          </div>
        </div>

        {/* Language + Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.preferredLanguage')}
            </label>
            <select
              value={form.preferred_language}
              onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
              className="input-trevu"
            >
              {refLanguages.map((l) => (
                <option key={l.code} value={l.code}>{l.name_native}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.preferredCurrency')}
            </label>
            <select
              value={form.preferred_currency}
              onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
              className="input-trevu"
            >
              {refCurrencies.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {locale === "en" ? c.name_en : c.name_hu}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-semibold text-navy-700 mb-1.5">
            {t('profile.settings.timezone')}
          </label>
          <select
            id="timezone"
            value={form.country_code ? form.timezone : ""}
            onChange={(e) => {
              setTimezoneError(null);
              setSaved(false);
              setForm({ ...form, timezone: e.target.value });
            }}
            disabled={!form.country_code}
            aria-invalid={!!timezoneError || undefined}
            aria-describedby="timezone-hint"
            className="input-trevu disabled:opacity-50"
          >
            <option value="">{t('profile.settings.timezonePlaceholder')}</option>
            {countryTimezones.map((tz) => (
              <option key={tz.tz_id} value={tz.tz_id}>{tz.display_name} ({tz.utc_offset_text})</option>
            ))}
          </select>
          <div id="timezone-hint">
            {timezoneError ? (
              <p role="alert" className="text-xs text-red-600 mt-1">
                {t(timezoneError)}
              </p>
            ) : !form.country_code ? (
              <p className="text-xs text-navy-400 mt-1">
                {t('profile.settings.timezoneSelectCountryFirst')}
              </p>
            ) : timezoneMissing ? (
              <p className="text-xs text-amber-700 mt-1">
                {t('profile.settings.timezoneChooseRequired')}
              </p>
            ) : (
              <p className="text-xs text-navy-400 mt-1">
                {t('profile.settings.timezoneHint')}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-1.5">
            {t('profile.settings.bio')}
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 500) })}
            className="input-trevu min-h-[120px] resize-none"
            placeholder={t('profile.settings.bioPlaceholder')}
          />
          <p className="text-xs text-navy-400 mt-1">
            {t('profile.settings.bioCharCount', { count: form.bio.length })}
          </p>
        </div>

        <hr className="border-navy-200" />

        {/* Emergency Contact */}
        <div>
          <h3 className="text-lg font-bold text-navy-900 mb-1">{t('profile.emergency.title')}</h3>
          <p className="text-xs text-navy-500 mb-4">
            {t('settings.privacy.phoneHint')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="emergency-name" className="block text-sm font-semibold text-navy-700 mb-1.5">
                {t('profile.emergency.name')}
              </label>
              <input
                id="emergency-name"
                type="text"
                value={emergency.name}
                onChange={(e) => setEmergency({ ...emergency, name: e.target.value })}
                className="input-trevu"
                placeholder={t('profile.emergency.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                {t('profile.emergency.relationship')}
              </label>
              <select
                value={emergency.relationship}
                onChange={(e) => setEmergency({ ...emergency, relationship: e.target.value })}
                className="input-trevu"
              >
                <option value="">--</option>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`profile.emergency.relationships.${r}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="emergency-phone" className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.emergency.phone')}
            </label>
            <input
              id="emergency-phone"
              type="tel"
              value={emergency.phone}
              onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })}
              className="input-trevu"
              placeholder={t('profile.emergency.phonePlaceholder')}
            />
          </div>
        </div>

        <hr className="border-navy-200" />

        {/* Actions */}
        {saveError && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {t(saveError)}
          </div>
        )}
        <div className="flex gap-3">
          <a
            href="/profile"
            className="rounded-xl border border-navy-200 bg-white px-7 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
          >
            {t('common.cancel')}
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-trevu-600 px-7 py-3 text-sm font-semibold text-white hover:bg-trevu-700 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.loading') : saved ? t('common.saved') : t('common.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
