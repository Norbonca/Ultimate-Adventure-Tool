"use server";

// US-M01-017 / UC-M01-003 — account deletion with a 30-day grace period (migration 041).
// Design: D01 `RbzSn` (A confirm, B blocked, C restore) + `kHbUE` (mobile).

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getServerT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export interface BlockingTrip {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  current_participants: number;
}

export type AccountDeletionResult =
  | { status: "scheduled"; scheduledFor: string }
  | { status: "blocked"; trips: BlockingTrip[] }
  | { status: "error"; error: string };

/** Social sign-ins have no password: they confirm by having signed in within this window. */
const RECENT_SIGN_IN_MS = 10 * 60 * 1000;

export async function requestAccountDeletion(password: string): Promise<AccountDeletionResult> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: t("errors.notAuthenticated") };

  const hasPassword = (user.identities ?? []).some((identity) => identity.provider === "email");
  if (hasPassword) {
    const input = z.string().min(1).max(200).safeParse(password);
    if (!input.success || !user.email) return { status: "error", error: t("settings.privacy.deleteWrongPassword") };
    // A separate, cookie-less client: verifying the password must not touch the current session.
    const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: passwordError } = await verifier.auth.signInWithPassword({ email: user.email, password: input.data });
    if (passwordError) return { status: "error", error: t("settings.privacy.deleteWrongPassword") };
  } else {
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if (Date.now() - lastSignIn > RECENT_SIGN_IN_MS) {
      return { status: "error", error: t("settings.privacy.deleteReauthRequired") };
    }
  }

  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) {
    console.error("request_account_deletion error:", error);
    return { status: "error", error: t("settings.privacy.deleteFailed") };
  }
  const result = data as { status: string; trips?: BlockingTrip[]; deletion_scheduled_for?: string };
  if (result.status === "blocked") return { status: "blocked", trips: result.trips ?? [] };

  await supabase.auth.signOut();
  return { status: "scheduled", scheduledFor: result.deletion_scheduled_for ?? "" };
}

export async function restoreAccount(): Promise<{ ok: boolean; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_account");
  if (error) {
    console.error("restore_account error:", error);
    return { ok: false, error: t("account.restore.failed") };
  }
  return { ok: true };
}
