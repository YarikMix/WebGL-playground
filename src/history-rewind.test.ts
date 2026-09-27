import { describe, expect, test } from 'bun:test';
import { rewindSteps } from './history-rewind';

/* длина истории с запасом — там, где проверяется только номер записи */
const LEN = 50;

describe('rewindSteps', () => {
  test('номер записи — столько шагов назад до первой записи приложения', () => {
    expect(rewindSteps(1, LEN)).toBe(1);
    expect(rewindSteps(3, LEN)).toBe(3);
  });
  test('уже на первой записи — идти некуда', () => {
    expect(rewindSteps(0, LEN)).toBe(0);
  });
  test('номера нет — 0', () => {
    expect(rewindSteps(undefined, LEN)).toBe(0);
  });
  test.each([-1, -3, 1.5, NaN, Infinity, 2 ** 53, '3', null, {}, [[2]]])('мусор %p — 0', raw => {
    // массив обёрнут ещё раз: test.each раскладывает элемент-массив в аргументы
    expect(rewindSteps(raw, LEN)).toBe(0);
  });
  test('номер не меньше длины истории — столько записей нет, go() ничего не сделал бы: 0', () => {
    // браузер хранит ~50 записей на вкладку, а номер TanStack растёт без предела
    expect(rewindSteps(50, 50)).toBe(0);
    expect(rewindSteps(73, 50)).toBe(0);
    expect(rewindSteps(3, 3)).toBe(0);
  });
  test('номер меньше длины истории — отматываем', () => {
    expect(rewindSteps(2, 3)).toBe(2);
    expect(rewindSteps(49, 50)).toBe(49);
  });
});
