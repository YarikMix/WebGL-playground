import type { CellKind } from '../types';

interface InsertBarProps {
  onAdd: (kind: CellKind) => void;
}

/* Полоса «+ Код / + Текст» после последней ячейки. В РК 1 ячейки добавляются только в конец,
   поэтому полоса одна и видна всегда */
export default function InsertBar({ onAdd }: InsertBarProps) {
  return (
    <div className="nb-insert" role="group" aria-label="Добавить ячейку в конец">
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
