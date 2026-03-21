import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F8FAFC] via-[#E6F7F5] to-[#CCEFEB]">
      <div className="text-center max-w-2xl mx-auto px-4">
        {/* Trevu Logo */}
        <div className="mb-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-trevu-600 text-white text-3xl font-bold shadow-trevu">
            T
          </div>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-navy-900 mb-4" style={{ letterSpacing: "-1px" }}>
          <span className="text-trevu-600">Tre</span>
          <span className="text-navy-900">vu</span>
        </h1>
        <p className="text-xl text-navy-600 mb-2 font-medium">
          Trek Beyond Ordinary
        </p>
        <p className="text-lg text-navy-500 mb-8">
          Fedezd fel, tervezd meg és oszd meg a felejthetetlen kalandjaidat.
          Túrák, mászások, vitorlázások és még sok más.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="rounded-xl bg-trevu-600 px-8 py-3 text-white font-semibold hover:bg-trevu-700 transition-colors shadow-trevu"
          >
            Regisztráció
          </Link>
          <Link
            href="/login"
            className="rounded-xl border-2 border-navy-200 px-8 py-3 text-navy-900 font-semibold hover:border-navy-400 transition-colors"
          >
            Bejelentkezés
          </Link>
        </div>

        {/* Discover link */}
        <div className="mt-6">
          <Link
            href="/discover"
            className="text-trevu-600 font-semibold hover:text-trevu-700 transition-colors text-sm"
          >
            Fedezd fel a kalandokat →
          </Link>
        </div>

        {/* Status */}
        <div className="mt-16 p-4 rounded-xl bg-trevu-50 border border-trevu-200">
          <p className="text-sm text-trevu-800">
            <span className="font-semibold">Státusz:</span> Infrastruktúra
            beüzemelve — Supabase + Vercel + Next.js
          </p>
        </div>
      </div>
    </main>
  );
}
