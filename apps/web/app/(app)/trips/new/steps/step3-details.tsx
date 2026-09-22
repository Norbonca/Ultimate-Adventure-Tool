"use client";

/**
 * Wizard Step 3 — Category Details — design/D02_Trip_Management.pen#fNVuu
 */

import { useMemo } from "react";
import type {
  WizardFormData,
  CategoryParameterRow,
  ParameterOptionRow,
} from "../../types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Input, StateTemplate, Toggle } from "@/components/ui";

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
    return <StateTemplate variant="loading" title={t('trips.wizard.loadingParams')} />;
  }

  if (parameters.length === 0) {
    return <StateTemplate variant="empty" title={t('trips.wizard.noParams')} />;
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
    "w-full min-h-[48px] px-4 py-3 rounded-trevu border-[1.5px] border-navy-300 text-[15px] text-navy-900 placeholder:text-navy-500 bg-white focus:ring-[3px] focus:ring-trevu-600/10 focus:border-trevu-600 outline-none transition-all duration-200";

  const fieldId = `param-${param.parameter_key}`;
  const labelNode = (
    <>
      {label}
      {param.field_type === "number" && param.unit && (
        <span className="text-navy-400 font-normal"> ({param.unit})</span>
      )}
      {param.is_required && <span className="text-coral"> *</span>}
    </>
  );

  switch (param.field_type) {
    case "number":
      return (
        <Input
          id={fieldId}
          label={labelNode}
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? parseFloat(e.target.value) : null)
          }
          min={param.validation?.min}
          max={param.validation?.max}
          step={param.validation?.step || 1}
          placeholder={param.placeholder || undefined}
        />
      );

    case "text":
      return (
        <Input
          id={fieldId}
          label={labelNode}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.placeholder || undefined}
        />
      );

    case "textarea":
      return (
        <div className="sm:col-span-2">
          <label htmlFor={fieldId} className="block text-sm font-semibold text-navy-900 mb-1.5">
            {labelNode}
          </label>
          <textarea
            id={fieldId}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </div>
      );

    case "boolean":
      return (
        <Toggle
          checked={!!value}
          onChange={(checked) => onChange(checked)}
          label={label}
          className="py-2"
        />
      );

    case "select":
      return (
        <div>
          <label htmlFor={fieldId} className="block text-sm font-semibold text-navy-900 mb-1.5">
            {labelNode}
          </label>
          <select
            id={fieldId}
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
          <label className="block text-sm font-semibold text-navy-900 mb-1.5">
            {labelNode}
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
        <Input
          id={fieldId}
          label={label}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
