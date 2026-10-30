/**
 * Borítókép next/image-dzsel (Norbert, 2026-10-30, C9: a borítóképek next/image-re, a többi <img> marad).
 * `fill` elrendezés: a szülő pozicionált, méretezett doboz. Az optimalizáló csak a next.config
 * `images.remotePatterns` hostjaira fut (Supabase Storage, Unsplash, helyi /public); más hostról jövő
 * képnél `unoptimized`, hogy ismeretlen URL ne dobjon futásidejű hibát.
 */

import Image from "next/image";

const OPTIMIZABLE: RegExp[] = [
  /^\/(?!\/)/, // helyi, /public
  /^https:\/\/rpwajsbxrvypeqaalhvd\.supabase\.co\/storage\/v1\/object\/public\//,
  /^https:\/\/images\.unsplash\.com\//,
];

export function isOptimizableImageSrc(src: string): boolean {
  return OPTIMIZABLE.some((re) => re.test(src));
}

interface CoverImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** a `sizes` attribútum — a kártya tényleges szélessége szerint (pl. "(min-width: 768px) 33vw, 100vw") */
  sizes?: string;
  priority?: boolean;
}

export function CoverImage({ src, alt = "", className = "object-cover", sizes = "100vw", priority = false }: CoverImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizableImageSrc(src)}
      className={className}
    />
  );
}
