// Design: D02 `u1GfEE` cancelledBanner (desktop) + `v6Fr1a` cancelledBannerM (390) — BR-M02-009.
// Server-safe (no hooks): the trip detail page passes pre-translated strings.
import { Icon } from "@/components/Icon";

interface TripCancelledBannerProps {
  title: string;
  meta: string;
  message: string | null;
  organizerName: string | null;
  note: string;
}

export function TripCancelledBanner({ title, meta, message, organizerName, note }: TripCancelledBannerProps) {
  return (
    <section
      role="status"
      aria-labelledby="trip-cancelled-title"
      className="flex gap-3 sm:gap-3.5 rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-subtle)] p-3.5 sm:px-5 sm:py-4"
    >
      <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 text-[var(--color-warning)]">
        <Icon name="calendar" size={20} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 id="trip-cancelled-title" className="text-base font-semibold text-navy-900">
          {title}
        </h2>
        <p className="text-[13px] text-navy-600">{meta}</p>
        {message && (
          <blockquote className="mt-1.5 rounded-trevu bg-white px-3.5 py-2.5 text-sm leading-relaxed text-navy-900 break-words">
            „{message}”{organizerName ? ` — ${organizerName}` : ""}
          </blockquote>
        )}
        <p className="text-xs text-navy-500 pt-0.5">{note}</p>
      </div>
    </section>
  );
}
