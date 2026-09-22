"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" };
  let types = 0;
  if (/[a-z]/.test(password)) types++;
  if (/[A-Z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (/[^a-zA-Z0-9]/.test(password)) types++;
  if (password.length < 8) return { level: 1, label: "weak", color: "var(--color-danger)" };
  if (types >= 3) return { level: 3, label: "strong", color: "var(--color-success)" };
  if (types >= 2) return { level: 2, label: "medium", color: "var(--color-warning)" };
  return { level: 1, label: "weak", color: "var(--color-danger)" };
}

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError(t('auth.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);

    // Verify current password by signing in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError(t('settings.password.currentIncorrect'));
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setError(t('settings.password.currentIncorrect'));
      setLoading(false);
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="border border-line bg-surface p-6 sm:p-8">
      <h1 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">
        {t('settings.password.title')}
      </h1>
      <p className="mb-8 text-sm text-ink-muted">
        {t('settings.password.description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="border border-[var(--color-danger)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
        {success && (
          <div className="border border-[var(--color-success)] bg-[var(--color-success-subtle)] p-3 text-sm text-[var(--color-success-text)]">
            {t('settings.password.success')}
          </div>
        )}

        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('settings.password.current')}
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="input-trevu"
            placeholder={t('settings.password.currentPlaceholder')}
          />
        </div>

        <hr className="border-line" />

        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('auth.newPassword')}
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="input-trevu"
            placeholder={t('auth.passwordMin')}
          />
        </div>

        {newPassword && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 transition-colors"
                  style={{ backgroundColor: i <= strength.level ? strength.color : "var(--color-border)" }}
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
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('auth.confirmNewPassword')}
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="input-trevu"
            placeholder={t('auth.confirmPasswordPlaceholder')}
          />
        </div>

        <hr className="border-line" />

        <div className="flex gap-3">
          <a href="/profile" className="inline-flex min-h-12 items-center justify-center border border-line-strong bg-surface px-7 py-3 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent">
            {t('common.cancel')}
          </a>
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 bg-accent px-7 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('settings.password.updateBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}
