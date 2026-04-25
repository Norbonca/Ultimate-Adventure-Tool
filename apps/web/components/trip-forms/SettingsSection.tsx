"use client";

import type { WizardFormData } from "@/app/(app)/trips/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@uat/i18n";

interface SettingsSectionProps {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}

const VISIBILITY_OPTIONS = [
  { value: "public" as const, icon: "🌍", labelKey: "trips.wizard.visPublic", descKey: "trips.wizard.visPublicDesc" },
  { value: "followers_only" as const, icon: "👥", labelKey: "trips.wizard.visFollowers", descKey: "trips.wizard.visFollowersDesc" },
  { value: "private" as const, icon: "🔒", labelKey: "trips.wizard.visPrivate", descKey: "trips.wizard.visPrivateDesc" },
];

export function SettingsSection({ data, onChange }: SettingsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Visibility */}
      <div>
        <label className="block text-sm font-semibold text-navy-700 mb-3">
          {t("trips.wizard.visibility")}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ visibility: opt.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                data.visibility === opt.value
                  ? "border-trevu-500 bg-trevu-50"
                  : "border-navy-200 hover:border-navy-300"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="block text-sm font-semibold text-navy-800 mt-2">
                {t(opt.labelKey as TranslationKey)}
              </span>
              <span className="block text-xs text-navy-400 mt-0.5">
                {t(opt.descKey as TranslationKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Team composition */}
      <div className="pt-2">
        <div className="flex items-center gap-3 pb-3">
          <div className="h-px flex-1 bg-navy-100" />
          <span className="text-xs font-bold text-navy-500 tracking-widest">
            {t("trips.settings.teamSizeHeader")}
          </span>
          <div className="h-px flex-1 bg-navy-100" />
        </div>
        <p className="text-sm text-navy-500 mb-3">
          {t("trips.settings.teamSizeHelp")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t("trips.settings.guestSeatsLabel")}
            </label>
            <input
              type="number"
              min={2}
              max={500}
              value={data.max_participants}
              onChange={(e) =>
                onChange({ max_participants: parseInt(e.target.value) || 2 })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1.5">
              {t("trips.settings.staffSeatsLabel")}
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={data.staff_seats}
              onChange={(e) =>
                onChange({ staff_seats: Math.max(0, Math.min(50, parseInt(e.target.value) || 0)) })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold">
          <span>👥</span>
          <span>
            {t("trips.settings.teamTotal").replace(
              "{count}",
              String((data.max_participants || 0) + (data.staff_seats || 0))
            )}
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        <ToggleRow
          checked={data.require_approval}
          onChange={(v) => onChange({ require_approval: v })}
          label={t("trips.wizard.requireApproval")}
          desc={t("trips.wizard.requireApprovalDesc")}
        />
        <ToggleRow
          checked={data.is_cost_sharing}
          onChange={(v) => onChange({ is_cost_sharing: v })}
          label={t("trips.wizard.costSharing")}
          desc={t("trips.wizard.costSharingDesc")}
        />
      </div>

      {/* Pricing divider */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-px flex-1 bg-navy-100" />
        <span className="text-xs font-bold text-navy-500 tracking-widest">
          {t("trips.settings.pricingHeader")}
        </span>
        <div className="h-px flex-1 bg-navy-100" />
      </div>

      {/* Pricing 3-col row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.wizard.pricePerPerson")}
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={data.price_amount ?? ""}
            onChange={(e) =>
              onChange({ price_amount: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.wizard.currency")}
          </label>
          <select
            value={data.price_currency}
            onChange={(e) => onChange({ price_currency: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 bg-white focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          >
            <option value="EUR">EUR (€)</option>
            <option value="HUF">HUF (Ft)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CZK">CZK (Kč)</option>
            <option value="RON">RON (lei)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {t("trips.wizard.registrationDeadline")}
          </label>
          <input
            type="date"
            value={data.registration_deadline ? data.registration_deadline.slice(0, 10) : ""}
            onChange={(e) => onChange({ registration_deadline: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Show on landing */}
      <div className="flex items-center justify-between pt-4 border-t border-navy-100">
        <div>
          <span className="text-sm font-medium text-navy-700">
            {t("trips.wizard.showOnLanding")}
          </span>
          <span className="block text-xs text-navy-400">
            {t("trips.wizard.showOnLandingDesc")}
          </span>
        </div>
        <Toggle
          checked={data.show_on_landing}
          onChange={(v) => onChange({ show_on_landing: v })}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Toggle checked={checked} onChange={onChange} />
      <div>
        <span className="text-sm font-medium text-navy-700">{label}</span>
        <span className="block text-xs text-navy-400">{desc}</span>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
        checked ? "bg-trevu-600" : "bg-navy-200"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
