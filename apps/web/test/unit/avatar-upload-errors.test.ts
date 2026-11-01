import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  bucket: vi.fn(),
  user: { id: "own" } as { id: string } | null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    storage: {
      from: (bucket: string) => {
        mocks.bucket(bucket);
        return {
          createSignedUploadUrl: mocks.createSignedUploadUrl,
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://local.test/${bucket}/${path}` } }),
        };
      },
    },
  }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getServerT: async () => ({ t: (key: string, values?: { max: number }) => key + (values?.max ? `:${values.max}` : "") }),
}));
import { createAvatarUploadTicket } from "@/app/(app)/settings/actions";
import { createCoverUploadTicket } from "@/app/(app)/trips/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "own" };
  mocks.createSignedUploadUrl.mockImplementation(async (path: string) => ({ data: { path, token: "tok" }, error: null }));
});

it("localizes unsupported avatar formats without issuing a ticket", async () => {
  expect(await createAvatarUploadTicket({ type: "text/plain", size: 10 })).toEqual({ ok: false, error: "errors.unsupportedFileFormat" });
  expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled();
});

it("localizes the 5 MB avatar limit", async () => {
  expect(await createAvatarUploadTicket({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toEqual({ ok: false, error: "errors.fileTooLarge:5" });
  expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled();
});

it("rejects AVIF avatars but accepts AVIF covers", async () => {
  expect(await createAvatarUploadTicket({ type: "image/avif", size: 10 })).toEqual({ ok: false, error: "errors.unsupportedFileFormat" });
  expect((await createCoverUploadTicket({ type: "image/avif", size: 10 })).ok).toBe(true);
});

it("requires a session", async () => {
  mocks.user = null;
  expect(await createCoverUploadTicket({ type: "image/jpeg", size: 10 })).toEqual({ ok: false, error: "errors.sessionExpired" });
});

it("rejects malformed input", async () => {
  expect(await createCoverUploadTicket({ type: "", size: -1 } as never)).toEqual({ ok: false, error: "errors.noFileSelected" });
});

it("does not expose raw storage errors", async () => {
  mocks.createSignedUploadUrl.mockResolvedValue({ data: null, error: { message: "bucket internals secret" } });
  expect(await createAvatarUploadTicket({ type: "image/png", size: 10 })).toEqual({ ok: false, error: "errors.saveFailed" });
});

it("issues a cover ticket for a 3 MB photo into the uploader's own folder (L-1: no 1 MB server action body)", async () => {
  const ticket = await createCoverUploadTicket({ type: "image/jpeg", size: 3 * 1024 * 1024 });
  expect(mocks.bucket).toHaveBeenCalledWith("trip-covers");
  expect(ticket.ok).toBe(true);
  if (!ticket.ok) return;
  expect(ticket.path).toMatch(/^own\/\d+-[a-z0-9]+\.jpg$/);
  expect(ticket.token).toBe("tok");
  expect(ticket.publicUrl).toBe(`https://local.test/trip-covers/${ticket.path}`);
});

it("issues an avatar ticket into the avatars bucket", async () => {
  const ticket = await createAvatarUploadTicket({ type: "image/webp", size: 4 * 1024 * 1024 });
  expect(mocks.bucket).toHaveBeenCalledWith("avatars");
  expect(ticket.ok && ticket.path.startsWith("own/") && ticket.path.endsWith(".webp")).toBe(true);
});
