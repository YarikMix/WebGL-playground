import { useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import Hero from './components/Hero.jsx';
import NotebookGrid from './components/NotebookGrid.jsx';
import Footer from './components/Footer.jsx';
import Sky from './sky/Sky.jsx';
import { filters, initialNotebooks, loadSetting, saveSetting } from './data.js';
import { useSceneLayout } from './useSceneLayout.js';

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [active, setActive] = useState('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [cards, setCards] = useState(() => loadSetting('sky-cards-r3f', ['flat', 'liquid'], 'liquid'));
  const [motion, setMotion] = useState(() => loadSetting('sky-motion', ['1', '0'], prefersReducedMotion() ? '0' : '1') === '1');

  const pageRef = useRef(null), heroRef = useRef(null), limbRef = useRef(null), gridRef = useRef(null);

  const shown = useMemo(() => {
    const test = filters.find(f => f.id === active).test;
    const q = query.trim().toLowerCase();
    return notebooks.filter(n => test(n) && (!q || n.title.toLowerCase().includes(q)));
  }, [notebooks, active, query]);

  const glass = cards === 'liquid';
  const layout = useSceneLayout({ pageRef, heroRef, limbRef, gridRef }, glass, [shown]);

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

  return (
    <div className={`page webgl cards-${cards}`} ref={pageRef}>
      <TopBar query={query} onQuery={setQuery} onProfile={() => setToast('В прототипе профиль не подключён')} />
      <Hero heroRef={heroRef} limbRef={limbRef} total={notebooks.length} running={notebooks.filter(n => n.run).length}
        onCreate={createNotebook} onUpload={() => setToast('В прототипе загрузка файлов не подключена')} />
      {layout && <Sky layout={layout} motion={motion} glass={glass} />}

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
        <NotebookGrid gridRef={gridRef} notebooks={shown} glass={glass} onOpen={() => setToast('В прототипе редактор не подключён')} />
        <Footer cards={cards} onCards={mode => { setCards(mode); saveSetting('sky-cards-r3f', mode); }}
          motion={motion} onMotion={on => { setMotion(on); saveSetting('sky-motion', on ? '1' : '0'); }} />
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
