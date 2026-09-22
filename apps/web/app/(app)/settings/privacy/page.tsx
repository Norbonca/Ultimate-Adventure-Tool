"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchPrivacySettings, savePrivacySettings } from "../actions";
import { DeleteAccountButton } from "@/components/account/DeleteAccountButton";
import { Icon } from "@/components/Icon";

const PROFILE_VIS_OPTIONS = ["public", "registered", "private"] as const;

export default function PrivacyPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    profile_visibility: "public",
    email_visibility: "public",
    phone_visibility: "hidden",
    location_precision: "city_country",
    trip_history_visibility: "public",
    online_status_visible: true,
  });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPrivacySettings().then(({ settings: data }) => {
      if (data) {
        setSettings({
          profile_visibility: data.profile_visibility ?? "public",
          email_visibility: data.email_visibility ?? "public",
          phone_visibility: data.phone_visibility ?? "hidden",
          location_precision: data.location_precision ?? "city_country",
          trip_history_visibility: data.trip_history_visibility ?? "public",
          online_status_visible: data.online_status_visible ?? true,
        });
      }
      setLoading(false);
    });
  }, []);

  const updateField = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await savePrivacySettings(settings);
      if (!result.error) setSaved(true);
    });
  };

  if (loading) {
    return (
      <div className="border border-line bg-surface p-8 text-center text-ink-muted">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Settings Card */}
      <div className="border border-line bg-surface p-6 sm:p-8">
        <h1 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">
          {t('profile.privacy.title')}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-ink-muted">
          {t('settings.privacy.description')}
        </p>

        <div className="space-y-6">
          {/* Profile visibility — segmented */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-ink">
              {t('profile.privacy.profileVisibility')}
            </label>
            <div className="flex gap-2">
              {PROFILE_VIS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateField("profile_visibility", opt)}
                  className={`flex-1 border py-2.5 text-sm font-semibold transition-colors ${
                    settings.profile_visibility === opt
                      ? "border-accent bg-accent text-accent-on"
                      : "border-line bg-canvas text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {t(`profile.privacy.options.${opt}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-line" />

          {/* Toggle rows */}
          {([
            { field: "email_visibility", label: t('profile.privacy.emailVisibility'), isToggle: true, onValue: "public", offValue: "hidden" },
            { field: "phone_visibility", label: t('profile.privacy.phoneVisibility'), isToggle: true, onValue: "trip_companions_only", offValue: "hidden", hint: t('settings.privacy.phoneHint') },
            { field: "location_precision", label: t('profile.privacy.locationPrecision'), isToggle: true, onValue: "city_country", offValue: "hidden" },
            { field: "trip_history_visibility", label: t('profile.privacy.tripHistoryVisibility'), isToggle: true, onValue: "public", offValue: "private" },
            { field: "online_status_visible", label: t('profile.privacy.onlineStatus'), isToggle: true, onValue: true, offValue: false },
          ] as const).map((item) => {
            const isOn = settings[item.field as keyof typeof settings] === item.onValue;
            return (
              <div key={item.field}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    {"hint" in item && item.hint && (
                      <p className="mt-0.5 text-xs text-ink-muted">{item.hint}</p>
                    )}
                  </div>
                  <button
                    onClick={() => updateField(item.field, isOn ? item.offValue : item.onValue)}
                    aria-label={item.label}
                    aria-pressed={isOn}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      isOn ? "bg-accent" : "bg-line-strong"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-transform ${
                        isOn ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-3 border-t border-line pt-6">
          <a href="/profile" className="inline-flex min-h-12 items-center justify-center border border-line-strong bg-surface px-7 py-3 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent">
            {t('common.cancel')}
          </a>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="min-h-12 bg-accent px-7 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {isPending ? t('common.loading') : saved ? t('common.saved') : t('common.saveChanges')}
          </button>
        </div>
      </div>

      {/* GDPR Card */}
      <div className="border border-line bg-surface p-6 sm:p-8">
        <h2 className="mb-6 font-display text-3xl font-extrabold text-ink">
          {t('settings.privacy.gdprTitle')}
        </h2>

        {/* Export data */}
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-ink">{t('settings.privacy.exportTitle')}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{t('settings.privacy.exportDesc')}</p>
          </div>
          <button className="flex min-h-11 items-center gap-2 border border-line-strong bg-surface px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent">
            <Icon name="download" size={16} />
            {t('settings.privacy.exportBtn')}
          </button>
        </div>

        <hr className="border-line" />

        {/* Delete account */}
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-danger)]">{t('settings.privacy.deleteTitle')}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{t('settings.privacy.deleteDesc')}</p>
          </div>
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
