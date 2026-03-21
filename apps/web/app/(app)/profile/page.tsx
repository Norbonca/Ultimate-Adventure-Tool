"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  display_name?: string;
  email: string;
  phone?: string;
  slug?: string;
  subscription_tier?: string;
  preferred_language?: string;
  preferred_currency?: string;
  country_code?: string;
  bio?: string;
  reputation_points?: number;
  reputation_level?: number;
  created_at?: string;
  location_city?: string;
  verified_organizer?: boolean;
}

interface AdventureInterest {
  id: string;
  name: string;
  name_localized?: string;
  icon_name?: string;
  color_hex?: string;
}

interface UserSkill {
  id: string;
  category_id: string;
  skill_level: string;
}

interface SubDiscipline {
  id: string;
  name: string;
  name_localized?: string;
  category_id: string;
}

interface PrivacySettings {
  user_id: string;
  profile_visibility: string;
  email_visibility: string;
  phone_visibility: string;
  location_precision: string;
  trip_history_visibility: string;
  online_status_visible: boolean;
}

interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

interface FollowCounts {
  followers: number;
  following: number;
  trips: number;
}

// Mapping objects
const SUBSCRIPTION_TIER_MAP: Record<string, string> = {
  free: "Kalandor (ingyenes)",
  pro: "Túravezető (€9.90/hó)",
  business: "Expedíció (€39.90/hó)",
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

const SKILL_LEVEL_MAP: Record<string, string> = {
  any: "Any",
  beginner: "Any",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const SKILL_LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  any: { bg: "#F1F5F9", text: "#64748B" },
  beginner: { bg: "#F1F5F9", text: "#64748B" },
  intermediate: { bg: "#FEF3C7", text: "#D97706" },
  advanced: { bg: "#DBEAFE", text: "#3B82F6" },
  expert: { bg: "#EDE9FE", text: "#8B5CF6" },
};

const CATEGORY_ICONS: Record<string, string> = {
  hiking: "🥾",
  mountain: "🏔️",
  water_sports: "🌊",
  cycling: "🚴",
  running: "🏃",
  winter_sports: "❄️",
  expedition: "🧭",
  motorsport: "🏍️",
};

const RELATIONSHIP_OPTIONS = ["spouse", "parent", "sibling", "friend", "other"];

const RELATIONSHIP_MAP: Record<string, string> = {
  spouse: "Házastárs",
  parent: "Szülő",
  sibling: "Testvér",
  friend: "Barát",
  other: "Egyéb",
};

const COUNTRY_OPTIONS = ["HU", "AT", "DE", "SK", "CZ", "HR", "SI", "RO", "CH", "PL", "IT"];
const LANGUAGE_OPTIONS = ["hu", "en", "de", "sk", "hr", "si", "ro", "cz"];
const CURRENCY_OPTIONS = ["EUR", "HUF", "CZK", "HRK", "RON"];

function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMonthYear(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
  });
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  let initials = "";
  if (firstName) initials += firstName.charAt(0).toUpperCase();
  if (lastName) initials += lastName.charAt(0).toUpperCase();
  if (!initials && email) initials = email.charAt(0).toUpperCase();
  return initials || "U";
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

  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "skills" | "privacy">("overview");

  // Sidebar data
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0, trips: 0 });
  const [adventureInterests, setAdventureInterests] = useState<AdventureInterest[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subDisciplines, setSubDisciplines] = useState<SubDiscipline[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);

  // Tab-specific state
  const [settingsForm, setSettingsForm] = useState<Partial<Profile & { emergency_contact: Partial<EmergencyContact> }>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [skillsToSave, setSkillsToSave] = useState<Record<string, string>>({});
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [expandedSkillCategory, setExpandedSkillCategory] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
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

        let loadedProfile: Profile | null = profileData;

        // Profile doesn't exist yet - create it (handles edge case of pre-trigger registration)
        if (!loadedProfile && authUser) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .upsert({
              id: authUser.id,
              email: authUser.email || "",
              display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || "Felhasználó",
              slug: authUser.email?.split('@')[0] || "user",
              first_name: authUser.user_metadata?.first_name || "",
              last_name: authUser.user_metadata?.last_name || "",
              avatar_url: authUser.user_metadata?.avatar_url || null,
            }, { onConflict: 'id' })
            .select()
            .single();

          if (newProfile) {
            loadedProfile = newProfile;
          }
        }

        // Fallback if profile still doesn't exist
        const finalProfile: Profile = loadedProfile || {
          id: authUser.id,
          email: authUser.email || "",
          display_name: authUser.user_metadata?.full_name || "",
        };

        setProfile(finalProfile);
        setSettingsForm(finalProfile);

        // Fetch follow counts
        const [followersRes, followingRes, tripsRes] = await Promise.all([
          supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", authUser.id),
          supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", authUser.id),
          supabase.from("trips").select("id", { count: "exact" }).eq("organizer_id", authUser.id),
        ]);

        setFollowCounts({
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
          trips: tripsRes.count || 0,
        });

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("*")
          .eq("status", "active");

        setCategories(categoriesData || []);

        // Fetch adventure interests
        const { data: interestsData } = await supabase
          .from("user_adventure_interests")
          .select("*, categories(*)")
          .eq("user_id", authUser.id);

        if (interestsData) {
          setAdventureInterests(interestsData.map((i: any) => i.categories));
        }

        // Fetch sub-disciplines
        const { data: subDisciplinesData } = await supabase
          .from("sub_disciplines")
          .select("*")
          .eq("status", "active");

        setSubDisciplines(subDisciplinesData || []);

        // Fetch user skills
        const { data: skillsData } = await supabase
          .from("user_skills")
          .select("*")
          .eq("user_id", authUser.id);

        setUserSkills(skillsData || []);

        // Fetch privacy settings
        const { data: privacyData } = await supabase
          .from("user_privacy_settings")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (privacyData) {
          setPrivacySettings(privacyData);
        } else {
          // Create default privacy settings
          const defaultPrivacy: PrivacySettings = {
            user_id: authUser.id,
            profile_visibility: "public",
            email_visibility: "hidden",
            phone_visibility: "hidden",
            location_precision: "city",
            trip_history_visibility: "public",
            online_status_visible: true,
          };
          
          // Auto-create privacy settings if they don't exist
          const { data: createdPrivacy } = await supabase
            .from("user_privacy_settings")
            .upsert(defaultPrivacy, { onConflict: 'user_id' })
            .select()
            .single();
          
          setPrivacySettings(createdPrivacy || defaultPrivacy);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showToast("Hiba az adatok betöltésekor", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSettingsChange = (field: string, value: any) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmergencyContactChange = (field: string, value: any) => {
    setSettingsForm((prev) => ({
      ...prev,
      emergency_contact: {
        ...prev.emergency_contact,
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    if (!profile || !user) return;

    try {
      setIsSavingSettings(true);

      const updateData = {
        first_name: settingsForm.first_name || "",
        last_name: settingsForm.last_name || "",
        phone: settingsForm.phone || "",
        bio: settingsForm.bio || "",
        location_city: settingsForm.location_city || "",
        country_code: settingsForm.country_code || "",
        preferred_language: settingsForm.preferred_language || "",
        preferred_currency: settingsForm.preferred_currency || "",
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ ...updateData, id: user.id }, { onConflict: 'id' });

      if (profileError) {
        showToast("Profil mentése sikertelen", "error");
        return;
      }

      setProfile({ ...profile, ...updateData });
      showToast("Profil frissítve!");
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("Hiba a profil mentésekor", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user || !privacySettings) return;

    try {
      setIsSavingPrivacy(true);

      const { error } = await supabase
        .from("user_privacy_settings")
        .upsert({
          ...privacySettings,
          user_id: user.id,
        })
        .eq("user_id", user.id);

      if (error) {
        showToast("Adatvédelmi beállítások mentése sikertelen", "error");
        return;
      }

      showToast("Adatvédelmi beállítások mentve!");
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      showToast("Hiba az adatvédelmi beállítások mentésekor", "error");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleSaveSkills = async () => {
    if (!user) return;

    try {
      setIsSavingSkills(true);

      // Delete existing skills and insert new ones
      await supabase.from("user_skills").delete().eq("user_id", user.id);

      const skillsToInsert = Object.entries(skillsToSave)
        .filter(([, level]) => level !== "none")
        .map(([subDisciplineId, level]) => {
          const subDiscipline = subDisciplines.find((s) => s.id === subDisciplineId);
          return {
            user_id: user.id,
            category_id: subDiscipline?.category_id || "",
            skill_level: level,
          };
        });

      if (skillsToInsert.length > 0) {
        const { error } = await supabase.from("user_skills").insert(skillsToInsert);

        if (error) {
          showToast("Készségek mentése sikertelen", "error");
          return;
        }
      }

      showToast("Készségek frissítve!");
    } catch (error) {
      console.error("Error saving skills:", error);
      showToast("Hiba a készségek mentésekor", "error");
    } finally {
      setIsSavingSkills(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors">
                UAT
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">Profil</h1>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
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
              <Link href="/dashboard" className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors">
                UAT
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">Profil</h1>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <p className="text-red-600">Profil nem található</p>
          </div>
        </div>
      </main>
    );
  }

  const initials = getInitials(profile.first_name, profile.last_name, profile.email);
  const memberSince = formatMonthYear(profile.created_at);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-adventure-forest text-white flex items-center justify-center font-bold text-2xl">
                  {initials}
                </div>
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-gray-900 text-center">
                {profile.first_name || profile.last_name
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                  : "Felhasználó"}
              </h2>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 text-center mt-2 line-clamp-2">
                  {profile.bio}
                </p>
              )}

              {/* Edit Profile Button */}
              <button
                onClick={() => setActiveTab("settings")}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Profil szerkesztése
              </button>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{followCounts.trips}</p>
                  <p className="text-xs text-gray-500">Túrák</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{followCounts.followers}</p>
                  <p className="text-xs text-gray-500">Követők</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{followCounts.following}</p>
                  <p className="text-xs text-gray-500">Követett</p>
                </div>
              </div>

              {/* Location */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <p className="text-sm text-gray-900">
                    {profile.location_city && profile.country_code
                      ? `${profile.location_city}, ${COUNTRY_MAP[profile.country_code] || profile.country_code}`
                      : profile.location_city || COUNTRY_MAP[profile.country_code || ""] || "—"}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <p className="text-xs text-gray-500 mt-4">
                Tag: {memberSince}
              </p>

              {/* Verified Badge */}
              {profile.verified_organizer && (
                <div className="mt-4 px-3 py-2 bg-green-50 rounded-lg flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-xs font-medium text-green-700">Hitelesített szervező</span>
                </div>
              )}

              {/* Subscription Tier */}
              {profile.subscription_tier === "free" && (
                <div className="mt-4">
                  <button className="w-full px-4 py-2 bg-adventure-forest text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">
                    Frissítés Pro-ra
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1">
            {/* Tab Navigation */}
            <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-0">
              <div className="flex gap-0">
                {[
                  { id: "overview", label: "Áttekintés" },
                  { id: "settings", label: "Beállítások" },
                  { id: "skills", label: "Készségek & Tapasztalat" },
                  { id: "privacy", label: "Adatvédelem" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "text-adventure-forest border-adventure-forest"
                        : "text-gray-600 border-transparent hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-6">
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Adventure Interests */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Kaland érdeklődés</h3>
                    {adventureInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {adventureInterests.map((interest) => (
                          <div
                            key={interest.id}
                            className="px-4 py-2 rounded-full flex items-center gap-2"
                            style={{ backgroundColor: interest.color_hex || "#e5e7eb" }}
                          >
                            <span>{CATEGORY_ICONS[interest.name?.toLowerCase()?.replace(" ", "_")] || "⭐"}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {interest.name_localized || interest.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">Még nem adtál meg kaland érdeklődéseket</p>
                    )}
                  </div>

                  {/* Experience Level */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Szint</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Szint {profile.reputation_level || 1}/5</span>
                        <span className="text-sm text-gray-600">{profile.reputation_points || 0} XP</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-adventure-forest h-2 rounded-full"
                          style={{ width: `${((profile.reputation_level || 1) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Aktivitás statisztika</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">0 km</p>
                        <p className="text-sm text-gray-600 mt-1">Megtett távolság</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">0 m</p>
                        <p className="text-sm text-gray-600 mt-1">Szintemelkedés</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">0 h</p>
                        <p className="text-sm text-gray-600 mt-1">Aktív idő</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Trips */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Közelmúltbeli túrák</h3>
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <p className="text-gray-600">Hamarosan elérhető</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Keresztnév
                      </label>
                      <input
                        type="text"
                        value={settingsForm.first_name || ""}
                        onChange={(e) => handleSettingsChange("first_name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Keresztnév"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vezetéknév
                      </label>
                      <input
                        type="text"
                        value={settingsForm.last_name || ""}
                        onChange={(e) => handleSettingsChange("last_name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Vezetéknév"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Felhasználónév
                      </label>
                      <input
                        type="text"
                        value={profile.slug || ""}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Nem módosítható</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email || ""}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Nem módosítható</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefonszám
                      </label>
                      <input
                        type="tel"
                        value={settingsForm.phone || ""}
                        onChange={(e) => handleSettingsChange("phone", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Telefonszám"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Város
                      </label>
                      <input
                        type="text"
                        value={settingsForm.location_city || ""}
                        onChange={(e) => handleSettingsChange("location_city", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Város"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ország
                      </label>
                      <select
                        value={settingsForm.country_code || ""}
                        onChange={(e) => handleSettingsChange("country_code", e.target.value)}
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
                        value={settingsForm.preferred_language || ""}
                        onChange={(e) => handleSettingsChange("preferred_language", e.target.value)}
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
                        value={settingsForm.preferred_currency || ""}
                        onChange={(e) => handleSettingsChange("preferred_currency", e.target.value)}
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

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bemutatkozás
                    </label>
                    <textarea
                      value={settingsForm.bio || ""}
                      onChange={(e) => handleSettingsChange("bio", e.target.value.slice(0, 500))}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest resize-none"
                      rows={4}
                      placeholder="Beszélj magadról..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(settingsForm.bio || "").length}/500 karakter
                    </p>
                  </div>

                  {/* Emergency Contact */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4">Vészhelyzeti kapcsolat</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kapcsolat neve
                        </label>
                        <input
                          type="text"
                          value={settingsForm.emergency_contact?.name || ""}
                          onChange={(e) => handleEmergencyContactChange("name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                          placeholder="Név"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kapcsolat
                        </label>
                        <select
                          value={settingsForm.emergency_contact?.relationship || ""}
                          onChange={(e) => handleEmergencyContactChange("relationship", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                        >
                          <option value="">-- Válassz --</option>
                          {RELATIONSHIP_OPTIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {RELATIONSHIP_MAP[rel]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Telefonszám
                        </label>
                        <input
                          type="tel"
                          value={settingsForm.emergency_contact?.phone || ""}
                          onChange={(e) => handleEmergencyContactChange("phone", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                          placeholder="Telefonszám"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-6 py-2 bg-adventure-forest text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-60"
                    >
                      {isSavingSettings ? "Mentés..." : "Módosítások mentése"}
                    </button>
                    <button
                      onClick={() => setSettingsForm(profile)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Mégse
                    </button>
                  </div>
                </div>
              )}

              {/* SKILLS & EXPERIENCE TAB */}
              {activeTab === "skills" && (
                <div className="space-y-6">
                  {adventureInterests.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <p className="text-gray-600 mb-4">Előbb add meg a kaland érdeklődéseidet</p>
                      <button
                        onClick={() => setActiveTab("overview")}
                        className="px-4 py-2 bg-adventure-forest text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
                      >
                        Vissza az Áttekintéshez
                      </button>
                    </div>
                  ) : (
                    <>
                      {adventureInterests.map((category) => {
                        const categorySubDisciplines = subDisciplines.filter((s) => s.category_id === category.id);
                        const isExpanded = expandedSkillCategory === category.id;

                        return (
                          <div
                            key={category.id}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setExpandedSkillCategory(isExpanded ? null : category.id)
                              }
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              style={{ backgroundColor: isExpanded ? (category.color_hex || "#f3f4f6") + "20" : "transparent" }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">
                                  {CATEGORY_ICONS[category.name?.toLowerCase()?.replace(" ", "_")] || "⭐"}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {category.name_localized || category.name}
                                </span>
                              </div>
                              <span className="text-gray-500">{isExpanded ? "▼" : "▶"}</span>
                            </button>

                            {isExpanded && (
                              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                                {categorySubDisciplines.map((subDisc) => {
                                  const currentLevel =
                                    skillsToSave[subDisc.id] ||
                                    userSkills.find((s) => s.id === subDisc.id)?.skill_level ||
                                    "any";

                                  return (
                                    <div
                                      key={subDisc.id}
                                      className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200"
                                    >
                                      <span className="text-sm font-medium text-gray-900">
                                        {subDisc.name_localized || subDisc.name}
                                      </span>
                                      <div className="flex gap-2">
                                        {["any", "intermediate", "advanced", "expert"].map((level) => (
                                          <button
                                            key={level}
                                            onClick={() => setSkillsToSave((prev) => ({ ...prev, [subDisc.id]: level }))}
                                            className="px-3 py-1 rounded text-xs font-medium transition-colors"
                                            style={{
                                              backgroundColor:
                                                currentLevel === level
                                                  ? SKILL_LEVEL_COLORS[level].bg
                                                  : "#f3f4f6",
                                              color:
                                                currentLevel === level
                                                  ? SKILL_LEVEL_COLORS[level].text
                                                  : "#6b7280",
                                              border:
                                                currentLevel === level
                                                  ? `1px solid ${SKILL_LEVEL_COLORS[level].text}`
                                                  : "1px solid #e5e7eb",
                                            }}
                                          >
                                            {SKILL_LEVEL_MAP[level]}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Save Button */}
                      <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <button
                          onClick={handleSaveSkills}
                          disabled={isSavingSkills}
                          className="px-6 py-2 bg-adventure-forest text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-60"
                        >
                          {isSavingSkills ? "Mentés..." : "Készségek mentése"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PRIVACY TAB */}
              {activeTab === "privacy" && privacySettings && (
                <div className="space-y-6">
                  {/* Profile Visibility */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4">Profil láthatósága</h4>
                    <div className="space-y-3">
                      {["public", "registered", "private"].map((option) => (
                        <label key={option} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="profile_visibility"
                            value={option}
                            checked={privacySettings.profile_visibility === option}
                            onChange={(e) =>
                              setPrivacySettings((prev) => ({
                                ...prev,
                                profile_visibility: e.target.value,
                              }))
                            }
                            className="w-4 h-4 accent-adventure-forest"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {option === "public" && "Nyilvános"}
                              {option === "registered" && "Csak regisztrált felhasználók"}
                              {option === "private" && "Privát"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {option === "public" && "Mindenki láthatja a profilodat"}
                              {option === "registered" && "Csak bejelentkezve lehet megtekinteni"}
                              {option === "private" && "Csak te láthatod"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Email Visibility */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4">Email láthatósága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "public", label: "Nyilvános" },
                        { value: "hidden", label: "Rejtett" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="email_visibility"
                            value={option.value}
                            checked={privacySettings.email_visibility === option.value}
                            onChange={(e) =>
                              setPrivacySettings((prev) => ({
                                ...prev,
                                email_visibility: e.target.value,
                              }))
                            }
                            className="w-4 h-4 accent-adventure-forest"
                          />
                          <p className="font-medium text-gray-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Phone Visibility */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4">Telefonszám láthatósága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "companions", label: "Csak túratársak" },
                        { value: "hidden", label: "Rejtett" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="phone_visibility"
                            value={option.value}
                            checked={privacySettings.phone_visibility === option.value}
                            onChange={(e) =>
                              setPrivacySettings((prev) => ({
                                ...prev,
                                phone_visibility: e.target.value,
                              }))
                            }
                            className="w-4 h-4 accent-adventure-forest"
                          />
                          <p className="font-medium text-gray-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location Precision */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4">Helyadatok pontossága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "city", label: "Város + Ország" },
                        { value: "country", label: "Csak ország" },
                        { value: "hidden", label: "Rejtett" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="location_precision"
                            value={option.value}
                            checked={privacySettings.location_precision === option.value}
                            onChange={(e) =>
                              setPrivacySettings((prev) => ({
                                ...prev,
                                location_precision: e.target.value,
                              }))
                            }
                            className="w-4 h-4 accent-adventure-forest"
                          />
                          <p className="font-medium text-gray-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Trip History Visibility */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4">Túrázás történet láthatósága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "public", label: "Nyilvános" },
                        { value: "followers", label: "Csak követők" },
                        { value: "private", label: "Privát" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="trip_history_visibility"
                            value={option.value}
                            checked={privacySettings.trip_history_visibility === option.value}
                            onChange={(e) =>
                              setPrivacySettings((prev) => ({
                                ...prev,
                                trip_history_visibility: e.target.value,
                              }))
                            }
                            className="w-4 h-4 accent-adventure-forest"
                          />
                          <p className="font-medium text-gray-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Online Status */}
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-4">Online státusz</h4>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={privacySettings.online_status_visible}
                        onChange={(e) =>
                          setPrivacySettings((prev) => ({
                            ...prev,
                            online_status_visible: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-adventure-forest"
                      />
                      <p className="font-medium text-gray-900">Online státusz zvisible</p>
                    </label>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleSavePrivacy}
                      disabled={isSavingPrivacy}
                      className="px-6 py-2 bg-adventure-forest text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-60"
                    >
                      {isSavingPrivacy ? "Mentés..." : "Adatvédelmi beállítások mentése"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </main>
  );
}
