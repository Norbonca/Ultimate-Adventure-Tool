"use client";

/**
 * SearchPill — lebegő pirula-kereső (Brand Guide v2 §6, „SearchBar pill”).
 *
 * Design: design/D00_Core_Components.pen#dtNrg (D02 másolat #oNfWS),
 * képernyőn: design/D02_Trip_Management.pen#H1rRQE (1440), #l87Il (390).
 * 56 px magas, keret --color-border-strong, háttér --color-glass + blur 12,
 * Keresés gomb teal pirula 40 px. Csak szemantikus tokenekből — Day és Night
 * felületen is helyes. Szöveget nem fordít: a hívó adja át `t()`-ből.
 */

import type { FormEvent } from "react";
import { Search } from "@/lib/icons";

export interface SearchPillProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
  /** Az űrlap akadálymentes neve (role="search"). */
  label: string;
  className?: string;
  testId?: string;
  inputTestId?: string;
  submitTestId?: string;
}

export function SearchPill({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  label,
  className,
  testId,
  inputTestId,
  submitTestId,
}: SearchPillProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={submit}
      data-testid={testId}
      className={[
        "flex h-14 w-full items-center gap-3 rounded-full border border-line-strong bg-glass py-2 pl-5 pr-2 backdrop-blur-md",
        "focus-within:border-accent focus-within:shadow-[var(--focus-ring)]",
        className ?? "",
      ].join(" ")}
    >
      <Search size={20} aria-hidden className="shrink-0 text-ink-muted" />
      <input
        type="search"
        enterKeyHint="search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={inputTestId}
        className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        placeholder={placeholder}
      />
      <button
        type="submit"
        data-testid={submitTestId}
        className="h-10 shrink-0 rounded-full bg-accent px-5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        {submitLabel}
      </button>
    </form>
  );
}
