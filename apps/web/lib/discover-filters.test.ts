import { describe, expect, it } from 'vitest';
import { matchesAdvanced, NO_FILTERS, tripDurationDays, type FilterableTrip } from './discover-filters';

const trip: FilterableTrip = { difficulty: 1, price_amount: 100, price_currency: 'EUR',
  start_date: '2027-03-28', end_date: '2027-03-29', max_participants: 8, current_participants: 0 };

describe('discovery price and calendar-day contracts', () => {
  it('includes both calendar days, including a daylight-saving boundary', () => {
    expect(tripDurationDays(trip)).toBe(2);
    expect(tripDurationDays({ ...trip, end_date: trip.start_date })).toBe(1);
    expect(matchesAdvanced(trip, { ...NO_FILTERS, duration: '1' })).toBe(false);
    expect(matchesAdvanced(trip, { ...NO_FILTERS, duration: '2-3' })).toBe(true);
  });
  it('does not classify missing, invalid or reversed dates as a one-day trip', () => {
    for (const end_date of [null, 'invalid', '2027-03-27']) {
      expect(tripDurationDays({ ...trip, end_date })).toBeNull();
      expect(matchesAdvanced({ ...trip, end_date }, { ...NO_FILTERS, duration: '1' })).toBe(false);
    }
  });
  it('never compares nominal amounts in different currencies', () => {
    const eurRange = { ...NO_FILTERS, currency: 'EUR', price: '50-200' };
    expect(matchesAdvanced(trip, eurRange)).toBe(true);
    expect(matchesAdvanced({ ...trip, price_currency: 'HUF' }, eurRange)).toBe(false);
    expect(matchesAdvanced(trip, { ...NO_FILTERS, price: '50-200' })).toBe(false);
    expect(matchesAdvanced({ ...trip, price_currency: 'HUF' }, { ...eurRange, currency: 'HUF' })).toBe(true);
  });
  it('keeps all currencies available before price filtering, and preserves free filtering', () => {
    expect(matchesAdvanced({ ...trip, price_currency: 'HUF' }, NO_FILTERS)).toBe(true);
    expect(matchesAdvanced({ ...trip, price_amount: null }, { ...NO_FILTERS, price: 'free' })).toBe(true);
    expect(matchesAdvanced(trip, { ...NO_FILTERS, price: 'free' })).toBe(false);
  });
});
