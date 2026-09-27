import { beforeEach, describe, expect, test } from 'bun:test';
import { clearSession, initials, loadSession, saveSession } from './session';

/* В Bun нет браузерного localStorage — подкладываем простую замену на Map */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } satisfies Storage,
});
const KEY = 'cellestial-session';

beforeEach(() => store.clear());

describe('session', () => {
  test('сохраняется и читается', () => {
    saveSession({ login: 'yarik' });
    expect(loadSession()).toEqual({ login: 'yarik' });
  });
  test('старая сессия с почтой не принимается', () => {
    store.set(KEY, JSON.stringify({ email: 'a@b.ru', name: 'Аня' }));
    expect(loadSession()).toBeNull();
  });
  test('битый JSON, пустой логин, не объект — null', () => {
    store.set(KEY, '{oops');
    expect(loadSession()).toBeNull();
    store.set(KEY, JSON.stringify({ login: '' }));
    expect(loadSession()).toBeNull();
    store.set(KEY, JSON.stringify('yarik'));
    expect(loadSession()).toBeNull();
  });
  test('clearSession стирает', () => {
    saveSession({ login: 'yarik' });
    clearSession();
    expect(loadSession()).toBeNull();
  });
  test('инициалы — первая буква логина заглавной', () => {
    expect(initials({ login: 'yarik' })).toBe('Y');
    expect(initials({ login: '_dev' })).toBe('_');
  });
});
