import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WizardForm } from "./wizard-form";
import { fetchCategories, fetchCountries } from "../actions";
import Link from "next/link";

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
      {/* Header */}
      <header className="bg-white/95 border-b border-navy-200 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-trevu-600 text-white flex items-center justify-center font-bold text-sm shadow-trevu-sm">
                T
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-trevu-600">Tre</span>
                <span className="text-navy-900">vu</span>
              </span>
            </Link>
            <span className="text-navy-300 mx-2">/</span>
            <span className="text-sm font-medium text-navy-600">
              Új túra létrehozása
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-navy-400 hover:text-navy-700 transition-colors"
          >
            Mégsem
          </Link>
        </div>
      </header>

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
