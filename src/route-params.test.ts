import { describe, expect, test } from 'bun:test';
import { loginSearch, parseNotebookId, safeRedirect } from './route-params';

describe('parseNotebookId', () => {
  test('положительное целое', () => {
    expect(parseNotebookId('3')).toBe(3);
    expect(parseNotebookId('1758960000000')).toBe(1758960000000);   // id нового блокнота — Date.now()
  });
  test.each(['', 'abc', '-1', '0', '007', '3.5', '3 ', '1e3', '99999999999999999999'])('отвергает %p', raw => {
    expect(parseNotebookId(raw)).toBeNull();
  });
});

describe('safeRedirect', () => {
  test('путь внутри приложения', () => {
    expect(safeRedirect('/')).toBe('/');
    expect(safeRedirect('/notebook/3')).toBe('/notebook/3');
  });
  test.each(['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/notebook/3 ',
    'notebook/3', '', 42, null, undefined, [['/']]])('отбрасывает %p', raw => {
    // массив обёрнут ещё раз: test.each раскладывает элемент-массив в аргументы, и без обёртки проверялся бы '/'
    expect(safeRedirect(raw)).toBeUndefined();
  });
});

describe('loginSearch', () => {
  test('проверенный путь', () => {
    expect(loginSearch({ redirect: '/notebook/3' })).toEqual({ redirect: '/notebook/3' });
  });
  test('ключ redirect есть и у отброшенного значения', () => {
    // роутер сливает { ...сырой search, ...validateSearch }: без ключа сырой '//evil.com' остался бы
    expect({ redirect: '//evil.com', ...loginSearch({ redirect: '//evil.com' }) }.redirect).toBeUndefined();
    expect('redirect' in loginSearch({})).toBe(true);
  });
});
