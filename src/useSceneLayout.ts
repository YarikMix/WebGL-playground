import { useLayoutEffect, useState, type RefObject } from 'react';
import type { CardRect, SceneLayout } from './types';

const BASE_HEIGHT = 900;   // высота канваса, пока стёкла карточек не тянут его ниже
const round = (v: number) => Math.round(v * 2) / 2;

export interface LayoutRefs {
  pageRef: RefObject<HTMLDivElement | null>;
  /** элемент, от верха которого отсчитывается свечение за заголовком */
  glowRef: RefObject<HTMLElement | null>;
  limbRef: RefObject<HTMLDivElement | null>;
  /** контейнер, чьи потомки `.card` уезжают в сцену стёклами */
  cardsRef: RefObject<HTMLDivElement | null>;
}

/* Сцена рисуется в координатах страницы: 1 единица three.js = 1 CSS-пиксель.
   Хук измеряет вёрстку и отдаёт всё, что нужно сцене: размер канваса, центр и радиус планеты
   (из CSS-диска .limb), положение свечения за заголовком и прямоугольники карточек.
   Канвас прокручивается вместе со страницей, поэтому скролл ничего не меняет —
   пересчёт нужен только при изменении раскладки. */
export function useSceneLayout({ pageRef, glowRef, limbRef, cardsRef }: LayoutRefs, glass: boolean): SceneLayout | null {
  const [layout, setLayout] = useState<SceneLayout | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const pageEl = pageRef.current, limbEl = limbRef.current, glowEl = glowRef.current;
      if (!pageEl || !limbEl || !glowEl) return;
      const page = pageEl.getBoundingClientRect();
      const limb = limbEl.getBoundingClientRect();
      const glow = glowEl.getBoundingClientRect();
      const cardsEl = cardsRef.current;
      const R = limb.width / 2;

      const cards: CardRect[] = glass && cardsEl
        ? [...cardsEl.querySelectorAll('.card')].map(el => {
            const r = el.getBoundingClientRect();
            // карточка входа — явный признак у вызывающей стороны, а не вывод из площади
            // (площадь тоже отличалась бы, но тогда порог был бы завязан на текущие размеры вёрстки)
            return { x: round(r.left - page.left + r.width / 2), y: round(r.top - page.top + r.height / 2), w: round(r.width), h: round(r.height), large: el.classList.contains('auth-card') };
          })
        : [];
      const cardsBottom = cardsEl ? cardsEl.getBoundingClientRect().bottom - page.top + 60 : 0;

      const next: SceneLayout = {
        width: round(page.width),
        height: Math.round(glass ? Math.max(BASE_HEIGHT, cardsBottom) : BASE_HEIGHT),
        fade: [BASE_HEIGHT * 0.6, BASE_HEIGHT],
        planet: { cx: round(limb.left - page.left + R), cy: round(limb.top - page.top + R), R: round(R) },
        glow: { x: round(limb.left - page.left + R), y: round(glow.top - page.top + 130), rx: Math.min(920, page.width * 1.3) / 2 * 1.1, ry: 297 },
        cards,
      };
      // сравнение по содержимому: ResizeObserver срабатывает часто, а сцену стоит трогать только по делу
      setLayout(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    for (const ref of [pageRef, glowRef, cardsRef]) if (ref.current) ro.observe(ref.current);
    // состав карточек может смениться без изменения размера контейнера (тот же счёт, другой набор) —
    // ResizeObserver это не поймает, а вёрстке .card нужно точное соответствие текущим карточкам
    const mo = new MutationObserver(measure);
    if (cardsRef.current) mo.observe(cardsRef.current, { childList: true });
    void document.fonts?.ready.then(measure);     // после загрузки шрифтов высота hero меняется
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [glass]);

  return layout;
}
