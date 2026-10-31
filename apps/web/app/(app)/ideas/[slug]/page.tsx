/**
 * M22 — az ötlet adatlapja `/ideas/[slug]` (FR-M22-004). Design: D22 `KpgDv` (1440), `M0RLZp` (390).
 * Night hero + Day tartalom, a túraoldal mintájára. A láthatóságot az RLS adja (BR-M22-006): ami nem látható,
 * az „nem található” (E-M22-041) — az adat nem szivárog.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { BackButtonNight } from "@/components/BackButton";
import { Icon } from "@/components/Icon";
import { CoverImage } from "@/components/ui/CoverImage";
import { IdeaActions } from "@/components/ideas/IdeaActions";
import { IdeaOwnerActions } from "@/components/ideas/IdeaOwnerActions";
import { getIdeaBySlug, getIdeaLinkedTrips, getIdeaMembers, getIdeaOffers } from "@/lib/ideas/queries";
import { categoryChip, countryName, destinationsText, durationText, getCategoryCovers, membersText, statusChip, windowText } from "@/lib/ideas/present";
import { formatWindow, monthName, windowMonthList } from "@/lib/ideas/window";
import { JOINABLE_STATUSES } from "@/lib/ideas/types";
import { DIFFICULTY_LEVELS } from "@/lib/categories";
import { formatMoney } from "@/lib/currency";
import { CATEGORY_TEXT } from "@/components/discover/TripBand";
import { getMyIdeaRelation } from "../actions";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const idea = await getIdeaBySlug(slug);
  if (!idea) return { title: "Trevu" };
  const noindex = idea.visibility !== "public";
  return { title: `${idea.title} · Trevu`, description: idea.description?.slice(0, 160) ?? undefined, robots: noindex ? { index: false, follow: false } : undefined };
}

export default async function IdeaDetailPage({ params }: Props) {
  const { slug } = await params;
  const idea = await getIdeaBySlug(slug);
  if (!idea) notFound();
  const { t, locale } = await getServerT();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [members, offers, linked, covers, rel] = await Promise.all([getIdeaMembers(idea.id), getIdeaOffers(idea.id), getIdeaLinkedTrips(idea.id), getCategoryCovers(), getMyIdeaRelation(idea.id)]);
  const isOwner = !!user && user.id === idea.owner_id;
  const underReview = idea.moderation_status === "under_review";
  const joinable = JOINABLE_STATUSES.includes(idea.status) && !underReview;
  const chip = categoryChip(idea.category, locale);
  const st = statusChip(idea, tr);
  const windowLabel = formatWindow({ startMonth: idea.window_start_month, endMonth: idea.window_end_month, year: idea.window_year }, locale);
  const months = windowMonthList({ startMonth: idea.window_start_month, endMonth: idea.window_end_month, year: idea.window_year });
  const codes = Array.from(new Set(idea.destinations.flatMap((d) => d.country_codes)));
  const diff = DIFFICULTY_LEVELS.find((d) => d.value === idea.difficulty);
  const expires = new Date(idea.expires_at).toLocaleDateString(locale === "en" ? "en-GB" : "hu-HU", { year: "numeric", month: "long", day: "numeric", timeZone: idea.timezone || "UTC" });
  const canSeeOffersNotes = isOwner || rel.offered;
  const headerUser = user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null;

  const memberName = (m: (typeof members)[number]) => {
    if (m.is_anonymous) return t("ideas.detail.anonymousMember");
    if (!user) return t("ideas.detail.member");
    if (m.profile?.profile_visibility === "private" && m.user_id !== user.id) return t("ideas.detail.member");
    return m.profile?.display_name ?? t("ideas.detail.member");
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <div data-surface="night" className="contents"><AppHeader user={headerUser} /></div>

      {/* HERO — D22 KpgDv x9eN0M */}
      <section data-surface="night" className="relative overflow-hidden bg-canvas text-ink" data-testid="idea-hero">
        {covers[idea.category_id] ? <CoverImage src={covers[idea.category_id]} sizes="100vw" priority /> : <div aria-hidden className="absolute inset-0 [background:radial-gradient(60%_80%_at_0%_0%,rgba(45,212,191,.12),transparent_70%)]" />}
        <div aria-hidden className="absolute inset-0 bg-hero-scrim-mobile md:bg-hero-scrim" />
        <div className="relative mx-auto max-w-7xl px-5 pt-3 md:px-[120px]"><BackButtonNight fallback="/ideas" label={t("common.back")} /></div>
        <div className="relative mx-auto flex min-h-[300px] max-w-7xl flex-col justify-end gap-6 px-5 pb-8 pt-6 md:min-h-[420px] md:flex-row md:items-end md:justify-between md:px-[120px] md:pb-12">
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {chip && <span className={`inline-flex w-fit items-center gap-1.5 rounded-chip bg-glass px-2.5 py-1 text-xs font-semibold backdrop-blur ${CATEGORY_TEXT[chip.token]}`}><Icon name={chip.icon} size={14} />{chip.label}</span>}
              {underReview && <span className="inline-flex items-center gap-1.5 rounded-chip bg-[var(--color-warning-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning-text)]"><Icon name="flag" size={12} />{t("ideas.detail.underReview")}</span>}
              {!joinable && !underReview && <span className="inline-flex items-center gap-1.5 rounded-chip bg-glass px-2.5 py-1 text-xs font-semibold text-ink"><Icon name="x-circle" size={12} />{st.label}</span>}
            </div>
            <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink [text-wrap:balance] md:text-hero-display">{idea.title}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-ink-body">
              <span className="inline-flex items-center gap-1.5"><Icon name="map-pin" size={16} className="text-ink-secondary" />{destinationsText(idea, tr, false)}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="calendar-range" size={16} className="text-ink-secondary" />{windowText(idea, tr, locale)}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="users" size={16} className="text-ink-secondary" />{membersText(idea, tr)}</span>
            </p>
          </div>
          <div className="hidden flex-col items-end gap-2.5 md:flex">
            <span className="text-lg font-semibold text-ink">{st.label}</span>
            <div className="w-56"><IdeaActions ideaId={idea.id} slug={idea.slug} joinable={joinable} isOwner={isOwner} userId={rel.userId} member={rel.member} offered={rel.offered} reported={rel.reported} windowMonths={months} layout="sticky" /></div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 md:px-[120px] lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* BAL OSZLOP */}
        <div className="space-y-6">
          {/* ötletgazda */}
          <div className="flex items-center gap-3 rounded-2xl border border-navy-200 bg-white p-5" data-testid="idea-owner-row">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-trevu-600 text-sm font-bold text-white">{(idea.owner?.display_name ?? "?").charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy-900">{idea.owner?.display_name ?? t("ideas.detail.deletedUser")}</p>
              <p className="text-xs text-navy-500">{t("ideas.detail.ownerRole")}</p>
            </div>
            <span className="rounded-chip bg-navy-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-navy-600">{t("ideas.detail.ownerBadge")}</span>
          </div>

          {/* infoBar — D22 O2L6W */}
          <div className="flex flex-wrap gap-3 text-sm" data-testid="idea-infobar">
            <span className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-1.5"><Icon name="calendar-range" size={15} className="text-navy-400" /><span className="font-medium text-navy-700">{windowLabel}</span>{durationText(idea, tr) && <span className="text-navy-400">· {durationText(idea, tr)}</span>}</span>
            {codes.length > 0 && <span className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-1.5"><Icon name="flag" size={15} className="text-navy-400" /><span className="font-medium text-navy-700">{codes.map((c) => countryName(c, locale)).join(" · ")}</span></span>}
            <span className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-1.5"><Icon name="map-pin" size={15} className="text-navy-400" /><span className="font-medium text-navy-700">{destinationsText(idea, tr, false)}</span></span>
            <span className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-1.5"><Icon name="users" size={15} className="text-navy-400" /><span className="font-medium text-navy-700">{membersText(idea, tr)}</span></span>
          </div>

          {/* Az ötlet */}
          <div className="rounded-2xl border border-navy-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-navy-900">{t("ideas.detail.about")}</h2>
            {idea.description ? <div className="whitespace-pre-wrap leading-relaxed text-navy-600">{idea.description}</div> : <p className="text-sm text-navy-400">{t("ideas.detail.noDescription")}</p>}
          </div>

          {/* részletek-rács */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="idea-details">
            {[
              [diff ? (locale === "en" ? diff.labelEn : diff.label) + ` (${diff.value}/5)` : "—", t("ideas.form.difficulty")],
              [idea.group_size_min || idea.group_size_max ? `${idea.group_size_min ?? "?"}–${idea.group_size_max ?? "?"} ${t("ideas.common.peopleUnit")}` : "—", t("ideas.form.groupSize")],
              [idea.budget_amount && idea.budget_currency ? `~${formatMoney(Number(idea.budget_amount), idea.budget_currency, locale)} / ${t("ideas.common.perPerson")}` : "—", t("ideas.form.budget")],
              [t(`ideas.intent.${idea.intent}`), t("ideas.form.intent")],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-navy-200 bg-white p-4"><p className="text-sm font-bold text-navy-900">{v}</p><p className="text-xs text-navy-400">{l}</p></div>
            ))}
          </div>

          {/* Vállalások — D22 YWRQn */}
          <div className="rounded-2xl border border-navy-200 bg-white p-6" data-testid="idea-offers">
            <h2 className="mb-3 text-lg font-bold text-navy-900">{t("ideas.detail.offers")}</h2>
            {offers.length === 0 ? <p className="text-sm text-navy-400">{t("ideas.detail.noOffers")}</p> : (
              <ul className="space-y-3">
                {offers.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 rounded-xl border border-navy-200 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{(o.profile?.display_name ?? "?").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-900">{o.profile?.display_name ?? t("ideas.detail.member")}{o.profile?.verified_organizer && <span className="inline-flex items-center gap-1 rounded-chip bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-600"><Icon name="badge-check" size={12} aria-hidden />{t("ideas.detail.verifiedOrganizer")}</span>}</p>
                      {o.message && <p className="mt-1 text-sm text-navy-700">{o.message}</p>}
                      <p className="mt-1 text-xs text-navy-400">{o.planned_months.length ? t("ideas.detail.plannedMonths", { months: o.planned_months.map((m) => monthName(m, locale)).join(", ") }) : t("ideas.detail.plannedAny")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-navy-400">{t("ideas.detail.offersHint")}</p>
          </div>

          {/* Túrák ebből az ötletből */}
          <div className="rounded-2xl border border-navy-200 bg-white p-6" data-testid="idea-linked-trips">
            <h2 className="mb-3 text-lg font-bold text-navy-900">{t("ideas.detail.linkedTrips")}</h2>
            {linked.length === 0 ? <p className="text-sm text-navy-400">{t("ideas.detail.noLinkedTrips")}</p> : (
              <ul className="space-y-2">
                {linked.map((l) => l.trip && (
                  <li key={l.trip_id}><Link href={`/trips/${l.trip.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-navy-200 p-3 hover:border-trevu-600"><span className="font-semibold text-navy-900">{l.trip.title}</span><span className="text-sm text-trevu-700">{t("ideas.detail.viewTrip")} →</span></Link></li>
                ))}
              </ul>
            )}
          </div>

          {isOwner && <IdeaOwnerActions ideaId={idea.id} status={idea.status} memberCount={idea.member_count} hasLinkedTrips={linked.length > 0} />}
        </div>

        {/* JOBB OSZLOP — csatlakozás-kártya + csatlakozók */}
        <aside className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-navy-200 bg-white p-6" data-testid="idea-join-card">
            <div className="text-center"><span className="text-3xl font-extrabold text-navy-900">{t("ideas.common.members", { count: idea.member_count })}</span>{idea.party_size_total > idea.member_count && <span className="ml-1 text-sm text-navy-400">· {t("ideas.common.people", { count: idea.party_size_total })}</span>}</div>
            <div className="rounded-xl bg-navy-50 p-3 text-sm"><p className="font-semibold text-navy-900">{t("ideas.join.notApplication")}</p><p className="text-navy-600">{t("ideas.join.notApplicationHint")}</p></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-navy-500">{t("ideas.detail.windowEnds")}</span><span className="text-right font-medium text-navy-700">{expires}</span></div>
              <div className="flex justify-between"><span className="text-navy-500">{t("ideas.form.visibility")}</span><span className="font-medium text-navy-700">{t(`ideas.visibility.${idea.visibility}`)}</span></div>
            </div>
            <IdeaActions ideaId={idea.id} slug={idea.slug} joinable={joinable} isOwner={isOwner} userId={rel.userId} member={rel.member} offered={rel.offered} reported={rel.reported} windowMonths={months} layout="card" />
          </div>
          <div className="rounded-2xl border border-navy-200 bg-white p-5" data-testid="idea-members">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-400">{t("ideas.detail.members")}</h3>
            {!user ? <p className="text-sm text-navy-500">{t("ideas.detail.membersLoginHint", { count: idea.member_count })}</p> : (
              <ul className="space-y-2">
                {members.slice(0, 8).map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm"><span className="text-navy-800">{memberName(m)}{m.user_id === idea.owner_id ? ` (${t("ideas.detail.ownerShort")})` : ""}</span><span className="text-navy-400">{t("ideas.common.people", { count: m.party_size })}{canSeeOffersNotes && m.note ? ` · „${m.note}”` : ""}</span></li>
                ))}
                {members.length > 8 && <li className="text-xs text-navy-400">{t("ideas.detail.moreMembers", { count: members.length - 8 })}</li>}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* mobil ragadós sáv — D22 M0RLZp ugJXK */}
      <div data-surface="night" className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-between gap-3 border-t border-line bg-[rgba(15,23,42,.92)] px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-[10px] lg:hidden" data-testid="idea-sticky-bar">
        <div className="flex min-w-0 flex-col"><span className="truncate text-base font-semibold text-ink">{membersText(idea, tr)}</span><span className="text-xs text-ink-muted">{t("ideas.join.notApplication")}</span></div>
        <div className="w-40"><IdeaActions ideaId={idea.id} slug={idea.slug} joinable={joinable} isOwner={isOwner} userId={rel.userId} member={rel.member} offered={rel.offered} reported={rel.reported} windowMonths={months} layout="sticky" /></div>
      </div>
    </main>
  );
}
