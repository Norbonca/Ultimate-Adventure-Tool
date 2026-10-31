/**
 * M22 — Saját ötleteim `/ideas/mine` (FR-M22-012): Ötleteim · Csatlakozásaim · Vállalásaim. Design: D22 `Tnhlv`.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { getMine } from "@/lib/ideas/queries";
import { categoryChip, membersText, statusChip, windowText } from "@/lib/ideas/present";
import type { IdeaListItem } from "@/lib/ideas/types";

type TabKey = "mine" | "joined" | "offered";
interface Props { searchParams: Promise<{ tab?: string }> }

export default async function MyIdeasPage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/ideas/mine");
  const { t, locale } = await getServerT();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const data = await getMine(user.id);
  const tab: TabKey = tabParam === "joined" || tabParam === "offered" ? tabParam : "mine";
  const lists: Record<TabKey, IdeaListItem[]> = { mine: data.mine, joined: data.joined, offered: data.offered };
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "mine", label: t("ideas.mine.tabMine"), count: data.mine.length },
    { key: "joined", label: t("ideas.mine.tabJoined"), count: data.joined.length },
    { key: "offered", label: t("ideas.mine.tabOffered"), count: data.offered.length },
  ];
  const items = lists[tab];

  return (
    <main className="min-h-screen bg-slate-50">
      <div data-surface="night" className="contents"><AppHeader user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }} /></div>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-navy-900">{t("ideas.mine.title")}</h1>
          <Link href="/ideas/new" className="inline-flex h-10 items-center gap-2 rounded-trevu bg-trevu-600 px-4 text-sm font-semibold text-white"><Icon name="lightbulb" size={16} aria-hidden />{t("ideas.board.newIdea")}</Link>
        </div>
        <nav className="mt-5 flex gap-1 border-b border-navy-200" aria-label={t("ideas.mine.title")}>
          {tabs.map((x) => (
            <Link key={x.key} href={`/ideas/mine?tab=${x.key}`} aria-current={tab === x.key ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold ${tab === x.key ? "border-trevu-600 text-trevu-700" : "border-transparent text-navy-500 hover:text-navy-700"}`}>
              {x.label} ({x.count})
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-navy-200 bg-white p-10 text-center" data-testid="ideas-mine-empty">
            <p className="text-navy-700">{t(`ideas.mine.empty_${tab}`)}</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/ideas" className="rounded-trevu border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700">{t("ideas.mine.browse")}</Link>
              {tab === "mine" && <Link href="/ideas/new" className="rounded-trevu bg-trevu-600 px-4 py-2 text-sm font-semibold text-white">{t("ideas.mine.first")}</Link>}
            </div>
          </div>
        ) : (
          <ul className="mt-6 space-y-3" data-testid="ideas-mine-list">
            {items.map((idea) => {
              const chip = categoryChip(idea.category, locale);
              const st = statusChip(idea, tr);
              return (
                <li key={idea.id}>
                  <Link href={`/ideas/${idea.slug}`} className="flex items-center gap-4 rounded-2xl border border-navy-200 bg-white p-5 hover:border-trevu-600">
                    {chip && <Icon name={chip.icon} size={18} className="shrink-0 text-navy-500" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-navy-900"><span className="truncate">{idea.title}</span><span className="rounded-chip bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-600">{st.label}</span></p>
                      <p className="text-sm text-navy-500">{windowText(idea, tr, locale)} · {membersText(idea, tr)}{idea.offer_count ? ` · ${t("ideas.mine.offers", { count: idea.offer_count })}` : ""}</p>
                    </div>
                    <span className="hidden text-sm font-semibold text-trevu-700 sm:inline">{tab === "mine" && idea.status === "expired" ? t("ideas.owner.renew") : tab === "mine" ? t("ideas.detail.edit") : t("ideas.board.details")} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
