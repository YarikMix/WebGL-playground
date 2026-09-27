import type { Cell as CellModel } from '../types';

interface CellProps {
  cell: CellModel;
  /** порядковый номер с нуля — для имени поля у скринридера */
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRun: () => void;
}

const PLACEHOLDER = { code: '# Код на Python', text: 'Заголовок или описание — Markdown' } as const;

/* Поле — настоящий textarea только для чтения: во втором модуле на его место встанет редактор,
   а разметка ячейки вокруг не изменится. data-cell-id нужен экрану, чтобы вернуть фокус после
   вставки и удаления */
export default function Cell({ cell, index, selected, onSelect, onDelete, onRun }: CellProps) {
  const label = cell.kind === 'code' ? `Ячейка кода ${index + 1}` : `Текстовая ячейка ${index + 1}`;
  return (
    <div className={`nb-cell nb-cell-${cell.kind}${selected ? ' selected' : ''}`} data-cell-id={cell.id}
      onPointerDown={onSelect} onFocus={onSelect}>
      {cell.kind === 'code' && (
        <div className="nb-gutter">
          <span className="nb-count" aria-hidden="true">[ ]</span>
          <button className="nb-run" type="button" aria-label="Выполнить ячейку" onClick={onRun}>
            <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1.2v9.6L9.2 6 1 1.2Z" fill="currentColor" /></svg>
          </button>
        </div>
      )}
      <textarea className="nb-input" readOnly rows={1} placeholder={PLACEHOLDER[cell.kind]} aria-label={label} />
      <div className="nb-cell-tools">
        <button className="nb-delete" type="button" aria-label="Удалить ячейку" onClick={onDelete}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
