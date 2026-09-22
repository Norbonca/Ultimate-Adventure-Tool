"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { StateTemplate } from "@/components/ui";

interface FollowUser {
  id: string;
  display_name: string | null;
  slug: string | null;
  avatar_url: string | null;
}

export default function SocialPage() {
  const { t } = useTranslation();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Followers — who follows me
      const { data: followerData } = await supabase
        .from("user_follows")
        .select("follower_id, profiles!user_follows_follower_id_fkey(id, display_name, slug, avatar_url)")
        .eq("following_id", user.id);

      // Following — who I follow
      const { data: followingData } = await supabase
        .from("user_follows")
        .select("following_id, profiles!user_follows_following_id_fkey(id, display_name, slug, avatar_url)")
        .eq("follower_id", user.id);

      if (followerData) {
        setFollowers(
          followerData.map((r) => {
            const p = r.profiles as unknown as FollowUser;
            return p ?? { id: r.follower_id, display_name: null, slug: null, avatar_url: null };
          })
        );
      }
      if (followingData) {
        setFollowing(
          followingData.map((r) => {
            const p = r.profiles as unknown as FollowUser;
            return p ?? { id: r.following_id, display_name: null, slug: null, avatar_url: null };
          })
        );
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const list = activeTab === "followers" ? followers : following;
  const filtered = search
    ? list.filter((u) =>
        (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.slug ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : list;

  return (
    <div className="border border-line bg-surface p-6 sm:p-8">
      <h1 className="mb-2 font-display text-4xl font-extrabold leading-none text-ink">
        {t('settings.social.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {followers.length} {t('settings.social.followers')} · {following.length} {t('settings.social.following')}
      </p>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-line">
        <button
          onClick={() => setActiveTab("followers")}
          className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${
            activeTab === "followers"
              ? "border-b-2 border-accent text-accent"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {t('settings.social.followers')}
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${
            activeTab === "following"
              ? "border-b-2 border-accent text-accent"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {t('settings.social.following')}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('settings.social.searchPlaceholder')}
        aria-label={t('settings.social.searchPlaceholder')}
        className="input-trevu mb-6"
      />

      {/* User list — states: design/D00_Core_Components.pen#v0Gvw, #3VCtO */}
      {loading ? (
        <StateTemplate variant="loading" title={t('common.loading')} />
      ) : filtered.length === 0 ? (
        <StateTemplate variant="empty" icon="users" title={t('settings.social.empty')} />
      ) : (
        <div className="divide-y divide-line">
          {filtered.map((user) => {
            const initials = (user.display_name ?? "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={user.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-on">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{user.display_name ?? t('profile.defaultUser')}</p>
                    <p className="text-xs text-ink-muted">@{user.slug ?? user.id.slice(0, 8)}</p>
                  </div>
                </div>
                <a
                  href={`/u/${user.slug ?? user.id}`}
                  className="border border-line-strong px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {t('settings.social.viewProfile')}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
