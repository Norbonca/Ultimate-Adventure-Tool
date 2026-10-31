import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WizardForm } from "./wizard-form";
import { fetchCategories, fetchCountries } from "../actions";
import { AppHeader } from "@/components/AppHeader";
import { getIdeaById } from "@/lib/ideas/queries";
import type { WizardFromIdea } from "./wizard-form";

interface NewTripPageProps { searchParams: Promise<{ idea?: string }> }

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const { idea: ideaParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pre-fetch categories and countries for the wizard
  const [categories, countries, idea] = await Promise.all([
    fetchCategories(),
    fetchCountries(),
    ideaParam && /^[0-9a-f-]{36}$/i.test(ideaParam) ? getIdeaById(ideaParam) : Promise.resolve(null),
  ]);

  // M22 FR-M22-008: előtöltés az ötletből (mind szerkeszthető); a dátumok üresek
  let fromIdea: WizardFromIdea | null = null;
  if (idea) {
    const cat = categories.find((c) => c.id === idea.category_id);
    const first = idea.destinations[0];
    fromIdea = {
      id: idea.id, slug: idea.slug, title: idea.title, memberCount: idea.member_count, partySizeTotal: idea.party_size_total,
      prefill: {
        category_id: idea.category_id, category_name: cat?.name ?? "", sub_discipline_id: idea.sub_discipline_id ?? "",
        title: idea.title, description: idea.description ?? "",
        location_country: first?.country_codes[0] ?? "", location_region: first?.name ?? "",
        ...(idea.difficulty ? { difficulty: idea.difficulty } : {}),
        ...(idea.group_size_max ? { max_participants: idea.group_size_max } : {}),
        ...(idea.group_size_min ? { min_participants: idea.group_size_min } : {}),
        ...(idea.budget_currency ? { price_currency: idea.budget_currency } : {}),
      },
    };
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Wizard Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <WizardForm
          categories={categories}
          countries={countries}
          userId={user.id}
          fromIdea={fromIdea}
        />
      </div>
    </main>
  );
}
