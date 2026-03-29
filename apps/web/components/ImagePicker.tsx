"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { uploadCoverImage, fetchCoverImages } from "@/app/(app)/trips/actions";
import { uploadAvatar, fetchSystemAvatars } from "@/app/(app)/settings/actions";

// ============================================
// ImagePicker — Közös képválasztó component
// Cover és Avatar módban is használható
// ============================================

interface ImagePickerProps {
  type: "cover" | "card" | "avatar";
  categoryId?: string;
  currentImageUrl?: string;
  currentSource?: "system" | "user_upload" | "oauth";
  onSelect: (url: string, source: "system" | "user_upload") => void;
  onClear?: () => void;
}

interface GalleryImage {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  alt_text: string;
  alt_text_localized?: Record<string, string> | null;
  photographer?: string | null;
  is_featured?: boolean;
  type?: string;
  tags?: string[];
  sort_order: number;
}

export function ImagePicker({
  type,
  categoryId,
  currentImageUrl,
  currentSource,
  onSelect,
  onClear,
}: ImagePickerProps) {
  const { t, locale } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [avatarTab, setAvatarTab] = useState<"icon" | "nature" | "abstract">("icon");

  // ── Load gallery images on toggle ──
  useEffect(() => {
    if (!showGallery) return;

    async function loadImages() {
      if (type === "cover" || type === "card") {
        const images = await fetchCoverImages(categoryId);
        setGalleryImages(images as GalleryImage[]);
      } else {
        const images = await fetchSystemAvatars();
        setGalleryImages(images as GalleryImage[]);
      }
    }
    loadImages();
  }, [showGallery, type, categoryId]);

  // ── File upload handler ──
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadError("");

      const fd = new FormData();
      fd.append("file", file);

      const result =
        type === "cover" || type === "card"
          ? await uploadCoverImage(fd)
          : await uploadAvatar(fd);

      setIsUploading(false);

      if (result.error) {
        setUploadError(result.error);
      } else {
        onSelect(result.url, "user_upload");
        setShowGallery(false);
      }

      // Reset input
      e.target.value = "";
    },
    [type, onSelect]
  );

  // ── Select gallery image ──
  const handleSelectGallery = useCallback(
    (url: string) => {
      onSelect(url, "system");
      setShowGallery(false);
    },
    [onSelect]
  );

  const isCover = type === "cover";
  const isCard = type === "card";
  const isImageType = isCover || isCard;
  const maxSize = isImageType ? "10 MB" : "5 MB";
  const acceptTypes = isImageType
    ? "image/jpeg,image/png,image/webp,image/avif"
    : "image/jpeg,image/png,image/webp";

  // Filter avatar images by tab
  const filteredImages =
    type === "avatar"
      ? galleryImages.filter((img) => img.type === avatarTab)
      : galleryImages;

  return (
    <div className="space-y-4">
      {/* ── Preview (when image selected) ── */}
      {currentImageUrl ? (
        <div className="relative">
          {isImageType ? (
            <div
              className={`rounded-xl bg-cover bg-center border border-slate-200 ${isCard ? "w-64 h-48" : "w-full h-48"}`}
              style={{ backgroundImage: `url(${currentImageUrl})` }}
            />
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full bg-cover bg-center border-2 border-teal-500"
                style={{ backgroundImage: `url(${currentImageUrl})` }}
              />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("imagePicker.avatar.current")}
                </p>
                <p className="text-xs text-slate-400">
                  {currentSource === "user_upload"
                    ? t("imagePicker.ownPhoto")
                    : currentSource === "oauth"
                    ? "OAuth"
                    : t("imagePicker.avatar.monogramDefault")}
                </p>
              </div>
            </div>
          )}

          {/* Own photo badge on cover preview */}
          {isImageType && currentSource === "user_upload" && (
            <span className="absolute bottom-3 right-3 text-[11px] font-semibold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-tl-lg">
              ✨ {t("imagePicker.ownPhoto")}
            </span>
          )}

          {/* Clear / Change button */}
          <button
            onClick={() => {
              onClear?.();
              setShowGallery(false);
            }}
            className={
              isImageType
                ? "absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
                : "mt-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            }
          >
            {isImageType ? "✕" : t("imagePicker.avatar.change")}
          </button>
        </div>
      ) : (
        <>
          {/* ── Upload zone ── */}
          <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-400 transition-colors cursor-pointer bg-white">
            <input
              type="file"
              accept={acceptTypes}
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <span className="text-sm text-slate-400 animate-pulse">
                {t("imagePicker.uploading")}
              </span>
            ) : (
              <>
                <svg
                  className="w-7 h-7 text-slate-300 mb-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-600">
                  {t("imagePicker.dragDrop")}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">
                  {t("imagePicker.maxSize").replace("{size}", maxSize)} · {t("imagePicker.acceptedFormats")}
                </span>
              </>
            )}
          </label>

          {uploadError && (
            <p className="text-xs text-red-500">{uploadError}</p>
          )}
        </>
      )}

      {/* ── Gallery toggle ── */}
      <button
        onClick={() => setShowGallery(!showGallery)}
        className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
      >
        {showGallery
          ? t("imagePicker.hideGallery")
          : t("imagePicker.chooseFromGallery")}
      </button>

      {/* ── Gallery grid ── */}
      {showGallery && (
        <div className="space-y-3">
          {/* Avatar tabs */}
          {type === "avatar" && (
            <div className="flex gap-1 border-b border-slate-200">
              {(
                [
                  { key: "icon" as const, label: t("imagePicker.avatar.tabIcons"), icon: "🏔️" },
                  { key: "nature" as const, label: t("imagePicker.avatar.tabNature"), icon: "🌄" },
                  { key: "abstract" as const, label: t("imagePicker.avatar.tabAbstract"), icon: "🎨" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAvatarTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                    avatarTab === tab.key
                      ? "border-teal-500 text-teal-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Image grid */}
          <div
            className={
              isImageType
                ? "grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1"
                : "grid grid-cols-4 gap-3 p-1"
            }
          >
            {filteredImages.map((img) => {
              const altText =
                (img.alt_text_localized as Record<string, string>)?.[locale] ||
                img.alt_text;

              return (
                <button
                  key={img.id}
                  onClick={() => handleSelectGallery(img.url)}
                  className={
                    isImageType
                      ? "relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-teal-500 transition-all hover:scale-[1.03] group"
                      : "relative aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-teal-500 transition-all hover:scale-105"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.thumbnail_url || img.url}
                    alt={altText}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Photographer credit (cover only) */}
                  {isImageType && img.photographer && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                      📷 {img.photographer}
                    </span>
                  )}
                  {/* Featured badge (cover only) */}
                  {isImageType && img.is_featured && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500" />
                  )}
                </button>
              );
            })}
          </div>

          {filteredImages.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              {t("imagePicker.uploading")}...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
