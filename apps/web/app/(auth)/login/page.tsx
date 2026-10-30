"use client";

import { useState, useEffect } from "react";
import { BrandIcon } from "@/lib/brand-icons";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button, Input, Checkbox } from "@/components/ui";

// Márkaikonok: lib/brand-icons.tsx (Icon Bank 0.6) — a Google négyszínű jele és a Simple Icons Facebook.

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletionScheduled, setDeletionScheduled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/v1/auth/check")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.authenticated) {
          router.push("/dashboard");
        } else {
          // US-M01-017: a fiók törlésének kérése után ide érkezik a kijelentkeztetett felhasználó.
          setDeletionScheduled(new URLSearchParams(window.location.search).get("account") === "deletion-scheduled");
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  if (checkingAuth) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <>
    <main className="flex min-h-[calc(100vh-56px)]">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[560px] shrink-0 bg-gradient-to-b from-slate-900 to-[#134E4A] p-12 text-white">
        <div>
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-trevu-400 hover:text-trevu-300 transition-colors">trevu</Link>
        </div>

        <div className="space-y-4">
          <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-tight">
            {t('auth.loginBrandTitle')}
          </h1>
          <p className="text-base text-slate-400 leading-relaxed max-w-[420px]">
            {t('auth.loginBrandDesc')}
          </p>
        </div>

        <div className="space-y-4">
          {[
            t('auth.loginFeature1'),
            t('auth.loginFeature2'),
            t('auth.loginFeature3'),
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-3">
              <svg className="h-5 w-5 text-trevu-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-slate-300">{feat}</span>
            </div>
          ))}
          <p className="text-xs text-slate-500 pt-4">{t('auth.freeForever')}</p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-navy-900">{t('auth.loginTitle')}</h2>
            <LanguageSwitcher />
          </div>

          {deletionScheduled && (
            <div role="status" className="p-3 rounded-xl bg-trevu-50 border border-trevu-200 text-trevu-800 text-sm">
              {t("account.restore.scheduledNotice")}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Social login buttons */}
          <div className="flex gap-4">
            <Button variant="social" className="flex-1" onClick={handleGoogleSignIn} loading={googleLoading}>
              <span className="inline-flex items-center gap-2"><BrandIcon name="brand.google" />Google</span>
            </Button>
            <Button variant="social" className="flex-1" disabled>
              <span className="inline-flex items-center gap-2"><BrandIcon name="brand.facebook" color="default" />Facebook</span>
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-navy-200" />
            <span className="text-xs text-navy-400">{t('common.or')}</span>
            <div className="flex-1 h-px bg-navy-200" />
          </div>

          {/* Email / Phone tabs */}
          <div className="flex border-b border-navy-200">
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${
                activeTab === "email"
                  ? "text-trevu-600 border-b-2 border-trevu-600"
                  : "text-navy-400 hover:text-navy-600"
              }`}
            >
              {t('auth.email')}
            </button>
            <button
              onClick={() => setActiveTab("phone")}
              className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${
                activeTab === "phone"
                  ? "text-trevu-600 border-b-2 border-trevu-600"
                  : "text-navy-400 hover:text-navy-600"
              }`}
            >
              {t('auth.phoneTab')}
            </button>
          </div>

          {/* Form */}
          {activeTab === "email" ? (
            <form onSubmit={handleLogin} className="space-y-5">
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

              <Input
                id="password"
                label={t('auth.password')}
                type="password"
                autoComplete="current-password"
                icon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('auth.passwordPlaceholder')}
              />

              <div className="flex items-center justify-between">
                <Checkbox id="remember" label={t('auth.rememberMe')} />
                <Link href="/forgot-password" className="text-sm font-medium text-trevu-600 hover:text-trevu-700">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button type="submit" fullWidth loading={loading}>
                {loading ? t('auth.loginLoading') : t('auth.login')}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <Input
                id="phone"
                label={t('auth.phoneNumber')}
                type="tel"
                autoComplete="tel"
                icon="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('auth.phonePlaceholder')}
              />
              <Button fullWidth disabled>
                {t('auth.sendOTP')}
              </Button>
              <p className="text-xs text-navy-400 text-center">{t('auth.phoneComingSoon')}</p>
            </div>
          )}

          <p className="text-center text-sm text-navy-500">
            {t('auth.noAccount')}{" "}
            <Link href="/register" className="text-trevu-600 font-semibold hover:text-trevu-700 hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </main>
    </>
  );
}
