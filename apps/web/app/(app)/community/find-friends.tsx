"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import {
  searchProfiles,
  followUser,
  unfollowUser,
  type ProfileSearchResult,
} from "./actions";

// Ismerős keresése + követés — design: design/D06_Community.pen#r6Cv8p (findFriendsSec)

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FollowToggle({
  targetId,
  initialFollowing,
  followBack,
}: {
  targetId: string;
  initialFollowing: boolean;
  followBack?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  const label = following
    ? t("community.followingBtn")
    : followBack
      ? t("community.followBack")
      : t("community.follow");

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const action = following ? unfollowUser : followUser;
          const { error } = await action(targetId);
          if (!error) {
            setFollowing(!following);
            router.refresh();
          }
        })
      }
      className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
        following
          ? "border-slate-200 text-navy-500 hover:border-red-200 hover:text-red-500"
          : "border-teal-600 text-teal-700 hover:bg-teal-600 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export function FindFriends() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      const { results: found } = await searchProfiles(value);
      setResults(found);
    });
  };

  return (
    <section>
      <h2 className="text-base font-bold text-navy-900 mb-3">
        {t("community.findFriends")}
      </h2>
      <div className="relative">
        <Icon
          name="search"
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder={t("community.findFriendsPlaceholder")}
          className="input-trevu w-full pl-10 pr-3 py-2.5 text-sm"
        />
      </div>

      {results !== null && (
        <div className="mt-2.5 space-y-2.5">
          {results.length === 0 && !pending ? (
            <p className="text-sm text-navy-400 px-1">{t("community.noResults")}</p>
          ) : (
            results.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar CDN-ről, next/image adopció külön kör (nyitott kérdés)
                  <img
                    src={p.avatar_url}
                    alt={p.display_name ?? ""}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                    {initials(p.display_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {p.display_name ?? "—"}
                  </p>
                  {p.slug && (
                    <p className="text-xs text-navy-400 truncate">@{p.slug}</p>
                  )}
                </div>
                <FollowToggle targetId={p.id} initialFollowing={p.isFollowing} />
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
