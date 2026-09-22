import { useEffect, useRef } from 'react';
import { SWEEP_MS, sweepEase } from '../scene-config';

/* Угол поворота солнца, который идёт по той же кривой и за то же время, что CSS-переход луны
   (см. sweepEase в scene-config.ts). Хук, а не общий модуль состояния: Planet и Backdrop
   считают угол независимо, но из одинаковых входных данных и по одинаковым часам, поэтому
   расходиться им нечем — а связывать их общим стором значило бы заводить зависимость между
   двумя листьями сцены ради значения, которое каждый и так умеет посчитать.

   `instant` — когда непрерывных кадров не будет (Ticker выключен или prefers-reduced-motion):
   единственный заказанный через <Redraw signal={spin} /> кадр обязан попасть точно в цель. */
export default function useSunSweep(spin: number, instant: boolean): () => number {
  const angle = useRef(spin);
  const leg = useRef({ from: spin, to: spin, t0: 0 });

  /* Отсчёт стартует в эффекте, а не в рендере: браузер начинает CSS-переход на первом
     пересчёте стилей после коммита — эффект попадает в тот же кадр. */
  useEffect(() => {
    if (instant) {
      angle.current = spin;
      leg.current = { from: spin, to: spin, t0: 0 };
      return;
    }
    if (leg.current.to === spin) return;   // первый рендер и повторные рендеры без смены режима
    leg.current = { from: angle.current, to: spin, t0: performance.now() };
  }, [spin, instant]);

  return () => {
    const { from, to, t0 } = leg.current;
    if (from !== to) {
      const p = Math.min(1, (performance.now() - t0) / SWEEP_MS);
      angle.current = from + (to - from) * sweepEase(p);
    }
    return angle.current;
  };
}
