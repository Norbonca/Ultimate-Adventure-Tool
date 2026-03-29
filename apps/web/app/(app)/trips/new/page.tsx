import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WizardForm } from "./wizard-form";
import { fetchCategories, fetchCountries } from "../actions";
import { AppHeader } from "@/components/AppHeader";

export default async function NewTripPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pre-fetch categories and countries for the wizard
  const [categories, countries] = await Promise.all([
    fetchCategories(),
    fetchCountries(),
  ]);

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Wizard Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <WizardForm
          categories={categories}
          countries={countries}
          userId={user.id}
        />
      </div>
    </main>
  );
}
