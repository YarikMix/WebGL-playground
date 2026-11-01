import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { initialNotebooks } from './data';
import { insertCell } from './notebook-cells';
import { useSceneLayout } from './useSceneLayout';
import { SUN_ORBIT } from './scene-config';
import { beginFlight, completeFlight, idleFlight } from './auth/flight';
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
  const router = useRouter();
  const navigate = useNavigate();
  /* Экран — по маршруту: от него зависят сцена (планета, стекло, свет) и класс страницы.
     Берём последний совпавший маршрут, а не location: адрес меняется в начале перехода, а matches —
     в том же рендере, что и <Outlet />, иначе раскладка сцены мерила бы DOM прежнего экрана.
     id маршрутов: '/login', '/' (список), '/notebook/$id'; при неизвестном адресе остаётся '__root__' */
  const routeId = useRouterState({ select: s => s.matches.at(-1)?.routeId });
  const screen: SceneScreen = routeId === '/login' ? 'auth' : routeId === '/notebook/$id' ? 'notebook' : 'list';

  /* Режим формы живёт здесь, а не в экране: им управляет не только карточка, но и свет сцены. */
  const [authFlight, setAuthFlight] = useState(() => idleFlight('login'));
  const [authSceneReady, setAuthSceneReady] = useState(false);
  const authSwitchRef = useRef<HTMLButtonElement>(null);

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
     выхода из только что созданного аккаунта видна форма регистрации вместо входа.
     Это прототип: важнее, чтобы по его страницам было удобно ходить, чем строгий флоу выхода.
     Текущая запись заменяется на вход с возвратом сюда — войдя снова, человек окажется на той же
     странице. «Назад» ведёт на прошлые страницы, и охранник каждой показывает вход с возвратом в неё */
  const signOut = useCallback(() => {
    const here = router.state.location.pathname;
    sessionStore.signOut();
    setAuthFlight(idleFlight('login'));
    void navigate({ to: '/login', search: { redirect: here }, replace: true });
  }, [router, navigate]);

  const createNotebook = useCallback((): number => {
    const id = Date.now();
    const cells = insertCell([], 0, 'code').cells;   // как Untitled.ipynb в Colab: одна пустая ячейка кода
    // выполнения в прототипе нет, поэтому в превью — без подсказки «Shift+Enter — запустить»
    setNotebooks(list => [{ id, title: 'Без названия', cells, code: '# Первая ячейка\n' }, ...list]);
    return id;
  }, []);
  /* Изменённый блокнот поднимается в начало. Подписи «Сначала недавно изменённые» и «изменён …»
     в РК 1 убраны, но порядок остался прежним: список по-прежнему — недавно изменённые сверху,
     и тот, с которым только что работали, проще всего найти первым */
  const setCells = useCallback((id: number, cells: Cell[]) => {
    setNotebooks(list => {
      const changed = list.find(n => n.id === id);
      return changed ? [{ ...changed, cells }, ...list.filter(n => n !== changed)] : list;
    });
  }, []);

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
  useEffect(() => { if (!isAuth) setAuthSceneReady(false); }, [isAuth]);
  const requestAuthMode = useCallback((target: AuthMode) => {
    setAuthFlight(prev => beginFlight(prev, target, performance.now(), authSceneReady && !reducedMotion));
  }, [authSceneReady, reducedMotion]);
  const onAuthArrive = useCallback((startedAt: number) => setAuthFlight(prev => completeFlight(prev, startedAt)), []);
  const onAuthReady = useCallback(() => setAuthSceneReady(true), []);
  const tickMs = isAuth && authFlight.startedAt !== null ? 0 : 33;

  const shell = useMemo<Shell>(() => ({
    glowRef, limbRef, cardsRef, glassOn, reducedMotion, session, authFlight, authSceneReady, authSwitchRef, requestAuthMode, signIn, signOut,
    notebooks, createNotebook, setCells, toast,
  }), [glassOn, reducedMotion, session, authFlight, authSceneReady, requestAuthMode, signIn, signOut, notebooks, createNotebook, setCells, toast]);

  return (
    <ShellContext.Provider value={shell}>
      <div className={`page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}${isAuth ? ' auth-page' : ''}`} ref={pageRef}>
        <Outlet />

        <SceneBoundary>
          <Suspense fallback={null}>
            {layout && <Sky layout={layout} motion={motion} glass={wantGlass} sun={SUN_ORBIT} spin={0} reducedMotion={reducedMotion} tickMs={tickMs}
              screen={screen} authFlight={authFlight} authSwitchRef={authSwitchRef} onAuthArrive={onAuthArrive} onAuthReady={onAuthReady}
              onReady={onSkyReady} onGlassReady={onGlassReady} />}
          </Suspense>
        </SceneBoundary>

        {toastText && <div className="toast" role="status">{toastText}</div>}
      </div>
    </ShellContext.Provider>
  );
}
