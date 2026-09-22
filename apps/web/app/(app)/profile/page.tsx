"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";

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

interface RecentTrip {
  id: string;
  slug: string;
  title?: string;
  card_image_url?: string | null;
  cover_image_url?: string | null;
  location_city?: string | null;
  location_country?: string | null;
}

interface FollowCounts {
  followers: number;
  following: number;
  trips: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  hiking: "footprints",
  mountain: "mountain",
  water_sports: "waves",
  cycling: "bike",
  running: "person-standing",
  winter_sports: "snowflake",
  expedition: "compass",
  motorsport: "gauge",
};

const SKILL_LEVEL_KEYS: Record<string, string> = {
  none: "profile.skillLevels.none",
  beginner: "profile.skillLevels.beginner",
  intermediate: "profile.skillLevels.intermediate",
  advanced: "profile.skillLevels.advanced",
  expert: "profile.skillLevels.expert",
};

const SKILL_LEVEL_COLORS: Record<string, string> = {
  none: "var(--color-danger)",
  beginner: "var(--color-success)",
  intermediate: "var(--color-warning)",
  advanced: "var(--color-info)",
  expert: "var(--color-primary)",
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followers: 0,
    following: 0,
    trips: 0,
  });
  const [adventureInterests, setAdventureInterests] = useState<AdventureInterest[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [subDisciplines, setSubDisciplines] = useState<SubDiscipline[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

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
          .rpc("get_my_profile");

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
            .select("id, display_name, avatar_url, slug")
            .single();

          if (newProfile) loadedProfile = { ...newProfile, email: authUser.email || "" };
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
          const interestCategoryIds = interestsRes.data.map(
            (i: { category_id: string }) => i.category_id
          );
          setAdventureInterests(
            cats.filter((c: AdventureInterest) => interestCategoryIds.includes(c.id))
          );
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
  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-canvas text-ink">
        <AppHeader />
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="border border-line bg-surface p-8 text-center text-ink-muted">
            {t("common.loading")}
          </div>
        </div>
      </main>
    );
  }

  if (!profile || !user) {
    return (
      <main className="min-h-[100dvh] bg-canvas text-ink">
        <AppHeader />
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="border border-[var(--color-danger)] bg-surface p-8 text-center text-[var(--color-danger)]">
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
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
        user={{
          email: user.email ?? "",
          displayName: profile.display_name ?? undefined,
          firstName: profile.first_name ?? undefined,
          lastName: profile.last_name ?? undefined,
        }}
      />

      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ─── LEFT SIDEBAR ─── */}
          <aside className="w-full flex-shrink-0 lg:w-[320px]">
            <div className="border border-line bg-surface p-7 lg:sticky lg:top-24">
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
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent font-display text-3xl font-bold text-accent-on">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Name & Handle */}
                <div className="text-center">
                  <h1 className="font-display text-3xl font-extrabold leading-none text-ink">
                    {displayName}
                  </h1>
                  {profile.slug && (
                    <p className="mt-2 text-sm text-ink-muted">
                      @{profile.slug}
                    </p>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-center text-sm leading-relaxed text-ink-muted">
                    {profile.bio}
                  </p>
                )}

                {/* Edit Profile Button */}
                <Link
                  href="/settings/profile"
                  className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 border border-line-strong px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon name="pencil" size={16} />
                  {t("profile.editProfile")}
                </Link>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-line" />

              {/* Stats Row */}
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">
                    {followCounts.trips}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {t("profile.overview.trips")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">
                    {followCounts.followers}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {t("profile.overview.followers")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">
                    {followCounts.following}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {t("profile.overview.following")}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-line" />

              {/* Info Section */}
              <div className="space-y-3.5">
                {/* Location */}
                {(profile.location_city || profile.country_code) && (
                  <div className="flex items-center gap-2.5">
                    <Icon name="map-pin" size={16} className="flex-shrink-0 text-ink-muted" />
                    <span className="text-[13px] text-ink-muted">
                      {[profile.location_city, profile.country_code]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {/* Member Since */}
                {memberSinceDate && (
                  <div className="flex items-center gap-2.5">
                    <Icon name="calendar-days" size={16} className="flex-shrink-0 text-ink-muted" />
                    <span className="text-[13px] text-ink-muted">
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
                    <Icon name="badge-check" size={16} className="flex-shrink-0 text-accent" />
                    <span className="text-[13px] font-semibold text-accent">
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
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  {t("profile.overview.adventureInterests")}
                </h2>
                <Link
                  href="/settings/interests"
                  className="text-sm font-bold uppercase tracking-[0.08em] text-accent hover:underline"
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
                        className="flex min-w-[100px] flex-col items-center justify-center gap-2 border border-line px-5 py-4"
                        style={{
                          backgroundColor: interest.color_hex
                            ? `color-mix(in srgb, ${interest.color_hex} 12%, transparent)`
                            : "var(--color-primary-subtle)",
                        }}
                      >
                        <span className="text-2xl">
                          <Icon name={CATEGORY_ICONS[iconKey] || "star"} size={18} />
                        </span>
                        <span className="text-xs font-medium text-ink">
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
                <div className="border border-line bg-surface p-6 text-center">
                  <p className="text-sm text-ink-muted">
                    {t("profile.overview.noInterests")}
                  </p>
                  <Link
                    href="/settings/interests"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-accent hover:underline"
                  >
                    {t("profile.skills.editInterests")}
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              )}
            </section>

            {/* Experience Level */}
            <section
              id="skills"
              className="border border-line bg-surface p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  {t("profile.overview.levelShort")}
                </h2>
                <Link
                  href="/settings/interests"
                  className="text-sm font-bold uppercase tracking-[0.08em] text-accent hover:underline"
                >
                  {t("profile.skills.editInterests")}
                </Link>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-accent">
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
                  <span className="text-xs text-ink-muted">
                    {(profile.reputation_points || 0).toLocaleString()} XP
                  </span>
                </div>
                <div className="h-1 w-full bg-line">
                  <div
                    className="h-1 bg-accent transition-all"
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
                <div className="border border-line bg-canvas p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">0 km</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("profile.overview.distanceCovered")}
                  </p>
                </div>
                <div className="border border-line bg-canvas p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">0 m</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("profile.overview.elevationGain")}
                  </p>
                </div>
                <div className="border border-line bg-canvas p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-ink">0 h</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("profile.overview.activeTime")}
                  </p>
                </div>
              </div>

              {/* Skills per category */}
              {skillsByCategory.length > 0 &&
                skillsByCategory.some((s) => s.bestLevel) && (
                  <div className="mt-6 border-t border-line pt-6">
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
                              className="flex items-center gap-3 border border-line px-4 py-3"
                            >
                              <span className="text-lg">
                                <Icon name={CATEGORY_ICONS[iconKey] || "star"} size={18} />
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-ink">
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
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  {t("profile.overview.recentTrips")}
                </h2>
                {followCounts.trips > 0 && (
                  <Link
                    href="/trips"
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-accent hover:underline"
                  >
                    {t("common.viewAll")}
                    <Icon name="arrow-right" size={14} />
                  </Link>
                )}
              </div>

              {recentTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentTrips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.slug}`}
                      className="group overflow-hidden border border-line bg-surface transition-colors hover:border-accent"
                    >
                      <div
                        className="h-32"
                        style={{
                          background:
                            trip.card_image_url || trip.cover_image_url
                              ? `url(${
                                  trip.card_image_url || trip.cover_image_url
                                }) center/cover`
                              : "var(--gradient-trevu)",
                        }}
                      />
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                          {trip.title}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {trip.location_city || trip.location_country}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-line bg-surface p-8 text-center">
                  <p className="text-sm text-ink-muted">
                    {t("profile.overview.noTripsYet")}
                  </p>
                  <Link
                    href="/trips/new"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-accent hover:underline"
                  >
                    {t("trips.createTrip")}
                    <Icon name="arrow-right" size={14} />
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
