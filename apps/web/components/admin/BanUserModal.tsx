"use client";

import { useState } from "react";

export type BanDuration = "1d" | "7d" | "30d" | "permanent";

export interface BanUserModalLabels {
  title: string;
  reason: string;
  reasonPlaceholder: string;
  duration: string;
  day1: string;
  days7: string;
  days30: string;
  permanent: string;
  confirm: string;
  cancel: string;
}

interface BanUserModalProps {
  userName: string;
  loading: boolean;
  labels: BanUserModalLabels;
  onCancel: () => void;
  onConfirm: (reason: string, duration: BanDuration) => void;
}

/** The admin ban dialog, shared by the user list and the user detail page. */
export function BanUserModal({ userName, loading, labels, onCancel, onConfirm }: BanUserModalProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<BanDuration>("7d");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div role="dialog" aria-modal="true" aria-labelledby="ban-user-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 id="ban-user-title" className="text-lg font-semibold text-slate-900 mb-1">
          {labels.title}
        </h3>
        <p className="text-sm text-slate-500 mb-4">{userName}</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="ban-reason" className="block text-sm font-medium text-slate-700 mb-1">
              {labels.reason}
            </label>
            <textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={labels.reasonPlaceholder}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">{labels.duration}</span>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { value: "1d", label: labels.day1 },
                  { value: "7d", label: labels.days7 },
                  { value: "30d", label: labels.days30 },
                  { value: "permanent", label: labels.permanent },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    duration === opt.value
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
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim(), duration)}
            disabled={!reason.trim() || loading}
            className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
