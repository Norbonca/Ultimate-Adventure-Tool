import { describe, expect, it } from 'vitest';
import { canScroll, wheelAxis } from '@/components/discover/globe-wheel';

const box = (o: Partial<Parameters<typeof canScroll>[0]>) => ({
  scrollTop: 0, scrollLeft: 0, scrollHeight: 100, scrollWidth: 100, clientHeight: 100, clientWidth: 100, ...o,
});

describe('3D térkép — görgetés a kereten belül', () => {
  it('a fő irány a nagyobb elmozdulás tengelye; Shift + görgő vízszintes', () => {
    expect(wheelAxis({ deltaX: 0, deltaY: 40, shiftKey: false })).toBe('y');
    expect(wheelAxis({ deltaX: 30, deltaY: 5, shiftKey: false })).toBe('x');
    expect(wheelAxis({ deltaX: 0, deltaY: 40, shiftKey: true })).toBe('x');
  });

  it('a nem görgethető elem nem nyeli el a görgetést (a térkép kapja, nem az oldal)', () => {
    expect(canScroll(box({}), 'y', 40)).toBe(false);
    expect(canScroll(box({ scrollHeight: 100.5 }), 'y', 40)).toBe(false);
  });

  it('a kártya szövege görget, amíg van hová — a végén már nem', () => {
    const mid = box({ scrollHeight: 400, scrollTop: 100 });
    expect(canScroll(mid, 'y', 40)).toBe(true);
    expect(canScroll(mid, 'y', -40)).toBe(true);
    expect(canScroll(box({ scrollHeight: 400, scrollTop: 0 }), 'y', -40)).toBe(false);
    expect(canScroll(box({ scrollHeight: 400, scrollTop: 300 }), 'y', 40)).toBe(false);
  });

  it('a tokensor vízszintesen görget', () => {
    expect(canScroll(box({ scrollWidth: 300, scrollLeft: 0 }), 'x', 30)).toBe(true);
    expect(canScroll(box({ scrollWidth: 300, scrollLeft: 200 }), 'x', 30)).toBe(false);
    expect(canScroll(box({ scrollWidth: 300 }), 'x', 0)).toBe(false);
  });
});
