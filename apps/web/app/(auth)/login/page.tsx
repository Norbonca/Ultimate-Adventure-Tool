"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-adventure-forest text-white text-xl font-bold mb-4">
            UAT
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bejelentkezés</h1>
          <p className="text-gray-600 mt-1">
            Üdvözlünk az Ultimate Adventure Tool-ban
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full rounded-lg bg-white border border-gray-300 py-2.5 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 mb-6"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Bejelentkezés..." : "Bejelentkezés Google-lel"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-sm text-gray-500">vagy</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              Jelszó
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-adventure-forest py-2.5 text-white font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Bejelentkezés..." : "Bejelentkezés"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Nincs még fiókod?{" "}
          <Link href="/register" className="text-adventure-forest font-semibold hover:underline">
            Regisztráció
          </Link>
        </p>
      </div>
    </main>
  );
}
