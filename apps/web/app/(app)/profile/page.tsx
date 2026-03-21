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
  timezone?: string;
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

// Reference data types (loaded from DB)
interface RefCountry {
  code: string;
  alpha3: string;
  name_en: string;
  name_hu: string;
  name_native?: string;
  phone_code: string;
  default_currency: string;
  flag_emoji?: string;
  is_eu: boolean;
  market_priority?: number;
}

interface RefLanguage {
  code: string;
  name_en: string;
  name_hu: string;
  name_native: string;
  is_app_supported: boolean;
}

interface RefCurrency {
  code: string;
  name_en: string;
  name_hu: string;
  symbol: string;
}

interface RefTimezone {
  tz_id: string;
  display_name: string;
  utc_offset_text: string;
  country_code: string;
}

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

const COUNTRY_MAP: Record<string, string> = {
  HU: "Magyarország", AT: "Ausztria", DE: "Németország", SK: "Szlovákia",
  CZ: "Csehország", HR: "Horvátország", SI: "Szlovénia", RO: "Románia",
  CH: "Svájc", PL: "Lengyelország", IT: "Olaszország",
};

const LANGUAGE_MAP: Record<string, string> = {
  hu: "Magyar", en: "English", de: "Deutsch", sk: "Slovenčina",
  hr: "Hrvatski", si: "Slovenščina", ro: "Română", cz: "Čeština",
};

const CURRENCY_MAP: Record<string, string> = {
  EUR: "Euro (EUR)", HUF: "Forint (HUF)", CZK: "Koruna (CZK)",
  HRK: "Kuna (HRK)", RON: "Leu (RON)",
};

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
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl text-sm font-medium transition-opacity ${
        type === "success"
          ? "bg-trevu-500 text-white"
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

  // Reference data (loaded from ref_* tables)
  const [refCountries, setRefCountries] = useState<RefCountry[]>([]);
  const [refLanguages, setRefLanguages] = useState<RefLanguage[]>([]);
  const [refCurrencies, setRefCurrencies] = useState<RefCurrency[]>([]);
  const [refTimezones, setRefTimezones] = useState<RefTimezone[]>([]);

  // Tab-specific state
  const [settingsForm, setSettingsForm] = useState<Partial<Profile & { emergency_contact: Partial<EmergencyContact> }>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [skillsToSave, setSkillsToSave] = useState<Record<string, string>>({});
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [expandedSkillCategory, setExpandedSkillCategory] = useState<string | null>(null);
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

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

        // Fetch reference data (countries, languages, currencies, timezones)
        const [countriesRes, languagesRes, currenciesRes, timezonesRes] = await Promise.all([
          supabase.from("ref_countries").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("ref_languages").select("*").eq("is_active", true).eq("is_app_supported", true).order("sort_order"),
          supabase.from("ref_currencies").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("ref_timezones").select("*").eq("is_active", true).order("sort_order"),
        ]);
        setRefCountries(countriesRes.data || []);
        setRefLanguages(languagesRes.data || []);
        setRefCurrencies(currenciesRes.data || []);
        setRefTimezones(timezonesRes.data || []);

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("categories")
          .select("*")
          .eq("status", "active");

        setCategories(categoriesData || []);

        // Fetch adventure interests (just IDs, no join - no FK between tables)
        const { data: interestsData } = await supabase
          .from("user_adventure_interests")
          .select("category_id")
          .eq("user_id", authUser.id);

        if (interestsData && categoriesData) {
          const interestCategoryIds = interestsData.map((i: any) => i.category_id);
          const matchedCategories = categoriesData.filter((c: any) => interestCategoryIds.includes(c.id));
          setAdventureInterests(matchedCategories);
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
            location_precision: "city_country",
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
        // Fallback: if ref_* tables don't exist yet, populate from hardcoded maps
        if (!countriesRes.data?.length) {
          setRefCountries(Object.entries(COUNTRY_MAP).map(([code, name]) => ({
            code, alpha3: "", name_en: name, name_hu: name, phone_code: code === "HU" ? "+36" : code === "AT" ? "+43" : code === "DE" ? "+49" : code === "SK" ? "+421" : code === "CZ" ? "+420" : code === "HR" ? "+385" : code === "SI" ? "+386" : code === "RO" ? "+40" : code === "CH" ? "+41" : code === "PL" ? "+48" : code === "IT" ? "+39" : "", default_currency: "EUR", flag_emoji: "", is_eu: true,
          })));
        }
        if (!languagesRes.data?.length) {
          setRefLanguages(Object.entries(LANGUAGE_MAP).map(([code, name]) => ({
            code, name_en: name, name_hu: name, name_native: name, is_app_supported: true,
          })));
        }
        if (!currenciesRes.data?.length) {
          setRefCurrencies(Object.entries(CURRENCY_MAP).map(([code, name]) => ({
            code, name_en: name, name_hu: name, symbol: code === "EUR" ? "€" : code === "HUF" ? "Ft" : code === "CZK" ? "Kč" : code === "HRK" ? "kn" : code === "RON" ? "lei" : "",
          })));
        }
        if (!timezonesRes.data?.length) {
          setRefTimezones([
            { tz_id: "Europe/Budapest", display_name: "Budapest (CET)", utc_offset_text: "UTC+1", country_code: "HU" },
            { tz_id: "Europe/Vienna", display_name: "Bécs (CET)", utc_offset_text: "UTC+1", country_code: "AT" },
            { tz_id: "Europe/Berlin", display_name: "Berlin (CET)", utc_offset_text: "UTC+1", country_code: "DE" },
          ]);
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
        phone: settingsForm.phone || null,
        bio: settingsForm.bio || null,
        location_city: settingsForm.location_city || null,
        country_code: settingsForm.country_code || null,
        preferred_language: settingsForm.preferred_language || "hu",
        preferred_currency: settingsForm.preferred_currency || "EUR",
        timezone: settingsForm.timezone || null,
        display_name: [settingsForm.first_name, settingsForm.last_name].filter(Boolean).join(" ") || profile?.display_name || "Felhasználó",
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          ...updateData,
          id: user.id,
          email: user.email || "",
          slug: profile?.slug || user.email?.split("@")[0] || "user",
        }, { onConflict: 'id' });

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
          user_id: user.id,
          profile_visibility: privacySettings.profile_visibility || "public",
          email_visibility: privacySettings.email_visibility || "hidden",
          phone_visibility: privacySettings.phone_visibility || "hidden",
          location_precision: privacySettings.location_precision || "city_country",
          trip_history_visibility: privacySettings.trip_history_visibility || "public",
          online_status_visible: privacySettings.online_status_visible ?? true,
        }, { onConflict: "user_id" });

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
            category_id: subDiscipline?.category_id,
            skill_level: level,
          };
        })
        .filter((s) => s.category_id); // Filter out entries without valid category_id

      if (skillsToInsert.length > 0) {
        const { error } = await supabase.from("user_skills").upsert(skillsToInsert, { onConflict: 'user_id,category_id' });

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

  const handleSaveInterests = async () => {
    if (!user) return;
    // Delete all existing interests
    await supabase.from("user_adventure_interests").delete().eq("user_id", user.id);
    // Insert selected ones
    if (selectedInterestIds.length > 0) {
      await supabase.from("user_adventure_interests").insert(
        selectedInterestIds.map(catId => ({ user_id: user.id, category_id: catId }))
      );
    }
    // Update local state
    const matchedCategories = categories.filter(c => selectedInterestIds.includes(c.id));
    setAdventureInterests(matchedCategories);
    setIsEditingInterests(false);
    showToast("Érdeklődések mentve!");
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-navy-50">
        <header className="bg-white border-b border-navy-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="h-9 w-9 rounded-xl bg-trevu-600 text-white flex items-center justify-center font-bold text-sm hover:bg-trevu-700 transition-colors">
                T
              </Link>
              <h1 className="text-lg font-semibold text-navy-900">Profil</h1>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-navy-200 p-8">
            <p className="text-navy-600">Betöltés...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile || !user) {
    return (
      <main className="min-h-screen bg-navy-50">
        <header className="bg-white border-b border-navy-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="h-9 w-9 rounded-xl bg-trevu-600 text-white flex items-center justify-center font-bold text-sm hover:bg-trevu-700 transition-colors">
                T
              </Link>
              <h1 className="text-lg font-semibold text-navy-900">Profil</h1>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-navy-200 p-8">
            <p className="text-red-600">Profil nem található</p>
          </div>
        </div>
      </main>
    );
  }

  const initials = getInitials(profile.first_name, profile.last_name, profile.email);
  const memberSince = formatMonthYear(profile.created_at);

  return (
    <main className="min-h-screen bg-navy-50">
      {/* Header */}
      <header className="bg-white border-b border-navy-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="h-9 w-9 rounded-xl bg-trevu-600 text-white flex items-center justify-center font-bold text-sm hover:bg-trevu-700 transition-colors">
              T
            </Link>
            <h1 className="text-lg font-semibold text-navy-900">Profil</h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-navy-600">{user.email}</span>
            <form action="/api/v1/auth/signout" method="POST">
              <button className="text-sm text-navy-500 hover:text-navy-700">
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
            <div className="bg-white rounded-xl border border-navy-200 p-6 sticky top-8">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-trevu-600 text-white flex items-center justify-center font-bold text-2xl">
                  {initials}
                </div>
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-navy-900 text-center">
                {profile.first_name || profile.last_name
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                  : "Felhasználó"}
              </h2>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-navy-600 text-center mt-2 line-clamp-2">
                  {profile.bio}
                </p>
              )}

              {/* Edit Profile Button */}
              <button
                onClick={() => setActiveTab("settings")}
                className="w-full mt-4 px-4 py-2 border border-navy-300 rounded-xl text-navy-700 font-medium hover:bg-navy-50 transition-colors"
              >
                Profil szerkesztése
              </button>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-navy-200">
                <div className="text-center">
                  <p className="text-lg font-bold text-navy-900">{followCounts.trips}</p>
                  <p className="text-xs text-navy-500">Túrák</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-navy-900">{followCounts.followers}</p>
                  <p className="text-xs text-navy-500">Követők</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-navy-900">{followCounts.following}</p>
                  <p className="text-xs text-navy-500">Követett</p>
                </div>
              </div>

              {/* Location */}
              <div className="mt-6 pt-6 border-t border-navy-200">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <p className="text-sm text-navy-900">
                    {profile.location_city && profile.country_code
                      ? `${profile.location_city}, ${refCountries.find(c => c.code === profile.country_code)?.name_hu || COUNTRY_MAP[profile.country_code] || profile.country_code}`
                      : profile.location_city || refCountries.find(c => c.code === (profile.country_code || ""))?.name_hu || COUNTRY_MAP[profile.country_code || ""] || "—"}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <p className="text-xs text-navy-500 mt-4">
                Tag: {memberSince}
              </p>

              {/* Verified Badge */}
              {profile.verified_organizer && (
                <div className="mt-4 px-3 py-2 bg-trevu-50 rounded-xl flex items-center gap-2">
                  <span className="text-trevu-600">✓</span>
                  <span className="text-xs font-medium text-green-700">Hitelesített szervező</span>
                </div>
              )}

              {/* Subscription Tier */}
              {profile.subscription_tier === "free" && (
                <div className="mt-4">
                  <button className="w-full px-4 py-2 bg-trevu-600 text-white rounded-xl text-sm font-medium hover:bg-trevu-700 transition-colors">
                    Frissítés Pro-ra
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1">
            {/* Tab Navigation */}
            <div className="bg-white rounded-t-xl border border-navy-200 border-b-0 p-0">
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
                        ? "text-trevu-600 border-adventure-forest"
                        : "text-navy-600 border-transparent hover:text-navy-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-xl border border-navy-200 border-t-0 p-6">
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Adventure Interests */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-navy-900">Kaland érdeklődés</h3>
                      <button
                        onClick={() => {
                          if (!isEditingInterests) {
                            setSelectedInterestIds(adventureInterests.map(a => a.id));
                          }
                          setIsEditingInterests(!isEditingInterests);
                        }}
                        className="px-3 py-1 text-sm font-medium text-trevu-600 hover:bg-trevu-50 rounded transition-colors"
                      >
                        {isEditingInterests ? "Mentés" : "Szerkesztés"}
                      </button>
                    </div>
                    {isEditingInterests ? (
                      <div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                          {categories.map((category) => {
                            const isSelected = selectedInterestIds.includes(category.id);
                            const iconKey = category.name?.toLowerCase()?.replace(/\s+/g, "_") || category.name?.toLowerCase();
                            return (
                              <button
                                key={category.id}
                                onClick={() => {
                                  setSelectedInterestIds((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== category.id)
                                      : [...prev, category.id]
                                  );
                                }}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                  isSelected
                                    ? "border-adventure-forest"
                                    : "border-navy-200 opacity-50 hover:opacity-75"
                                }`}
                                style={
                                  isSelected
                                    ? { backgroundColor: `${category.color_hex}20` }
                                    : {}
                                }
                              >
                                <span className="text-2xl">{CATEGORY_ICONS[iconKey] || "⭐"}</span>
                                <span className="text-sm font-medium text-center text-navy-900">
                                  {category.name_localized || category.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={handleSaveInterests}
                          className="px-4 py-2 bg-trevu-600 text-white rounded-xl text-sm font-medium hover:bg-trevu-700 transition-colors"
                        >
                          Mentés
                        </button>
                      </div>
                    ) : (
                      <>
                        {adventureInterests.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {adventureInterests.map((interest) => (
                              <div
                                key={interest.id}
                                className="px-4 py-2 rounded-full flex items-center gap-2"
                                style={{ backgroundColor: interest.color_hex || "#e5e7eb" }}
                              >
                                <span>{CATEGORY_ICONS[interest.name?.toLowerCase()?.replace(" ", "_")] || "⭐"}</span>
                                <span className="text-sm font-medium text-navy-900">
                                  {interest.name_localized || interest.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-navy-500">Még nem adtál meg kaland érdeklődéseket</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Experience Level */}
                  <div className="pt-6 border-t border-navy-200">
                    <h3 className="text-lg font-bold text-navy-900 mb-4">Szint</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-navy-700">Szint {profile.reputation_level || 1}/5</span>
                        <span className="text-sm text-navy-600">{profile.reputation_points || 0} XP</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-trevu-600 h-2 rounded-full"
                          style={{ width: `${((profile.reputation_level || 1) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="pt-6 border-t border-navy-200">
                    <h3 className="text-lg font-bold text-navy-900 mb-4">Aktivitás statisztika</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-navy-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-navy-900">0 km</p>
                        <p className="text-sm text-navy-600 mt-1">Megtett távolság</p>
                      </div>
                      <div className="bg-navy-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-navy-900">0 m</p>
                        <p className="text-sm text-navy-600 mt-1">Szintemelkedés</p>
                      </div>
                      <div className="bg-navy-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-navy-900">0 h</p>
                        <p className="text-sm text-navy-600 mt-1">Aktív idő</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Trips */}
                  <div className="pt-6 border-t border-navy-200">
                    <h3 className="text-lg font-bold text-navy-900 mb-4">Közelmúltbeli túrák</h3>
                    <div className="bg-navy-50 rounded-xl p-8 text-center">
                      <p className="text-navy-600">Hamarosan elérhető</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Keresztnév
                      </label>
                      <input
                        type="text"
                        value={settingsForm.first_name || ""}
                        onChange={(e) => handleSettingsChange("first_name", e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Keresztnév"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Vezetéknév
                      </label>
                      <input
                        type="text"
                        value={settingsForm.last_name || ""}
                        onChange={(e) => handleSettingsChange("last_name", e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Vezetéknév"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Felhasználónév
                      </label>
                      <input
                        type="text"
                        value={profile.slug || ""}
                        disabled
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl bg-navy-50 text-navy-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-navy-500 mt-1">Nem módosítható</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email || ""}
                        disabled
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl bg-navy-50 text-navy-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-navy-500 mt-1">Nem módosítható</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Telefonszám
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={(() => {
                            const phone = settingsForm.phone || "";
                            const match = refCountries.find(c => phone.startsWith(c.phone_code));
                            return match?.phone_code || (settingsForm.country_code ? refCountries.find(c => c.code === settingsForm.country_code)?.phone_code : "") || "";
                          })()}
                          onChange={(e) => {
                            const currentPhone = settingsForm.phone || "";
                            const oldCode = refCountries.find(c => currentPhone.startsWith(c.phone_code))?.phone_code || "";
                            const number = oldCode ? currentPhone.slice(oldCode.length) : currentPhone.replace(/^\+\d+/, "");
                            handleSettingsChange("phone", e.target.value + number);
                          }}
                          className="w-28 px-2 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white text-sm"
                        >
                          <option value="">--</option>
                          {refCountries.map((country) => (
                            <option key={country.code} value={country.phone_code}>
                              {country.flag_emoji} {country.phone_code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={(() => {
                            const phone = settingsForm.phone || "";
                            const match = refCountries.find(c => phone.startsWith(c.phone_code));
                            return match ? phone.slice(match.phone_code.length) : phone;
                          })()}
                          onChange={(e) => {
                            const currentPhone = settingsForm.phone || "";
                            const match = refCountries.find(c => currentPhone.startsWith(c.phone_code));
                            const code = match?.phone_code || "";
                            handleSettingsChange("phone", code + e.target.value);
                          }}
                          className="flex-1 px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                          placeholder="Telefonszám"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Város
                      </label>
                      <input
                        type="text"
                        value={settingsForm.location_city || ""}
                        onChange={(e) => handleSettingsChange("location_city", e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                        placeholder="Város"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Ország
                      </label>
                      <select
                        value={settingsForm.country_code || ""}
                        onChange={(e) => handleSettingsChange("country_code", e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                      >
                        <option value="">-- Válassz országot --</option>
                        {refCountries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag_emoji} {country.name_hu}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Preferált nyelv
                      </label>
                      <select
                        value={settingsForm.preferred_language || ""}
                        onChange={(e) => handleSettingsChange("preferred_language", e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                      >
                        <option value="">-- Válassz nyelvet --</option>
                        {refLanguages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name_native}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Preferált valuta
                      </label>
                      <select
                        value={settingsForm.preferred_currency || ""}
                        onChange={(e) => handleSettingsChange("preferred_currency", e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                      >
                        <option value="">-- Válassz valutát --</option>
                        {refCurrencies.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.name_hu} ({curr.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Időzóna
                      </label>
                      <select
                        value={(settingsForm as any).timezone || ""}
                        onChange={(e) => handleSettingsChange("timezone" as any, e.target.value)}
                        className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
                      >
                        <option value="">-- Válassz időzónát --</option>
                        {refTimezones.map((tz) => (
                          <option key={tz.tz_id} value={tz.tz_id}>
                            {tz.display_name} ({tz.utc_offset_text})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-2">
                      Bemutatkozás
                    </label>
                    <textarea
                      value={settingsForm.bio || ""}
                      onChange={(e) => handleSettingsChange("bio", e.target.value.slice(0, 500))}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest resize-none"
                      rows={4}
                      placeholder="Beszélj magadról..."
                    />
                    <p className="text-xs text-navy-500 mt-1">
                      {(settingsForm.bio || "").length}/500 karakter
                    </p>
                  </div>

                  {/* Emergency Contact */}
                  <div className="pt-6 border-t border-navy-200">
                    <h4 className="text-base font-bold text-navy-900 mb-4">Vészhelyzeti kapcsolat</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-2">
                          Kapcsolat neve
                        </label>
                        <input
                          type="text"
                          value={settingsForm.emergency_contact?.name || ""}
                          onChange={(e) => handleEmergencyContactChange("name", e.target.value)}
                          className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                          placeholder="Név"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-2">
                          Kapcsolat
                        </label>
                        <select
                          value={settingsForm.emergency_contact?.relationship || ""}
                          onChange={(e) => handleEmergencyContactChange("relationship", e.target.value)}
                          className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest bg-white"
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
                        <label className="block text-sm font-medium text-navy-700 mb-2">
                          Telefonszám
                        </label>
                        <input
                          type="tel"
                          value={settingsForm.emergency_contact?.phone || ""}
                          onChange={(e) => handleEmergencyContactChange("phone", e.target.value)}
                          className="w-full px-3 py-2 border border-navy-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-adventure-forest"
                          placeholder="Telefonszám"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-navy-200">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-6 py-2 bg-trevu-600 text-white rounded-xl font-medium hover:bg-trevu-700 transition-colors disabled:opacity-60"
                    >
                      {isSavingSettings ? "Mentés..." : "Módosítások mentése"}
                    </button>
                    <button
                      onClick={() => setSettingsForm(profile)}
                      className="px-6 py-2 border border-navy-300 text-navy-700 rounded-xl font-medium hover:bg-navy-50 transition-colors"
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
                    <div className="bg-navy-50 rounded-xl p-8 text-center">
                      <p className="text-navy-600 mb-4">Előbb add meg a kaland érdeklődéseidet</p>
                      <button
                        onClick={() => setActiveTab("overview")}
                        className="px-4 py-2 bg-trevu-600 text-white rounded-xl text-sm font-medium hover:bg-trevu-700 transition-colors"
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
                            className="border border-navy-200 rounded-xl overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setExpandedSkillCategory(isExpanded ? null : category.id)
                              }
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-navy-50 transition-colors"
                              style={{ backgroundColor: isExpanded ? (category.color_hex || "#f3f4f6") + "20" : "transparent" }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">
                                  {CATEGORY_ICONS[category.name?.toLowerCase()?.replace(" ", "_")] || "⭐"}
                                </span>
                                <span className="font-semibold text-navy-900">
                                  {category.name_localized || category.name}
                                </span>
                              </div>
                              <span className="text-navy-500">{isExpanded ? "▼" : "▶"}</span>
                            </button>

                            {isExpanded && (
                              <div className="px-6 py-4 bg-navy-50 border-t border-navy-200 space-y-4">
                                {categorySubDisciplines.map((subDisc) => {
                                  const currentLevel =
                                    skillsToSave[subDisc.id] ||
                                    userSkills.find((s) => s.id === subDisc.id)?.skill_level ||
                                    "any";

                                  return (
                                    <div
                                      key={subDisc.id}
                                      className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-navy-200"
                                    >
                                      <span className="text-sm font-medium text-navy-900">
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
                      <div className="flex gap-3 pt-6 border-t border-navy-200">
                        <button
                          onClick={handleSaveSkills}
                          disabled={isSavingSkills}
                          className="px-6 py-2 bg-trevu-600 text-white rounded-xl font-medium hover:bg-trevu-700 transition-colors disabled:opacity-60"
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
                    <h4 className="text-base font-bold text-navy-900 mb-4">Profil láthatósága</h4>
                    <div className="space-y-3">
                      {["public", "registered", "private"].map((option) => (
                        <label key={option} className="flex items-center gap-3 p-3 border border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50">
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
                            <p className="font-medium text-navy-900">
                              {option === "public" && "Nyilvános"}
                              {option === "registered" && "Csak regisztrált felhasználók"}
                              {option === "private" && "Privát"}
                            </p>
                            <p className="text-xs text-navy-500">
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
                  <div className="pt-6 border-t border-navy-200">
                    <h4 className="text-base font-bold text-navy-900 mb-4">Email láthatósága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "public", label: "Nyilvános" },
                        { value: "hidden", label: "Rejtett" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50">
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
                          <p className="font-medium text-navy-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Phone Visibility */}
                  <div className="pt-6 border-t border-navy-200">
                    <h4 className="text-base font-bold text-navy-900 mb-4">Telefonszám láthatósága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "trip_companions_only", label: "Csak túratársak" },
                        { value: "hidden", label: "Rejtett" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50">
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
                          <p className="font-medium text-navy-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location Precision */}
                  <div className="pt-6 border-t border-navy-200">
                    <h4 className="text-base font-bold text-navy-900 mb-4">Helyadatok pontossága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "city_country", label: "Város + Ország" },
                        { value: "country_only", label: "Csak ország" },
                        { value: "hidden", label: "Rejtett" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50">
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
                          <p className="font-medium text-navy-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Trip History Visibility */}
                  <div className="pt-6 border-t border-navy-200">
                    <h4 className="text-base font-bold text-navy-900 mb-4">Túrázás történet láthatósága</h4>
                    <div className="space-y-3">
                      {[
                        { value: "public", label: "Nyilvános" },
                        { value: "followers_only", label: "Csak követők" },
                        { value: "private", label: "Privát" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 p-3 border border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50">
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
                          <p className="font-medium text-navy-900">{option.label}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Online Status */}
                  <div className="pt-6 border-t border-navy-200">
                    <h4 className="text-base font-bold text-navy-900 mb-4">Online státusz</h4>
                    <label className="flex items-center gap-3 p-3 border border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50">
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
                      <p className="font-medium text-navy-900">Online státusz zvisible</p>
                    </label>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-6 border-t border-navy-200">
                    <button
                      onClick={handleSavePrivacy}
                      disabled={isSavingPrivacy}
                      className="px-6 py-2 bg-trevu-600 text-white rounded-xl font-medium hover:bg-trevu-700 transition-colors disabled:opacity-60"
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
