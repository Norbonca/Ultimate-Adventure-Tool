"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { AppHeader } from "@/components/AppHeader";

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" };

  let types = 0;
  if (/[a-z]/.test(password)) types++;
  if (/[A-Z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (/[^a-zA-Z0-9]/.test(password)) types++;

  if (password.length < 8) return { level: 1, label: "weak", color: "#DC2626" };
  if (types >= 3) return { level: 3, label: "strong", color: "#059669" };
  if (types >= 2) return { level: 2, label: "medium", color: "#D97706" };
  return { level: 1, label: "weak", color: "#DC2626" };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const strength = getPasswordStrength(password);

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    // Also check if there's already a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('auth.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center text-2xl font-bold text-navy-900">
            {t('auth.setNewPassword')}
          </h1>
          <p className="mb-8 text-center text-sm text-navy-500 leading-relaxed">
            {t('auth.setNewPasswordDesc')}
          </p>

          {!sessionReady ? (
            <div className="text-center text-sm text-navy-500">
              <p>{t('auth.verifyingResetLink')}</p>
              <div className="mt-4 h-1 w-24 mx-auto rounded bg-navy-200 overflow-hidden">
                <div className="h-full w-1/2 bg-trevu-600 animate-pulse rounded" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-navy-700 mb-1.5">
                  {t('auth.newPassword')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input-trevu"
                  placeholder={t('auth.passwordMin')}
                />
              </div>

              {/* Password strength */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i <= strength.level
                            ? strength.color
                            : "#E2E8F0",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strength.color }}>
                    {strength.label === "weak" && t('auth.passwordStrength.weak')}
                    {strength.label === "medium" && t('auth.passwordStrength.medium')}
                    {strength.label === "strong" && t('auth.passwordStrength.strong')}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-navy-700 mb-1.5">
                  {t('auth.confirmNewPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input-trevu"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-trevu-600 py-3 text-white font-semibold hover:bg-trevu-700 transition-colors disabled:opacity-50 shadow-trevu"
              >
                {loading ? t('common.loading') : t('auth.resetPassword')}
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
