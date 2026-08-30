"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button, Input, Checkbox } from "@/components/ui";

// Brand marks for the OAuth buttons. Declared at module scope so React does not
// re-create the component type on every render (react-hooks/static-components).
// NOTE: ad-hoc SVG — the Icon Bank has no Google mark yet.
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);


export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Social login buttons */}
          <div className="flex gap-4">
            <Button variant="social" className="flex-1" onClick={handleGoogleSignIn} loading={googleLoading}>
              <span className="inline-flex items-center gap-2"><GoogleIcon />Google</span>
            </Button>
            <Button variant="social" className="flex-1" disabled>
              <span className="inline-flex items-center gap-2"><FacebookIcon />Facebook</span>
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
