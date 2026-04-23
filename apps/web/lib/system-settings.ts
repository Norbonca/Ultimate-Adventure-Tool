// ============================================================================
// System Settings helper
// ============================================================================
// Olvas a system_settings táblából (READ: mindenki), + üzleti logika:
// computeDefaultRequireApproval(maxParticipants) — a 15-ös küszöb alapján.
//
// Küszöb üzleti szabály (lásd: 00_Rendszerszintu_Funkcionalis_Specifikacio.md):
//   - max_participants > threshold  → require_approval = false  (auto-approval)
//   - max_participants <= threshold → require_approval = true   (kézi)
// A szervező a wizard / edit formon felülírhatja.
// ============================================================================

import { createClient } from "./supabase/server";

export const DEFAULT_AUTO_APPROVAL_THRESHOLD = 15;

const SETTING_KEY_THRESHOLD = "trip_auto_approval_threshold";

/**
 * Olvassa a system_settings táblából a küszöböt. Fallback: 15.
 */
export async function getAutoApprovalThreshold(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", SETTING_KEY_THRESHOLD)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_AUTO_APPROVAL_THRESHOLD;
  }

  const raw = data.value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUTO_APPROVAL_THRESHOLD;
}

/**
 * Kiszámolja az alapértelmezett require_approval értéket adott max_participants-re.
 * max_participants > threshold → false (auto-approval)
 * max_participants <= threshold → true (kézi)
 */
export function computeDefaultRequireApproval(
  maxParticipants: number,
  threshold: number
): boolean {
  return maxParticipants <= threshold;
}
