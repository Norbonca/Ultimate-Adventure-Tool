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
    <main className="flex min-h-[100dvh] flex-col bg-canvas">

      {/* Body */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] border border-line border-t-4 border-t-accent bg-surface p-7 sm:p-10">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center bg-accent text-accent-on">
            <Icon name="key-round" size={28} />
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center font-display text-3xl font-bold text-ink">
            {t('auth.forgotPassword')}
          </h1>
          <p className="mb-8 text-center text-sm leading-relaxed text-ink-muted">
            {t('auth.forgotPasswordDesc')}
          </p>

          {success ? (
            <div className="space-y-6">
              <div className="border border-accent bg-[var(--color-primary-subtle)] p-4 text-center">
                <p className="text-sm font-medium text-[var(--color-primary-text)]">
                  {t('auth.resetPasswordSent')}
                </p>
                <p className="mt-1 text-xs text-[var(--color-primary-text)]">
                  {t('auth.checkEmailForReset')}
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-ink-muted hover:text-accent"
              >
                <Icon name="arrow-left" size={16} />
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="border border-coral bg-[var(--color-danger-subtle)] p-3 text-sm text-coral">
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
                className="flex items-center justify-center gap-2 text-sm font-medium text-ink-muted hover:text-accent"
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
