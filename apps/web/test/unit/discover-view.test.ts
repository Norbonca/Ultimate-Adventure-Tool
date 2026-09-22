import { describe, expect, it } from 'vitest';
import { getTranslations } from '@uat/i18n';
import { DEFAULT_DISCOVER_VIEW, DISCOVER_VIEWS, DISCOVER_VIEW_COOKIE, parseDiscoverView } from '@/lib/discover-view';

describe('discover view', () => {
  it('a csempés nézet az alapértelmezés, a 3D térkép és a lista választható', () => {
    expect(DEFAULT_DISCOVER_VIEW).toBe('grid');
    expect([...DISCOVER_VIEWS]).toEqual(['grid', 'globe', 'list']);
  });

  it('a cookie értékét elfogadja, ismeretlen értéknél csempére esik', () => {
    expect(parseDiscoverView('globe')).toBe('globe');
    expect(parseDiscoverView('list')).toBe('list');
    expect(parseDiscoverView('grid')).toBe('grid');
    expect(parseDiscoverView('xyz')).toBe('grid');
    expect(parseDiscoverView(undefined)).toBe('grid');
  });

  it('új cookie-név, hogy a korábbi választás ne takarja el a csempéket', () => {
    expect(DISCOVER_VIEW_COOKIE).toBe('trevu-discover-view-v2');
  });

  it('a magyar szervezői CTA természetes mondatot használ', () => {
    expect(getTranslations('hu').discover.ctaTitle).toBe(
      'Készen állsz a saját kalandod megszervezésére?'
    );
  });
});
