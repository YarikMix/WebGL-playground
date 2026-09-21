import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Notebooks from './screens/Notebooks';
import Auth from './screens/Auth';
import { loadSetting, saveSetting } from './data';
import { useSceneLayout } from './useSceneLayout';
import { SUN_DAWN, SUN_ORBIT, SWEEP_ANGLE, SWEEP_MS } from './scene-config';
import { clearSession, loadSession, saveSession } from './session';
import type { Session } from './session';
import type { AuthMode, CardsMode } from './types';

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
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const onSignIn = (s: Session) => { saveSession(s); setSession(s); };
  const onSignOut = () => { clearSession(); setSession(null); };

  /* Режим формы живёт здесь, а не в экране: им управляет не только карточка, но и свет сцены. */
  const [mode, setMode] = useState<AuthMode>('login');

  /* Тикер разгоняется на время проезда терминатора и возвращается обратно. Эффект реагирует
     на смену mode, но не должен срабатывать при монтировании — иначе каждое открытие экрана
     входа зря поднимало бы частоту на SWEEP_MS. При prefers-reduced-motion разгон не включаем
     вовсе: терминатор двигается на пониженной частоте, глаз не должен ловить перепад скорости. */
  const [sweeping, setSweeping] = useState(false);
  const isFirstMode = useRef(true);
  useEffect(() => {
    if (isFirstMode.current) { isFirstMode.current = false; return; }
    if (prefersReducedMotion()) return;
    setSweeping(true);
    const timer = setTimeout(() => setSweeping(false), SWEEP_MS);
    return () => clearTimeout(timer);
  }, [mode]);

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

  const changeCards = (next: CardsMode) => {
    if (next !== 'liquid') setGlassReady(false);
    setCards(next);
    saveSetting('sky-cards-r3f', next);
  };
  const onSkyReady = useCallback(() => setSkyReady(true), []);
  const onGlassReady = useCallback(() => setGlassReady(true), []);
  const onMotion = (on: boolean) => { setMotion(on); saveSetting('sky-motion', on ? '1' : '0'); };

  const glassOn = wantGlass && glassReady;
  const isAuth = session === null;
  const sun = isAuth ? SUN_DAWN : SUN_ORBIT;
  const spin = isAuth ? (mode === 'signup' ? SWEEP_ANGLE : 0) : 0;
  const tickMs = sweeping ? 0 : 33;

  return (
    <div className={`page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}${isAuth ? ' auth-page' : ''}`} ref={pageRef}>
      {isAuth
        ? <Auth glowRef={glowRef} cardsRef={cardsRef} limbRef={limbRef} mode={mode} onModeChange={setMode} onSignIn={onSignIn} />
        : <Notebooks glowRef={glowRef} limbRef={limbRef} cardsRef={cardsRef}
            motion={motion} onMotion={onMotion} cards={cards} onCards={changeCards} glassOn={glassOn}
            session={session} onSignOut={onSignOut} />}

      <SceneBoundary>
        <Suspense fallback={null}>
          {layout && <Sky layout={layout} motion={motion} glass={wantGlass} sun={sun} spin={spin} tickMs={tickMs}
            onReady={onSkyReady} onGlassReady={onGlassReady} />}
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
