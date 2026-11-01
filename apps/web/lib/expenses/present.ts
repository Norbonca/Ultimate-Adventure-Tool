import { formatMoney } from '@/lib/currency';
import type { ExpenseCategory } from './schemas';

/** Cent → lokalizált pénzösszeg (a pénznem tizedeseit az Intl adja; HUF 0 tizedes). */
export const money = (cents: number, currency: string, locale: string) => formatMoney(cents / 100, currency, locale);

/** Icon Bank kulcsok (a meglévő bankból — a D04 anchor/bed/fuel ikonjai helyett a bankban lévő megfelelők). */
export const CATEGORY_ICON: Record<ExpenseCategory, string> = {
  food_drinks: 'shopping-cart',
  accommodation: 'tent',
  transport_fuel: 'route',
  activities: 'ticket',
  gear_equipment: 'backpack',
  marina_berth: 'waves',
};

export const CATEGORY_KEY: Record<ExpenseCategory, string> = {
  food_drinks: 'expenses.categories.foodDrinks',
  accommodation: 'expenses.categories.accommodation',
  transport_fuel: 'expenses.categories.transportFuel',
  activities: 'expenses.categories.activities',
  gear_equipment: 'expenses.categories.gearEquipment',
  marina_berth: 'expenses.categories.marinaBerth',
};

/** A 065 árfolyam-irányát (1 elszámolási = rate × tétel) a felhasználónak olvasható alakra hozza: „1 € = 1,0892 $”. */
export function rateLabel(rate: number, settlementCurrency: string, itemCurrency: string, locale: string): string {
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'hu-HU', { maximumFractionDigits: rate < 1 ? 6 : 4 });
  const one = formatMoney(1, settlementCurrency, locale, { maximumFractionDigits: 0 });
  return `${one} = ${nf.format(rate)} ${itemCurrency}`;
}

export const dateLabel = (iso: string | null, locale: string) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'hu-HU', { month: 'short', day: 'numeric' }) : '';

/** DB-érték → i18n kulcsrész (a nyelvi kulcsok lowerCamel-ek). */
export const FX_MODE_KEY: Record<string, string> = { expense_date: 'expenseDate', settlement_date: 'settlementDate', fixed: 'fixed' };
export const METHOD_KEY: Record<string, string> = { cash: 'cash', bank_transfer: 'bankTransfer', stripe: 'bankTransfer' };
