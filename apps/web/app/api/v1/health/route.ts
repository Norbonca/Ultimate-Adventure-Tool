import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    app: "Ultimate Adventure Tool",
    services: {
      supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
    },
  });
}
