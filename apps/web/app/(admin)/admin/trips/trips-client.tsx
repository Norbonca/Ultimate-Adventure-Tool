"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTripStatus, type AdminTrip } from "../actions";

interface TabLabel {
  key: string;
  label: string;
  count: number;
}

interface AdminTripsClientProps {
  trips: AdminTrip[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  locale: string;
  tabLabels: TabLabel[];
  t_search_placeholder: string;
  t_col_trip: string;
  t_col_organizer: string;
  t_col_category: string;
  t_col_difficulty: string;
  t_col_status: string;
  t_col_dates: string;
  t_col_participants: string;
  t_view_trip: string;
  t_approve: string;
  t_flag: string;
  t_cancel: string;
  t_status_active: string;
  t_status_draft: string;
  t_status_published: string;
  t_status_cancelled: string;
  t_status_completed: string;
  t_showing_of: string;
  t_no_results: string;
}

export function AdminTripsClient({
  trips,
  total,
  page,
  totalPages,
  search: initialSearch,
  status: activeTab,
  locale,
  tabLabels,
  ...t
}: AdminTripsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
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
      router.push(`/admin/trips?${params.toString()}`);
    },
    [router]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter("search", search);
  };

  const handleStatusChange = async (
    tripId: string,
    newStatus: "published" | "cancelled" | "draft"
  ) => {
    setActionLoading(tripId);
    const res = await updateTripStatus(tripId, newStatus);
    setActionLoading(null);
    if (res.success) {
      showToast(`Státusz frissítve: ${newStatus}`);
      router.refresh();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      published: { label: t.t_status_published, cls: "bg-emerald-100 text-emerald-700" },
      active: { label: t.t_status_active, cls: "bg-blue-100 text-blue-700" },
      draft: { label: t.t_status_draft, cls: "bg-yellow-100 text-yellow-700" },
      cancelled: { label: t.t_status_cancelled, cls: "bg-red-100 text-red-700" },
      completed: { label: t.t_status_completed, cls: "bg-slate-100 text-slate-600" },
    };
    const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", {
      month: "short",
      day: "numeric",
    }).format(new Date(d));
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabLabels.map((tab) => (
          <button
            key={tab.key}
            onClick={() => applyFilter("status", tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-emerald-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-500"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_trip}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_organizer}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_category}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_status}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_dates}
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                {t.t_col_participants}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  {t.t_no_results}
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Trip */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 truncate max-w-48">
                        {trip.title}
                      </p>
                      {trip.location_city && (
                        <p className="text-xs text-slate-400 truncate">
                          📍 {trip.location_city}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Organizer */}
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {trip.organizer_name ?? "—"}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {trip.category_id ?? "—"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">{statusBadge(trip.status)}</td>

                  {/* Dates */}
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                  </td>

                  {/* Participants */}
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {trip.current_participants}
                    {trip.max_participants ? ` / ${trip.max_participants}` : ""}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/trips/${trip.slug}`}
                        target="_blank"
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                      >
                        {t.t_view_trip}
                      </Link>
                      {trip.status === "draft" && (
                        <button
                          onClick={() => handleStatusChange(trip.id, "published")}
                          disabled={actionLoading === trip.id}
                          className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {t.t_approve}
                        </button>
                      )}
                      {trip.status !== "cancelled" && trip.status !== "completed" && (
                        <button
                          onClick={() => handleStatusChange(trip.id, "cancelled")}
                          disabled={actionLoading === trip.id}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {t.t_cancel}
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
                .replace("{shown}", String(trips.length))
                .replace("{total}", String(total))}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/trips?page=${p}&status=${activeTab}`}
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
    </>
  );
}
