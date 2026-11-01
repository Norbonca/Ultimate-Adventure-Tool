/**
 * Admin · Árfolyamok `/admin/fx` (rendszerspec §14.9, D15 yuhwh) — Day felület, mint a többi admin oldal.
 */
import { getServerT } from "@/lib/i18n/server";
import { fetchFxAdminData } from "./actions";
import { FxAdminClient } from "./fx-admin-client";

export default async function AdminFxPage() {
  const { t, locale } = await getServerT();
  const data = await fetchFxAdminData();
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-900">{t("admin.fx.title")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">{t("admin.fx.lead")}</p>
      <FxAdminClient data={data} locale={locale} />
    </div>
  );
}
