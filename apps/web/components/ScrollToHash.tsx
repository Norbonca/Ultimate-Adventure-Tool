"use client";

import { useEffect } from "react";

/**
 * Horgonyhoz görgetés más útvonalról érkezve. A Next.js a navigáció pillanatában
 * görget, de a fölötte lévő kliensoldali tartalom (pl. menetrend) utána töltődik
 * be és lejjebb tolja a célt. Ezért az első néhány másodpercben minden
 * elrendezésváltozás után újra a célhoz igazít — amíg a felhasználó maga nem görget.
 */
export function ScrollToHash({ id, settleMs = 3000 }: { id: string; settleMs?: number }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const target = document.getElementById(id);
    if (!target) return;

    const align = () => target.scrollIntoView({ block: "start", behavior: "instant" });
    let frame = requestAnimationFrame(align);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(align);
    });
    observer.observe(document.body);

    const stop = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const timer = window.setTimeout(stop, settleMs);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [id, settleMs]);
  return null;
}
