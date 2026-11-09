import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isSupportedLocale, negotiateLocale } from "@/lib/i18n/negotiate";

export async function proxy(request: NextRequest) {
  // Az olvasó nyelve dönt (Norbert, 2026-11-09): választott nyelv (süti) híján az Accept-Language
  // szerint. A kérés sütijébe is beírjuk, hogy a szerveroldali render már ezen a nyelven fusson,
  // a válaszba pedig, hogy a kliens és a következő kérések is ezt használják.
  const negotiated = isSupportedLocale(request.cookies.get(LOCALE_COOKIE)?.value)
    ? null
    : negotiateLocale(request.headers.get("accept-language"));
  if (negotiated) request.cookies.set(LOCALE_COOKIE, negotiated);
  const withLocale = (res: NextResponse) => {
    if (negotiated) res.cookies.set(LOCALE_COOKIE, negotiated, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Felhasználó session frissítése
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Védett oldalak — bejelentkezés nélkül átirányítás
  // /trips/[slug] (detail) NYILVÁNOS — Discover-ről kattintható, nem kell auth.
  // /trips (lista), /trips/new és /trips/[slug]/{edit|manage|participant} védett.
  const pathname = request.nextUrl.pathname;
  const protectedPaths = ["/dashboard", "/profile", "/settings", "/admin", "/tutorials"]; // M211: útmutató csak belépve
  const publicAdminPaths = ["/admin/login"];
  const isPublicAdmin = publicAdminPaths.some((p) => pathname.startsWith(p));

  const isTripsList = pathname === "/trips" || pathname === "/trips/";
  const isTripsCreate = pathname.startsWith("/trips/new");
  const isTripsSubAction = /^\/trips\/[^/]+\/(edit|manage|participant)(\/|$)/.test(pathname);
  const isTripsProtected = isTripsList || isTripsCreate || isTripsSubAction;

  const isProtected =
    !isPublicAdmin &&
    (isTripsProtected || protectedPaths.some((p) => pathname.startsWith(p)));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return withLocale(NextResponse.redirect(url));
  }

  // US-M01-017: a törlésre váró fiók a türelmi időben először a visszaállító oldalt kapja
  // (D01 `RbzSn` C). Csak védett oldalon kérdezzük, hogy a publikus oldalak ne lassuljanak.
  if (user && isProtected && !isPublicAdmin) {
    const { data } = await supabase.rpc("account_deletion_status").maybeSingle();
    if ((data as { pending_deletion?: boolean } | null)?.pending_deletion) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-restore";
      url.search = "";
      return withLocale(NextResponse.redirect(url));
    }
  }

  return withLocale(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
