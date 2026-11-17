import { Home, Lightbulb, LayoutDashboard, Map, Users, CirclePlay, Sparkles } from "@/lib/icons";

/**
 * A webhely navigációja — egyetlen lista; a fejléc (középső és lenyíló menü) és a lábléc is ebből szűr.
 * Elvek (Norbert, 2026-11-16):
 *  1. Ami csak bejelentkezve értelmes (Túratervező, Közösség, Útmutatók), csak bejelentkezve látszik.
 *  2. Elöl a funkciók, hátul a leírások és tájékoztatók.
 *  3. Ami még nem élő funkció, egyáltalán nem látszik (pl. Árazás, amíg fizetni sem lehet).
 *  4. A lábléc ugyanezt mutatja, mint a fejléc menüje (szinkronban), plusz a fix jogi linkeket.
 *  5. A Dashboard a belépés utáni kiindulópont, ezért elöl áll — és csak bejelentkezve (Norbert, 2026-11-17).
 * Túratervező = M02 túraszervezés (a My Trips oldalról indul); nem az M20 Utazástervező.
 * `center: false` — a fejléc középső zónájában nem szerepel (csak a lenyíló menüben és a láblécben).
 */
export const NAV_ITEMS = [
  { key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, auth: true, center: true }, // belépés utáni nyitóoldal
  { key: "nav.discover", href: "/", icon: Home, auth: false, center: true },
  { key: "nav.tripIdeas", href: "/ideas", icon: Lightbulb, auth: false, center: false }, // M22 — a Felfedezés alatt (NyK-08)
  { key: "nav.tripPlanner", href: "/trips", icon: Map, auth: true, center: true },
  { key: "nav.community", href: "/community", icon: Users, auth: true, center: true },
  { key: "nav.tutorials", href: "/tutorials", icon: CirclePlay, auth: true, center: true }, // M211 — Útmutatók
  { key: "nav.getStarted", href: "/get-started", icon: Sparkles, auth: false, center: true },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/** A belépési állapot szerint látható menüpontok (a sorrend a listáé). */
export const visibleNavItems = (loggedIn: boolean) => NAV_ITEMS.filter((item) => loggedIn || !item.auth);
