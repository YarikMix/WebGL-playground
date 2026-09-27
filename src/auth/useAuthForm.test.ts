import { describe, expect, test } from 'bun:test';
import { validate } from './useAuthForm';

const ok = { login: 'yarik', password: '12345678', confirm: '12345678' };

describe('validate: логин', () => {
  test('пустой', () => expect(validate('login', { ...ok, login: '  ' }).login).toBe('Введите логин'));
  const RULE = 'От 3 до 32 символов: a–z, 0–9, _ . -';
  test('2 символа', () => expect(validate('login', { ...ok, login: 'ab' }).login).toBe(RULE));
  test('33 символа', () => expect(validate('login', { ...ok, login: 'a'.repeat(33) }).login).toBe(RULE));
  test('ровно 3 и ровно 32 — можно', () => {
    expect(validate('login', { ...ok, login: 'abc' }).login).toBeUndefined();
    expect(validate('login', { ...ok, login: 'a'.repeat(32) }).login).toBeUndefined();
  });
  test('заглавные не приводятся молча', () => expect(validate('login', { ...ok, login: 'Yarik' }).login).toBe(RULE));
  test('кириллица и пробел внутри', () => {
    expect(validate('login', { ...ok, login: 'ярик' }).login).toBe(RULE);
    expect(validate('login', { ...ok, login: 'ya rik' }).login).toBe(RULE);
  });
  test('допустимые знаки _ . -', () => expect(validate('login', { ...ok, login: 'ya_r.i-k9' }).login).toBeUndefined());
  test('пробелы по краям обрезаются', () => expect(validate('login', { ...ok, login: '  yarik ' }).login).toBeUndefined());
});

describe('validate: пароль', () => {
  test('пустой', () => expect(validate('login', { ...ok, password: '' }).password).toBe('Введите пароль'));
  test('короче 8', () => expect(validate('login', { ...ok, password: '1234567' }).password).toBe('Нужно не меньше 8 символов'));
});

describe('validate: повтор пароля', () => {
  test('на входе не проверяется', () => expect(validate('login', { ...ok, confirm: '' }).confirm).toBeUndefined());
  test('пустой', () => expect(validate('signup', { ...ok, confirm: '' }).confirm).toBe('Повторите пароль'));
  test('не совпадает', () => expect(validate('signup', { ...ok, confirm: '87654321' }).confirm).toBe('Пароли не совпадают'));
  test('совпадает — ошибок нет вовсе', () => expect(validate('signup', ok)).toEqual({}));
});
