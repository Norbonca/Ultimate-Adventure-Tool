"use client";
/**
 * M151 — állapotsáv az admin áttekintő tetején (spec K-2, K-4, K-6).
 * Terv: design/D15_Admin.pen#Q3MGZ9 (komponens + 4 állapot a #VeTnM táblán), 1440 #sF2Ao, 390 #tbHY4.
 * Asztalon: összesítés + szolgáltatásonként egy pötty + „Részletek”; mobilon egysoros kártya-link.
 */
import Link from "next/link";
import type { TranslationKey } from "@uat/i18n";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { STRIP_ITEMS, affectedNames, formatClock, stripItemState, type DisplayState } from "./format";
import { STATE_STYLE } from "./StatusChip";
import { useSystemStatus } from "./useSystemStatus";

export function SystemStatusStrip() {
  const { t, locale } = useTranslation();
  const { data, failed, checking } = useSystemStatus();

  const stale = failed;
  const state: DisplayState = !data && !failed ? "wait" : stale ? "warn" : data!.overall.state;
  const leadIcon = !data && !failed ? "loader-2" : stale ? "wifi-off" : data!.overall.state === "ok" ? "activity" : STATE_STYLE[state].icon;
  const time = data ? formatClock(data.checkedAt, locale) : "";

  let title: string;
  let sub: string;
  if (!data && !failed) {
    title = t("admin.system.loading");
    sub = t("admin.system.loadingSub");
  } else if (stale) {
    title = t("admin.system.stale");
    sub = data ? t("admin.system.staleSub", { time }) : t("admin.system.staleNever");
  } else {
    const o = data!.overall;
    const names = affectedNames(o.affected, t);
    title =
      o.state === "ok"
        ? t("admin.system.overall.ok")
        : o.state === "warn"
          ? t("admin.system.overall.warn", { count: o.warn + o.down })
          : t("admin.system.overall.down", { names: affectedNames(data!.checks.filter((c) => c.critical && c.state === "down").map((c) => c.key), t) });
    sub = o.state === "ok" ? `${t("admin.system.lastCheck", { time })} · ${t("admin.system.autoRefresh")}` : `${t("admin.system.lastCheck", { time })} · ${names}`;
  }
  const mobileSub = data && !stale ? `${t("admin.system.summary", { ok: data.overall.ok, total: data.overall.total })} · ${time}` : sub;
  const s = STATE_STYLE[state];

  const lead = (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${s.soft} ${s.iconColor}`}>
        <Icon name={leadIcon} size={18} className={!data && !failed ? "motion-safe:animate-spin" : undefined} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink" role="status" aria-live="polite">
          {title}
        </p>
        <p className="truncate text-xs text-ink-muted md:hidden">{mobileSub}</p>
        <p className="hidden text-xs text-ink-muted md:block">{sub}</p>
      </div>
    </div>
  );

  return (
    <section aria-label={t("admin.system.title")} aria-busy={checking} className="mb-6">
      {/* Mobil: az egész kártya link, ≥ 44 px célterület (#tbHY4) */}
      <Link
        href="/admin/system"
        className="flex min-h-[64px] items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 md:hidden"
      >
        <div className="min-w-0 flex-1">{lead}</div>
        <Icon name="chevron-right" size={20} className="shrink-0 text-accent" label={t("admin.system.details")} />
      </Link>

      {/* Asztal (#Q3MGZ9) */}
      <div className="hidden items-center gap-5 rounded-xl border border-line bg-surface px-5 py-3.5 md:flex">
        <div className="min-w-0 shrink-0 lg:max-w-[320px]">{lead}</div>
        <ul className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 lg:flex">
          {STRIP_ITEMS.map((item) => {
            const st: DisplayState = data ? stripItemState(item, data.checks) : "wait";
            return (
              <li key={item} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className={`h-2 w-2 rounded-full ${STATE_STYLE[st].dot}`} aria-hidden="true" />
                {t(`admin.system.short.${item}` as TranslationKey)}
                <span className="sr-only">: {t(`admin.system.state.${st}` as TranslationKey)}</span>
              </li>
            );
          })}
        </ul>
        <Link href="/admin/system" className="ml-auto flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline">
          {t("admin.system.details")}
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </section>
  );
}
