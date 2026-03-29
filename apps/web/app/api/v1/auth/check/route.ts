import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({
    authenticated: !!user,
    email: user?.email ?? null,
    displayName: user?.user_metadata?.full_name ?? null,
    firstName: user?.user_metadata?.first_name ?? null,
    lastName: user?.user_metadata?.last_name ?? null,
  });
}
