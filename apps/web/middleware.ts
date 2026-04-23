import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
  const protectedPaths = ["/dashboard", "/profile", "/settings", "/admin"];
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
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
