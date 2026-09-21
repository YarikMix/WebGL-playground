import { useEffect, useMemo, useState, type RefObject } from 'react';
import TopBar from '../components/TopBar';
import Hero from '../components/Hero';
import NotebookGrid from '../components/NotebookGrid';
import Footer from '../components/Footer';
import { filters, initialNotebooks } from '../data';
import type { CardsMode, FilterId, Notebook } from '../types';

interface NotebooksProps {
  /** heroRef и limbRef нужны сцене: из них берутся положение свечения и геометрия планеты */
  heroRef: RefObject<HTMLElement | null>;
  limbRef: RefObject<HTMLDivElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
  motion: boolean;
  onMotion: (on: boolean) => void;
  cards: CardsMode;
  onCards: (mode: CardsMode) => void;
  /** стекло рисует сцена — карточки становятся прозрачными */
  glassOn: boolean;
}

export default function Notebooks({ heroRef, limbRef, gridRef, motion, onMotion, cards, onCards, glassOn }: NotebooksProps) {
  const [notebooks, setNotebooks] = useState<Notebook[]>(initialNotebooks);
  const [active, setActive] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  const shown = useMemo(() => {
    const test = filters.find(f => f.id === active)?.test ?? (() => true);
    const q = query.trim().toLowerCase();
    return notebooks.filter(n => test(n) && (!q || n.title.toLowerCase().includes(q)));
  }, [notebooks, active, query]);

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
    <>
      <TopBar query={query} onQuery={setQuery} onProfile={() => setToast('В прототипе профиль не подключён')} />
      <Hero heroRef={heroRef} limbRef={limbRef} total={notebooks.length} running={notebooks.filter(n => n.run).length}
        onCreate={createNotebook} onUpload={() => setToast('В прототипе загрузка файлов не подключена')} />

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
        <Footer cards={cards} onCards={onCards} motion={motion} onMotion={onMotion} />
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
