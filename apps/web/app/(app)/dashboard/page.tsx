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
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm">
              UAT
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              Ultimate Adventure Tool
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Link
              href="/profile"
              className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-xs hover:bg-green-800 transition-colors"
              title="Profil"
            >
              {(user.user_metadata?.full_name || user.email || "U")
                .charAt(0)
                .toUpperCase()}
            </Link>
            <form action="/api/v1/auth/signout" method="POST">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                Kijelentkezés
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Üdvözlünk, {user.user_metadata?.full_name || "Kalandor"}!
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Quick Action Cards */}
          <Link
            href="/trips"
            className="p-6 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">🏔️</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-adventure-forest">
              Túráim
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Meglévő túrák kezelése
            </p>
          </Link>

          <Link
            href="/trips"
            className="p-6 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">➕</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-adventure-forest">
              Új túra
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Hozz létre egy új kalandot
            </p>
          </Link>

          <div className="p-6 bg-white rounded-xl border border-gray-200 opacity-60">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-900">Költségek</h3>
            <p className="text-sm text-gray-500 mt-1">
              Hamarosan elérhető
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 opacity-60">
            <div className="text-3xl mb-3">🧭</div>
            <h3 className="font-semibold text-gray-900">Túravezetők</h3>
            <p className="text-sm text-gray-500 mt-1">
              Hamarosan elérhető
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Rendszer státusz:</span>{" "}
            MVP infrastruktúra aktív — M01 User Management beüzemelve
          </p>
        </div>
      </div>
    </main>
  );
}
