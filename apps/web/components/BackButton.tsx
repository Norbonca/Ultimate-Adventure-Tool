"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallback: string;
  label: string;
}

export function BackButton({ fallback, label }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <div className="bg-white border-b border-navy-100 px-6 sm:px-12 py-2.5">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-trevu-600 transition-colors font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M5 12l7-7M5 12l7 7" />
        </svg>
        {label}
      </button>
    </div>
  );
}
