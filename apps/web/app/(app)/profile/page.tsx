"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { AppHeader } from "@/components/AppHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  avatar_source?: string;
  display_name?: string;
  email: string;
  slug?: string;
  bio?: string;
  reputation_points?: number;
  reputation_level?: number;
  created_at?: string;
  location_city?: string;
  country_code?: string;
  verified_organizer?: boolean;
  subscription_tier?: string;
}

interface AdventureInterest {
  id: string;
  name: string;
  name_localized?: Record<string, string> | string;
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
  name_localized?: Record<string, string> | string;
  category_id: string;
}

interface FollowCounts {
  followers: number;
  following: number;
  trips: number;
}

// ─── Constants ───────────────────────────────────────────────────────
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

const SKILL_LEVEL_KEYS: Record<string, string> = {
  none: "profile.skillLevels.none",
  beginner: "profile.skillLevels.beginner",
  intermediate: "profile.skillLevels.intermediate",
  advanced: "profile.skillLevels.advanced",
  expert: "profile.skillLevels.expert",
};

const SKILL_LEVEL_COLORS: Record<string, string> = {
  none: "#DC2626",
  beginner: "#16A34A",
  intermediate: "#D97706",
  advanced: "#3B82F6",
  expert: "#8B5CF6",
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getLocalizedName(
  localized: Record<string, string> | string | undefined | null,
  fallback: string,
  lang = "hu"
): string {
  if (!localized) return fallback;
  if (typeof localized === "string") return localized;
  if (typeof localized === "object") {
    return localized[lang] || localized["en"] || localized["hu"] || fallback;
  }
  return fallback;
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  let initials = "";
  if (firstName) initials += firstName.charAt(0).toUpperCase();
  if (lastName) initials += lastName.charAt(0).toUpperCase();
  if (!initials && email) initials = email.charAt(0).toUpperCase();
  return initials || "U";
}

// ─── Component ───────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useTranslation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followers: 0,
    following: 0,
    trips: 0,
  });
  const [adventureInterests, setAdventureInterests] = useState<AdventureInterest[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [subDisciplines, setSubDisciplines] = useState<SubDiscipline[]>([]);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);

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
          return;
        }

        let loadedProfile: Profile | null = profileData;

        if (!loadedProfile) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .upsert(
              {
                id: authUser.id,
                email: authUser.email || "",
                display_name:
                  authUser.user_metadata?.full_name ||
                  authUser.email?.split("@")[0] ||
                  "User",
                slug: authUser.email?.split("@")[0] || "user",
                first_name: authUser.user_metadata?.first_name || "",
                last_name: authUser.user_metadata?.last_name || "",
                avatar_url: authUser.user_metadata?.avatar_url || null,
              },
              { onConflict: "id" }
            )
            .select()
            .single();

          if (newProfile) loadedProfile = newProfile;
        }

        const finalProfile: Profile = loadedProfile || {
          id: authUser.id,
          email: authUser.email || "",
          display_name: authUser.user_metadata?.full_name || "",
        };

        setProfile(finalProfile);

        // Parallel fetches
        const [
          followersRes,
          followingRes,
          tripsCountRes,
          categoriesRes,
          interestsRes,
          subDiscsRes,
          skillsRes,
          tripsRes,
        ] = await Promise.all([
          supabase
            .from("user_follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", authUser.id),
          supabase
            .from("user_follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", authUser.id),
          supabase
            .from("trips")
            .select("id", { count: "exact" })
            .eq("organizer_id", authUser.id),
          supabase.from("categories").select("*").eq("status", "active"),
          supabase
            .from("user_adventure_interests")
            .select("category_id")
            .eq("user_id", authUser.id),
          supabase.from("sub_disciplines").select("*").eq("status", "active"),
          supabase.from("user_skills").select("*").eq("user_id", authUser.id),
          supabase
            .from("trips")
            .select(
              "id, title, slug, location_city, location_country, start_date, status, category_id, cover_image_url, card_image_url"
            )
            .eq("organizer_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        setFollowCounts({
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
          trips: tripsCountRes.count || 0,
        });

        const cats = categoriesRes.data || [];
        if (interestsRes.data && cats.length > 0) {
          const interestCategoryIds = interestsRes.data.map((i: any) => i.category_id);
          setAdventureInterests(cats.filter((c: any) => interestCategoryIds.includes(c.id)));
        }

        setSubDisciplines(subDiscsRes.data || []);
        setUserSkills(skillsRes.data || []);
        setRecentTrips(tripsRes.data || []);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // ─── Loading / Error ─────────────────────────────────────
  const headerAnchors: { label: string; href: string }[] = [];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader anchors={headerAnchors} />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            {t("common.loading")}
          </div>
        </div>
      </main>
    );
  }

  if (!profile || !user) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader anchors={headerAnchors} />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-red-600">
            {t("profile.overview.notFound")}
          </div>
        </div>
      </main>
    );
  }

  const initials = getInitials(profile.first_name, profile.last_name, profile.email);
  const displayName =
    profile.first_name || profile.last_name
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : t("profile.defaultUser");

  const memberSinceDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(
        locale === "en" ? "en-US" : "hu-HU",
        { year: "numeric", month: "long" }
      )
    : "";

  // Build skills summary per category (best skill level per interest category)
  const skillsByCategory = adventureInterests.map((cat) => {
    const catSubDiscs = subDisciplines.filter((s) => s.category_id === cat.id);
    const catSkills = userSkills.filter((s) =>
      catSubDiscs.some((sd) => sd.id === s.category_id)
    );
    const levels = ["expert", "advanced", "intermediate", "beginner", "none"];
    const bestSkill = catSkills.reduce<string | null>((best, skill) => {
      if (!best) return skill.skill_level;
      return levels.indexOf(skill.skill_level) < levels.indexOf(best)
        ? skill.skill_level
        : best;
    }, null);
    return { category: cat, bestLevel: bestSkill, count: catSkills.length };
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        anchors={headerAnchors}
        user={{
          email: user.email ?? "",
          displayName: profile.display_name ?? undefined,
          firstName: profile.first_name ?? undefined,
          lastName: profile.last_name ?? undefined,
        }}
      />

      {/* Body — S07 layout: sidebar + main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* ─── LEFT SIDEBAR ─── */}
          <aside className="w-[320px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sticky top-24">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="rounded-full object-cover w-24 h-24"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-3xl">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Name & Handle */}
                <div className="text-center">
                  <h1 className="text-[22px] font-bold text-slate-900">
                    {displayName}
                  </h1>
                  {profile.slug && (
                    <p className="text-sm text-slate-400 mt-1">
                      @{profile.slug}
                    </p>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-slate-500 text-center leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                {/* Edit Profile Button */}
                <Link
                  href="/settings/profile"
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  {t("profile.editProfile")}
                </Link>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-200 my-6" />

              {/* Stats Row */}
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">
                    {followCounts.trips}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("profile.overview.trips")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">
                    {followCounts.followers}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("profile.overview.followers")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">
                    {followCounts.following}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("profile.overview.following")}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-200 my-6" />

              {/* Info Section */}
              <div className="space-y-3.5">
                {/* Location */}
                {(profile.location_city || profile.country_code) && (
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-[13px] text-slate-500">
                      {[profile.location_city, profile.country_code]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {/* Member Since */}
                {memberSinceDate && (
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-[13px] text-slate-500">
                      {t("profile.overview.memberSince").replace(
                        "{date}",
                        memberSinceDate
                      )}
                    </span>
                  </div>
                )}

                {/* Verified Organizer */}
                {profile.verified_organizer && (
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-teal-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="text-[13px] font-semibold text-teal-600">
                      {t("profile.overview.verifiedOrganizer")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ─── MAIN CONTENT ─── */}
          <div className="flex-1 min-w-0 space-y-7">
            {/* Adventure Interests */}
            <section id="overview">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {t("profile.overview.adventureInterests")}
                </h2>
                <Link
                  href="/settings/interests"
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  {t("profile.skills.editInterests")}
                </Link>
              </div>
              {adventureInterests.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {adventureInterests.map((interest) => {
                    const iconKey =
                      interest.name
                        ?.toLowerCase()
                        ?.replace(/\s+/g, "_") || "";
                    return (
                      <div
                        key={interest.id}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-5 py-4 min-w-[100px]"
                        style={{
                          backgroundColor: `${interest.color_hex || "#e5e7eb"}20`,
                        }}
                      >
                        <span className="text-2xl">
                          {CATEGORY_ICONS[iconKey] || "⭐"}
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {getLocalizedName(
                            interest.name_localized,
                            interest.name,
                            locale
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">
                    {t("profile.overview.noInterests")}
                  </p>
                  <Link
                    href="/settings/interests"
                    className="inline-block mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    {t("profile.skills.editInterests")} →
                  </Link>
                </div>
              )}
            </section>

            {/* Experience Level */}
            <section
              id="skills"
              className="bg-white rounded-2xl border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {t("profile.overview.levelShort")}
                </h2>
                <Link
                  href="/settings/interests"
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  {t("profile.skills.editInterests")}
                </Link>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-teal-600">
                    {t(
                      SKILL_LEVEL_KEYS[
                        (profile.reputation_level || 1) <= 1
                          ? "beginner"
                          : (profile.reputation_level || 1) <= 2
                          ? "intermediate"
                          : (profile.reputation_level || 1) <= 3
                          ? "advanced"
                          : "expert"
                      ] as Parameters<typeof t>[0]
                    )}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(profile.reputation_points || 0).toLocaleString()} XP
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((profile.reputation_level || 1) / 5) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Activity Stats (3 cards) */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-slate-900">0 km</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t("profile.overview.distanceCovered")}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-slate-900">0 m</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t("profile.overview.elevationGain")}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-slate-900">0 h</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t("profile.overview.activeTime")}
                  </p>
                </div>
              </div>

              {/* Skills per category */}
              {skillsByCategory.length > 0 &&
                skillsByCategory.some((s) => s.bestLevel) && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      {skillsByCategory
                        .filter((s) => s.bestLevel)
                        .map((s) => {
                          const iconKey =
                            s.category.name
                              ?.toLowerCase()
                              ?.replace(/\s+/g, "_") || "";
                          return (
                            <div
                              key={s.category.id}
                              className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3"
                            >
                              <span className="text-lg">
                                {CATEGORY_ICONS[iconKey] || "⭐"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {getLocalizedName(
                                    s.category.name_localized,
                                    s.category.name,
                                    locale
                                  )}
                                </p>
                                <p
                                  className="text-xs font-medium"
                                  style={{
                                    color:
                                      SKILL_LEVEL_COLORS[
                                        s.bestLevel || "none"
                                      ],
                                  }}
                                >
                                  {t(
                                    SKILL_LEVEL_KEYS[
                                      s.bestLevel || "none"
                                    ] as Parameters<typeof t>[0]
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
            </section>

            {/* Recent Trips */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {t("profile.overview.recentTrips")}
                </h2>
                {followCounts.trips > 0 && (
                  <Link
                    href="/trips"
                    className="text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    {t("common.viewAll")} →
                  </Link>
                )}
              </div>

              {recentTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentTrips.map((trip: any) => (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.slug}`}
                      className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow bg-white"
                    >
                      <div
                        className="h-32"
                        style={{
                          background:
                            trip.card_image_url || trip.cover_image_url
                              ? `url(${
                                  trip.card_image_url || trip.cover_image_url
                                }) center/cover`
                              : "linear-gradient(135deg, #0D9488, #0F766E)",
                        }}
                      />
                      <div className="p-3">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {trip.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {trip.location_city || trip.location_country}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-500">
                    {t("profile.overview.noTripsYet")}
                  </p>
                  <Link
                    href="/trips/new"
                    className="inline-block mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    {t("trips.createTrip")} →
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
