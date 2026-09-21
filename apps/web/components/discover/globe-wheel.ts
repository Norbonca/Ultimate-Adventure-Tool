/**
 * A 3D térkép görgetése a kereten belül marad (Norbert hibajelzése, 2026-09-19:
 * „scrollozásnál kilép a térkép frameből és az egész oldalt görgeti időnként”).
 *
 * Ok: a MapLibre csak a saját vásznán (`#tg-map`) fogja meg a görgetést. A fölötte
 * álló rétegek — zászlók, klaszterek, kártya, idősáv, tokensor, gombok, attribúció —
 * a böngészőnek adták tovább, és amíg a renderer be nem töltött, az egész keret is.
 * Ilyenkor az oldal görgetett a térkép helyett.
 *
 * Megoldás: a keret egy nem passzív, capture fázisú figyelővel minden görgetést elkap.
 * - Ha a mutató alatt görgethető belső elem van, és arra még van hová (a kártya
 *   szövege, a vízszintes tokensor), az görget — az oldal nem.
 * - A kártyán belül ezen túl semmi nem történik (a kártya nem nagyítja a térképet).
 * - Máshol a görgetés a térkép nagyítása: a rétegekről a MapLibre vásznára kerül.
 */

type Axis = 'x' | 'y';

/** A görgetés fő iránya: a nagyobb elmozdulás tengelye (Shift + görgő → vízszintes). */
export function wheelAxis(event: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'shiftKey'>): Axis {
  if (event.shiftKey && event.deltaX === 0) return 'x';
  return Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 'x' : 'y';
}

interface ScrollBox {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
}

/** Tud-e az elem még görgetni ebbe az irányba (1 px tűréssel a tört pixelek miatt). */
export function canScroll(box: ScrollBox, axis: Axis, delta: number): boolean {
  if (delta === 0) return false;
  if (axis === 'y') {
    if (box.scrollHeight - box.clientHeight <= 1) return false;
    return delta < 0 ? box.scrollTop > 0 : box.scrollTop + box.clientHeight < box.scrollHeight - 1;
  }
  if (box.scrollWidth - box.clientWidth <= 1) return false;
  return delta < 0 ? box.scrollLeft > 0 : box.scrollLeft + box.clientWidth < box.scrollWidth - 1;
}

function isScrollContainer(el: Element, axis: Axis): boolean {
  const style = getComputedStyle(el);
  const overflow = axis === 'y' ? style.overflowY : style.overflowX;
  return overflow === 'auto' || overflow === 'scroll';
}

/** A célelemtől a keretig: van-e görgethető belső elem, amely ezt a görgetést elnyeli. */
export function scrollsInside(event: WheelEvent, frame: Element): boolean {
  const axis = wheelAxis(event);
  const delta = axis === 'y' ? event.deltaY : event.deltaX || (event.shiftKey ? event.deltaY : 0);
  let el = event.target instanceof Element ? event.target : null;
  while (el && el !== frame) {
    if (isScrollContainer(el, axis) && canScroll(el as HTMLElement, axis, delta)) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Bekapcsolja a keret görgetésvédelmét. A visszatérési érték leveszi.
 * `mapSelector`: a MapLibre vásznának konténere a kereten belül.
 */
export function containGlobeWheel(frame: HTMLElement, mapSelector = '#tg-map', cardSelector = '#tg-card'): () => void {
  const onWheel = (event: WheelEvent) => {
    // a továbbküldött esemény célja maga a vászon: az oldal nem görget, a nagyítás a MapLibre-é
    if (scrollsInside(event, frame)) return;
    event.preventDefault();
    const target = event.target instanceof Element ? event.target : null;
    const mapEl = frame.querySelector(mapSelector);
    const canvas = mapEl?.querySelector('canvas');
    if (!target || !mapEl || !canvas || mapEl.contains(target) || target.closest(cardSelector)) return;
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaZ: event.deltaZ,
        deltaMode: event.deltaMode,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      })
    );
  };
  frame.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => frame.removeEventListener('wheel', onWheel, { capture: true });
}
