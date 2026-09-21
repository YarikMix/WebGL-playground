import { Component, Suspense, lazy, useCallback, useRef, useState, type ReactNode } from 'react';
import Notebooks from './screens/Notebooks';
import { loadSetting, saveSetting } from './data';
import { useSceneLayout } from './useSceneLayout';
import type { CardsMode } from './types';

/* Сцена — отдельный чанк: three.js, R3F и drei весят ~330 КБ gzip и для первого экрана не нужны.
   Загрузка стартует сразу, параллельно с первым рендером, а не когда React дойдёт до <Sky>. */
const skyChunk = import('./sky/Sky');
const Sky = lazy(() => skyChunk);

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Сцена — украшение: если чанк не загрузился или WebGL недоступен, страница остаётся на CSS-фоне */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Sky: сцена не запустилась, остаётся CSS-фон.', error); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function App() {
  const [cards, setCards] = useState<CardsMode>(() => loadSetting('sky-cards-r3f', ['flat', 'liquid'] as const, 'liquid'));
  const [motion, setMotion] = useState(() => loadSetting('sky-motion', ['1', '0'] as const, prefersReducedMotion() ? '0' : '1') === '1');

  /* Готовность сцены — в два шага, и оба меняют вёрстку только после отрисованного кадра:
     skyReady   — канвас проявляется, CSS-фон гаснет;
     glassReady — DOM-карточки становятся прозрачными. Раньше нельзя: пока шейдер стекла
                  компилируется, под прозрачной карточкой не было бы ничего. */
  const [skyReady, setSkyReady] = useState(false);
  const [glassReady, setGlassReady] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null), heroRef = useRef<HTMLElement>(null);
  const limbRef = useRef<HTMLDivElement>(null), gridRef = useRef<HTMLDivElement>(null);

  const wantGlass = cards === 'liquid';
  const layout = useSceneLayout({ pageRef, heroRef, limbRef, gridRef }, wantGlass, []);

  const changeCards = (mode: CardsMode) => {
    if (mode !== 'liquid') setGlassReady(false);
    setCards(mode);
    saveSetting('sky-cards-r3f', mode);
  };
  const onSkyReady = useCallback(() => setSkyReady(true), []);
  const onGlassReady = useCallback(() => setGlassReady(true), []);
  const onMotion = (on: boolean) => { setMotion(on); saveSetting('sky-motion', on ? '1' : '0'); };

  const glassOn = wantGlass && glassReady;
  return (
    <div className={`page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}`} ref={pageRef}>
      <Notebooks heroRef={heroRef} limbRef={limbRef} gridRef={gridRef}
        motion={motion} onMotion={onMotion} cards={cards} onCards={changeCards} glassOn={glassOn} />

      <SceneBoundary>
        <Suspense fallback={null}>
          {layout && <Sky layout={layout} motion={motion} glass={wantGlass} onReady={onSkyReady} onGlassReady={onGlassReady} />}
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
