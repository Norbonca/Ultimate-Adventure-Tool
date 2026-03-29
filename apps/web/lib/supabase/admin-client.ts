import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service role kliens — admin műveletek (RLS bypass).
 * Csak szerver oldalon használható, soha ne kerüljön a kliensre!
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
