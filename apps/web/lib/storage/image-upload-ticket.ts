// ============================================
// Képfeltöltési jegy — csak szerveroldalon (server actionökből hívva)
// ============================================
// A szerver ellenőrzi a bejelentkezést, a típust és a méretet, majd aláírt
// feltöltési URL-t ad a feltöltő saját mappájára. A fájlt a böngésző tölti fel
// (uploadToSignedUrl); a bucket méretkorlátja és a 058-as storage-szabály
// a Storage oldalán is véd.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import {
  IMAGE_UPLOAD_RULES,
  buildImageUploadPath,
  validateImageUpload,
  type ImageUploadKind,
} from "./image-upload";

const uploadRequestSchema = z.object({
  type: z.string().min(1).max(100),
  size: z.number().int().nonnegative(),
});

export type ImageUploadTicket =
  | { ok: true; bucket: string; path: string; token: string; publicUrl: string }
  | { ok: false; error: string };

export async function issueImageUploadTicket(
  kind: ImageUploadKind,
  input: unknown
): Promise<ImageUploadTicket> {
  const { t } = await getServerT();

  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("errors.noFileSelected") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("errors.sessionExpired") };

  const rule = IMAGE_UPLOAD_RULES[kind];
  const problem = validateImageUpload(kind, parsed.data);
  if (problem === "unsupportedFileFormat") return { ok: false, error: t("errors.unsupportedFileFormat") };
  if (problem === "fileTooLarge") return { ok: false, error: t("errors.fileTooLarge", { max: rule.maxMb }) };
  if (problem === "emptyFile") return { ok: false, error: t("errors.noFileSelected") };

  const path = buildImageUploadPath(user.id, parsed.data.type);
  const { data, error } = await supabase.storage.from(rule.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[image-upload] signed upload URL failed:", error?.message);
    return { ok: false, error: t("errors.saveFailed") };
  }

  const { data: publicUrl } = supabase.storage.from(rule.bucket).getPublicUrl(data.path);
  return { ok: true, bucket: rule.bucket, path: data.path, token: data.token, publicUrl: publicUrl.publicUrl };
}
