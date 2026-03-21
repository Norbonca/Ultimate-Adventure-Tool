"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="w-full max-w-md mx-auto p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-green-500 text-white text-xl mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email elküldve!</h1>
          <p className="text-gray-600">
            Ellenőrizd az email fiókodat és kattints a megerősítő linkre.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-adventure-forest text-white text-xl font-bold mb-4">
            UAT
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Regisztráció</h1>
          <p className="text-gray-600 mt-1">
            Csatlakozz az Ultimate Adventure Tool közösségéhez
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Teljes név
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              placeholder="Kovács János"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              placeholder="nev@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Jelszó (min. 6 karakter)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-adventure-forest py-2.5 text-white font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Regisztráció..." : "Regisztráció"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Már van fiókod?{" "}
          <Link href="/login" className="text-adventure-forest font-semibold hover:underline">
            Bejelentkezés
          </Link>
        </p>
      </div>
    </main>
  );
}
