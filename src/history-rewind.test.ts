import { describe, expect, test } from 'bun:test';
import { rewindSteps } from './history-rewind';

describe('rewindSteps', () => {
  test('номер записи — столько шагов назад до первой записи приложения', () => {
    expect(rewindSteps(1)).toBe(1);
    expect(rewindSteps(3)).toBe(3);
  });
  test('уже на первой записи — идти некуда', () => {
    expect(rewindSteps(0)).toBe(0);
  });
  test('номера нет — 0', () => {
    expect(rewindSteps(undefined)).toBe(0);
  });
  test.each([-1, -3, 1.5, NaN, Infinity, 2 ** 53, '3', null, {}, [[2]]])('мусор %p — 0', raw => {
    // массив обёрнут ещё раз: test.each раскладывает элемент-массив в аргументы
    expect(rewindSteps(raw)).toBe(0);
  });
});
