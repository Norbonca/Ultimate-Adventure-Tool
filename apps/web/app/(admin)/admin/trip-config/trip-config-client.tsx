"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  upsertCategory,
  upsertSubDiscipline,
  deleteSubDiscipline,
  upsertParameter,
  deleteParameter,
  getParameterOptions,
  upsertParameterOption,
  deleteParameterOption,
  type AdminCategory,
  type AdminSubDiscipline,
  type AdminParameter,
  type AdminParameterOption,
} from "./actions";

// ─── Props ───────────────────────────────────────────────────────────────────

interface TripConfigClientProps {
  initialCategories: AdminCategory[];
  initialSubDisciplines: AdminSubDiscipline[];
  initialParameters: AdminParameter[];
  // Tab labels
  t_tabs_categories: string;
  t_tabs_subDisciplines: string;
  t_tabs_parameters: string;
  // Category columns / actions
  t_cat_colOrder: string;
  t_cat_colIcon: string;
  t_cat_colNameHu: string;
  t_cat_colNameEn: string;
  t_cat_colColor: string;
  t_cat_colStatus: string;
  t_cat_editCategory: string;
  t_cat_saveCategory: string;
  t_cat_cancelEdit: string;
  t_cat_iconPlaceholder: string;
  t_cat_namePlaceholder: string;
  t_cat_nameEnPlaceholder: string;
  t_cat_statusActive: string;
  t_cat_statusDraft: string;
  t_cat_statusDeprecated: string;
  // Sub-discipline columns / actions
  t_sd_selectPrompt: string;
  t_sd_colNameHu: string;
  t_sd_colNameEn: string;
  t_sd_colOrder: string;
  t_sd_colStatus: string;
  t_sd_addSubDiscipline: string;
  t_sd_editSubDiscipline: string;
  t_sd_saveSubDiscipline: string;
  t_sd_deleteSubDiscipline: string;
  t_sd_deleteConfirm: string;
  t_sd_namePlaceholder: string;
  t_sd_nameEnPlaceholder: string;
  t_sd_noSubDisciplines: string;
  // Parameter columns / actions
  t_p_selectPrompt: string;
  t_p_colKey: string;
  t_p_colLabelHu: string;
  t_p_colFieldType: string;
  t_p_colRequired: string;
  t_p_colOrder: string;
  t_p_colStatus: string;
  t_p_addParameter: string;
  t_p_editParameter: string;
  t_p_saveParameter: string;
  t_p_deleteParameter: string;
  t_p_deleteConfirm: string;
  t_p_keyPlaceholder: string;
  t_p_labelPlaceholder: string;
  t_p_labelEnPlaceholder: string;
  t_p_fieldTypeText: string;
  t_p_fieldTypeNumber: string;
  t_p_fieldTypeBoolean: string;
  t_p_fieldTypeSelect: string;
  t_p_fieldTypeMultiselect: string;
  t_p_fieldTypeRange: string;
  t_p_fieldTypeDate: string;
  t_p_fieldTypeTextarea: string;
  t_p_noParameters: string;
  t_p_isRequired: string;
  t_p_isFilterable: string;
  // Parameter options
  t_p_optionsTitle: string;
  t_p_optionsAddOption: string;
  t_p_optionsValue: string;
  t_p_optionsLabelHu: string;
  t_p_optionsLabelEn: string;
  t_p_optionsOrder: string;
  t_p_optionsIsDefault: string;
  t_p_optionsSave: string;
  t_p_optionsDelete: string;
  t_p_optionsDeleteConfirm: string;
  t_p_optionsNoOptions: string;
  t_p_optionsSaveFirstHint: string;
  t_p_optionsValuePlaceholder: string;
  t_p_optionsLabelPlaceholder: string;
  t_p_optionsLabelEnPlaceholder: string;
  t_p_optionsCount: string;
  // Common
  t_saveSuccess: string;
  t_deleteSuccess: string;
  t_errorSave: string;
  t_errorDelete: string;
  t_noResults: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TripConfigClient({
  initialCategories,
  initialSubDisciplines,
  initialParameters,
  ...t
}: TripConfigClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"categories" | "subDisciplines" | "parameters">(
    "categories"
  );
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // ─── Category edit state ───────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{
    name_hu: string; name_en: string; icon_name: string;
    color_hex: string; status: string; display_order: number;
  }>({ name_hu: "", name_en: "", icon_name: "", color_hex: "#10B981", status: "active", display_order: 0 });

  // ─── Sub-discipline state ──────────────────────────────────────────────────
  const [selectedCatForSd, setSelectedCatForSd] = useState<string>("");
  const [editingSdId, setEditingSdId] = useState<string | null>(null);
  const [showSdForm, setShowSdForm] = useState(false);
  const [sdForm, setSdForm] = useState<{
    name_hu: string; name_en: string; status: string; display_order: number;
  }>({ name_hu: "", name_en: "", status: "active", display_order: 0 });

  // ─── Parameter state ───────────────────────────────────────────────────────
  const [selectedCatForP, setSelectedCatForP] = useState<string>("");
  const [editingPId, setEditingPId] = useState<string | null>(null);
  const [showPForm, setShowPForm] = useState(false);
  const [pForm, setPForm] = useState<{
    parameter_key: string; label_hu: string; label_en: string;
    field_type: string; is_required: boolean; is_filterable: boolean;
    display_order: number; group_key: string; status: string;
  }>({
    parameter_key: "", label_hu: "", label_en: "", field_type: "text",
    is_required: false, is_filterable: false, display_order: 0, group_key: "", status: "active",
  });

  // ─── Parameter Options state ────────────────────────────────────────────
  const [options, setOptions] = useState<AdminParameterOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [showOptForm, setShowOptForm] = useState(false);
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [optForm, setOptForm] = useState({
    value: "", label_hu: "", label_en: "", sort_order: 0, is_default: false, status: "active",
  });

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  // ─── Category actions ──────────────────────────────────────────────────────

  const startEditCat = (cat: AdminCategory) => {
    setEditingCatId(cat.id);
    setCatForm({
      name_hu: cat.name_localized?.hu ?? cat.name,
      name_en: cat.name_localized?.en ?? cat.name,
      icon_name: cat.icon_name,
      color_hex: cat.color_hex,
      status: cat.status,
      display_order: cat.display_order,
    });
  };

  const saveCat = async (cat: AdminCategory) => {
    setLoading(cat.id);
    const res = await upsertCategory({ id: cat.id, name: cat.name, ...catForm });
    setLoading(null);
    if (res.success) {
      setEditingCatId(null);
      showToast(t.t_saveSuccess);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorSave, false);
    }
  };

  // ─── Sub-discipline actions ────────────────────────────────────────────────

  const openAddSd = () => {
    setEditingSdId(null);
    setSdForm({ name_hu: "", name_en: "", status: "active", display_order: 0 });
    setShowSdForm(true);
  };

  const openEditSd = (sd: AdminSubDiscipline) => {
    setEditingSdId(sd.id);
    setSdForm({
      name_hu: sd.name_localized?.hu ?? sd.name,
      name_en: sd.name_localized?.en ?? sd.name,
      status: sd.status,
      display_order: sd.display_order,
    });
    setShowSdForm(true);
  };

  const saveSd = async () => {
    if (!selectedCatForSd) return;
    setLoading("sd-save");
    const res = await upsertSubDiscipline({
      id: editingSdId ?? undefined,
      category_id: selectedCatForSd,
      ...sdForm,
    });
    setLoading(null);
    if (res.success) {
      setShowSdForm(false);
      showToast(t.t_saveSuccess);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorSave, false);
    }
  };

  const deleteSd = async (id: string) => {
    if (!confirm(t.t_sd_deleteConfirm)) return;
    setLoading(id);
    const res = await deleteSubDiscipline(id);
    setLoading(null);
    if (res.success) {
      showToast(t.t_deleteSuccess);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorDelete, false);
    }
  };

  // ─── Parameter actions ─────────────────────────────────────────────────────

  const openAddP = () => {
    setEditingPId(null);
    setPForm({
      parameter_key: "", label_hu: "", label_en: "", field_type: "text",
      is_required: false, is_filterable: false, display_order: 0, group_key: "", status: "active",
    });
    setShowPForm(true);
    setShowOptForm(false);
    setOptions([]);
  };

  const openEditP = (p: AdminParameter) => {
    setEditingPId(p.id);
    setPForm({
      parameter_key: p.parameter_key,
      label_hu: p.label_localized?.hu ?? p.label,
      label_en: p.label_localized?.en ?? p.label,
      field_type: p.field_type,
      is_required: p.is_required,
      is_filterable: p.is_filterable,
      display_order: p.display_order,
      group_key: p.group_key ?? "",
      status: p.status,
    });
    setShowPForm(true);
    setShowOptForm(false);
    setOptions([]);
    if (p.field_type === "select" || p.field_type === "multiselect") {
      loadOptions(p.id);
    }
  };

  const saveP = async () => {
    if (!selectedCatForP) return;
    setLoading("p-save");
    const res = await upsertParameter({
      id: editingPId ?? undefined,
      category_id: selectedCatForP,
      ...pForm,
      group_key: pForm.group_key || null,
    });
    setLoading(null);
    if (res.success) {
      setShowPForm(false);
      showToast(t.t_saveSuccess);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorSave, false);
    }
  };

  const deleteP = async (id: string) => {
    if (!confirm(t.t_p_deleteConfirm)) return;
    setLoading(id);
    const res = await deleteParameter(id);
    setLoading(null);
    if (res.success) {
      showToast(t.t_deleteSuccess);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorDelete, false);
    }
  };

  // ─── Parameter Options actions ──────────────────────────────────────────

  const loadOptions = async (parameterId: string) => {
    setOptionsLoading(true);
    const opts = await getParameterOptions(parameterId);
    setOptions(opts);
    setOptionsLoading(false);
  };

  const openAddOpt = () => {
    setEditingOptId(null);
    setOptForm({ value: "", label_hu: "", label_en: "", sort_order: options.length + 1, is_default: false, status: "active" });
    setShowOptForm(true);
  };

  const openEditOpt = (opt: AdminParameterOption) => {
    setEditingOptId(opt.id);
    setOptForm({
      value: opt.value,
      label_hu: opt.label_localized?.hu ?? opt.label,
      label_en: opt.label_localized?.en ?? opt.label,
      sort_order: opt.sort_order,
      is_default: opt.is_default,
      status: opt.status,
    });
    setShowOptForm(true);
  };

  const saveOpt = async () => {
    if (!editingPId) return;
    setLoading("opt-save");
    const res = await upsertParameterOption({
      id: editingOptId ?? undefined,
      parameter_id: editingPId,
      ...optForm,
    });
    setLoading(null);
    if (res.success) {
      setShowOptForm(false);
      showToast(t.t_saveSuccess);
      await loadOptions(editingPId);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorSave, false);
    }
  };

  const deleteOpt = async (id: string) => {
    if (!confirm(t.t_p_optionsDeleteConfirm)) return;
    if (!editingPId) return;
    setLoading(id);
    const res = await deleteParameterOption(id);
    setLoading(null);
    if (res.success) {
      showToast(t.t_deleteSuccess);
      await loadOptions(editingPId);
      refresh();
    } else {
      showToast(res.error ?? t.t_errorDelete, false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const fieldTypeLabel = (ft: string) => {
    const map: Record<string, string> = {
      text: t.t_p_fieldTypeText,
      number: t.t_p_fieldTypeNumber,
      boolean: t.t_p_fieldTypeBoolean,
      select: t.t_p_fieldTypeSelect,
      multiselect: t.t_p_fieldTypeMultiselect,
      range: t.t_p_fieldTypeRange,
      date: t.t_p_fieldTypeDate,
      textarea: t.t_p_fieldTypeTextarea,
    };
    return map[ft] ?? ft;
  };

  const statusBadge = (status: string) => {
    const cls =
      status === "active"
        ? "bg-emerald-100 text-emerald-700"
        : status === "draft"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-slate-100 text-slate-500";
    const label =
      status === "active"
        ? t.t_cat_statusActive
        : status === "draft"
        ? t.t_cat_statusDraft
        : t.t_cat_statusDeprecated;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  const filteredSds = initialSubDisciplines.filter(
    (sd) => sd.category_id === selectedCatForSd
  );
  const filteredPs = initialParameters.filter(
    (p) => p.category_id === selectedCatForP
  );

  const inputCls =
    "w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400 bg-slate-50";
  const selectCls =
    "w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400 bg-slate-50";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
            toast.ok ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            { key: "categories", label: t.t_tabs_categories },
            { key: "subDisciplines", label: t.t_tabs_subDisciplines },
            { key: "parameters", label: t.t_tabs_parameters },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-500"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CATEGORIES TAB ──────────────────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-16">
                  {t.t_cat_colOrder}
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-12">
                  {t.t_cat_colIcon}
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  {t.t_cat_colNameHu}
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  {t.t_cat_colNameEn}
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-24">
                  {t.t_cat_colColor}
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-28">
                  {t.t_cat_colStatus}
                </th>
                <th className="px-3 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialCategories.map((cat) => {
                const isEditing = editingCatId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                    {isEditing ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={catForm.display_order}
                            onChange={(e) =>
                              setCatForm((f) => ({ ...f, display_order: Number(e.target.value) }))
                            }
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={catForm.icon_name}
                            onChange={(e) =>
                              setCatForm((f) => ({ ...f, icon_name: e.target.value }))
                            }
                            placeholder={t.t_cat_iconPlaceholder}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={catForm.name_hu}
                            onChange={(e) =>
                              setCatForm((f) => ({ ...f, name_hu: e.target.value }))
                            }
                            placeholder={t.t_cat_namePlaceholder}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={catForm.name_en}
                            onChange={(e) =>
                              setCatForm((f) => ({ ...f, name_en: e.target.value }))
                            }
                            placeholder={t.t_cat_nameEnPlaceholder}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="color"
                            value={catForm.color_hex}
                            onChange={(e) =>
                              setCatForm((f) => ({ ...f, color_hex: e.target.value }))
                            }
                            className="w-10 h-8 rounded cursor-pointer border border-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={catForm.status}
                            onChange={(e) =>
                              setCatForm((f) => ({ ...f, status: e.target.value }))
                            }
                            className={selectCls}
                          >
                            <option value="active">{t.t_cat_statusActive}</option>
                            <option value="draft">{t.t_cat_statusDraft}</option>
                            <option value="deprecated">{t.t_cat_statusDeprecated}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => saveCat(cat)}
                              disabled={loading === cat.id}
                              className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                              {t.t_cat_saveCategory}
                            </button>
                            <button
                              onClick={() => setEditingCatId(null)}
                              className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              {t.t_cat_cancelEdit}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">
                          {cat.display_order}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-slate-600 text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {cat.icon_name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {cat.name_localized?.hu ?? cat.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {cat.name_localized?.en ?? cat.name}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm flex-shrink-0"
                              style={{ background: cat.color_hex }}
                            />
                            <span className="text-xs text-slate-500 font-mono">
                              {cat.color_hex}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{statusBadge(cat.status)}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => startEditCat(cat)}
                            className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                          >
                            {t.t_cat_editCategory}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SUB-DISCIPLINES TAB ──────────────────────────────────────────────── */}
      {activeTab === "subDisciplines" && (
        <div className="flex flex-col gap-4">
          {/* Category selector + Add button */}
          <div className="flex items-center gap-3">
            <select
              value={selectedCatForSd}
              onChange={(e) => {
                setSelectedCatForSd(e.target.value);
                setShowSdForm(false);
              }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white"
            >
              <option value="">{t.t_sd_selectPrompt}</option>
              {initialCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_localized?.hu ?? c.name}
                </option>
              ))}
            </select>
            {selectedCatForSd && (
              <button
                onClick={openAddSd}
                className="px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
              >
                + {t.t_sd_addSubDiscipline}
              </button>
            )}
          </div>

          {/* Inline add/edit form */}
          {showSdForm && selectedCatForSd && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_sd_colNameHu}
                  </label>
                  <input
                    type="text"
                    value={sdForm.name_hu}
                    onChange={(e) => setSdForm((f) => ({ ...f, name_hu: e.target.value }))}
                    placeholder={t.t_sd_namePlaceholder}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_sd_colNameEn}
                  </label>
                  <input
                    type="text"
                    value={sdForm.name_en}
                    onChange={(e) => setSdForm((f) => ({ ...f, name_en: e.target.value }))}
                    placeholder={t.t_sd_nameEnPlaceholder}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_sd_colOrder}
                  </label>
                  <input
                    type="number"
                    value={sdForm.display_order}
                    onChange={(e) =>
                      setSdForm((f) => ({ ...f, display_order: Number(e.target.value) }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_sd_colStatus}
                  </label>
                  <select
                    value={sdForm.status}
                    onChange={(e) => setSdForm((f) => ({ ...f, status: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="active">{t.t_cat_statusActive}</option>
                    <option value="draft">{t.t_cat_statusDraft}</option>
                    <option value="deprecated">{t.t_cat_statusDeprecated}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSdForm(false)}
                  className="px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  {t.t_cat_cancelEdit}
                </button>
                <button
                  onClick={saveSd}
                  disabled={loading === "sd-save"}
                  className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {t.t_sd_saveSubDiscipline}
                </button>
              </div>
            </div>
          )}

          {/* Sub-disciplines table */}
          {selectedCatForSd && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {filteredSds.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {t.t_sd_noSubDisciplines}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                        {t.t_sd_colNameHu}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                        {t.t_sd_colNameEn}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">
                        {t.t_sd_colOrder}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-28">
                        {t.t_sd_colStatus}
                      </th>
                      <th className="px-4 py-2.5 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSds.map((sd) => (
                      <tr key={sd.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {sd.name_localized?.hu ?? sd.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {sd.name_localized?.en ?? sd.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                          {sd.display_order}
                        </td>
                        <td className="px-4 py-2.5">{statusBadge(sd.status)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditSd(sd)}
                              className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                            >
                              {t.t_sd_editSubDiscipline}
                            </button>
                            <button
                              onClick={() => deleteSd(sd.id)}
                              disabled={loading === sd.id}
                              className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {t.t_sd_deleteSubDiscipline}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PARAMETERS TAB ────────────────────────────────────────────────────── */}
      {activeTab === "parameters" && (
        <div className="flex flex-col gap-4">
          {/* Category selector + Add button */}
          <div className="flex items-center gap-3">
            <select
              value={selectedCatForP}
              onChange={(e) => {
                setSelectedCatForP(e.target.value);
                setShowPForm(false);
              }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white"
            >
              <option value="">{t.t_p_selectPrompt}</option>
              {initialCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_localized?.hu ?? c.name}
                </option>
              ))}
            </select>
            {selectedCatForP && (
              <button
                onClick={openAddP}
                className="px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
              >
                + {t.t_p_addParameter}
              </button>
            )}
          </div>

          {/* Inline add/edit form */}
          {showPForm && selectedCatForP && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_p_colKey}
                  </label>
                  <input
                    type="text"
                    value={pForm.parameter_key}
                    onChange={(e) => setPForm((f) => ({ ...f, parameter_key: e.target.value }))}
                    placeholder={t.t_p_keyPlaceholder}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_p_colFieldType}
                  </label>
                  <select
                    value={pForm.field_type}
                    onChange={(e) => setPForm((f) => ({ ...f, field_type: e.target.value }))}
                    className={selectCls}
                  >
                    {[
                      ["text", t.t_p_fieldTypeText],
                      ["number", t.t_p_fieldTypeNumber],
                      ["boolean", t.t_p_fieldTypeBoolean],
                      ["select", t.t_p_fieldTypeSelect],
                      ["multiselect", t.t_p_fieldTypeMultiselect],
                      ["range", t.t_p_fieldTypeRange],
                      ["date", t.t_p_fieldTypeDate],
                      ["textarea", t.t_p_fieldTypeTextarea],
                    ].map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_p_colLabelHu}
                  </label>
                  <input
                    type="text"
                    value={pForm.label_hu}
                    onChange={(e) => setPForm((f) => ({ ...f, label_hu: e.target.value }))}
                    placeholder={t.t_p_labelPlaceholder}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    EN
                  </label>
                  <input
                    type="text"
                    value={pForm.label_en}
                    onChange={(e) => setPForm((f) => ({ ...f, label_en: e.target.value }))}
                    placeholder={t.t_p_labelEnPlaceholder}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_p_colOrder}
                  </label>
                  <input
                    type="number"
                    value={pForm.display_order}
                    onChange={(e) =>
                      setPForm((f) => ({ ...f, display_order: Number(e.target.value) }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {t.t_p_colStatus}
                  </label>
                  <select
                    value={pForm.status}
                    onChange={(e) => setPForm((f) => ({ ...f, status: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="active">{t.t_cat_statusActive}</option>
                    <option value="draft">{t.t_cat_statusDraft}</option>
                    <option value="deprecated">{t.t_cat_statusDeprecated}</option>
                  </select>
                </div>
              </div>
              {/* Checkboxes */}
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pForm.is_required}
                    onChange={(e) => setPForm((f) => ({ ...f, is_required: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  {t.t_p_isRequired}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pForm.is_filterable}
                    onChange={(e) =>
                      setPForm((f) => ({ ...f, is_filterable: e.target.checked }))
                    }
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  {t.t_p_isFilterable}
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPForm(false)}
                  className="px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  {t.t_cat_cancelEdit}
                </button>
                <button
                  onClick={saveP}
                  disabled={loading === "p-save"}
                  className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {t.t_p_saveParameter}
                </button>
              </div>

              {/* ── OPTIONS SECTION (select/multiselect only) ───────────── */}
              {(pForm.field_type === "select" || pForm.field_type === "multiselect") && (
                <div className="mt-4 pt-4 border-t border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {t.t_p_optionsTitle}
                    </h4>
                    {editingPId && (
                      <button
                        onClick={openAddOpt}
                        className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        + {t.t_p_optionsAddOption}
                      </button>
                    )}
                  </div>

                  {!editingPId ? (
                    <p className="text-xs text-slate-500 italic">
                      {t.t_p_optionsSaveFirstHint}
                    </p>
                  ) : optionsLoading ? (
                    <p className="text-xs text-slate-400 animate-pulse">...</p>
                  ) : (
                    <>
                      {/* Add/Edit option form */}
                      {showOptForm && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-1">
                                {t.t_p_optionsValue}
                              </label>
                              <input
                                type="text"
                                value={optForm.value}
                                onChange={(e) => setOptForm((f) => ({ ...f, value: e.target.value }))}
                                placeholder={t.t_p_optionsValuePlaceholder}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-1">
                                {t.t_p_optionsOrder}
                              </label>
                              <input
                                type="number"
                                value={optForm.sort_order}
                                onChange={(e) => setOptForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-1">
                                {t.t_p_optionsLabelHu}
                              </label>
                              <input
                                type="text"
                                value={optForm.label_hu}
                                onChange={(e) => setOptForm((f) => ({ ...f, label_hu: e.target.value }))}
                                placeholder={t.t_p_optionsLabelPlaceholder}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-1">
                                {t.t_p_optionsLabelEn}
                              </label>
                              <input
                                type="text"
                                value={optForm.label_en}
                                onChange={(e) => setOptForm((f) => ({ ...f, label_en: e.target.value }))}
                                placeholder={t.t_p_optionsLabelEnPlaceholder}
                                className={inputCls}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={optForm.is_default}
                                onChange={(e) => setOptForm((f) => ({ ...f, is_default: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded accent-emerald-500"
                              />
                              {t.t_p_optionsIsDefault}
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowOptForm(false)}
                                className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
                              >
                                {t.t_cat_cancelEdit}
                              </button>
                              <button
                                onClick={saveOpt}
                                disabled={loading === "opt-save"}
                                className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                              >
                                {t.t_p_optionsSave}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Options list */}
                      {options.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          {t.t_p_optionsNoOptions}
                        </p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-2.5 py-1.5 font-medium text-slate-500 uppercase tracking-wider">
                                  {t.t_p_optionsValue}
                                </th>
                                <th className="text-left px-2.5 py-1.5 font-medium text-slate-500 uppercase tracking-wider">
                                  {t.t_p_optionsLabelHu}
                                </th>
                                <th className="text-left px-2.5 py-1.5 font-medium text-slate-500 uppercase tracking-wider">
                                  {t.t_p_optionsLabelEn}
                                </th>
                                <th className="text-left px-2.5 py-1.5 font-medium text-slate-500 uppercase tracking-wider w-12">
                                  #
                                </th>
                                <th className="px-2.5 py-1.5 w-20" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {options.map((opt) => (
                                <tr key={opt.id} className="hover:bg-slate-50/50">
                                  <td className="px-2.5 py-1.5">
                                    <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                                      {opt.value}
                                    </span>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-700">
                                    {opt.label_localized?.hu ?? opt.label}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-500">
                                    {opt.label_localized?.en ?? opt.label}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-400">
                                    {opt.sort_order}
                                    {opt.is_default && (
                                      <span className="ml-1 text-emerald-500" title={t.t_p_optionsIsDefault}>★</span>
                                    )}
                                  </td>
                                  <td className="px-2.5 py-1.5">
                                    <div className="flex gap-1 justify-end">
                                      <button
                                        onClick={() => openEditOpt(opt)}
                                        className="px-1.5 py-0.5 text-[10px] border border-slate-200 text-slate-600 rounded hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                                      >
                                        {t.t_p_editParameter}
                                      </button>
                                      <button
                                        onClick={() => deleteOpt(opt.id)}
                                        disabled={loading === opt.id}
                                        className="px-1.5 py-0.5 text-[10px] border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                                      >
                                        {t.t_p_optionsDelete}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parameters table */}
          {selectedCatForP && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {filteredPs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {t.t_p_noParameters}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                        {t.t_p_colKey}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                        {t.t_p_colLabelHu}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-28">
                        {t.t_p_colFieldType}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">
                        {t.t_p_colRequired}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-16">
                        {t.t_p_colOrder}
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-24">
                        {t.t_p_colStatus}
                      </th>
                      <th className="px-4 py-2.5 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPs.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {p.parameter_key}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-800">
                          {p.label_localized?.hu ?? p.label}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                          {fieldTypeLabel(p.field_type)}
                          {(p.field_type === "select" || p.field_type === "multiselect") && (
                            <span className="ml-1 text-emerald-600 font-medium">
                              ({t.t_p_optionsCount.replace("{count}", String(p.options_count ?? 0))})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {p.is_required ? (
                            <span className="text-emerald-600 font-medium">✓</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                          {p.display_order}
                        </td>
                        <td className="px-4 py-2.5">{statusBadge(p.status)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditP(p)}
                              className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                            >
                              {t.t_p_editParameter}
                            </button>
                            <button
                              onClick={() => deleteP(p.id)}
                              disabled={loading === p.id}
                              className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {t.t_p_deleteParameter}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
