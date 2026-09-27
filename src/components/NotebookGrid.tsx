import { useMemo, type PointerEvent, type RefObject } from 'react';
import { Link } from '@tanstack/react-router';
import NotebookTags from './NotebookTags';
import { plural, tokenize } from '../data';
import type { Notebook } from '../types';

interface CardProps {
  notebook: Notebook;
  glass: boolean;
}

function Card({ notebook: n, glass }: CardProps) {
  const tokens = useMemo(() => tokenize(n.code), [n.code]);

  // свечение под курсором: координаты уходят в CSS-переменные, React в этом не участвует
  const track = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <Link className={glass ? 'card lq' : 'card'} to="/notebook/$id" params={{ id: String(n.id) }} onPointerMove={track}>
      <div className="peek" aria-hidden="true">
        {tokens.map((t, i) => (t.cls ? <span key={i} className={t.cls}>{t.text}</span> : t.text))}
      </div>
      <div className="card-body">
        <h3>{n.title}</h3>
        <p className="meta">{n.cells.length} {plural(n.cells.length, 'ячейка', 'ячейки', 'ячеек')} · изменён {n.edited}</p>
        <NotebookTags notebook={n} />
      </div>
    </Link>
  );
}

interface NotebookGridProps {
  gridRef: RefObject<HTMLDivElement | null>;
  notebooks: Notebook[];
  /** стекло рисует сцена — карточка становится прозрачной */
  glass: boolean;
}

export default function NotebookGrid({ gridRef, notebooks, glass }: NotebookGridProps) {
  if (!notebooks.length) {
    return (
      <div className="empty">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r="8" fill="#2a1f5c" stroke="#8b6cff" strokeWidth="1.2" />
          <ellipse cx="28" cy="28" rx="25" ry="9" transform="rotate(-20 28 28)" stroke="#6f6990" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
        </svg>
        <strong>На этой орбите пусто</strong>
        <span>Ничего не нашлось. Измените запрос или выберите другой фильтр.</span>
      </div>
    );
  }
  return (
    <div className="grid" ref={gridRef}>
      {notebooks.map(n => <Card key={n.id} notebook={n} glass={glass} />)}
    </div>
  );
}
