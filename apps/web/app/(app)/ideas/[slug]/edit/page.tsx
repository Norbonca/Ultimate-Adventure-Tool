/**
 * M22 — ötlet szerkesztése `/ideas/[slug]/edit` (FR-M22-011 1.). Csak az ötletgazda.
 */

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { IdeaForm } from "@/components/ideas/IdeaForm";
import { getIdeaBySlug } from "@/lib/ideas/queries";
import { fetchCategories, fetchCountries } from "../../../trips/actions";

interface Props { params: Promise<{ slug: string }> }

export default async function EditIdeaPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/ideas/${slug}/edit`)}`);
  const idea = await getIdeaBySlug(slug);
  if (!idea || idea.owner_id !== user.id) notFound();
  const { t } = await getServerT();
  const [categories, countries, currenciesRes] = await Promise.all([fetchCategories(), fetchCountries(), supabase.from("ref_currencies").select("code").eq("is_active", true).order("sort_order")]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div data-surface="night" className="contents"><AppHeader user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }} /></div>
      <div className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl font-extrabold text-navy-900">{t("ideas.form.editTitle")}</h1>
        <p className="mt-1 mb-6 text-sm text-navy-500">{t("ideas.form.editSubtitle")}</p>
        <IdeaForm
          mode="edit"
          categories={categories.map((c) => ({ id: c.id, name: c.name, name_localized: c.name_localized as Record<string, string> | null, icon_name: c.icon_name }))}
          countries={countries}
          currencies={(currenciesRes.data ?? []) as { code: string }[]}
          initial={{ ...idea, budget_amount: idea.budget_amount ? Number(idea.budget_amount) : null }}
        />
      </div>
    </main>
  );
}
