import { describe, expect, it } from 'vitest';
import { groupTripsForDiscover, seriesPrice, todayUtc, type SeriesTrip } from '@/lib/trip-series';

const t = (id: string, start: string, series: string | null = 'S', price = 450, currency = 'EUR'): SeriesTrip => ({
  id, series_id: series, start_date: start, price_amount: price, price_currency: currency,
});
const TODAY = '2027-01-01';

describe('M024 groupTripsForDiscover (K-1…K-11)', () => {
  it('K-1: only an explicit series merges; trips without series stay separate cards', () => {
    const a = t('a', '2027-05-10', null);
    const b = t('b', '2027-06-07', null);
    const cards = groupTripsForDiscover([a, b], [a, b], TODAY);
    expect(cards.map((c) => c.kind)).toEqual(['single', 'single']);
  });

  it('merges a series into one card at the position of its first matching trip; the count counts cards (K-9)', () => {
    const x = t('x', '2027-03-01', null);
    const s1 = t('s1', '2027-06-07');
    const s2 = t('s2', '2027-05-10');
    const cards = groupTripsForDiscover([s1, x, s2], [s1, x, s2], TODAY);
    expect(cards).toHaveLength(2);
    expect(cards[0].kind).toBe('series');
    expect(cards[1].kind).toBe('single');
  });

  it('K-3/K-5: representative is the nearest upcoming date, rows are upcoming, chronological, max 3, rest counted', () => {
    const trips = [t('d5', '2027-09-01'), t('d1', '2027-05-10'), t('past', '2026-10-01'), t('d3', '2027-07-05'), t('d2', '2027-06-07'), t('d4', '2027-08-02')];
    const [card] = groupTripsForDiscover(trips, trips, TODAY);
    if (card.kind !== 'series') throw new Error('expected series');
    expect(card.representative.id).toBe('d1');
    expect(card.rows.map((r) => r.id)).toEqual(['d1', 'd2', 'd3']);
    expect(card.moreCount).toBe(2);
    expect(card.dateCount).toBe(5);
  });

  it('K-8: with a filter the rows show the matching dates and the rest is counted in "+N"', () => {
    const all = [t('d1', '2027-05-10'), t('d2', '2027-06-07'), t('d3', '2027-07-05')];
    const [card] = groupTripsForDiscover([all[1]], all, TODAY);
    if (card.kind !== 'series') throw new Error('expected series');
    expect(card.representative.id).toBe('d2');
    expect(card.rows.map((r) => r.id)).toEqual(['d2']);
    expect(card.moreCount).toBe(2);
    expect(card.dateCount).toBe(3);
  });

  it('K-11: a series with a single visible date is a normal card', () => {
    const only = t('only', '2027-05-10');
    expect(groupTripsForDiscover([only], [only], TODAY)[0].kind).toBe('single');
  });

  it('K-3: when every date is in the past the latest one represents the card and there are no rows', () => {
    const all = [t('p1', '2026-05-10'), t('p2', '2026-08-10')];
    const [card] = groupTripsForDiscover(all, all, TODAY);
    if (card.kind !== 'series') throw new Error('expected series');
    expect(card.representative.id).toBe('p2');
    expect(card.rows).toEqual([]);
    expect(card.dateCount).toBe(2);
  });

  it('keeps two different series apart', () => {
    const all = [t('a1', '2027-05-10', 'A'), t('b1', '2027-05-11', 'B'), t('a2', '2027-06-10', 'A'), t('b2', '2027-06-11', 'B')];
    const cards = groupTripsForDiscover(all, all, TODAY);
    expect(cards.map((c) => c.key)).toEqual(['series-A', 'series-B']);
  });
});

describe('M024 seriesPrice (K-4)', () => {
  it('same price → the price, not "from"', () => {
    const trips = [t('a', '2027-05-10'), t('b', '2027-06-10')];
    expect(seriesPrice(trips, trips[0])).toEqual({ amount: 450, currency: 'EUR', from: false });
  });
  it('different prices → the lowest, "from"', () => {
    const trips = [t('a', '2027-05-10', 'S', 490), t('b', '2027-06-10', 'S', 450)];
    expect(seriesPrice(trips, trips[0])).toEqual({ amount: 450, currency: 'EUR', from: true });
  });
  it('mixed currencies never compare amounts: representative price, "from"', () => {
    const trips = [t('a', '2027-05-10', 'S', 189000, 'HUF'), t('b', '2027-06-10', 'S', 450, 'EUR')];
    expect(seriesPrice(trips, trips[0])).toEqual({ amount: 189000, currency: 'HUF', from: true });
  });
  it('a free date makes the series start from free', () => {
    const trips = [t('a', '2027-05-10', 'S', 0), t('b', '2027-06-10', 'S', 450)];
    expect(seriesPrice(trips, trips[1])).toEqual({ amount: null, currency: 'EUR', from: true });
  });
});

describe('todayUtc', () => {
  it('formats the UTC day', () => {
    expect(todayUtc(new Date('2027-05-10T23:30:00Z'))).toBe('2027-05-10');
  });
});
