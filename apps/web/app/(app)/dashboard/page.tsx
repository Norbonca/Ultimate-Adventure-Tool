/**
 * A bejelentkezés utáni nyitóoldal — „mit kell most csinálnom?”
 *
 * Design: design/claude/D25_Nyitooldal#Teli (1440), #Ures, #Uj, #Teli_390, #Ures_390.
 *
 * A lap három állapota ugyanaz a szerkezet, csak más réteg kerül előre:
 *  - teli nap: állapotsor → Szervezőként (szén) → Résztvevőként (csont) → következő túra → ajánlások
 *  - üres nap: állapotsor → következő túra → Merre indulj? → ajánlások → az utad eddig
 *  - új felhasználó: állapotsor → Válassz utat → ajánlások
 * Üres sáv nem jelenik meg, és nem marad üres doboz a helyén.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { TodoLane } from "@/components/dashboard/TodoLane";
import { NextTripBand } from "@/components/dashboard/NextTripBand";
import { PathCards } from "@/components/dashboard/PathCards";
import { RoadSoFar } from "@/components/dashboard/RoadSoFar";
import { SuggestionGrid } from "@/components/dashboard/SuggestionGrid";
import { getDemandIdeas } from "@/lib/ideas/queries";
import { membersText, windowText } from "@/lib/ideas/present";
import { fetchDashboard, fetchSuggestions } from "./queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { t } = await getServerT();
  const locale = await getServerLocale();

  const [adat, ajanlatok, kereslet] = await Promise.all([
    fetchDashboard(user.id, locale),
    fetchSuggestions(user.id, locale),
    getDemandIdeas(user.id),
  ]);

  const keresztnev =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined)?.split(" ").slice(-1)[0] ||
    "";

  const sorok = [...adat.organizer, ...adat.participant];
  // Csak a szorító teendő számít „vár rád”-nak; a ráérős sor nem állít fel az asztaltól.
  const szorito = sorok.filter((i) => !i.soft).length + adat.organizerMore + adat.participantMore;
  const surgos = sorok.filter((i) => i.days !== null && i.days <= 2).length;
  const ujFelhasznalo = !adat.hasHistory && sorok.length === 0;

  // Állapotsor: a cím maga mondja meg, hol tartunk — nem köszönés.
  const cim = ujFelhasznalo
    ? t("dashboard.titleNew")
    : szorito === 0
      ? sorok.length === 0
        ? t("dashboard.titleEmpty")
        : t("dashboard.titleSoftOnly")
      : szorito === 1
        ? t("dashboard.titleTodoOne")
        : t("dashboard.titleTodo", { count: szorito });

  const alcim = ujFelhasznalo
    ? t("dashboard.subtitleNew")
    : szorito === 0
      ? sorok.length === 0
        ? t("dashboard.subtitleEmpty")
        : t("dashboard.subtitleSoftOnly")
      : surgos === 0
        ? t("dashboard.subtitleTodoCalm")
        : surgos === 1
          ? t("dashboard.subtitleTodoOneUrgent")
          : t("dashboard.subtitleTodo", { count: surgos });

  const fejsor = ujFelhasznalo && keresztnev
    ? t("dashboard.greetingNew", { name: keresztnev })
    : new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", {
        year: "numeric", month: "long", day: "numeric", weekday: "long",
      }).format(new Date());

  const otlet = kereslet.items[0]
    ? {
        slug: kereslet.items[0].slug,
        title: kereslet.items[0].title,
        members: membersText(kereslet.items[0], t as (k: string, p?: Record<string, string | number>) => string),
        window: windowText(kereslet.items[0], t as (k: string, p?: Record<string, string | number>) => string, locale),
      }
    : null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }} />

      {/* ÁLLAPOTSOR — a lap válasza egy mondatban */}
      <section data-testid="dash-state" className="border-b border-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-7 md:gap-3.5 md:px-[120px] md:py-13">
          <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">{fejsor}</p>
          <h1 className="text-[38px] uppercase leading-[0.95] text-balance md:text-[clamp(48px,5vw,76px)]">{cim}</h1>
          <p className="max-w-[680px] text-base text-ink-body md:text-xl">{alcim}</p>
        </div>
      </section>

      <TodoLane
        items={adat.organizer}
        more={adat.organizerMore}
        moreHref="/trips"
        night
        titleKey="dashboard.laneOrganizer"
        hintKey="dashboard.laneOrganizerHint"
        testId="dash-lane-organizer"
      />
      <TodoLane
        items={adat.participant}
        more={adat.participantMore}
        moreHref="/trips"
        titleKey="dashboard.laneParticipant"
        hintKey="dashboard.laneParticipantHint"
        testId="dash-lane-participant"
      />

      {adat.nextTrip && <NextTripBand trip={adat.nextTrip} />}

      {szorito === 0 && <PathCards titleKey={ujFelhasznalo ? "dashboard.pathsTitleNew" : "dashboard.pathsTitle"} />}

      <SuggestionGrid trips={ajanlatok} idea={otlet} />

      {adat.stats && szorito === 0 && <RoadSoFar stats={adat.stats} />}
    </div>
  );
}
