/**
 * Discover hero search — the "Hova?" (where / what) and "Mikor?" (when) fields.
 *
 * Spec: modules/09_Search/01_Funkcionalis_Specifikacio.md, US-M09-001 (free-text
 * search on title, description, location, organizer, category, sub-discipline)
 * and US-M09-002 (date filter). Client-side, on the trips the Discover page has
 * already loaded; the server-side search index (M09) replaces it later.
 *
 * Both fields are free text so the hero keeps its designed look (D02 `RNDGS`):
 * the "when" field understands a year, month names (HU/EN, with Hungarian
 * suffixes), month ranges ("2027 jan–márc"), seasons and an exact date.
 */

/** Lower-case, accent-free, single-spaced — "Horvátország" matches "horvatorszag". */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every whitespace-separated query word must appear somewhere in the haystack. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const text = normalizeSearchText(haystack);
  return words.every((word) => text.includes(word));
}

const regionNameCache = new Map<string, string>();

/** Country code → its Hungarian and English name, so "Horvátország" and "Croatia" both find `HR`. */
export function countryNames(code: string | null | undefined): string {
  if (!code) return '';
  const key = code.toUpperCase();
  const cached = regionNameCache.get(key);
  if (cached !== undefined) return cached;
  const names: string[] = [key];
  for (const locale of ['hu', 'en']) {
    try {
      const name = new Intl.DisplayNames([locale], { type: 'region' }).of(key);
      if (name && name !== key) names.push(name);
    } catch {
      // Not a region code — keep the raw value only.
    }
  }
  const joined = names.join(' ');
  regionNameCache.set(key, joined);
  return joined;
}

type Localized = Record<string, string> | null | undefined;
type Named = { name: string; name_localized?: Localized };
type OneOrMany<T> = T | T[] | null | undefined;

export interface SearchableTrip {
  title: string;
  short_description?: string | null;
  description?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  categories?: OneOrMany<Named>;
  sub_disciplines?: OneOrMany<Named>;
  profiles?: OneOrMany<{ display_name: string | null }>;
}

const asList = <T,>(value: OneOrMany<T>): T[] => (value ? (Array.isArray(value) ? value : [value]) : []);

const namesOf = (item: Named): string[] => [item.name, ...Object.values(item.name_localized ?? {})];

/**
 * All searchable text of a trip in one string. `extraCategoryNames` carries the
 * display names that live in code (CATEGORY_DISPLAY), not in the database.
 */
export function buildTripSearchText(trip: SearchableTrip, extraCategoryNames: string[] = []): string {
  return [
    trip.title,
    trip.short_description,
    trip.description,
    trip.location_city,
    trip.location_region,
    countryNames(trip.location_country),
    ...asList(trip.categories).flatMap(namesOf),
    ...extraCategoryNames,
    ...asList(trip.sub_disciplines).flatMap(namesOf),
    ...asList(trip.profiles).map((p) => p.display_name),
  ]
    .filter(Boolean)
    .join(' • ');
}

// ── "Mikor?" ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Array<[string, number]> = [
  ['januar', 1], ['februar', 2], ['marcius', 3], ['aprilis', 4], ['majus', 5], ['junius', 6],
  ['julius', 7], ['augusztus', 8], ['szeptember', 9], ['oktober', 10], ['november', 11], ['december', 12],
  ['january', 1], ['february', 2], ['march', 3], ['april', 4], ['may', 5], ['june', 6],
  ['july', 7], ['august', 8], ['september', 9], ['october', 10],
];

const SEASONS: Array<[string, number[]]> = [
  ['tavas', [3, 4, 5]], ['spring', [3, 4, 5]],
  ['nyar', [6, 7, 8]], ['summer', [6, 7, 8]],
  ['ossz', [9, 10, 11]], ['osz', [9, 10, 11]], ['autumn', [9, 10, 11]], ['fall', [9, 10, 11]],
  ['tel', [12, 1, 2]], ['winter', [12, 1, 2]],
];

/** "jún", "június", "júniusban", "june" → 6. At least three letters, so "ma" never matches. */
function monthOf(token: string): number | null {
  if (token.length < 3 || !/^[a-z]+$/.test(token)) return null;
  for (const [name, month] of MONTH_NAMES) {
    if (name.startsWith(token) || token.startsWith(name)) return month;
  }
  return null;
}

function seasonOf(token: string): number[] | null {
  for (const [stem, months] of SEASONS) {
    if (token.startsWith(stem)) return months;
  }
  return null;
}

export interface WhenFilter {
  /** Nothing recognisable in the text — the page shows no match rather than ignoring the field. */
  invalid: boolean;
  day?: string;
  years?: Set<number>;
  months?: Set<number>;
  /** Inclusive year-month range as `year * 12 + (month - 1)`. */
  from?: number;
  to?: number;
}

const ym = (year: number, month: number) => year * 12 + (month - 1);
const pad = (n: number) => String(n).padStart(2, '0');

/** Parses the "Mikor?" field. Returns `null` for an empty field (no date filter). */
export function parseWhen(input: string): WhenFilter | null {
  const text = normalizeSearchText(input);
  if (!text) return null;

  const exact = text.match(/\b((?:19|20)\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\b/);
  if (exact) {
    const [year, month, day] = [Number(exact[1]), Number(exact[2]), Number(exact[3])];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { invalid: false, day: `${year}-${pad(month)}-${pad(day)}` };
    }
  }

  const tokens = text.replace(/[–—-]/g, ' - ').replace(/[.,/]/g, ' ').split(' ').filter(Boolean);
  type Atom = { kind: 'year'; value: number } | { kind: 'months'; value: number[] } | { kind: 'dash' };
  const atoms: Atom[] = [];
  for (const token of tokens) {
    if (token === '-') { atoms.push({ kind: 'dash' }); continue; }
    if (/^(19|20)\d{2}$/.test(token)) { atoms.push({ kind: 'year', value: Number(token) }); continue; }
    const previous = atoms[atoms.length - 1];
    if (/^\d{1,2}$/.test(token) && previous?.kind === 'year' && Number(token) >= 1 && Number(token) <= 12) {
      atoms.push({ kind: 'months', value: [Number(token)] });
      continue;
    }
    const month = monthOf(token);
    if (month) { atoms.push({ kind: 'months', value: [month] }); continue; }
    const season = seasonOf(token);
    if (season) atoms.push({ kind: 'months', value: season });
    // Anything else ("-ban", "és", "or") is filler.
  }

  const years = atoms.filter((a) => a.kind === 'year').map((a) => a.value as number);
  const monthAtoms = atoms.filter((a) => a.kind === 'months');
  if (years.length === 0 && monthAtoms.length === 0) return { invalid: true };

  // A range: "<month> – <month>", each side optionally with its own year.
  const dash = atoms.findIndex((a) => a.kind === 'dash');
  if (dash > 0) {
    const left = atoms.slice(0, dash);
    const right = atoms.slice(dash + 1);
    const leftMonth = [...left].reverse().find((a) => a.kind === 'months');
    const rightMonth = right.find((a) => a.kind === 'months');
    const leftYear = left.find((a) => a.kind === 'year');
    const rightYear = right.find((a) => a.kind === 'year');
    if (leftMonth && rightMonth) {
      const m1 = (leftMonth.value as number[])[0];
      const m2 = (rightMonth.value as number[]).slice(-1)[0];
      const y1 = (leftYear?.value as number | undefined) ?? (rightYear?.value as number | undefined);
      const y2 = (rightYear?.value as number | undefined) ?? y1;
      if (y1 !== undefined && y2 !== undefined) {
        const from = ym(y1, m1);
        // "2027 nov – feb" means the February after.
        const to = ym(y2, m2) >= from ? ym(y2, m2) : ym(y2 + 1, m2);
        return { invalid: false, from, to };
      }
      const months = new Set<number>();
      for (let m = m1, guard = 0; guard < 12; guard++, m = (m % 12) + 1) {
        months.add(m);
        if (m === m2) break;
      }
      return { invalid: false, months };
    }
  }

  return {
    invalid: false,
    years: years.length ? new Set(years) : undefined,
    months: monthAtoms.length ? new Set(monthAtoms.flatMap((a) => a.value as number[])) : undefined,
  };
}

/** Does a trip running `start`…`end` (ISO dates) touch the period in the filter? */
export function tripMatchesWhen(filter: WhenFilter | null, start: string | null, end: string | null): boolean {
  if (!filter) return true;
  if (filter.invalid || !start) return false;
  const startDay = start.slice(0, 10);
  const endDay = (end ?? start).slice(0, 10);
  if (filter.day) return startDay <= filter.day && filter.day <= endDay;

  const [sy, sm] = startDay.split('-').map(Number);
  const [ey, em] = endDay.split('-').map(Number);
  const first = ym(sy, sm);
  const last = Math.max(first, ym(ey, em));
  for (let cur = first; cur <= last && cur - first < 36; cur++) {
    if (filter.from !== undefined && filter.to !== undefined) {
      if (cur >= filter.from && cur <= filter.to) return true;
      continue;
    }
    const year = Math.floor(cur / 12);
    const month = (cur % 12) + 1;
    if ((!filter.years || filter.years.has(year)) && (!filter.months || filter.months.has(month))) return true;
  }
  return false;
}
