import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import TopBar from '../components/TopBar';
import Hero from '../components/Hero';
import NotebookGrid from '../components/NotebookGrid';
import Footer from '../components/Footer';
import { filters } from '../data';
import { initials } from '../session';
import { useShell } from '../shell';
import type { FilterId } from '../types';

export default function Notebooks() {
  /* glowRef и limbRef нужны сцене: из них берутся положение свечения и геометрия планеты */
  const { glowRef, limbRef, cardsRef, glassOn, session, signOut, notebooks, createNotebook, toast } = useShell();
  const [active, setActive] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const shown = useMemo(() => {
    const test = filters.find(f => f.id === active)?.test ?? (() => true);
    const q = query.trim().toLowerCase();
    return notebooks.filter(n => test(n) && (!q || n.title.toLowerCase().includes(q)));
  }, [notebooks, active, query]);

  /* Хуки выше этой строки: при выходе сессия гаснет на рендер раньше, чем адрес сменится на /login */
  if (!session) return null;

  /* Как в Colab: новый блокнот сразу открывается, а не остаётся карточкой в списке */
  const create = () => {
    const id = createNotebook();
    void navigate({ to: '/notebook/$id', params: { id: String(id) } });
  };

  return (
    <>
      <TopBar query={query} onQuery={setQuery} initials={initials(session)} onSignOut={signOut} />
      <Hero heroRef={glowRef} limbRef={limbRef} total={notebooks.length} running={notebooks.filter(n => n.run).length}
        onCreate={create} onUpload={() => toast('В прототипе загрузка файлов не подключена')} />

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
        <NotebookGrid gridRef={cardsRef} notebooks={shown} glass={glassOn} />
        <Footer />
      </main>
    </>
  );
}
