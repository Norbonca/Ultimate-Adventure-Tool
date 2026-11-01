import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAdminAudit, type AdminAuditEntry } from "./admin-audit";

const entry: AdminAuditEntry = {
  admin_user_id: "11111111-1111-1111-1111-111111111111",
  admin_role: "operations_admin",
  action: "user.ban",
  target_type: "user",
  target_id: "22222222-2222-2222-2222-222222222222",
};

function clientReturning(result: { error: unknown } | Error) {
  const insert = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const from = vi.fn(() => ({ insert }));
  return { client: { from } as never, from, insert };
}

describe("recordAdminAudit", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes the row with defaults and reports success", async () => {
    const { client, from, insert } = clientReturning({ error: null });
    await expect(recordAdminAudit(client, entry)).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("admin_audit_log");
    expect(insert).toHaveBeenCalledWith({ ...entry, details: null, result: "success" });
  });

  it("logs a returned error instead of swallowing it, without throwing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = clientReturning({ error: { code: "42501", message: "permission denied" } });
    await expect(recordAdminAudit(client, entry)).resolves.toBe(false);
    expect(spy).toHaveBeenCalledWith("admin_audit_log insert failed:", "user.ban", expect.objectContaining({ code: "42501" }));
  });

  it("logs a thrown error without throwing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = clientReturning(new Error("network down"));
    await expect(recordAdminAudit(client, entry)).resolves.toBe(false);
    expect(spy).toHaveBeenCalledWith("admin_audit_log insert threw:", "user.ban", expect.any(Error));
  });
});
