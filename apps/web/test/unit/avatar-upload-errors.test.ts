import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), user: { id: "own" } as { id: string } | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) }, storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: "https://local.test/avatar.png" } }) }) } }) }));
vi.mock("@/lib/i18n/server", () => ({ getServerT: async () => ({ t: (key: string, values?: {max: number}) => key + (values?.max ? `:${values.max}` : "") }) }));
import { uploadAvatar } from "@/app/(app)/settings/actions";
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "own" }; mocks.upload.mockResolvedValue({ error: null }); });
function file(type: string, size = 1) { const form = new FormData(); form.set("file", new File([new Uint8Array(size)], "test.png", { type })); return form; }
it("localizes unsupported formats without uploading", async () => { expect(await uploadAvatar(file("text/plain"))).toEqual({ url: "", error: "errors.unsupportedFileFormat" }); expect(mocks.upload).not.toHaveBeenCalled(); });
it("localizes the 5 MB size limit", async () => { expect(await uploadAvatar(file("image/png", 5*1024*1024+1))).toEqual({ url: "", error: "errors.fileTooLarge:5" }); expect(mocks.upload).not.toHaveBeenCalled(); });
it("does not expose raw storage errors", async () => { mocks.upload.mockResolvedValue({ error: { message: "bucket internals secret" } }); expect(await uploadAvatar(file("image/png"))).toEqual({ url: "", error: "errors.saveFailed" }); });
it("accepts valid PNG uploads", async () => { expect(await uploadAvatar(file("image/png"))).toEqual({ url: "https://local.test/avatar.png" }); });
