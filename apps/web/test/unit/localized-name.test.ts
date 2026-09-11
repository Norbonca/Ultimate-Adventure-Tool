/**
 * Unit tests for `apps/web/lib/i18n/localized.ts`.
 *
 * Regressziós védelem az M021 Timeline nyelvesítéséhez: a sablonból jövő
 * fázis/mérföldkő/feladat nevek locale szerint jelennek meg, kézi átnevezés
 * (üres name_localized) esetén a beírt név érvényes minden nyelven.
 */

import { describe, it, expect } from 'vitest';
import { getLocalizedName, getLocalizedText } from '@/lib/i18n/localized';

describe('UNIT-i18n-localized', () => {
  const fromTemplate = { name: 'Registration', name_localized: { hu: 'Regisztráció', en: 'Registration' } };

  it('hu locale → magyar fordítás', () => {
    expect(getLocalizedName(fromTemplate, 'hu')).toBe('Regisztráció');
  });

  it('en locale → angol fordítás', () => {
    expect(getLocalizedName(fromTemplate, 'en')).toBe('Registration');
  });

  it('ismeretlen locale → alapnév', () => {
    expect(getLocalizedName(fromTemplate, 'de')).toBe('Registration');
  });

  it('kézi átnevezés (üres name_localized) → a beírt név minden nyelven', () => {
    const renamed = { name: 'Saját fázis', name_localized: {} };
    expect(getLocalizedName(renamed, 'hu')).toBe('Saját fázis');
    expect(getLocalizedName(renamed, 'en')).toBe('Saját fázis');
  });

  it('null / hiányzó name_localized → alapnév', () => {
    expect(getLocalizedName({ name: 'X', name_localized: null }, 'hu')).toBe('X');
    expect(getLocalizedName({ name: 'X' }, 'hu')).toBe('X');
  });

  it('üres string fordítás → alapnév', () => {
    expect(getLocalizedName({ name: 'X', name_localized: { hu: '  ' } }, 'hu')).toBe('X');
  });

  it('getLocalizedText: leírás feloldása és null átengedése', () => {
    expect(getLocalizedText('Basic', { hu: 'Alap' }, 'hu')).toBe('Alap');
    expect(getLocalizedText('Basic', {}, 'hu')).toBe('Basic');
    expect(getLocalizedText(null, null, 'hu')).toBeNull();
  });
});
