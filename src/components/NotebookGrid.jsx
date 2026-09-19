import { useMemo } from 'react';
import { plural, tokenize } from '../data.js';

function Card({ notebook: n, glass, onOpen }) {
  const tokens = useMemo(() => tokenize(n.code), [n.code]);

  // свечение под курсором: координаты уходят в CSS-переменные, React в этом не участвует
  const track = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <a className={glass ? 'card lq' : 'card'} href="#" onPointerMove={track}
      onClick={e => { e.preventDefault(); onOpen(n); }}>
      <div className="peek" aria-hidden="true">
        {tokens.map((t, i) => (t.cls ? <span key={i} className={t.cls}>{t.text}</span> : t.text))}
      </div>
      <div className="card-body">
        <h3>{n.title}</h3>
        <p className="meta">{n.cells} {plural(n.cells, 'ячейка', 'ячейки', 'ячеек')} · изменён {n.edited}</p>
        <div className="tags">
          {n.run
            ? <span className="tag run"><i className="dot" />Работает · {n.run}</span>
            : <span className="tag"><i className="dot" />Остановлен</span>}
          <span className="tag accel">{n.accel}</span>
          {n.owner && <span className="tag">от {n.owner}</span>}
        </div>
      </div>
    </a>
  );
}

export default function NotebookGrid({ gridRef, notebooks, glass, onOpen }) {
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
      {notebooks.map(n => <Card key={n.id} notebook={n} glass={glass} onOpen={onOpen} />)}
    </div>
  );
}
