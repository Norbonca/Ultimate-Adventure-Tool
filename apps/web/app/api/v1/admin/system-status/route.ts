/**
 * GET /api/v1/admin/system-status — M151 Rendszerállapot (csak platform-admin).
 * `?force=1`: kézi „Ellenőrzés most” (a 15 mp-es gyorsítótár megkerülése, 5 mp-es minimummal).
 * Spec: modules/15_Admin_Panel/151_System_Status/README.md · terv: design/D15_Admin.pen#ihHfu
 */
import { NextResponse, type NextRequest } from "next/server";
import { getPlatformAdmin } from "@/lib/admin-auth";
import { getSystemStatus } from "@/lib/system-status/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getPlatformAdmin();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const force = request.nextUrl.searchParams.get("force") === "1";
  try {
    const status = await getSystemStatus({ force });
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("system-status:", error);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
