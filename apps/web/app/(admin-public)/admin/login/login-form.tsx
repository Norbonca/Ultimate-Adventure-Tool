"use client";

import { useActionState } from "react";
import { adminLogin } from "./actions";

export function AdminLoginForm({ adminEmail }: { adminEmail: string }) {
  const [state, formAction, pending] = useActionState(adminLogin, null);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
            T
          </div>
          <span className="text-white text-xl font-semibold">Trevu Admin</span>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h1 className="text-white text-xl font-semibold mb-1">Bejelentkezés</h1>
          <p className="text-slate-400 text-sm mb-6">Admin hozzáférés szükséges</p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                defaultValue={adminEmail}
                required
                autoComplete="email"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Jelszó</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {state?.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5">
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
            >
              {pending ? "Bejelentkezés..." : "Belépés"}
            </button>
          </form>

          <p className="text-slate-600 text-xs text-center mt-6">
            Első belépésnél a fiók automatikusan létrejön.
          </p>
        </div>
      </div>
    </div>
  );
}
