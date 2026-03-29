"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { banUser, unbanUser, type AdminUser } from "../actions";

interface AdminUsersClientProps {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  plan: string;
  locale: string;
  // Pre-translated strings (server passes these to avoid client-side t() on server data)
  t_users_title: string;
  t_search_placeholder: string;
  t_filter_status: string;
  t_filter_plan: string;
  t_col_user: string;
  t_col_status: string;
  t_col_plan: string;
  t_col_registered: string;
  t_col_trips: string;
  t_col_revenue: string;
  t_view_details: string;
  t_ban_user: string;
  t_unban_user: string;
  t_status_active: string;
  t_status_banned: string;
  t_plan_free: string;
  t_plan_pro: string;
  t_plan_business: string;
  t_showing_of: string;
  t_no_results: string;
  t_ban_title: string;
  t_ban_reason: string;
  t_ban_reason_placeholder: string;
  t_ban_duration: string;
  t_ban_1day: string;
  t_ban_7days: string;
  t_ban_30days: string;
  t_ban_permanent: string;
  t_ban_confirm: string;
  t_ban_success: string;
  t_unban_success: string;
  t_cancel: string;
}

export function AdminUsersClient({
  users,
  total,
  page,
  totalPages,
  search: initialSearch,
  status: initialStatus,
  plan: initialPlan,
  locale,
  ...t
}: AdminUsersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [banModal, setBanModal] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"1d" | "7d" | "30d" | "permanent">("7d");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const applyFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set(key, value);
      else params.delete(key);
      params.set("page", "1");
      router.push(`/admin/users?${params.toString()}`);
    },
    [router]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter("search", search);
  };

  const handleBan = async () => {
    if (!banModal || !banReason.trim()) return;
    setActionLoading(banModal.id);
    const res = await banUser(banModal.id, banReason, banDuration);
    setActionLoading(null);
    if (res.success) {
      showToast(t.t_ban_success);
      setBanModal(null);
      setBanReason("");
      router.refresh();
    }
  };

  const handleUnban = async (userId: string) => {
    setActionLoading(userId);
    const res = await unbanUser(userId);
    setActionLoading(null);
    if (res.success) {
      showToast(t.t_unban_success);
      router.refresh();
    }
  };

  const planLabel = (tier: string | null) => {
    if (tier === "pro") return t.t_plan_pro;
    if (tier === "business") return t.t_plan_business;
    return t.t_plan_free;
  };

  const planColor = (tier: string | null) => {
    if (tier === "pro") return "bg-violet-100 text-violet-700";
    if (tier === "business") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  const userName = (u: AdminUser) =>
    u.display_name ||
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.email ||
    u.id.slice(0, 8);

  const userInitials = (u: AdminUser) => {
    const name = userName(u);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-48 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.t_search_placeholder}
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 bg-slate-50"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
          >
            🔍
          </button>
        </form>

        <select
          defaultValue={initialStatus}
          onChange={(e) => applyFilter("status", e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:border-emerald-400"
        >
          <option value="">{t.t_filter_status}</option>
          <option value="active">{t.t_status_active}</option>
          <option value="banned">{t.t_status_banned}</option>
        </select>

        <select
          defaultValue={initialPlan}
          onChange={(e) => applyFilter("plan", e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:border-emerald-400"
        >
          <option value="">{t.t_filter_plan}</option>
          <option value="free">{t.t_plan_free}</option>
          <option value="pro">{t.t_plan_pro}</option>
          <option value="business">{t.t_plan_business}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_user}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_status}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_plan}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_registered}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_trips}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {t.t_no_results}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* User cell */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
                        {userInitials(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {userName(user)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {user.id.slice(0, 12)}…
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.is_banned
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {user.is_banned ? t.t_status_banned : t.t_status_active}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${planColor(user.subscription_tier)}`}
                    >
                      {planLabel(user.subscription_tier)}
                    </span>
                  </td>

                  {/* Registered */}
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(user.created_at))}
                  </td>

                  {/* Trips */}
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {user.trip_count}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                      >
                        {t.t_view_details}
                      </Link>
                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          disabled={actionLoading === user.id}
                          className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {t.t_unban_user}
                        </button>
                      ) : (
                        <button
                          onClick={() => setBanModal(user)}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {t.t_ban_user}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {t.t_showing_of
                .replace("{shown}", String(users.length))
                .replace("{total}", String(total))}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/users?page=${p}`}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs ${
                    p === page
                      ? "bg-emerald-500 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {t.t_ban_title}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {userName(banModal)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.t_ban_reason}
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder={t.t_ban_reason_placeholder}
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.t_ban_duration}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { value: "1d", label: t.t_ban_1day },
                      { value: "7d", label: t.t_ban_7days },
                      { value: "30d", label: t.t_ban_30days },
                      { value: "permanent", label: t.t_ban_permanent },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBanDuration(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        banDuration === opt.value
                          ? "bg-red-500 text-white border-red-500"
                          : "border-slate-200 text-slate-600 hover:border-red-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setBanModal(null); setBanReason(""); }}
                className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {t.t_cancel}
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || actionLoading !== null}
                className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "..." : t.t_ban_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
