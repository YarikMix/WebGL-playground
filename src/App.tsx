import { Component, Suspense, lazy, useCallback, useRef, useState, type ReactNode } from 'react';
import Notebooks from './screens/Notebooks';
import Auth from './screens/Auth';
import { loadSetting, saveSetting } from './data';
import { useSceneLayout } from './useSceneLayout';
import { SUN_ORBIT } from './scene-config';
import { loadSession } from './session';
import type { Session } from './session';
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
  // вход по кнопке пока не работает (задача 4) — сеттер сессии здесь не нужен,
  // сессия только читается один раз, чтобы решить, какой экран показать
  const [session] = useState<Session | null>(() => loadSession());

  /* Готовность сцены — в два шага, и оба меняют вёрстку только после отрисованного кадра:
     skyReady   — канвас проявляется, CSS-фон гаснет;
     glassReady — DOM-карточки становятся прозрачными. Раньше нельзя: пока шейдер стекла
                  компилируется, под прозрачной карточкой не было бы ничего. */
  const [skyReady, setSkyReady] = useState(false);
  const [glassReady, setGlassReady] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null), glowRef = useRef<HTMLElement>(null);
  const limbRef = useRef<HTMLDivElement>(null), cardsRef = useRef<HTMLDivElement>(null);

  const wantGlass = cards === 'liquid';
  const layout = useSceneLayout({ pageRef, glowRef, limbRef, cardsRef }, wantGlass);

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
      {session === null
        ? <Auth glowRef={glowRef} cardsRef={cardsRef} limbRef={limbRef} />
        : <Notebooks glowRef={glowRef} limbRef={limbRef} cardsRef={cardsRef}
            motion={motion} onMotion={onMotion} cards={cards} onCards={changeCards} glassOn={glassOn} />}

      <SceneBoundary>
        <Suspense fallback={null}>
          {layout && <Sky layout={layout} motion={motion} glass={wantGlass} sun={SUN_ORBIT} spin={0} tickMs={33}
            onReady={onSkyReady} onGlassReady={onGlassReady} />}
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
