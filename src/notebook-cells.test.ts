import { describe, expect, test } from 'bun:test';
import { initialCells, insertCell, insertionIndex, removeCell } from './notebook-cells';
import type { Cell } from './types';

const kinds = (cells: readonly Cell[]) => cells.map(c => c.kind);
const ids = (cells: readonly Cell[]) => cells.map(c => c.id);

describe('initialCells', () => {
  test('чередует текст и код, начиная с текста', () => {
    expect(kinds(initialCells(5))).toEqual(['text', 'code', 'text', 'code', 'text']);
  });
  test('ровно столько ячеек, сколько просили', () => {
    expect(initialCells(21)).toHaveLength(21);
    expect(initialCells(0)).toEqual([]);
  });
  test('id уникальны и между вызовами', () => {
    const all = [...ids(initialCells(10)), ...ids(initialCells(10))];
    expect(new Set(all).size).toBe(20);
  });
});

describe('insertCell', () => {
  const base = initialCells(3);
  test('в начало', () => {
    const { cells, id } = insertCell(base, 0, 'code');
    expect(cells[0]).toEqual({ id, kind: 'code' });
    expect(ids(cells.slice(1))).toEqual(ids(base));
  });
  test('в середину', () => {
    const { cells, id } = insertCell(base, 2, 'text');
    expect(cells[2]?.id).toBe(id);
    expect(cells).toHaveLength(4);
  });
  test('в конец', () => {
    const { cells, id } = insertCell(base, 3, 'code');
    expect(cells.at(-1)?.id).toBe(id);
  });
  test('индекс за границами прижимается к краю', () => {
    expect(insertCell(base, 99, 'code').cells.at(-1)?.kind).toBe('code');
    expect(insertCell(base, -5, 'code').cells[0]?.kind).toBe('code');
  });
  test('не мутирует исходный массив', () => {
    const before = ids(base);
    insertCell(base, 1, 'code');
    expect(ids(base)).toEqual(before);
  });
  test('серия вставок даёт уникальные id', () => {
    let cells: Cell[] = [];
    for (let i = 0; i < 50; i++) cells = insertCell(cells, 0, 'code').cells;
    expect(new Set(ids(cells)).size).toBe(50);
  });
});

describe('insertionIndex', () => {
  const base = initialCells(4);
  test('после выбранной', () => {
    expect(insertionIndex(base, base[1]!.id)).toBe(2);
    expect(insertionIndex(base, base[3]!.id)).toBe(4);
  });
  test('без выбора — в конец', () => {
    expect(insertionIndex(base, null)).toBe(4);
  });
  test('выбранной уже нет — в конец', () => {
    expect(insertionIndex(base, -1)).toBe(4);
  });
});

describe('removeCell', () => {
  const base = initialCells(3);
  test('первая: выбор переходит на следующую', () => {
    const { cells, nextSelected } = removeCell(base, base[0]!.id);
    expect(ids(cells)).toEqual([base[1]!.id, base[2]!.id]);
    expect(nextSelected).toBe(base[1]!.id);
  });
  test('средняя: выбор переходит на следующую', () => {
    expect(removeCell(base, base[1]!.id).nextSelected).toBe(base[2]!.id);
  });
  test('последняя: выбор переходит на предыдущую', () => {
    expect(removeCell(base, base[2]!.id).nextSelected).toBe(base[1]!.id);
  });
  test('единственная: пусто и выбора нет', () => {
    const one = initialCells(1);
    expect(removeCell(one, one[0]!.id)).toEqual({ cells: [], nextSelected: null });
  });
  test('несуществующий id ничего не меняет', () => {
    const { cells, nextSelected } = removeCell(base, -1);
    expect(ids(cells)).toEqual(ids(base));
    expect(nextSelected).toBeNull();
  });
});
