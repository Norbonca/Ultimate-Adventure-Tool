import { describe, expect, it } from 'vitest';
import { money } from '@/lib/expenses/present';

const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('money — GAP-012: a rögzített 2 tizedes nem vész el a kijelzésben', () => {
  it('egész HUF 0 tizedessel', () => {
    expect(norm(money(3_000_000, 'HUF', 'hu'))).toBe('30 000 Ft');
  });
  it('törtrészes HUF 2 tizedessel (hu, en)', () => {
    expect(norm(money(1_234_567, 'HUF', 'hu'))).toBe('12 345,67 Ft');
    expect(norm(money(1_234_567, 'HUF', 'en'))).toContain('12,345.67');
  });
  it('EUR változatlanul 2 tizedes', () => {
    expect(norm(money(5_050, 'EUR', 'hu'))).toContain('50,50');
    expect(norm(money(5_000, 'EUR', 'en'))).toContain('50.00');
  });
  it('negatív törtrész', () => {
    expect(norm(money(-1_234_567, 'HUF', 'hu'))).toBe('-12 345,67 Ft');
  });
});
