import { useLayoutEffect, useState } from 'react';

const BASE_HEIGHT = 900;   // высота канваса, пока стёкла карточек не тянут его ниже
const round = v => Math.round(v * 2) / 2;

/* Сцена рисуется в координатах страницы: 1 единица three.js = 1 CSS-пиксель.
   Хук измеряет вёрстку и отдаёт всё, что нужно сцене: размер канваса, центр и радиус планеты
   (из скрытого CSS-диска .limb), положение свечения за заголовком и прямоугольники карточек.
   Канвас прокручивается вместе со страницей, поэтому скролл ничего не меняет —
   пересчёт нужен только при изменении раскладки. */
export function useSceneLayout({ pageRef, heroRef, limbRef, gridRef }, glass, deps) {
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const page = pageRef.current.getBoundingClientRect();
      const limb = limbRef.current.getBoundingClientRect();
      const hero = heroRef.current.getBoundingClientRect();
      const grid = gridRef.current;
      const R = limb.width / 2;

      const cards = glass && grid
        ? [...grid.querySelectorAll('.card')].map(el => {
            const r = el.getBoundingClientRect();
            return { x: round(r.left - page.left + r.width / 2), y: round(r.top - page.top + r.height / 2), w: round(r.width), h: round(r.height) };
          })
        : [];
      const gridBottom = grid ? grid.getBoundingClientRect().bottom - page.top + 60 : 0;

      const next = {
        width: round(page.width),
        height: Math.round(glass ? Math.max(BASE_HEIGHT, gridBottom) : BASE_HEIGHT),
        fade: [BASE_HEIGHT * 0.6, BASE_HEIGHT],
        planet: { cx: round(limb.left - page.left + R), cy: round(limb.top - page.top + R), R: round(R) },
        glow: { x: round(limb.left - page.left + R), y: round(hero.top - page.top + 130), rx: Math.min(920, page.width * 1.3) / 2 * 1.1, ry: 297 },
        cards,
      };
      // сравнение по содержимому: ResizeObserver срабатывает часто, а сцену стоит трогать только по делу
      setLayout(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    for (const ref of [pageRef, heroRef, gridRef]) if (ref.current) ro.observe(ref.current);
    document.fonts?.ready.then(measure);     // после загрузки шрифтов высота hero меняется
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glass, ...deps]);

  return layout;
}
