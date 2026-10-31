/** Discovery filters never convert currencies using implicit or stale exchange rates. */
export interface FilterableTrip {
  difficulty: number;
  price_amount: number | null;
  price_currency: string;
  start_date: string | null;
  end_date: string | null;
  max_participants: number;
  current_participants: number;
}

export const tripDurationDays = (trip: FilterableTrip): number | null => {
  if (!trip.start_date || !trip.end_date) return null;
  const start = Date.parse(`${trip.start_date.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${trip.end_date.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
};

export type Choice = string;

export interface AdvancedFilters {
  currency: Choice;
  difficulty: Choice;
  price: Choice;
  duration: Choice;
  spots: Choice;
}

export const NO_FILTERS: AdvancedFilters = { currency: 'all', difficulty: 'all', price: 'all', duration: 'all', spots: 'all' };

export function matchesAdvanced(trip: FilterableTrip, f: AdvancedFilters): boolean {
  if (f.currency !== 'all' && trip.price_currency !== f.currency) return false;
  if (f.difficulty !== 'all' && String(trip.difficulty) !== f.difficulty) return false;
  if (f.price !== 'all') {
    // A priced range is meaningful only within one explicit currency.
    if (f.price !== 'free' && f.currency === 'all') return false;
    const price = trip.price_amount || 0;
    if (f.price === 'free' && price > 0) return false;
    if (f.price === 'under50' && (price === 0 || price >= 50)) return false;
    if (f.price === '50-200' && (price < 50 || price > 200)) return false;
    if (f.price === '200-500' && (price < 200 || price > 500)) return false;
    if (f.price === '500+' && price < 500) return false;
  }
  if (f.duration !== 'all') {
    const days = tripDurationDays(trip);
    if (days === null) return false;
    if (f.duration === '1' && days > 1) return false;
    if (f.duration === '2-3' && (days < 2 || days > 3)) return false;
    if (f.duration === '4-7' && (days < 4 || days > 7)) return false;
    if (f.duration === '1-2w' && (days < 7 || days > 14)) return false;
    if (f.duration === '2w+' && days < 14) return false;
  }
  if (f.spots !== 'all') {
    const spots = trip.max_participants - (trip.current_participants || 0);
    if (f.spots === '1-3' && (spots < 1 || spots > 3)) return false;
    if (f.spots === '4-8' && (spots < 4 || spots > 8)) return false;
    if (f.spots === '9+' && spots < 9) return false;
  }
  return true;
}

