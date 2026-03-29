"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
    <div className="rounded-2xl border border-navy-200 bg-white p-8">
      <h1 className="text-[22px] font-bold text-navy-900 mb-2">
        {t('settings.social.title')}
      </h1>
      <p className="text-sm text-navy-500 mb-6">
        {followers.length} {t('settings.social.followers')} · {following.length} {t('settings.social.following')}
      </p>

      {/* Tabs */}
      <div className="flex border-b border-navy-200 mb-6">
        <button
          onClick={() => setActiveTab("followers")}
          className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${
            activeTab === "followers"
              ? "text-trevu-600 border-b-2 border-trevu-600"
              : "text-navy-400 hover:text-navy-600"
          }`}
        >
          {t('settings.social.followers')}
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors ${
            activeTab === "following"
              ? "text-trevu-600 border-b-2 border-trevu-600"
              : "text-navy-400 hover:text-navy-600"
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

      {/* User list */}
      {loading ? (
        <p className="text-sm text-navy-500 text-center py-8">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-navy-500 text-center py-8">{t('settings.social.empty')}</p>
      ) : (
        <div className="divide-y divide-navy-200">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trevu-600 text-white text-sm font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-800">{user.display_name ?? "User"}</p>
                    <p className="text-xs text-navy-400">@{user.slug ?? user.id.slice(0, 8)}</p>
                  </div>
                </div>
                <a
                  href={`/u/${user.slug ?? user.id}`}
                  className="rounded-lg border border-navy-200 px-4 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 transition-colors"
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
