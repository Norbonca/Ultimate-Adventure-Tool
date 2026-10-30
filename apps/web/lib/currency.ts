/**
 * Pénznem-formázás (rendszerspec §14.5, CODE-006).
 *
 * Egyetlen közös formázó: a tárolt ISO 4217 kód + az adott nyelv Intl-szabályai (szimbólum,
 * tizedesek — HUF/JPY/ISK/CLP 0 tizedes az Intl-ben is). Beégetett pénznemjel (€) a kódban nem maradhat.
 * A pénznemlista forrása a `ref_currencies` tábla (048: idegen kulcs), statikus lista sehol.
 */

export type MoneyLocale = "hu" | "en" | string;

function intlLocale(locale: MoneyLocale): string {
  if (locale === "en" || locale === "en-US") return "en-US";
  if (locale === "hu" || locale === "hu-HU") return "hu-HU";
  return locale;
}

/** Összeg a tárolt pénznemben, a nyelv szabályai szerint; ismeretlen kódnál `1 234,56 XYZ` alak. */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
  locale: MoneyLocale,
  options: { maximumFractionDigits?: number } = {}
): string {
  const value = Number(amount ?? 0);
  const code = (currency ?? "").toUpperCase();
  const loc = intlLocale(locale);
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(loc, {
        style: "currency",
        currency: code,
        ...(options.maximumFractionDigits !== undefined
          ? { minimumFractionDigits: 0, maximumFractionDigits: options.maximumFractionDigits }
          : {}),
      }).format(value);
    } catch {
      /* az Intl nem ismeri a kódot — lentebb szöveges tartalék */
    }
  }
  const num = new Intl.NumberFormat(loc, {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value);
  return code ? `${num} ${code}` : num;
}

export interface CurrencyOption {
  code: string;
  symbol: string | null;
  name_en: string;
  name_hu: string;
  decimal_digits: number;
}

let currencyCache: Promise<CurrencyOption[]> | null = null;

/** Aktív pénznemek a `ref_currencies` táblából (`/api/v1/reference`, 1 órás cache); hálózati hibánál üres lista. */
export function loadActiveCurrencies(): Promise<CurrencyOption[]> {
  if (!currencyCache) {
    currencyCache = fetch("/api/v1/reference")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { currencies?: CurrencyOption[] }) => j.currencies ?? [])
      .catch(() => {
        currencyCache = null;
        return [];
      });
  }
  return currencyCache;
}
