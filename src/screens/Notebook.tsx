import { Fragment, useEffect, useRef, useState } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import NotebookHeader from '../notebook/NotebookHeader';
import Cell from '../notebook/Cell';
import InsertBar, { Plus } from '../notebook/InsertBar';
import { insertCell, insertionIndex, removeCell } from '../notebook-cells';
import { parseNotebookId } from '../route-params';
import { initials } from '../session';
import { useShell } from '../shell';
import type { CellKind } from '../types';

const notebookApi = getRouteApi('/notebook/$id');

/** куда вернуть фокус после вставки/удаления: id ячейки или пустое состояние */
type FocusTarget = number | 'empty' | null;

export default function Notebook() {
  const { id: rawId } = notebookApi.useParams();
  const { notebooks, setCells, toast, session, signOut, reducedMotion } = useShell();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const emptyRef = useRef<HTMLButtonElement>(null);

  const id = parseNotebookId(rawId);
  const notebook = id === null ? undefined : notebooks.find(n => n.id === id);

  /* Проверка здесь, а не в beforeLoad: блокноты — состояние корня, охранник маршрута их не видит.
     Сюда же попадает блокнот, созданный до перезагрузки: после неё его нет */
  useEffect(() => {
    if (notebook) return;
    toast('Блокнот не найден');
    void navigate({ to: '/', replace: true });
  }, [notebook, toast, navigate]);

  /* Фокус переносится после того, как React отрисовал новый список: иначе нужной ячейки ещё нет
     в DOM, а удалённая уносит фокус на body. scrollIntoView — отдельно от focus(): фокус сам
     прокручивает, но без плавности и выравнивания */
  useEffect(() => {
    if (focusTarget === null) return;
    const el = focusTarget === 'empty'
      ? emptyRef.current
      : document.querySelector<HTMLElement>(`[data-cell-id="${focusTarget}"] .nb-input`);
    el?.focus({ preventScroll: true });
    el?.closest('.nb-cell, .empty')?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    setFocusTarget(null);
  }, [focusTarget, reducedMotion]);

  if (!notebook || !session) return null;
  const { cells } = notebook;

  const add = (index: number, kind: CellKind) => {
    const result = insertCell(cells, index, kind);
    setCells(notebook.id, result.cells);
    setSelected(result.id);
    setFocusTarget(result.id);
  };
  const remove = (cellId: number) => {
    const result = removeCell(cells, cellId);
    setCells(notebook.id, result.cells);
    setSelected(result.nextSelected);
    setFocusTarget(result.nextSelected ?? 'empty');
  };
  const run = () => toast('В прототипе выполнение не подключено');

  return (
    <>
      <NotebookHeader notebook={notebook} initials={initials(session)} onSignOut={signOut}
        onAdd={kind => add(insertionIndex(cells, selected), kind)} />

      <main className="wrap nb-main">
        {cells.length === 0 ? (
          <div className="empty nb-empty">
            <strong>В блокноте пусто</strong>
            <span>Добавьте первую ячейку</span>
            <div className="nb-empty-actions">
              <button ref={emptyRef} className="nb-add" type="button" onClick={() => add(0, 'code')}><Plus />Код</button>
              <button className="nb-add" type="button" onClick={() => add(0, 'text')}><Plus />Текст</button>
            </div>
          </div>
        ) : (
          <div className="nb-cells">
            <InsertBar onAdd={kind => add(0, kind)} nearSelected={cells[0]?.id === selected} />
            {cells.map((cell, i) => (
              <Fragment key={cell.id}>
                <Cell cell={cell} index={i} selected={cell.id === selected}
                  onSelect={() => setSelected(cell.id)} onDelete={() => remove(cell.id)} onRun={run} />
                {/* после последней ячейки полоса видна всегда — вторая точка входа для добавления */}
                <InsertBar onAdd={kind => add(i + 1, kind)} persistent={i === cells.length - 1} nearSelected={cell.id === selected} />
              </Fragment>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
