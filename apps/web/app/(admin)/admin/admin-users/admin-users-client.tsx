"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  grantAdmin,
  revokeAdmin,
  updateAdminRole,
  type AdminRoleEntry,
} from "./actions";

interface AdminUsersClientProps {
  admins: AdminRoleEntry[];
  currentUserId: string;
  t_colUser: string;
  t_colRole: string;
  t_colStatus: string;
  t_colActions: string;
  t_addAdmin: string;
  t_revokeAdmin: string;
  t_revokeConfirm: string;
  t_addTitle: string;
  t_emailLabel: string;
  t_emailPlaceholder: string;
  t_roleLabel: string;
  t_notesLabel: string;
  t_notesPlaceholder: string;
  t_addConfirm: string;
  t_roleSuper: string;
  t_roleOperations: string;
  t_roleContent: string;
  t_roleSupport: string;
  t_roleFinance: string;
  t_statusActive: string;
  t_statusRevoked: string;
  t_userNotFound: string;
  t_addSuccess: string;
  t_revokeSuccess: string;
  t_alreadyAdmin: string;
  t_noAdmins: string;
  t_saveRole: string;
  t_editRole: string;
  t_lastAdminError: string;
  t_cancel: string;
}

export function AdminUsersClient({
  admins,
  currentUserId,
  ...t
}: AdminUsersClientProps) {
  const router = useRouter();

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "operations_admin", notes: "" });
  const [addError, setAddError] = useState<string | null>(null);

  // Edit role state — key: adminRoleId
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: "", notes: "" });

  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  const roleOptions: [string, string][] = [
    ["super_admin", t.t_roleSuper],
    ["operations_admin", t.t_roleOperations],
    ["content_moderator", t.t_roleContent],
    ["support_agent", t.t_roleSupport],
    ["finance_admin", t.t_roleFinance],
  ];

  const roleLabel = (role: string) =>
    roleOptions.find(([v]) => v === role)?.[1] ?? role;

  const roleBadgeCls = (role: string) => {
    const map: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-700",
      operations_admin: "bg-blue-100 text-blue-700",
      content_moderator: "bg-amber-100 text-amber-700",
      support_agent: "bg-sky-100 text-sky-700",
      finance_admin: "bg-emerald-100 text-emerald-700",
    };
    return map[role] ?? "bg-slate-100 text-slate-600";
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setLoading("add");
    const res = await grantAdmin(addForm);
    setLoading(null);
    if (res.success) {
      setShowAddForm(false);
      setAddForm({ email: "", role: "operations_admin", notes: "" });
      showToast(t.t_addSuccess);
      refresh();
    } else {
      const key = res.error ?? "";
      setAddError(
        key === "userNotFound" ? t.t_userNotFound
        : key === "alreadyAdmin" ? t.t_alreadyAdmin
        : key
      );
    }
  };

  const startEdit = (admin: AdminRoleEntry) => {
    setEditingId(admin.id);
    setEditForm({ role: admin.role, notes: admin.notes ?? "" });
  };

  const handleSaveRole = async (adminRoleId: string) => {
    setLoading(adminRoleId);
    const res = await updateAdminRole(adminRoleId, editForm.role, editForm.notes);
    setLoading(null);
    if (res.success) {
      setEditingId(null);
      showToast(t.t_addSuccess);
      refresh();
    } else {
      showToast(res.error ?? "Error", false);
    }
  };

  const handleRevoke = async (adminRoleId: string) => {
    if (!confirm(t.t_revokeConfirm)) return;
    setLoading(adminRoleId);
    const res = await revokeAdmin(adminRoleId);
    setLoading(null);
    if (res.success) {
      showToast(t.t_revokeSuccess);
      refresh();
    } else {
      const key = res.error ?? "";
      showToast(key === "lastAdmin" ? t.t_lastAdminError : key, false);
    }
  };

  const inputCls =
    "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white";

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

      {/* Header row */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => { setShowAddForm(true); setAddError(null); }}
          className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          + {t.t_addAdmin}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">{t.t_addTitle}</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  {t.t_emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t.t_emailPlaceholder}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  {t.t_roleLabel}
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  className={inputCls}
                >
                  {roleOptions.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                {t.t_notesLabel}
              </label>
              <textarea
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t.t_notesPlaceholder}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {addError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {t.t_cancel}
              </button>
              <button
                type="submit"
                disabled={loading === "add"}
                className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {t.t_addConfirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {admins.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">{t.t_noAdmins}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  {t.t_colUser}
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider w-56">
                  {t.t_colRole}
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider w-28">
                  {t.t_colStatus}
                </th>
                <th className="px-4 py-3 w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin) => {
                const isSelf = admin.user_id === currentUserId;
                const isEditing = editingId === admin.id;

                return (
                  <tr
                    key={admin.id}
                    className={`transition-colors ${
                      isSelf ? "bg-emerald-50/40" : "hover:bg-slate-50/50"
                    }`}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelf
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {(admin.display_name ?? admin.email)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 flex items-center gap-1.5">
                            {admin.display_name ?? admin.email}
                            {isSelf && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                                te
                              </span>
                            )}
                          </p>
                          {admin.display_name && (
                            <p className="text-xs text-slate-400">{admin.email}</p>
                          )}
                          {admin.notes && !isEditing && (
                            <p className="text-xs text-slate-400 italic mt-0.5">{admin.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role — editable */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                            className="w-full text-xs border border-emerald-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 bg-white"
                          >
                            {roleOptions.map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                            placeholder={t.t_notesPlaceholder}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400 bg-white"
                          />
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeCls(admin.role)}`}
                        >
                          {roleLabel(admin.role)}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {admin.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          {t.t_statusActive}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                          {t.t_statusRevoked}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveRole(admin.id)}
                              disabled={loading === admin.id}
                              className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                              {t.t_saveRole}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              {t.t_cancel}
                            </button>
                          </>
                        ) : (
                          <>
                            {admin.is_active && (
                              <button
                                onClick={() => startEdit(admin)}
                                className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                              >
                                {t.t_editRole}
                              </button>
                            )}
                            {admin.is_active && !isSelf && (
                              <button
                                onClick={() => handleRevoke(admin.id)}
                                disabled={loading === admin.id}
                                className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                {t.t_revokeAdmin}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
