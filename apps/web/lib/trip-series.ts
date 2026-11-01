/**
 * M024 Túrasorozat — a Discover-kártyák összevonása.
 *
 * Spec: modules/02_Trip_Management/024_Trip_Series/00_Uzleti_Specifikacio.md §6.2 (K-1…K-11).
 * Minden időpont önálló túra; csak a kártya vonja össze az azonos `series_id`-jú, látható túrákat.
 * Tiszta függvény: a hívó adja a szűrt + rendezett listát (`ordered`) és az összes látható túrát (`all`).
 */

export interface SeriesTrip {
  id: string;
  series_id?: string | null;
  start_date: string | null;
  price_amount: number | null;
  price_currency: string;
}

export interface SeriesPrice {
  amount: number | null;
  currency: string;
  /** Eltérő árak (vagy pénznemek) → „…-tól” (K-4). */
  from: boolean;
}

export type DiscoverCard<T extends SeriesTrip> =
  | { kind: 'single'; key: string; trip: T }
  | {
      kind: 'series';
      key: string;
      seriesId: string;
      /** K-3: a kártya adatai (cím, kép, hely, szervező) és a fő link innen jönnek. */
      representative: T;
      /** K-5/K-8: legfeljebb 3 jövőbeli, a szűrőknek megfelelő időpont, időrendben. */
      rows: T[];
      /** A sorokon kívüli jövőbeli időpontok száma („+N további időpont”). */
      moreCount: number;
      /** K-6: az időpontok száma a chipen. */
      dateCount: number;
      price: SeriesPrice;
    };

export const SERIES_MAX_ROWS = 3;

const byStart = <T extends SeriesTrip>(a: T, b: T) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999');
const isUpcoming = (trip: SeriesTrip, today: string) => !!trip.start_date && trip.start_date >= today;

/** K-4: ár a sorozat időpontjaiból. */
export function seriesPrice<T extends SeriesTrip>(trips: T[], representative: T): SeriesPrice {
  const currencies = new Set(trips.map((trip) => trip.price_currency || 'EUR'));
  if (currencies.size > 1) {
    return { amount: representative.price_amount, currency: representative.price_currency, from: true };
  }
  const amounts = trips.map((trip) => (trip.price_amount && trip.price_amount > 0 ? trip.price_amount : 0));
  const min = Math.min(...amounts);
  return {
    amount: min > 0 ? min : null,
    currency: representative.price_currency,
    from: new Set(amounts).size > 1,
  };
}

/**
 * Kártyák a Discoverhez.
 * @param ordered a szűrőknek megfelelő túrák a megjelenítési sorrendben
 * @param all     minden látható túra (a sorozat teljes képéhez: chip, „+N”, ár)
 * @param today   ÉÉÉÉ-HH-NN (UTC nap), a jövőbeli időpontok határa
 */
export function groupTripsForDiscover<T extends SeriesTrip>(ordered: T[], all: T[], today: string): DiscoverCard<T>[] {
  const bySeries = new Map<string, T[]>();
  for (const trip of all) {
    if (!trip.series_id) continue;
    const list = bySeries.get(trip.series_id) ?? [];
    list.push(trip);
    bySeries.set(trip.series_id, list);
  }

  const cards: DiscoverCard<T>[] = [];
  const seen = new Set<string>();
  for (const trip of ordered) {
    const seriesId = trip.series_id;
    const members = seriesId ? bySeries.get(seriesId) : undefined;
    // K-1, K-11: sorozat nélkül vagy egyetlen látható időponttal normál kártya.
    if (!seriesId || !members || members.length < 2) {
      cards.push({ kind: 'single', key: trip.id, trip });
      continue;
    }
    if (seen.has(seriesId)) continue;
    seen.add(seriesId);

    const matched = ordered.filter((other) => other.series_id === seriesId);
    const matchedUpcoming = matched.filter((other) => isUpcoming(other, today)).sort(byStart);
    const upcomingAll = members.filter((other) => isUpcoming(other, today)).sort(byStart);
    // K-3: a legközelebbi jövőbeli (szűrőnek megfelelő) időpont; ha mind lezajlott, a legutóbbi.
    const representative = matchedUpcoming[0] ?? [...matched].sort(byStart).at(-1) ?? trip;
    const rows = matchedUpcoming.slice(0, SERIES_MAX_ROWS);

    cards.push({
      kind: 'series',
      key: `series-${seriesId}`,
      seriesId,
      representative,
      rows,
      moreCount: Math.max(0, upcomingAll.length - rows.length),
      dateCount: upcomingAll.length || members.length,
      price: seriesPrice(upcomingAll.length ? upcomingAll : members, representative),
    });
  }
  return cards;
}

/** A mai nap UTC-ben, ÉÉÉÉ-HH-NN — a túrák dátuma napként értendő (UTC). */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
