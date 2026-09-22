import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui";
import { FindFriends, FollowToggle } from "./find-friends";

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

function PersonRow({
  person,
  isFollowing,
  followBack,
}: {
  person: FollowProfile;
  isFollowing: boolean;
  followBack?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar CDN-ről, next/image adopció külön kör (nyitott kérdés)
        <img
          src={person.avatar_url}
          alt={person.display_name ?? ""}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-on">
          {initials(person.display_name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {person.display_name ?? "-"}
        </p>
        {person.slug && (
          <p className="truncate text-xs text-ink-muted">@{person.slug}</p>
        )}
      </div>
      <FollowToggle
        targetId={person.id}
        initialFollowing={isFollowing}
        followBack={followBack}
      />
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
  const followingIds = new Set(following.map((p) => p.id));
  const myTrips = tripsRes.data ?? [];
  const profile = profileRes.data;

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
        user={{
          email: user.email ?? "",
          displayName: profile?.display_name ?? user.user_metadata?.full_name,
        }}
      />

      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <h1 className="mb-8 font-display text-4xl font-extrabold leading-none tracking-tight text-ink sm:text-5xl">
          {t("community.title")}
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Bal oszlop: keresés + követettek + követők ── */}
          <div className="flex-1 min-w-0 w-full space-y-8">
            <FindFriends />

            <section>
              <h2 className="mb-3 text-base font-bold uppercase tracking-[0.1em] text-ink">
                {t("community.following")} ({following.length})
              </h2>
              {following.length > 0 ? (
                <div className="space-y-2.5">
                  {following.map((p) => (
                    <PersonRow key={p.id} person={p} isFollowing={true} />
                  ))}
                </div>
              ) : (
                <p className="border border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
                  {t("community.noFollowing")}
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-base font-bold uppercase tracking-[0.1em] text-ink">
                {t("community.followers")} ({followers.length})
              </h2>
              {followers.length > 0 ? (
                <div className="space-y-2.5">
                  {followers.map((p) => (
                    <PersonRow
                      key={p.id}
                      person={p}
                      isFollowing={followingIds.has(p.id)}
                      followBack
                    />
                  ))}
                </div>
              ) : (
                <p className="border border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
                  {t("community.noFollowers")}
                </p>
              )}
            </section>
          </div>

          {/* ── Jobb sáv: amit mások látnak ── */}
          <aside className="w-full lg:w-[400px] shrink-0 space-y-6">
            <section className="space-y-4 border border-line bg-surface p-5">
              <h2 className="text-base font-bold uppercase tracking-[0.1em] text-ink">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-bold text-accent-on">
                    {initials(profile?.display_name ?? null)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">
                    {profile?.display_name ?? "-"}
                  </p>
                  {profile?.slug && (
                    <p className="truncate text-xs text-ink-muted">@{profile.slug}</p>
                  )}
                </div>
              </div>
              <Button href="/profile" fullWidth>
                {t("community.viewPublicProfile")}
              </Button>
            </section>

            <section className="space-y-3 border border-line bg-surface p-5">
              <h2 className="text-base font-bold uppercase tracking-[0.1em] text-ink">
                {t("community.myPublishedTrips")} ({myTrips.length})
              </h2>
              {myTrips.length > 0 ? (
                <div className="space-y-2">
                  {myTrips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.slug}`}
                      className="-mx-2 flex items-center gap-3 px-2 py-2 transition-colors hover:bg-canvas"
                    >
                      <div className="h-8 w-11 shrink-0 border-l-4 border-accent bg-[var(--color-primary-subtle)]" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {trip.title}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {trip.start_date}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  {t("community.noPublishedTrips")}
                </p>
              )}
              <p className="text-xs text-ink-muted">{t("community.blogComingSoon")}</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
