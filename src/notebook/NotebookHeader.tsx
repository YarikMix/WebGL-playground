import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import NotebookTags from '../components/NotebookTags';
import { Plus } from './InsertBar';
import { plural } from '../data';
import type { CellKind, Notebook } from '../types';

interface NotebookHeaderProps {
  notebook: Notebook;
  initials: string;
  onSignOut: () => void;
  /** вставка из шапки — после выбранной ячейки или в конец */
  onAdd: (kind: CellKind) => void;
}

/* Меню Colab («Файл / Изменить / Вид…»), «Выполнить все» и «Подключиться» не переносятся:
   пункты без действий — шум, в модуле 1 им нечего делать */
export default function NotebookHeader({ notebook: n, initials, onSignOut, onAdd }: NotebookHeaderProps) {
  const count = n.cells.length;

  /* Высота шапки — для scroll-padding-top страницы (styles.css). Шапка sticky и закрывает верх окна,
     а её высота не постоянна: мета переносится на вторую строку в зависимости от ширины окна
     и названия (138–163px), поэтому число в CSS подошло бы не везде */
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = header.current, root = document.documentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => root.style.setProperty('--nb-top-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty('--nb-top-h'); };
  }, []);

  return (
    <header className="top wrap" ref={header}>
      <div className="top-inner nb-top-inner">
        <div className="nb-head">
          <Link className="nb-back" to="/" aria-label="К списку блокнотов">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link className="logo nb-logo" to="/" aria-label="Cellestial — на главную">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
              <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
              <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
            </svg>
          </Link>
          <div className="nb-title">
            <h1>{n.title}</h1>
            <div className="nb-meta">
              <span className="meta">{count} {plural(count, 'ячейка', 'ячейки', 'ячеек')} · изменён {n.edited}</span>
              <NotebookTags notebook={n} />
            </div>
          </div>
          <button className="avatar" type="button" aria-label="Выйти" onClick={onSignOut}>{initials}</button>
        </div>
        {/* group, а не toolbar: toolbar обещает навигацию стрелками (roving tabindex), а её здесь нет */}
        <div className="nb-toolbar" role="group" aria-label="Добавить ячейку">
          <button className="chip" type="button" onClick={() => onAdd('code')}><Plus />Код</button>
          <button className="chip" type="button" onClick={() => onAdd('text')}><Plus />Текст</button>
        </div>
      </div>
    </header>
  );
}
