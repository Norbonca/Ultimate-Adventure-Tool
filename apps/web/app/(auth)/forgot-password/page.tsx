"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { AppHeader } from "@/components/AppHeader";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">

      {/* Body */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] rounded-2xl border border-navy-200 bg-white p-10 shadow-sm">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-trevu-50">
            <svg className="h-7 w-7 text-trevu-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center text-2xl font-bold text-navy-900">
            {t('auth.forgotPassword')}
          </h1>
          <p className="mb-8 text-center text-sm text-navy-500 leading-relaxed">
            {t('auth.forgotPasswordDesc')}
          </p>

          {success ? (
            <div className="space-y-6">
              <div className="rounded-xl bg-trevu-50 border border-trevu-200 p-4 text-center">
                <p className="text-sm font-medium text-trevu-700">
                  {t('auth.resetPasswordSent')}
                </p>
                <p className="mt-1 text-xs text-trevu-600">
                  {t('auth.checkEmailForReset')}
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-navy-500 hover:text-navy-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-navy-700 mb-1.5">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-trevu"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-trevu-600 py-3 text-white font-semibold hover:bg-trevu-700 transition-colors disabled:opacity-50 shadow-trevu"
              >
                {loading ? t('common.loading') : t('auth.sendResetLink')}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-navy-500 hover:text-navy-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                {t('auth.backToLogin')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
