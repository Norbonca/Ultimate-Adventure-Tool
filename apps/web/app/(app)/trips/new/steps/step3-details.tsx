"use client";

import { useMemo } from "react";
import type {
  WizardFormData,
  CategoryParameterRow,
  ParameterOptionRow,
} from "../../types";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface Step3Props {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  parameters: CategoryParameterRow[];
  paramOptions: ParameterOptionRow[];
  isLoading: boolean;
}

export function Step3Details({
  formData,
  onChange,
  parameters,
  paramOptions,
  isLoading,
}: Step3Props) {
  // Group parameters by group_key
  const grouped = useMemo(() => {
    const groups: Record<
      string,
      { label: string; labelHu: string; params: CategoryParameterRow[] }
    > = {};

    for (const param of parameters) {
      const key = param.group_key || "_default";
      if (!groups[key]) {
        groups[key] = {
          label: param.group_label || "Egyéb",
          labelHu:
            (param.group_label_localized as Record<string, string>)?.hu ||
            param.group_label ||
            "Egyéb",
          params: [],
        };
      }
      groups[key].params.push(param);
    }

    return groups;
  }, [parameters]);

  // Get/set value in category_details
  const getValue = (key: string) => formData.category_details[key];

  const setValue = (key: string, value: unknown) => {
    onChange({
      category_details: {
        ...formData.category_details,
        [key]: value,
      },
    });
  };

  // Get options for a parameter
  const getOptions = (paramId: string) =>
    paramOptions.filter((o) => o.parameter_id === paramId);

  const { t, locale } = useTranslation();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-2 border-trevu-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-navy-500 mt-3">{t('trips.wizard.loadingParams')}</p>
      </div>
    );
  }

  if (parameters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-navy-500">{t('trips.wizard.noParams')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">
          {t('trips.wizard.step3Title')}
        </h2>
        <p className="text-navy-500">{t('trips.wizard.step3Description')}</p>
      </div>

      {Object.entries(grouped).map(([groupKey, group]) => {
        const groupLabel = locale === 'en'
          ? (group.label || t('trips.wizard.otherGroup'))
          : (group.labelHu || t('trips.wizard.otherGroup'));
        return (
        <div key={groupKey}>
          <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-navy-100" />
            <span>{groupLabel}</span>
            <div className="h-px flex-1 bg-navy-100" />
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.params.map((param) => (
              <ParameterField
                key={param.id}
                param={param}
                value={getValue(param.parameter_key)}
                onChange={(val) => setValue(param.parameter_key, val)}
                options={getOptions(param.id)}
                locale={locale}
                t={t as (key: string, params?: Record<string, string | number>) => string}
              />
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ============================================
// Dynamic Field Renderer
// ============================================
function ParameterField({
  param,
  value,
  onChange,
  options,
  locale,
  t,
}: {
  param: CategoryParameterRow;
  value: unknown;
  onChange: (val: unknown) => void;
  options: ParameterOptionRow[];
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const label =
    locale === 'en'
      ? (param.label_localized as Record<string, string>)?.en || param.label
      : (param.label_localized as Record<string, string>)?.hu || param.label;

  const inputClasses =
    "w-full px-4 py-2.5 rounded-xl border border-navy-200 text-navy-900 placeholder:text-navy-300 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors bg-white";

  switch (param.field_type) {
    case "number":
      return (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {param.unit && (
              <span className="text-navy-400 font-normal"> ({param.unit})</span>
            )}
            {param.is_required && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange(e.target.value ? parseFloat(e.target.value) : null)
            }
            min={param.validation?.min}
            max={param.validation?.max}
            step={param.validation?.step || 1}
            placeholder={param.placeholder || undefined}
            className={inputClasses}
          />
        </div>
      );

    case "text":
      return (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {param.is_required && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder || undefined}
            className={inputClasses}
          />
        </div>
      );

    case "textarea":
      return (
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {param.is_required && <span className="text-red-500"> *</span>}
          </label>
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => onChange(!(value as boolean))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              value ? "bg-trevu-600" : "bg-navy-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                value ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <label className="text-sm font-medium text-navy-700">
            {label}
          </label>
        </div>
      );

    case "select":
      return (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {param.is_required && <span className="text-red-500"> *</span>}
          </label>
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          >
            <option value="">{t('trips.wizard.selectOption')}</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {locale === 'en'
                  ? (opt.label_localized as Record<string, string>)?.en || opt.label
                  : (opt.label_localized as Record<string, string>)?.hu || opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "multiselect":
      const selectedValues = (value as string[]) || [];
      return (
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
            {param.is_required && <span className="text-red-500"> *</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v) => v !== opt.value));
                    } else {
                      onChange([...selectedValues, opt.value]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-trevu-600 text-white shadow-sm"
                      : "bg-navy-50 text-navy-600 hover:bg-navy-100 border border-navy-200"
                  }`}
                >
                  {locale === 'en'
                    ? (opt.label_localized as Record<string, string>)?.en || opt.label
                    : (opt.label_localized as Record<string, string>)?.hu || opt.label}
                </button>
              );
            })}
            {options.length === 0 && (
              <span className="text-xs text-navy-400">
                {t('trips.wizard.noOptions')}
              </span>
            )}
          </div>
        </div>
      );

    default:
      return (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            {label}
          </label>
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          />
        </div>
      );
  }
}
