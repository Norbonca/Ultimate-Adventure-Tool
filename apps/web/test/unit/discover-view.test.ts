import { describe, expect, it } from 'vitest';
import { getTranslations } from '@uat/i18n';
import { DEFAULT_DISCOVER_VIEW, DISCOVER_VIEWS, DISCOVER_VIEW_COOKIE, parseDiscoverView } from '@/lib/discover-view';

describe('discover view', () => {
  it('a tömör sorlista az alapértelmezés, a csempe és a 3D térkép választható', () => {
    expect(DEFAULT_DISCOVER_VIEW).toBe('list');
    expect([...DISCOVER_VIEWS]).toEqual(['grid', 'globe', 'list']);
  });

  it('a cookie értékét elfogadja, ismeretlen értéknél az alapnézetre esik', () => {
    expect(parseDiscoverView('globe')).toBe('globe');
    expect(parseDiscoverView('list')).toBe('list');
    expect(parseDiscoverView('grid')).toBe('grid');
    expect(parseDiscoverView('xyz')).toBe('list');
    expect(parseDiscoverView(undefined)).toBe('list');
  });

  it('új cookie-név, hogy a korábbi választás ne takarja el az új alapnézetet', () => {
    expect(DISCOVER_VIEW_COOKIE).toBe('trevu-discover-view-v3');
  });

  it('a magyar szervezői CTA természetes mondatot használ', () => {
    expect(getTranslations('hu').discover.ctaTitle).toBe(
      'Készen állsz a saját kalandod megszervezésére?'
    );
  });
});
