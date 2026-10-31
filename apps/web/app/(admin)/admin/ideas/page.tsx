/**
 * M22 — Ötletbörze moderáció `/admin/ideas` (FR-M22-013, BR-M22-009). V1 minimum: a jelentési küszöböt
 * elért (under_review) ötletek listája, visszaállítás vagy eltávolítás. Admin-kliens (RLS-mentes), audit log.
 */

import { getServerT } from "@/lib/i18n/server";
import { getIdeasUnderReview } from "../actions";
import { AdminIdeasClient } from "./ideas-client";

export default async function AdminIdeasPage() {
  const { t } = await getServerT();
  const ideas = await getIdeasUnderReview();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.ideas.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("admin.ideas.subtitle")}</p>
      </div>
      <AdminIdeasClient ideas={ideas} />
    </div>
  );
}
