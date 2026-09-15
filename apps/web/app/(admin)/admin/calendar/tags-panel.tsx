"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TranslationKey } from "@uat/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { saveCalendarTag, type AdminTag } from "./actions";
import { statusBadgeClass } from "./calendar-format";

interface TagForm {
  id?: string;
  key: string;
  labelHu: string;
  labelEn: string;
  iconKey: string;
  colorToken: string;
  sortOrder: number;
  status: "active" | "inactive";
}

const EMPTY: TagForm = { key: "", labelHu: "", labelEn: "", iconKey: "", colorToken: "", sortOrder: 100, status: "active" };

/** M23 S8 — címkekatalógus (FR-M23-002). */
export function TagsPanel({ tags, onToast }: { tags: AdminTag[]; onToast: (msg: string, ok?: boolean) => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState<TagForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const submit = async (value: TagForm) => {
    setBusy(value.id ?? "new");
    const res = await saveCalendarTag({
      ...value,
      iconKey: value.iconKey.trim() || null,
      colorToken: value.colorToken.trim() || null,
    });
    setBusy(null);
    if (res.ok) {
      onToast(t("admin.calendar.messages.saved"));
      setForm(null);
      router.refresh();
    } else {
      onToast(t(`errors.calendar.${res.error}` as TranslationKey), false);
    }
  };

  const toggleStatus = (tag: AdminTag) =>
    submit({
      id: tag.id,
      key: tag.key,
      labelHu: tag.label_localized.hu ?? "",
      labelEn: tag.label_localized.en ?? "",
      iconKey: tag.icon_key ?? "",
      colorToken: tag.color_token ?? "",
      sortOrder: tag.sort_order,
      status: tag.status === "active" ? "inactive" : "active",
    });

  const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white";
  const field = (name: keyof TagForm, label: TranslationKey, placeholder?: TranslationKey, disabled = false) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {t(label)}
      <input
        className={`${inputCls} disabled:bg-slate-100`}
        value={String(form?.[name] ?? "")}
        disabled={disabled}
        type={name === "sortOrder" ? "number" : "text"}
        placeholder={placeholder ? t(placeholder) : undefined}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, [name]: name === "sortOrder" ? Number(e.target.value) : e.target.value } : f))
        }
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{t("admin.calendar.tagsPanel.hint")}</p>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY })}
          className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
        >
          + {t("admin.calendar.actions.addTag")}
        </button>
      </div>

      {form && (
        <form
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 grid grid-cols-2 lg:grid-cols-4 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(form);
          }}
        >
          {field("key", "admin.calendar.columns.key", "admin.calendar.tagsPanel.keyPlaceholder", Boolean(form.id))}
          {field("labelHu", "admin.calendar.columns.nameHu")}
          {field("labelEn", "admin.calendar.columns.nameEn")}
          {field("sortOrder", "admin.calendar.columns.order")}
          {field("iconKey", "admin.calendar.columns.icon", "admin.calendar.tagsPanel.iconPlaceholder")}
          {field("colorToken", "admin.calendar.columns.colorToken", "admin.calendar.tagsPanel.colorTokenPlaceholder")}
          <div className="col-span-2 flex items-end justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="px-3 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              {t("admin.calendar.actions.cancel")}
            </button>
            <button type="submit" disabled={busy !== null} className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {t("admin.calendar.actions.save")}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {tags.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">{t("admin.calendar.tagsPanel.noTags")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                {(["key", "nameHu", "nameEn", "icon", "colorToken", "order", "usage", "status"] as const).map((col) => (
                  <th key={col} className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    {t(`admin.calendar.columns.${col}` as TranslationKey)}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{tag.key}</td>
                  <td className="px-4 py-3 text-slate-800">{tag.label_localized.hu}</td>
                  <td className="px-4 py-3 text-slate-800">{tag.label_localized.en}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{tag.icon_key}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{tag.color_token}</td>
                  <td className="px-4 py-3 text-slate-500">{tag.sort_order}</td>
                  <td className="px-4 py-3 text-slate-500">{tag.usage}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[tag.status]}`}>
                      {t(`admin.calendar.statuses.${tag.status}` as TranslationKey)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: tag.id,
                            key: tag.key,
                            labelHu: tag.label_localized.hu ?? "",
                            labelEn: tag.label_localized.en ?? "",
                            iconKey: tag.icon_key ?? "",
                            colorToken: tag.color_token ?? "",
                            sortOrder: tag.sort_order,
                            status: tag.status,
                          })
                        }
                        className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                      >
                        {t("admin.calendar.actions.edit")}
                      </button>
                      <button
                        type="button"
                        disabled={busy === tag.id}
                        onClick={() => void toggleStatus(tag)}
                        className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                      >
                        {tag.status === "active" ? t("admin.calendar.actions.deactivate") : t("admin.calendar.actions.activate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
