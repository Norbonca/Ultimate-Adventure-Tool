import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAuditEntry = {
  admin_user_id: string | null;
  admin_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details?: Record<string, unknown> | null;
  result?: "success" | "failure" | "partial";
};

/**
 * Admin audit-napló bejegyzés (admin_audit_log).
 *
 * A napló hibája nem akadályozza az admin műveletet, de nem is vész el csendben: a supabase-js a hibát
 * visszaadja (nem dobja), ezért a `try/catch` önmagában semmit nem fogott meg — itt a visszaadott `error`-t
 * is naplózzuk. A tábla 2026-11-01 óta (069) csak service_role-lal írható: createAdminClient()-et kell átadni.
 *
 * @returns true, ha a bejegyzés elkészült.
 */
export async function recordAdminAudit(
  client: Pick<SupabaseClient, "from">,
  entry: AdminAuditEntry,
): Promise<boolean> {
  const row = { ...entry, details: entry.details ?? null, result: entry.result ?? "success" };
  try {
    const { error } = await client.from("admin_audit_log").insert(row);
    if (error) {
      console.error("admin_audit_log insert failed:", entry.action, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("admin_audit_log insert threw:", entry.action, err);
    return false;
  }
}
