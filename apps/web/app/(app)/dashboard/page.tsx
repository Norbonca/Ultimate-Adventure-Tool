import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white/95 border-b border-navy-200 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-trevu-600 text-white flex items-center justify-center font-bold text-sm shadow-trevu-sm">
                T
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-trevu-600">Tre</span>
                <span className="text-navy-900">vu</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-navy-500">{user.email}</span>
            <Link
              href="/profile"
              className="h-9 w-9 rounded-full bg-trevu-600 text-white flex items-center justify-center font-semibold text-xs hover:bg-trevu-700 transition-colors"
              title="Profil"
            >
              {(user.user_metadata?.full_name || user.email || "U")
                .charAt(0)
                .toUpperCase()}
            </Link>
            <form action="/api/v1/auth/signout" method="POST">
              <button className="text-sm text-navy-400 hover:text-navy-700 transition-colors">
                Kijelentkezés
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">
          Üdvözlünk, {user.user_metadata?.full_name || "Kalandor"}!
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Quick Action Cards */}
          <Link
            href="/trips"
            className="p-6 bg-white rounded-2xl border border-navy-200 hover:border-trevu-400 hover:shadow-trevu-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-trevu-50 flex items-center justify-center mb-4">
              <span className="text-2xl">🏔️</span>
            </div>
            <h3 className="font-semibold text-navy-900 group-hover:text-trevu-600 transition-colors">
              Túráim
            </h3>
            <p className="text-sm text-navy-500 mt-1">
              Meglévő túrák kezelése
            </p>
          </Link>

          <Link
            href="/trips/new"
            className="p-6 bg-white rounded-2xl border border-navy-200 hover:border-trevu-400 hover:shadow-trevu-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-trevu-50 flex items-center justify-center mb-4">
              <span className="text-2xl">➕</span>
            </div>
            <h3 className="font-semibold text-navy-900 group-hover:text-trevu-600 transition-colors">
              Új túra
            </h3>
            <p className="text-sm text-navy-500 mt-1">
              Hozz létre egy új kalandot
            </p>
          </Link>

          <div className="p-6 bg-white rounded-2xl border border-navy-200 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-navy-900">Költségek</h3>
            <p className="text-sm text-navy-500 mt-1">
              Hamarosan elérhető
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-navy-200 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center mb-4">
              <span className="text-2xl">🧭</span>
            </div>
            <h3 className="font-semibold text-navy-900">Túravezetők</h3>
            <p className="text-sm text-navy-500 mt-1">
              Hamarosan elérhető
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="p-4 rounded-xl bg-trevu-50 border border-trevu-200">
          <p className="text-sm text-trevu-800">
            <span className="font-semibold">Rendszer státusz:</span>{" "}
            MVP infrastruktúra aktív — M01 User Management + M02 Trip Wizard beüzemelve
          </p>
        </div>
      </div>
    </main>
  );
}
