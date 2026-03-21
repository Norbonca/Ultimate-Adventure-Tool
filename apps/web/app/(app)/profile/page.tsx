"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  avatar_url?: string;
  display_name?: string;
  email: string;
  slug?: string;
  subscription_tier?: string;
  preferred_language?: string;
  preferred_currency?: string;
  country_code?: string;
  bio?: string;
  reputation_points?: number;
  reputation_level?: string;
  created_at?: string;
  location_city?: string;
}

// Mapping objects for display values
const SUBSCRIPTION_TIER_MAP: Record<string, string> = {
  free: "Kalandor (ingyenes)",
  pro: "Túravezető",
  premium: "Szuperkalandor",
};

const LANGUAGE_MAP: Record<string, string> = {
  hu: "Magyar",
  en: "English",
  de: "Deutsch",
  sk: "Slovenčina",
  hr: "Hrvatski",
  si: "Slovenščina",
  ro: "Română",
  cz: "Čeština",
};

const CURRENCY_MAP: Record<string, string> = {
  EUR: "Euro (EUR)",
  HUF: "Forint (HUF)",
  CZK: "Koruna (CZK)",
  HRK: "Kuna (HRK)",
  RON: "Leu (RON)",
};

const COUNTRY_MAP: Record<string, string> = {
  HU: "Magyarország",
  AT: "Ausztria",
  DE: "Németország",
  SK: "Szlovákia",
  CZ: "Csehország",
  HR: "Horvátország",
  SI: "Szlovénia",
  RO: "Románia",
  CH: "Svájc",
  PL: "Lengyelország",
  IT: "Olaszország",
};

const COUNTRY_OPTIONS = ["HU", "AT", "DE", "SK", "CZ", "HR", "SI", "RO", "CH", "PL", "IT"];
const LANGUAGE_OPTIONS = ["hu", "en", "de", "sk", "hr", "si", "ro", "cz"];
const CURRENCY_OPTIONS = ["EUR", "HUF", "CZK", "HRK", "RON"];

function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name?: string, email?: string): string {
  const displayName = name || email || "U";
  return displayName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm font-medium transition-opacity ${
        type === "success"
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {message}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

  // Fetch user and profile on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          router.push("/login");
          return;
        }

        setUser(authUser);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile fetch error:", profileError);
          showToast("Profil betöltése sikertelen", "error");
          return;
        }

        const loadedProfile: Profile = profileData || {
          id: authUser.id,
          email: authUser.email || "",
          display_name: authUser.user_metadata?.full_name || "",
        };

        setProfile(loadedProfile);
        setEditForm(loadedProfile);
      } catch (error) {
        console.error("Error fetching data:", error);
        showToast("Hiba az adatok betöltésekor", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEditChange = (field: keyof Profile, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    try {
      setIsSaving(true);

      const updateData = {
        display_name: editForm.display_name || "",
        bio: editForm.bio || "",
        location_city: editForm.location_city || "",
        country_code: editForm.country_code || "",
        preferred_language: editForm.preferred_language || "",
        preferred_currency: editForm.preferred_currency || "",
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Save error:", error);
        showToast("Profil mentése sikertelen", "error");
        return;
      }

      setProfile({ ...profile, ...updateData });
      setIsEditing(false);
      showToast("Profil frissítve!");
    } catch (error) {
      console.error("Error saving profile:", error);
      showToast("Hiba a profil mentésekor", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile || {});
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors"
              >
                UAT
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">Profil</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <p className="text-gray-600">Betöltés...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile || !user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors"
              >
                UAT
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">Profil</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <p className="text-red-600">Profil nem található</p>
          </div>
        </div>
      </main>
    );
  }

  const initials = getInitials(profile.display_name, profile.email);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors"
            >
              UAT
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Profil</h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-600">{user.email}</span>
            <form action="/api/v1/auth/signout" method="POST">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                Kijelentkezés
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-xl bg-adventure-forest text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1">
                {!isEditing ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profile.display_name || "Felhasználó"}
                    </h2>
                    <p className="text-gray-600 mt-1">{profile.email}</p>
                    {profile.bio && (
                      <p className="text-gray-700 mt-2">{profile.bio}</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Megjelenítendő név
                      </label>
                      <input
                        type="text"
                        value={editForm.display_name || ""}
                        onChange={(e) =>
                          handleEditChange("display_name", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Név"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Rólad (max 500 karakter)
                      </label>
                      <textarea
                        value={editForm.bio || ""}
                        onChange={(e) =>
                          handleEditChange(
                            "bio",
                            e.target.value.slice(0, 500)
                          )
                        }
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest resize-none"
                        rows={3}
                        placeholder="Beszélj magadról..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {(editForm.bio || "").length}/500
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit/Save/Cancel Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg bg-adventure-forest text-white font-semibold hover:bg-green-800 transition-colors"
                >
                  Szerkesztés
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-adventure-forest text-white font-semibold hover:bg-green-800 transition-colors disabled:opacity-60"
                  >
                    {isSaving ? "Mentés..." : "Mentés"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition-colors disabled:opacity-60"
                  >
                    Mégse
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Csatlakozás dátuma</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatDate(profile.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Előfizetés szint</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {SUBSCRIPTION_TIER_MAP[profile.subscription_tier || "free"] ||
                  profile.subscription_tier ||
                  "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reputációs pontok</p>
              <p className="text-lg font-semibold text-adventure-forest mt-1">
                {profile.reputation_points || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Felhasználónév</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {profile.slug ? `/u/${profile.slug}` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Személyes adatok
          </h3>

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {profile.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Megjelenítendő név</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {profile.display_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Város</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {profile.location_city || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ország</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {COUNTRY_MAP[profile.country_code || ""] ||
                    profile.country_code ||
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Preferált nyelv</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {LANGUAGE_MAP[profile.preferred_language || ""] ||
                    profile.preferred_language ||
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Preferált valuta</p>
                <p className="text-base font-semibold text-gray-900 mt-2">
                  {CURRENCY_MAP[profile.preferred_currency || ""] ||
                    profile.preferred_currency ||
                    "-"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email nem módosítható
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Város
                  </label>
                  <input
                    type="text"
                    value={editForm.location_city || ""}
                    onChange={(e) =>
                      handleEditChange("location_city", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                    placeholder="Város"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ország
                  </label>
                  <select
                    value={editForm.country_code || ""}
                    onChange={(e) =>
                      handleEditChange("country_code", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                  >
                    <option value="">-- Válassz országot --</option>
                    {COUNTRY_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {COUNTRY_MAP[code]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferált nyelv
                  </label>
                  <select
                    value={editForm.preferred_language || ""}
                    onChange={(e) =>
                      handleEditChange("preferred_language", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                  >
                    <option value="">-- Válassz nyelvet --</option>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_MAP[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferált valuta
                  </label>
                  <select
                    value={editForm.preferred_currency || ""}
                    onChange={(e) =>
                      handleEditChange("preferred_currency", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                  >
                    <option value="">-- Válassz valutát --</option>
                    {CURRENCY_OPTIONS.map((curr) => (
                      <option key={curr} value={curr}>
                        {CURRENCY_MAP[curr]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </main>
  );
}
