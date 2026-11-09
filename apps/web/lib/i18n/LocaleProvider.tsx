"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { getLocale, setLocale, type Locale, DEFAULT_LOCALE } from "@uat/i18n";

/**
 * A szerver által feloldott olvasói nyelv (lib/i18n/server.ts `getServerLocale`) a kliens-komponenseknek.
 * Ettől a kliens-komponensek szerveroldali renderje és a hidratálás is ezen a nyelven fut — nem a modul
 * alapértékén (`hu`), és nem villan át a nyelv a betöltés után (Norbert, 2026-11-09: az olvasó nyelve dönt).
 */
const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  // Csatoláskor egyszer: a kliens modul-állapotát a gyerekek első renderje előtt a szerver nyelvére
  // állítjuk, hogy a hidratálás utáni pillanatkép (getLocale) egyezzen a szerverével.
  useState(() => {
    if (typeof window !== "undefined" && getLocale() !== locale) setLocale(locale);
    return true;
  });
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** A szerver által feloldott nyelv (provider nélkül az alapértelmezett). */
export function useServerLocale(): Locale {
  return useContext(LocaleContext) ?? DEFAULT_LOCALE;
}
