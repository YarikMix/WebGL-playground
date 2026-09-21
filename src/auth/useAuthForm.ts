import { useState } from 'react';
import type { AuthMode } from '../types';
import type { Session } from '../session';

const TAKEN = 'taken@nebulab.ru';
export type Field = 'name' | 'email' | 'password';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

// Строже §4.3: спека требует только «без @», а тут ещё и точка в домене (значит `a@b` отвергается) —
// осознанно строже спеки, чтобы не пропускать заведомо неполные адреса.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: AuthMode, values: Values): Errors {
  const errors: Errors = {};
  if (mode === 'signup' && !values.name.trim()) errors.name = 'Введите имя';
  if (!values.email.trim()) errors.email = 'Введите почту';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Адрес вида имя@домен';
  if (!values.password) errors.password = 'Введите пароль';
  else if (values.password.length < 8) errors.password = 'Нужно не меньше 8 символов';
  return errors;
}

const EMPTY: Values = { name: '', email: '', password: '' };
const ORDER: Field[] = ['name', 'email', 'password'];

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

    const email = values.email.trim();
    if (mode === 'signup' && email.toLowerCase() === TAKEN) {
      setErrors({ email: 'Этот адрес уже занят. Войдите или возьмите другой' });
      return 'email';
    }
    const name = values.name.trim();
    onDone(name ? { email, name } : { email });
    return null;
  }

  return { values, errors, busy, setValue, blurField, reset, submit };
}
