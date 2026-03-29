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
  if (password.length < 8) return { level: 1, label: "weak", color: "#DC2626" };
  if (types >= 3) return { level: 3, label: "strong", color: "#059669" };
  if (types >= 2) return { level: 2, label: "medium", color: "#D97706" };
  return { level: 1, label: "weak", color: "#DC2626" };
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
      setError("Cannot verify current password");
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
    <div className="rounded-2xl border border-navy-200 bg-white p-8">
      <h1 className="text-[22px] font-bold text-navy-900 mb-2">
        {t('settings.password.title')}
      </h1>
      <p className="text-sm text-navy-500 mb-8">
        {t('settings.password.description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-trevu-50 border border-trevu-200 p-3 text-sm text-trevu-700">
            {t('settings.password.success')}
          </div>
        )}

        <div>
          <label htmlFor="current-password" className="block text-sm font-semibold text-navy-700 mb-1.5">
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

        <hr className="border-navy-200" />

        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold text-navy-700 mb-1.5">
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
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{ backgroundColor: i <= strength.level ? strength.color : "#E2E8F0" }}
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
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-navy-700 mb-1.5">
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

        <hr className="border-navy-200" />

        <div className="flex gap-3">
          <a href="/profile" className="rounded-xl border border-navy-200 bg-white px-7 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors">
            {t('common.cancel')}
          </a>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-trevu-600 px-7 py-3 text-sm font-semibold text-white hover:bg-trevu-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('settings.password.updateBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}
