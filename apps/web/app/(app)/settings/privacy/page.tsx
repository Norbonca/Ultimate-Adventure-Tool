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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      const response = await fetch('/api/v1/account/export', { cache: 'no-store' });
      if (!response.ok) throw new Error('export_failed');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'trevu-account.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError(t('errors.loadFailed'));
    } finally {
      setExporting(false);
    }
  };

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
      <div className="rounded-2xl border border-navy-200 bg-white p-8 text-center text-navy-500">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Settings Card */}
      <div className="rounded-2xl border border-navy-200 bg-white p-4 sm:p-8">
        <h1 className="text-[22px] font-bold text-navy-900 mb-2">
          {t('profile.privacy.title')}
        </h1>
        <p className="text-sm text-navy-500 leading-relaxed mb-8">
          {t('settings.privacy.description')}
        </p>

        <div className="space-y-6">
          {/* Profile visibility — segmented */}
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-3">
              {t('profile.privacy.profileVisibility')}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PROFILE_VIS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateField("profile_visibility", opt)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                    settings.profile_visibility === opt
                      ? "bg-trevu-600 text-white"
                      : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                  }`}
                >
                  {t(`profile.privacy.options.${opt}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-navy-200" />

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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-navy-700">{item.label}</span>
                    {"hint" in item && item.hint && (
                      <p className="text-xs text-navy-400 mt-0.5">{item.hint}</p>
                    )}
                  </div>
                  <button
                    onClick={() => updateField(item.field, isOn ? item.offValue : item.onValue)}
                    aria-label={item.label}
                    aria-pressed={isOn}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      isOn ? "bg-trevu-600" : "bg-navy-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isOn ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-navy-200 flex flex-wrap gap-3">
          <a href="/profile" className="rounded-xl border border-navy-200 bg-white px-7 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors">
            {t('common.cancel')}
          </a>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-trevu-600 px-7 py-3 text-sm font-semibold text-white hover:bg-trevu-700 transition-colors disabled:opacity-50"
          >
            {isPending ? t('common.loading') : saved ? t('common.saved') : t('common.saveChanges')}
          </button>
        </div>
      </div>

      {/* GDPR Card */}
      <div className="rounded-2xl border border-navy-200 bg-white p-4 sm:p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6">
          {t('settings.privacy.gdprTitle')}
        </h2>

        {/* Export data */}
        <div className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-navy-700">{t('settings.privacy.exportTitle')}</p>
            <p className="text-xs text-navy-500 mt-0.5">{t('settings.privacy.exportDesc')}</p>
          </div>
          <button onClick={handleExport} disabled={exporting} className="flex shrink-0 items-center gap-2 rounded-xl border border-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-50">
            <Icon name="download" size={16} />
            {exporting ? t('common.loading') : t('settings.privacy.exportBtn')}
          </button>
        </div>
        {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}

        <hr className="border-navy-200" />

        {/* Delete account */}
        <div className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-red-600">{t('settings.privacy.deleteTitle')}</p>
            <p className="text-xs text-navy-500 mt-0.5">{t('settings.privacy.deleteDesc')}</p>
          </div>
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
