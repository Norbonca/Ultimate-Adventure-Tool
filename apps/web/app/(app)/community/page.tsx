import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui";

// Community Dashboard (M05) — design: design/D06_Community.pen#r6Cv8p
// Saját közösségi áttekintő: követettek, követők, publikus tartalmaim.

interface FollowProfile {
  id: string;
  display_name: string | null;
  slug: string | null;
  avatar_url: string | null;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function PersonRow({ person }: { person: FollowProfile }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar CDN-ről, next/image adopció külön kör (nyitott kérdés)
        <img
          src={person.avatar_url}
          alt={person.display_name ?? ""}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
          {initials(person.display_name)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy-900 truncate">
          {person.display_name ?? "—"}
        </p>
        {person.slug && (
          <p className="text-xs text-navy-400 truncate">@{person.slug}</p>
        )}
      </div>
    </div>
  );
}

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { t } = await getServerT();

  const [followingRes, followerRes, tripsRes, profileRes] = await Promise.all([
    supabase
      .from("user_follows")
      .select(
        "following_id, profiles!user_follows_following_id_fkey(id, display_name, slug, avatar_url)"
      )
      .eq("follower_id", user.id),
    supabase
      .from("user_follows")
      .select(
        "follower_id, profiles!user_follows_follower_id_fkey(id, display_name, slug, avatar_url)"
      )
      .eq("following_id", user.id),
    supabase
      .from("trips")
      .select("id, title, slug, start_date, end_date")
      .eq("organizer_id", user.id)
      .eq("status", "published")
      .order("start_date", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("display_name, slug, avatar_url")
      .eq("id", user.id)
      .single(),
  ]);

  const following = (followingRes.data ?? [])
    .map((r) => r.profiles as unknown as FollowProfile | null)
    .filter((p): p is FollowProfile => p !== null);
  const followers = (followerRes.data ?? [])
    .map((r) => r.profiles as unknown as FollowProfile | null)
    .filter((p): p is FollowProfile => p !== null);
  const myTrips = tripsRes.data ?? [];
  const profile = profileRes.data;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        user={{
          email: user.email ?? "",
          displayName: profile?.display_name ?? user.user_metadata?.full_name,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-extrabold text-navy-900 mb-6">
          {t("community.title")}
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Bal oszlop: követettek + követők ── */}
          <div className="flex-1 min-w-0 w-full space-y-8">
            <section>
              <h2 className="text-base font-bold text-navy-900 mb-3">
                {t("community.following")} ({following.length})
              </h2>
              {following.length > 0 ? (
                <div className="space-y-2.5">
                  {following.map((p) => (
                    <PersonRow key={p.id} person={p} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-navy-500 bg-white border border-slate-200 rounded-xl px-4 py-6 text-center">
                  {t("community.noFollowing")}
                </p>
              )}
            </section>

            <section>
              <h2 className="text-base font-bold text-navy-900 mb-3">
                {t("community.followers")} ({followers.length})
              </h2>
              {followers.length > 0 ? (
                <div className="space-y-2.5">
                  {followers.map((p) => (
                    <PersonRow key={p.id} person={p} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-navy-500 bg-white border border-slate-200 rounded-xl px-4 py-6 text-center">
                  {t("community.noFollowers")}
                </p>
              )}
            </section>
          </div>

          {/* ── Jobb sáv: amit mások látnak ── */}
          <aside className="w-full lg:w-[400px] shrink-0 space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold text-navy-900">
                {t("community.whatOthersSee")}
              </h2>
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar CDN-ről, next/image adopció külön kör (nyitott kérdés)
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name ?? ""}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">
                    {initials(profile?.display_name ?? null)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-navy-900 truncate">
                    {profile?.display_name ?? "—"}
                  </p>
                  {profile?.slug && (
                    <p className="text-xs text-navy-400 truncate">@{profile.slug}</p>
                  )}
                </div>
              </div>
              <Button href="/profile" fullWidth>
                {t("community.viewPublicProfile")}
              </Button>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-bold text-navy-900">
                {t("community.myPublishedTrips")} ({myTrips.length})
              </h2>
              {myTrips.length > 0 ? (
                <div className="space-y-2">
                  {myTrips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.slug}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-11 h-8 rounded-md bg-teal-50 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-navy-900 truncate">
                          {trip.title}
                        </p>
                        <p className="text-[11px] text-navy-400">
                          {trip.start_date}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-navy-500">
                  {t("community.noPublishedTrips")}
                </p>
              )}
              <p className="text-xs text-navy-300">{t("community.blogComingSoon")}</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
