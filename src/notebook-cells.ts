/* Операции над ячейками блокнота — чистые функции: экран отдаёт текущий массив и получает новый.
   Состояние живёт в корне (App), поэтому здесь нет ни React, ни мутаций. */
import type { Cell, CellKind } from './types';

/* Счётчик модуля, а не Date.now(): две вставки в одну миллисекунду (двойной клик, серия в тестах)
   получили бы один id, и React перепутал бы ячейки. Уникальность нужна только в пределах вкладки —
   ячейки не переживают перезагрузку. */
let nextId = 1;
const newCell = (kind: CellKind): Cell => ({ id: nextId++, kind });

/** Стартовое содержимое блокнота: count ячеек, чередуя текст и код, начиная с текста */
export function initialCells(count: number): Cell[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => newCell(i % 2 === 0 ? 'text' : 'code'));
}

/** Вставить ячейку в позицию index: 0 — в начало, cells.length — в конец. Отдаёт и id новой ячейки,
    чтобы экран сразу сделал её выбранной */
export function insertCell(cells: readonly Cell[], index: number, kind: CellKind): { cells: Cell[]; id: number } {
  const at = Math.min(Math.max(index, 0), cells.length);
  const cell = newCell(kind);
  return { cells: [...cells.slice(0, at), cell, ...cells.slice(at)], id: cell.id };
}

/** Куда вставляют кнопки в шапке: после выбранной ячейки, а без выбора (или если её уже нет) — в конец */
export function insertionIndex(cells: readonly Cell[], selectedId: number | null): number {
  const i = selectedId === null ? -1 : cells.findIndex(c => c.id === selectedId);
  return i === -1 ? cells.length : i + 1;
}

/** Удалить ячейку. Выбор переходит на следующую, а если её нет — на предыдущую: так фокус
    остаётся рядом с местом удаления, а не падает на body */
export function removeCell(cells: readonly Cell[], id: number): { cells: Cell[]; nextSelected: number | null } {
  const i = cells.findIndex(c => c.id === id);
  if (i === -1) return { cells: [...cells], nextSelected: null };
  const rest = [...cells.slice(0, i), ...cells.slice(i + 1)];
  const neighbour = rest[i] ?? rest[i - 1];
  return { cells: rest, nextSelected: neighbour ? neighbour.id : null };
}
