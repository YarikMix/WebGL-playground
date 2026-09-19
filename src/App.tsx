import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import TopBar from './components/TopBar';
import Hero from './components/Hero';
import NotebookGrid from './components/NotebookGrid';
import Footer from './components/Footer';
import { filters, initialNotebooks, loadSetting, saveSetting } from './data';
import { useSceneLayout } from './useSceneLayout';
import type { CardsMode, FilterId, Notebook } from './types';

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
  const [notebooks, setNotebooks] = useState<Notebook[]>(initialNotebooks);
  const [active, setActive] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
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

  const shown = useMemo(() => {
    const test = filters.find(f => f.id === active)?.test ?? (() => true);
    const q = query.trim().toLowerCase();
    return notebooks.filter(n => test(n) && (!q || n.title.toLowerCase().includes(q)));
  }, [notebooks, active, query]);

  const wantGlass = cards === 'liquid';
  const layout = useSceneLayout({ pageRef, heroRef, limbRef, gridRef }, wantGlass, [shown]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const createNotebook = () => {
    setNotebooks(list => [{ id: Date.now(), title: 'Без названия', cells: 1, edited: 'только что', accel: 'CPU', code: '# Первая ячейка. Shift+Enter — запустить\n' }, ...list]);
    setActive('all');
    setQuery('');
    setToast('Блокнот создан');
  };

  const changeCards = (mode: CardsMode) => {
    if (mode !== 'liquid') setGlassReady(false);
    setCards(mode);
    saveSetting('sky-cards-r3f', mode);
  };
  const onSkyReady = useCallback(() => setSkyReady(true), []);
  const onGlassReady = useCallback(() => setGlassReady(true), []);

  const glassOn = wantGlass && glassReady;
  return (
    <div className={`page${skyReady ? ' webgl' : ''} cards-${glassOn ? 'liquid' : 'flat'}`} ref={pageRef}>
      <TopBar query={query} onQuery={setQuery} onProfile={() => setToast('В прототипе профиль не подключён')} />
      <Hero heroRef={heroRef} limbRef={limbRef} total={notebooks.length} running={notebooks.filter(n => n.run).length}
        onCreate={createNotebook} onUpload={() => setToast('В прототипе загрузка файлов не подключена')} />
      <SceneBoundary>
        <Suspense fallback={null}>
          {layout && <Sky layout={layout} motion={motion} glass={wantGlass} onReady={onSkyReady} onGlassReady={onGlassReady} />}
        </Suspense>
      </SceneBoundary>

      <main className="wrap">
        <h2 className="sr-only">Блокноты</h2>
        <div className="bar">
          <div className="chips" role="group" aria-label="Фильтр блокнотов">
            {filters.map(f => (
              <button key={f.id} className="chip" type="button" aria-pressed={f.id === active} onClick={() => setActive(f.id)}>
                {f.label}<span>{notebooks.filter(f.test).length}</span>
              </button>
            ))}
          </div>
          <span className="sort">Сначала недавно изменённые</span>
        </div>
        <NotebookGrid gridRef={gridRef} notebooks={shown} glass={glassOn} onOpen={() => setToast('В прототипе редактор не подключён')} />
        <Footer cards={cards} onCards={changeCards}
          motion={motion} onMotion={on => { setMotion(on); saveSetting('sky-motion', on ? '1' : '0'); }} />
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
