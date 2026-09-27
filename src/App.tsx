import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { initialNotebooks } from './data';
import { insertCell } from './notebook-cells';
import { useSceneLayout } from './useSceneLayout';
import { SUN_ORBIT, SWEEP_ANGLE, SWEEP_MS } from './scene-config';
import { sessionStore, useSession } from './session-store';
import { ShellContext } from './shell';
import type { Shell } from './shell';
import type { Session } from './session';
import type { AuthMode, Cell, Notebook, SceneScreen } from './types';

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

/* Корневой маршрут: сцена, общее состояние и <Outlet /> для экрана по адресу */
export default function App() {
  const session = useSession();
  const navigate = useNavigate();
  /* Экран — по маршруту: от него зависят сцена (планета, стекло, свет) и класс страницы.
     Берём последний совпавший маршрут, а не location: адрес меняется в начале перехода, а matches —
     в том же рендере, что и <Outlet />, иначе раскладка сцены мерила бы DOM прежнего экрана.
     id маршрутов: '/login', '/' (список), '/notebook/$id'; при неизвестном адресе остаётся '__root__' */
  const routeId = useRouterState({ select: s => s.matches.at(-1)?.routeId });
  const screen: SceneScreen = routeId === '/login' ? 'auth' : routeId === '/notebook/$id' ? 'notebook' : 'list';

  /* Режим формы живёт здесь, а не в экране: им управляет не только карточка, но и свет сцены. */
  const [mode, setMode] = useState<AuthMode>('login');

  /* Единственное место, где читается медиазапрос: прокидывается пропом туда, где непрерывных
     кадров может не быть (Sky/Planet/Backdrop) и куда синхронизирован кросс-фейд половин
     карточки (AuthCard) — вместо повторного чтения matchMedia в каждом месте. Читается один раз
     за жизнь страницы: значение уходит в контекст, и новый объект на каждом рендере зря
     перерисовывал бы все экраны. */
  const [reducedMotion] = useState(prefersReducedMotion);

  /* Переключателей стекла и анимации больше нет: стекло всегда liquid, анимация включена.
     prefers-reduced-motion — требование доступности, а не опция, и по-прежнему гасит движение. */
  const motion = !reducedMotion;
  const wantGlass = true;

  /* Блокноты и тост живут здесь, а не в экранах: список размонтируется при уходе в блокнот, и только
     что созданный «Без названия» пропал бы; «Блокнот не найден» показывается уже после ухода с экрана */
  const [notebooks, setNotebooks] = useState<Notebook[]>(initialNotebooks);
  const [toastText, setToastText] = useState('');
  const toast = useCallback((text: string) => setToastText(text), []);
  useEffect(() => {
    if (!toastText) return;
    const timer = setTimeout(() => setToastText(''), 2600);
    return () => clearTimeout(timer);
  }, [toastText]);

  const signIn = useCallback((s: Session) => sessionStore.signIn(s), []);
  /* mode переживает выход (он в корне ради света сцены), поэтому сбрасывается явно — иначе после
     выхода из только что созданного аккаунта видна форма регистрации вместо входа */
  const signOut = useCallback(() => {
    sessionStore.signOut();
    setMode('login');
    void navigate({ to: '/login' });
  }, [navigate]);

  const createNotebook = useCallback((): number => {
    const id = Date.now();
    const cells = insertCell([], 0, 'code').cells;   // как Untitled.ipynb в Colab: одна пустая ячейка кода
    setNotebooks(list => [{ id, title: 'Без названия', cells, edited: 'только что', accel: 'CPU', code: '# Первая ячейка. Shift+Enter — запустить\n' }, ...list]);
    return id;
  }, []);
  const setCells = useCallback((id: number, cells: Cell[]) => {
    setNotebooks(list => list.map(n => (n.id === id ? { ...n, cells, edited: 'только что' } : n)));
  }, []);

  /* Тикер разгоняется на время переезда света и возвращается обратно. Эффект реагирует
     на смену mode, но не должен срабатывать при монтировании — иначе каждое открытие экрана
     входа зря поднимало бы частоту. При prefers-reduced-motion разгон не включаем вовсе:
     свет там встаёт на место мгновенно, разгонять нечего. */
  const [sweeping, setSweeping] = useState(false);
  const isFirstMode = useRef(true);
  useEffect(() => {
    if (isFirstMode.current) { isFirstMode.current = false; return; }
    if (reducedMotion) return;
    setSweeping(true);
    const timer = setTimeout(() => setSweeping(false), SWEEP_MS);
    return () => clearTimeout(timer);
  }, [mode, reducedMotion]);

  /* Готовность сцены — в два шага, и оба меняют вёрстку только после отрисованного кадра:
     skyReady   — канвас проявляется, CSS-фон гаснет;
     glassReady — DOM-карточки становятся прозрачными. Раньше нельзя: пока шейдер стекла
                  компилируется, под прозрачной карточкой не было бы ничего. */
  const [skyReady, setSkyReady] = useState(false);
  const [glassReady, setGlassReady] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null), glowRef = useRef<HTMLElement>(null);
  const limbRef = useRef<HTMLDivElement>(null), cardsRef = useRef<HTMLDivElement>(null);

  const isAuth = screen === 'auth';
  const layout = useSceneLayout({ pageRef, glowRef, limbRef, cardsRef }, wantGlass, screen);

  const onSkyReady = useCallback(() => setSkyReady(true), []);
  const onGlassReady = useCallback(() => setGlassReady(true), []);

  const glassOn = wantGlass && glassReady;
  /* spin теперь поворачивает не планету, а солнце (Ruling 9, scene-config.ts): ±половина угла,
     покой входа и покой регистрации симметричны относительно базовой композиции SUN_ORBIT.
     Солнце у обоих экранов одно и то же — вход не заводит собственного (SUN_ORBIT). */
  const spin = isAuth ? (mode === 'signup' ? SWEEP_ANGLE / 2 : -SWEEP_ANGLE / 2) : 0;
  const tickMs = sweeping ? 0 : 33;

  const shell = useMemo<Shell>(() => ({
    glowRef, limbRef, cardsRef, glassOn, reducedMotion, session, mode, setMode, signIn, signOut,
    notebooks, createNotebook, setCells, toast,
  }), [glassOn, reducedMotion, session, mode, signIn, signOut, notebooks, createNotebook, setCells, toast]);

  return (
    <ShellContext.Provider value={shell}>
      <div className={`page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}${isAuth ? ' auth-page' : ''}`} ref={pageRef}>
        <Outlet />

        <SceneBoundary>
          <Suspense fallback={null}>
            {layout && <Sky layout={layout} motion={motion} glass={wantGlass} sun={SUN_ORBIT} spin={spin} reducedMotion={reducedMotion} tickMs={tickMs}
              onReady={onSkyReady} onGlassReady={onGlassReady} />}
          </Suspense>
        </SceneBoundary>

        {toastText && <div className="toast" role="status">{toastText}</div>}
      </div>
    </ShellContext.Provider>
  );
}
