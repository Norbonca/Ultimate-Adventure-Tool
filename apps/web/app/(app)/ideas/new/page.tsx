/**
 * M22 — ötlet beküldése `/ideas/new` (FR-M22-001). Design: D22 `sGfJS`. Bejelentkezés kell (FR-M22-006:
 * a kitöltött adatok a böngésző munkamenetében maradnak — a visszatérési cél belső útvonal).
 * Előtöltés a Felfedezés szűrőiből: ?category=&country=&month=&endMonth=&via=discover_empty
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { IdeaForm } from "@/components/ideas/IdeaForm";
import { fetchCategories, fetchCountries } from "../../trips/actions";

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NewIdeaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v ? [[k, one(v)]] : []))).toString();
    redirect(`/login?redirect=${encodeURIComponent(`/ideas/new${q ? `?${q}` : ""}`)}`);
  }
  const { t } = await getServerT();
  const [categories, countries, currenciesRes] = await Promise.all([fetchCategories(), fetchCountries(), supabase.from("ref_currencies").select("code").eq("is_active", true).order("sort_order")]);
  const country = one(sp.country).toUpperCase();
  const month = Number(one(sp.month)) || undefined;
  const endMonth = Number(one(sp.endMonth)) || month;

  return (
    <main className="min-h-screen bg-slate-50">
      <div data-surface="night" className="contents"><AppHeader user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }} /></div>
      <div className="mx-auto max-w-3xl px-5 py-8">
        <span className="inline-flex items-center gap-1.5 rounded-chip bg-trevu-50 px-2.5 py-1 text-xs font-semibold text-trevu-700"><Icon name="lightbulb" size={14} aria-hidden />{t("ideas.form.badge")}</span>
        <h1 className="mt-3 text-3xl font-extrabold text-navy-900">{t("ideas.form.newTitle")}</h1>
        <p className="mt-1 mb-6 text-sm text-navy-500">{t("ideas.form.newSubtitle")}</p>
        <IdeaForm
          mode="create"
          categories={categories.map((c) => ({ id: c.id, name: c.name, name_localized: c.name_localized as Record<string, string> | null, icon_name: c.icon_name }))}
          countries={countries}
          currencies={(currenciesRes.data ?? []) as { code: string }[]}
          initial={{
            category_id: one(sp.category) || undefined,
            destinations: country ? [{ name: one(sp.place) || "", continent: null, country_codes: [country] }] : undefined,
            window_start_month: month,
            window_end_month: endMonth,
            created_via: one(sp.via) === "discover_empty" ? "discover_empty" : "form",
          }}
        />
      </div>
    </main>
  );
}
