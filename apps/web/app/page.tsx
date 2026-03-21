import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="text-center max-w-2xl mx-auto px-4">
        {/* Logo placeholder */}
        <div className="mb-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-adventure-forest text-white text-3xl font-bold">
            UAT
          </div>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Ultimate Adventure Tool
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Tervezd meg a tökéletes kalandot. Szervezz túrákat, oszd meg a
          költségeket, és találj helyi túravezetőket.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="rounded-lg bg-adventure-forest px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
          >
            Regisztráció
          </Link>
          <Link
            href="/login"
            className="rounded-lg border-2 border-adventure-forest px-6 py-3 text-adventure-forest font-semibold hover:bg-green-50 transition-colors"
          >
            Bejelentkezés
          </Link>
        </div>

        {/* Státusz */}
        <div className="mt-16 p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-800">
            <span className="font-semibold">MVP Státusz:</span> Infrastruktúra
            beüzemelve — Supabase + Vercel + Next.js
          </p>
        </div>
      </div>
    </main>
  );
}
