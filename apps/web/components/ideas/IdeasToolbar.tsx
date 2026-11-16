"use client";

/**
 * M22 — a Túraötletek lista kereső- és szűrősávja.
 *
 * Design: design/claude/D22b_Turaotletek#Lista (01 / Keresd meg + „Szűrők (n)”),
 * #Szuro_390 (mobil alsó lap). A Felfedezés (`/`) mintája: a kereső önálló, mono
 * címkés szakasz a hero alatt, a szűrők a `FilterSheet`-ben (mobilon alsó lap,
 * asztalon a gomb alatti panel).
 *
 * A lap szerveroldalon renderelődik, a szűrők az URL-ben élnek (NK-M22-001), ezért a
 * lap opciói **linkek**: a hívó adja a kész `href`-eket, ez a komponens csak a
 * megnyitást, a bezárást és a kiválasztott állapotot kezeli. Szöveget nem fordít.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { SearchPill, FilterSheet } from "@/components/ui";
import { SlidersHorizontal } from "@/lib/icons";

export interface IdeasSearchProps {
  /** A mező kezdőértéke (az URL `q` paramétere). */
  initialQuery: string;
  /** A keresés célútvonala a `q` nélkül, pl. `/ideas?category=…` — a `q` ehhez fűződik. */
  action: string;
  sectionLabel: string;
  placeholder: string;
  submitLabel: string;
  label: string;
  hint: string;
}

export function IdeasSearch({ initialQuery, action, sectionLabel, placeholder, submitLabel, label, hint }: IdeasSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  const submit = () => {
    const url = new URL(action, "https://ttvk.hu");
    const q = value.trim();
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    url.searchParams.delete("page");
    router.push(`${url.pathname}${url.search}`);
  };

  return (
    <div id="ideas-find" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-6 md:px-[120px] md:pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
        <p className="shrink-0 font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{sectionLabel}</p>
        <SearchPill
          className="w-full"
          value={value}
          onChange={setValue}
          onSubmit={submit}
          placeholder={placeholder}
          submitLabel={submitLabel}
          label={label}
          testId="ideas-search"
          inputTestId="ideas-search-query"
          submitTestId="ideas-search-submit"
        />
        <p className="shrink-0 text-sm text-ink-muted md:max-w-[220px]">{hint}</p>
      </div>
    </div>
  );
}

export interface IdeasFilterOption {
  label: string;
  href: string;
  selected: boolean;
  testId?: string;
}

export interface IdeasFilterGroup {
  key: string;
  label: string;
  options: IdeasFilterOption[];
}

export interface IdeasFiltersProps {
  groups: IdeasFilterGroup[];
  /** Hány szűrő aktív (a kategória nem számít bele: az a fülsorban látszik). */
  activeCount: number;
  clearHref: string;
  filtersLabel: string;
  filtersActiveLabel: string; // „Szűrők ({count})”
  closeLabel: string;
  clearLabel: string;
  applyLabel: string;
}

/** OptionChip-megjelenés, de link — a szűrés az URL-ben él. */
function ChipLink({ option, onNavigate }: { option: IdeasFilterOption; onNavigate: () => void }) {
  return (
    <Link
      href={option.href}
      onClick={onNavigate}
      role="radio"
      aria-checked={option.selected}
      data-testid={option.testId}
      className={[
        "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-trevu px-3.5 text-sm font-semibold transition-colors",
        "focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)",
        option.selected ? "bg-accent text-accent-on" : "border border-line bg-ghost text-ink hover:border-line-strong",
      ].join(" ")}
    >
      {option.label}
    </Link>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink-secondary">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function IdeasFilters({
  groups,
  activeCount,
  clearHref,
  filtersLabel,
  filtersActiveLabel,
  closeLabel,
  clearLabel,
  applyLabel,
}: IdeasFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="ideas-filters-open"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-trevu border border-line bg-ghost px-4 text-sm font-semibold text-ink hover:border-line-strong focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
      >
        <SlidersHorizontal size={16} aria-hidden />
        {activeCount > 0 ? filtersActiveLabel.replace("{count}", String(activeCount)) : filtersLabel}
      </button>

      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        title={filtersLabel}
        closeLabel={closeLabel}
        clearLabel={clearLabel}
        onClear={() => {
          setOpen(false);
          router.push(clearHref);
        }}
        applyLabel={applyLabel}
        testId="ideas-filter-sheet"
      >
        <div className="flex flex-col gap-5 pb-2">
          {groups.map((group) => (
            <Group key={group.key} label={group.label}>
              {group.options.map((option) => (
                <ChipLink key={option.href + option.label} option={option} onNavigate={() => setOpen(false)} />
              ))}
            </Group>
          ))}
        </div>
      </FilterSheet>
    </>
  );
}
