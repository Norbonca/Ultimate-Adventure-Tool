"use client";

/**
 * Pénznem-választó a `ref_currencies` aktív soraiból (CODE-006, rendszerspec §14.11/2):
 * statikus lista nincs — új pénznem felvétele vagy kivezetése adatművelet, nem kódmódosítás.
 * A már mentett, de inaktívvá vált kód (pl. HRK) a listában marad kiválasztottként, hogy a régi
 * érték ne vesszen el; újat választani csak aktívból lehet.
 */

import { useEffect, useState } from "react";
import { loadActiveCurrencies, type CurrencyOption } from "@/lib/currency";

interface CurrencySelectProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function CurrencySelect({ id, value, onChange, className }: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  useEffect(() => {
    let alive = true;
    loadActiveCurrencies().then((list) => {
      if (alive) setCurrencies(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasValue = currencies.some((c) => c.code === value);
  const options = value && !hasValue ? [{ code: value, symbol: null } as CurrencyOption, ...currencies] : currencies;

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {options.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol ? `${c.code} (${c.symbol})` : c.code}
        </option>
      ))}
    </select>
  );
}
