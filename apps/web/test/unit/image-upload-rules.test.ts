import { describe, expect, it } from "vitest";
import {
  acceptAttribute,
  buildImageUploadPath,
  maxBytes,
  validateImageUpload,
} from "@/lib/storage/image-upload";

describe("validateImageUpload", () => {
  it("accepts a 9.9 MB JPEG cover and rejects 10 MB + 1 byte", () => {
    expect(validateImageUpload("cover", { type: "image/jpeg", size: maxBytes("cover") })).toBeNull();
    expect(validateImageUpload("cover", { type: "image/jpeg", size: maxBytes("cover") + 1 })).toBe("fileTooLarge");
  });
  it("limits avatars to 5 MB and JPEG/PNG/WebP", () => {
    expect(maxBytes("avatar")).toBe(5 * 1024 * 1024);
    expect(validateImageUpload("avatar", { type: "image/avif", size: 10 })).toBe("unsupportedFileFormat");
    expect(validateImageUpload("avatar", { type: "image/heic", size: 10 })).toBe("unsupportedFileFormat");
  });
  it("rejects empty files", () => {
    expect(validateImageUpload("cover", { type: "image/png", size: 0 })).toBe("emptyFile");
  });
});

describe("buildImageUploadPath", () => {
  it("puts the file into the uploader's folder with an extension derived from the MIME type", () => {
    expect(buildImageUploadPath("u1", "image/jpeg", 123, "abc")).toBe("u1/123-abc.jpg");
    expect(buildImageUploadPath("u1", "image/webp", 123, "abc")).toBe("u1/123-abc.webp");
  });
  it("ignores misleading file names (no name input at all)", () => {
    expect(buildImageUploadPath("u1", "image/png", 1, "x")).toBe("u1/1-x.png");
  });
});

it("builds the accept attribute from the rules", () => {
  expect(acceptAttribute("avatar")).toBe("image/jpeg,image/png,image/webp");
  expect(acceptAttribute("cover")).toBe("image/jpeg,image/png,image/webp,image/avif");
});
