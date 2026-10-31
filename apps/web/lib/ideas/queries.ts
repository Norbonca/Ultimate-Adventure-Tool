/**
 * M22 — lekérdezések (szerveroldal, a hívó RLS-es kliensén; BR-M22-006 láthatóság az adatbázisban).
 */

import { createClient } from "@/lib/supabase/server";
import type { IdeaDestination, IdeaLinkedTrip, IdeaListItem, IdeaMember, IdeaOffer, IdeaRow } from "./types";
import { windowsOverlap } from "./window";

const IDEA_SELECT = `*, destinations:trip_idea_destinations(id, name, continent, country_codes, sort_order),
  category:categories(id, name, name_localized, icon_name, color_hex),
  owner:profiles!trip_ideas_owner_id_fkey(id, display_name, avatar_url, profile_visibility)`;

export interface BoardFilters {
  category?: string | null;
  country?: string | null;
  continent?: string | null;
  month?: number | null;
  minDuration?: number | null;
  difficulty?: number | null;
  intent?: string | null;
  hasOffer?: boolean;
  includeClosed?: boolean;
  q?: string | null;
  sort?: "members" | "newest" | "soonest";
  page?: number;
}

export const BOARD_PAGE_SIZE = 24;

function normalize(row: Record<string, unknown>): IdeaListItem {
  const r = row as unknown as IdeaListItem & { destinations: IdeaDestination[] | null };
  return { ...r, destinations: [...(r.destinations ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) };
}

/** Ötletbörze (FR-M22-003): a `link_only` sosem; lezárt/lejárt csak kérésre. */
export async function listIdeas(f: BoardFilters): Promise<{ items: IdeaListItem[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let q = supabase
    .from("trip_ideas")
    .select(IDEA_SELECT.replace("destinations:trip_idea_destinations", f.country || f.continent ? "destinations:trip_idea_destinations!inner" : "destinations:trip_idea_destinations"), { count: "exact" })
    .is("deleted_at", null)
    .eq("moderation_status", "none")
    .neq("visibility", "link_only");
  if (!f.includeClosed) q = q.in("status", ["open", "organizing", "converted"]);
  if (f.category) q = q.eq("category_id", f.category);
  if (f.country) q = q.contains("trip_idea_destinations.country_codes", [f.country.toUpperCase()]);
  if (f.continent) q = q.eq("trip_idea_destinations.continent", f.continent);
  if (f.difficulty) q = q.eq("difficulty", f.difficulty);
  if (f.intent && ["seeking_organizer", "seeking_companions", "will_organize"].includes(f.intent)) q = q.eq("intent", f.intent);
  if (f.hasOffer) q = q.gt("offer_count", 0);
  if (f.minDuration) q = q.gte("duration_min_days", f.minDuration);
  if (f.q) q = q.ilike("title", `%${f.q.replace(/[%_]/g, "")}%`);
  if (f.sort === "newest") q = q.order("created_at", { ascending: false });
  else if (f.sort === "soonest") q = q.order("window_start_date", { ascending: true });
  else q = q.order("member_count", { ascending: false }).order("created_at", { ascending: false });
  // hónap-átfedés: kliensoldali szűrés az oldalon belül kerülendő — a dátumra szűrünk (az ablak tartalmazza a hónapot bármelyik évben)
  const { data, error, count } = await q.range((page - 1) * BOARD_PAGE_SIZE, page * BOARD_PAGE_SIZE - 1);
  if (error) {
    console.error("listIdeas error:", error);
    throw new Error("Unable to load ideas");
  }
  let items = ((data ?? []) as unknown[]).map((r) => normalize(r as Record<string, unknown>));
  if (f.month) items = items.filter((i) => monthInWindow(i, f.month as number));
  return { items, total: count ?? items.length };
}

function monthInWindow(i: IdeaRow, month: number): boolean {
  const s = i.window_start_month, e = i.window_end_month;
  return s <= e ? month >= s && month <= e : month >= s || month <= e;
}

export async function getIdeaBySlug(slug: string): Promise<IdeaListItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trip_ideas").select(IDEA_SELECT).eq("slug", slug).is("deleted_at", null).maybeSingle();
  if (error) {
    console.error("getIdeaBySlug error:", error);
    return null;
  }
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function getIdeaById(id: string): Promise<IdeaListItem | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("trip_ideas").select(IDEA_SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function getIdeaMembers(ideaId: string): Promise<IdeaMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_idea_members")
    .select("*, profile:profiles(id, display_name, avatar_url, profile_visibility)")
    .eq("idea_id", ideaId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  return (data ?? []) as unknown as IdeaMember[];
}

export async function getIdeaOffers(ideaId: string): Promise<IdeaOffer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_idea_organizer_offers")
    .select("*, profile:profiles(id, display_name, avatar_url, verified_organizer)")
    .eq("idea_id", ideaId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as IdeaOffer[];
}

export async function getIdeaLinkedTrips(ideaId: string): Promise<IdeaLinkedTrip[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_idea_trips")
    .select("trip_id, created_by, trip:trips(id, slug, title, start_date, end_date, status, cover_image_url)")
    .eq("idea_id", ideaId);
  // a trips RLS csak a néző számára látható túrákat adja vissza (FR-M22-008 3.)
  return ((data ?? []) as unknown as IdeaLinkedTrip[]).filter((l) => l.trip && l.trip.status !== "draft");
}

export async function getIdeaForTrip(tripId: string): Promise<{ id: string; slug: string; title: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("trip_idea_trips").select("idea:trip_ideas(id, slug, title)").eq("trip_id", tripId).maybeSingle();
  const idea = (data as { idea?: { id: string; slug: string; title: string } | { id: string; slug: string; title: string }[] | null } | null)?.idea;
  return Array.isArray(idea) ? idea[0] ?? null : idea ?? null;
}

/** Saját ötleteim, csatlakozásaim, vállalásaim (FR-M22-012). */
export async function getMine(userId: string): Promise<{ mine: IdeaListItem[]; joined: IdeaListItem[]; offered: IdeaListItem[] }> {
  const supabase = await createClient();
  const [mineRes, joinedRes, offeredRes] = await Promise.all([
    supabase.from("trip_ideas").select(IDEA_SELECT).eq("owner_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("trip_idea_members").select("idea:trip_ideas(" + IDEA_SELECT + ")").eq("user_id", userId).eq("status", "active"),
    supabase.from("trip_idea_organizer_offers").select("idea:trip_ideas(" + IDEA_SELECT + ")").eq("organizer_id", userId).eq("status", "active"),
  ]);
  const unwrap = (rows: unknown[] | null) =>
    (rows ?? [])
      .map((r) => (r as { idea: Record<string, unknown> | Record<string, unknown>[] | null }).idea)
      .map((i) => (Array.isArray(i) ? i[0] : i))
      .filter((i): i is Record<string, unknown> => !!i && !(i as { deleted_at?: string | null }).deleted_at)
      .map(normalize);
  const mine = (mineRes.data ?? []).map((r) => normalize(r as Record<string, unknown>));
  return { mine, joined: unwrap(joinedRes.data).filter((i) => i.owner_id !== userId), offered: unwrap(offeredRes.data) };
}

/**
 * „Mire várnak” (FR-M22-013): nyitott ötletek a néző érdeklődési kategóriáiban és a publikált túráinak
 * kategóriáiban; link_only soha; csatlakozók szerint csökkenő.
 */
export async function getDemandIdeas(userId: string): Promise<{ items: IdeaListItem[]; eligible: boolean; categoryIds: string[] }> {
  const supabase = await createClient();
  const [interests, trips] = await Promise.all([
    supabase.from("user_adventure_interests").select("category_id").eq("user_id", userId),
    supabase.from("trips").select("category_id").eq("organizer_id", userId).in("status", ["published", "registration_open", "active", "completed"]).is("deleted_at", null),
  ]);
  const ids = Array.from(new Set([...(interests.data ?? []).map((r) => r.category_id as string), ...(trips.data ?? []).map((r) => r.category_id as string)].filter(Boolean)));
  if (ids.length === 0) return { items: [], eligible: false, categoryIds: [] };
  const { data } = await supabase
    .from("trip_ideas")
    .select(IDEA_SELECT)
    .in("category_id", ids)
    .in("status", ["open", "organizing"])
    .eq("moderation_status", "none")
    .neq("visibility", "link_only")
    .neq("owner_id", userId)
    .is("deleted_at", null)
    .order("member_count", { ascending: false })
    .limit(50);
  return { items: (data ?? []).map((r) => normalize(r as Record<string, unknown>)), eligible: true, categoryIds: ids };
}

/** Hasonló ötletek (FR-M22-002): azonos kategória, közös ország vagy földrész, átfedő időablak. */
export async function findSimilarIdeas(input: { category_id: string; country_codes: string[]; continents: string[]; start: string; end: string; excludeId?: string | null }, limit = 3): Promise<IdeaListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_ideas")
    .select(IDEA_SELECT)
    .eq("category_id", input.category_id)
    .in("status", ["open", "organizing", "converted"])
    .eq("moderation_status", "none")
    .neq("visibility", "link_only")
    .is("deleted_at", null)
    .lte("window_start_date", input.end)
    .gte("window_end_date", input.start)
    .order("member_count", { ascending: false })
    .limit(40);
  const want = new Set(input.country_codes.map((c) => c.toUpperCase()));
  const wantCont = new Set(input.continents);
  return (data ?? [])
    .map((r) => normalize(r as Record<string, unknown>))
    .filter((i) => i.id !== input.excludeId)
    .filter((i) => i.destinations.some((d) => d.country_codes.some((c) => want.has(c)) || (d.continent && wantCont.has(d.continent))))
    .map((i) => ({ i, score: i.destinations.reduce((s, d) => s + d.country_codes.filter((c) => want.has(c)).length, 0) * 10 + i.member_count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.i);
}

/** Illeszkedő túrák (FR-M22-002): publikált, azonos kategória, ország egyezik, kezdődátum az ablakban. */
export async function findMatchingTrips(input: { category_id: string; country_codes: string[]; start: string; end: string }, limit = 3) {
  if (input.country_codes.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("trips")
    .select("id, slug, title, start_date, end_date, location_country, cover_image_url, current_participants, max_participants")
    .eq("category_id", input.category_id)
    .in("status", ["published", "registration_open"])
    .in("location_country", input.country_codes.map((c) => c.toUpperCase()))
    .gte("start_date", input.start)
    .lte("start_date", input.end)
    .is("deleted_at", null)
    .order("start_date", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export { windowsOverlap };
