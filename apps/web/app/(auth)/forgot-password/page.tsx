"use client";

/**
 * Forgot Password — design/D01_User_Auth_Profile.pen#0lajY
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { Button, Input } from "@/components/ui";

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
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-trevu-50 text-trevu-600">
            <Icon name="key-round" size={28} />
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
                <Icon name="arrow-left" size={16} />
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

              <Input
                id="email"
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                icon="mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.emailPlaceholder')}
              />

              <Button type="submit" fullWidth loading={loading}>
                {loading ? t('common.loading') : t('auth.sendResetLink')}
              </Button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-navy-500 hover:text-navy-700"
              >
                <Icon name="arrow-left" size={16} />
                {t('auth.backToLogin')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
