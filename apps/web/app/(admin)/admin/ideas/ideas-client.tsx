"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { moderateIdea, type AdminIdeaRow } from "../actions";

export function AdminIdeasClient({ ideas: initial }: { ideas: AdminIdeaRow[] }) {
  const { t: tt } = useTranslation();
  const t = tt as (k: string, p?: Record<string, string | number>) => string;
  const [ideas, setIdeas] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, decision: "restore" | "remove") => {
    setBusy(id);
    setError(null);
    const res = await moderateIdea(id, decision);
    if (res.success) setIdeas((xs) => xs.filter((x) => x.id !== id));
    else setError(res.error ?? t("admin.ideas.error"));
    setBusy(null);
  };

  if (ideas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500" data-testid="admin-ideas-empty">
        {t("admin.ideas.empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="admin-ideas-list">
      {error && <p className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">{error}</p>}
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">{t("admin.ideas.colIdea")}</th>
            <th className="px-5 py-3">{t("admin.ideas.colOwner")}</th>
            <th className="px-5 py-3">{t("admin.ideas.colReports")}</th>
            <th className="px-5 py-3">{t("admin.ideas.colMembers")}</th>
            <th className="px-5 py-3 text-right">{t("admin.ideas.colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea) => (
            <tr key={idea.id} className="border-t border-slate-100">
              <td className="px-5 py-3">
                <Link href={`/ideas/${idea.slug}`} className="font-semibold text-slate-900 hover:underline" target="_blank" rel="noreferrer">
                  {idea.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">{idea.reasons.join(", ")}</p>
              </td>
              <td className="px-5 py-3 text-slate-700">{idea.owner_name ?? "—"}</td>
              <td className="px-5 py-3 text-slate-700">{idea.report_count}</td>
              <td className="px-5 py-3 text-slate-700">{idea.member_count}</td>
              <td className="px-5 py-3 text-right">
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    disabled={busy === idea.id}
                    onClick={() => act(idea.id, "restore")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t("admin.ideas.restore")}
                  </button>
                  <button
                    type="button"
                    disabled={busy === idea.id}
                    onClick={() => act(idea.id, "remove")}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {t("admin.ideas.remove")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
