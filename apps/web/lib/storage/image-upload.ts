// ============================================
// Képfeltöltés — közös szabályok (kliens és szerver egyaránt használja)
// ============================================
// A fájl NEM megy át server actionön: a szerver aláírt feltöltési URL-t ad
// (createSignedUploadUrl), a böngésző közvetlenül a Storage-ba tölt.
// Ok (2026-10-31, L-1): a Next.js server action törzskorlátja alapból 1 MB,
// így a nagyobb fotók feltöltése korábban kivétellel elbukott.
// Az útvonal első szintje mindig a feltöltő azonosítója — erre épül a
// 058-as storage-szabály (írás csak a saját mappába).

export type ImageUploadKind = "cover" | "avatar";

export type ImageUploadRule = {
  bucket: "trip-covers" | "avatars";
  maxMb: number;
  mimeTypes: readonly string[];
};

export const IMAGE_UPLOAD_RULES: Record<ImageUploadKind, ImageUploadRule> = {
  cover: {
    bucket: "trip-covers",
    maxMb: 10,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  avatar: {
    bucket: "avatars",
    maxMb: 5,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type ImageUploadProblem = "unsupportedFileFormat" | "fileTooLarge" | "emptyFile";

export function maxBytes(kind: ImageUploadKind): number {
  return IMAGE_UPLOAD_RULES[kind].maxMb * 1024 * 1024;
}

export function validateImageUpload(
  kind: ImageUploadKind,
  file: { type: string; size: number }
): ImageUploadProblem | null {
  const rule = IMAGE_UPLOAD_RULES[kind];
  if (!rule.mimeTypes.includes(file.type)) return "unsupportedFileFormat";
  if (file.size <= 0) return "emptyFile";
  if (file.size > maxBytes(kind)) return "fileTooLarge";
  return null;
}

/** `{userId}/{időbélyeg}-{véletlen}.{kiterjesztés}` — a kiterjesztés a MIME-típusból jön, nem a fájlnévből. */
export function buildImageUploadPath(
  userId: string,
  mimeType: string,
  now: number = Date.now(),
  random: string = Math.random().toString(36).substring(2, 8)
): string {
  const ext = EXTENSION_BY_MIME[mimeType] ?? "jpg";
  return `${userId}/${now}-${random}.${ext}`;
}

export function acceptAttribute(kind: ImageUploadKind): string {
  return IMAGE_UPLOAD_RULES[kind].mimeTypes.join(",");
}
