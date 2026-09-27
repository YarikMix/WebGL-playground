import { useState } from 'react';
import type { AuthMode } from '../types';
import type { Session } from '../session';

/* Логин, на котором регистрация отвечает «занят», — чтобы состояние серверной ошибки можно было
   показать руками, а не описать словами */
const TAKEN = 'taken';
export type Field = 'login' | 'password' | 'confirm';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const LOGIN = /^[a-z0-9_.-]{3,32}$/;

/* Заглавные буквы не приводятся к нижнему регистру молча: менять то, что человек ввёл в поле,
   которым он потом будет входить, хуже, чем сказать об этом (§5.2 спеки) */
export function validate(mode: AuthMode, values: Values): Errors {
  const errors: Errors = {};
  const login = values.login.trim();
  if (!login) errors.login = 'Введите логин';
  else if (!LOGIN.test(login)) errors.login = 'От 3 до 32 символов: a–z, 0–9, _ . -';
  if (!values.password) errors.password = 'Введите пароль';
  else if (values.password.length < 8) errors.password = 'Нужно не меньше 8 символов';
  if (mode === 'signup') {
    if (!values.confirm) errors.confirm = 'Повторите пароль';
    else if (values.confirm !== values.password) errors.confirm = 'Пароли не совпадают';
  }
  return errors;
}

const EMPTY: Values = { login: '', password: '', confirm: '' };
const ORDER: Field[] = ['login', 'password', 'confirm'];

export function useAuthForm(mode: AuthMode, onDone: (session: Session) => void) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function setValue(field: Field, value: string): void {
    setValues(prev => ({ ...prev, [field]: value }));
    // ошибку снимаем сразу: ругаться, пока человек исправляет, незачем
    setErrors(prev => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }));
  }

  function blurField(field: Field): void {
    const found = validate(mode, values)[field];
    setErrors(prev => ({ ...prev, [field]: found }));
  }

  /** Сбросить ошибки при смене режима — правила у форм разные */
  function reset(): void {
    setErrors({});
    setBusy(false);
  }

  async function submit(): Promise<Field | null> {
    const found = validate(mode, values);
    setErrors(found);
    const firstBad = ORDER.find(field => found[field] !== undefined);
    if (firstBad) return firstBad;

    setBusy(true);
    await new Promise(resolve => setTimeout(resolve, 600));   // чтобы состояние отправки было видно
    setBusy(false);

    const login = values.login.trim();
    if (mode === 'signup' && login === TAKEN) {
      setErrors({ login: 'Этот логин уже занят. Войдите или выберите другой' });
      return 'login';
    }
    onDone({ login });
    return null;
  }

  return { values, errors, busy, setValue, blurField, reset, submit };
}
