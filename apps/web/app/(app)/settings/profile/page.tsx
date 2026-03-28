"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ImagePicker } from "@/components/ImagePicker";

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

const RELATIONSHIP_OPTIONS = ["spouse", "parent", "sibling", "friend", "other"];

export default function ProfileSettingsPage() {
  const { t, locale } = useTranslation();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Profile>({
    first_name: "", last_name: "", phone: "", bio: "",
    location_city: "", country_code: "", preferred_language: "hu",
    preferred_currency: "HUF", timezone: "Europe/Budapest",
    avatar_url: "", avatar_source: "system",
  });
  const [emergency, setEmergency] = useState<EmergencyContact>({ name: "", phone: "", relationship: "" });
  const [refCountries, setRefCountries] = useState<any[]>([]);
  const [refLanguages, setRefLanguages] = useState<any[]>([]);
  const [refCurrencies, setRefCurrencies] = useState<any[]>([]);
  const [refTimezones, setRefTimezones] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, emergencyRes, countriesRes, languagesRes, currenciesRes, timezonesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("emergency_contacts").select("*").eq("user_id", user.id).limit(1).single(),
        supabase.from("ref_countries").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("ref_languages").select("*").eq("is_active", true).eq("is_app_supported", true).order("sort_order"),
        supabase.from("ref_currencies").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("ref_timezones").select("*").eq("is_active", true).order("sort_order"),
      ]);

      if (profileRes.data) {
        const p = profileRes.data;
        setForm({
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          phone: p.phone || "",
          bio: p.bio || "",
          location_city: p.location_city || "",
          country_code: p.country_code || "",
          preferred_language: p.preferred_language || "hu",
          preferred_currency: p.preferred_currency || "HUF",
          timezone: p.timezone || "Europe/Budapest",
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
      setRefTimezones(timezonesRes.data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
      timezone: form.timezone,
      avatar_url: form.avatar_url || null,
      avatar_source: form.avatar_source,
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile save error:", profileError);
      setSaving(false);
      return;
    }

    if (emergency.name && emergency.phone) {
      await supabase.from("emergency_contacts").upsert({
        user_id: user.id,
        name: emergency.name,
        phone: emergency.phone,
        relationship: emergency.relationship || "other",
        is_primary: true,
      }, { onConflict: "user_id,is_primary" });
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
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t('profile.settings.country')}
            </label>
            <select
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              className="input-trevu"
            >
              <option value="">{t('profile.settings.countryPlaceholder')}</option>
              {refCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag_emoji} {locale === "en" ? c.name_en : c.name_hu}
                </option>
              ))}
            </select>
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
          <label className="block text-sm font-semibold text-navy-700 mb-1.5">
            {t('profile.settings.timezone')}
          </label>
          <select
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="input-trevu"
          >
            {refTimezones.map((tz) => (
              <option key={tz.tz_id} value={tz.tz_id}>{tz.display_name} ({tz.utc_offset_text})</option>
            ))}
          </select>
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
