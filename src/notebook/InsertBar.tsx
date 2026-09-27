import type { CellKind } from '../types';

interface InsertBarProps {
  onAdd: (kind: CellKind) => void;
  /** полоса после последней ячейки — видна всегда, а не только при наведении */
  persistent?: boolean;
  /** полоса рядом с выбранной ячейкой — сразу под ней, либо перед первой ячейкой, если выбрана
      она сама; на тач-экранах (нет наведения) показываются только такие полосы */
  nearSelected?: boolean;
}

export default function InsertBar({ onAdd, persistent = false, nearSelected = false }: InsertBarProps) {
  return (
    <div className={`nb-insert${persistent ? ' persistent' : ''}${nearSelected ? ' near-selected' : ''}`}>
      <button className="nb-add" type="button" onClick={() => onAdd('code')}><Plus />Код</button>
      <button className="nb-add" type="button" onClick={() => onAdd('text')}><Plus />Текст</button>
    </div>
  );
}

export function Plus() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
