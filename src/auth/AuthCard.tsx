import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthMode } from '../types';
import type { Session } from '../session';
import { useAuthForm } from './useAuthForm';
import type { Field } from './useAuthForm';

interface AuthCardProps {
  onSignIn: (session: Session) => void;
}

/* Карточка входа/регистрации: две половины (форма и приглашение) стоят в DOM в постоянном
   порядке, а какая из них слева, решает CSS `order` по классу режима на карточке —
   переключение не переставляет узлы и не сбрасывает фокус. Класс `card` обязателен:
   по нему useSceneLayout находит карточку и отдаёт её в сцену стеклом. */
export default function AuthCard({ onSignIn }: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  // показ пароля — своё состояние карточки, при смене режима гасится, чтобы пароль
  // не оставался открытым на другой форме
  const [shown, setShown] = useState(false);
  const [toast, setToast] = useState('');

  const { values, errors, busy, setValue, blurField, reset, submit } = useAuthForm(mode, onSignIn);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const fieldRef = (field: Field) => (field === 'name' ? nameRef : field === 'email' ? emailRef : passwordRef);

  // при смене режима (и при первом рендере — тогда это просто открытие формы) — сброс ошибок
  // и фокус на первое поле формы
  useEffect(() => {
    reset();
    setShown(false);
    (mode === 'signup' ? nameRef : emailRef).current?.focus();
    // reset/submit меняются на каждый рендер (хук без useCallback) — сюда их включать не нужно,
    // эффект должен срабатывать только на смену режима
  }, [mode]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'signup' : 'login'));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const firstBad = await submit();
    if (firstBad) fieldRef(firstBad).current?.focus();
  };

  return (
    <div className={`card auth-card mode-${mode}`}>
      <form className="auth-form" noValidate onSubmit={e => { void handleSubmit(e); }}>
        <h1>{mode === 'login' ? 'Вход' : 'Создание аккаунта'}</h1>
        {mode === 'signup' && (
          <label className="field">
            <span>Имя</span>
            <input ref={nameRef} type="text" name="name" autoComplete="name" value={values.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
              onChange={e => setValue('name', e.target.value)} onBlur={() => blurField('name')} />
            {errors.name && <span id="name-error" className="field-error" role="alert">{errors.name}</span>}
          </label>
        )}
        <label className="field">
          <span>Почта</span>
          <input ref={emailRef} type="email" name="email" autoComplete="email" placeholder="имя@домен" value={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            onChange={e => setValue('email', e.target.value)} onBlur={() => blurField('email')} />
          {errors.email && <span id="email-error" className="field-error" role="alert">{errors.email}</span>}
        </label>
        <label className="field">
          <span>Пароль</span>
          <span className="field-input">
            <input ref={passwordRef} type={shown ? 'text' : 'password'} name="password" value={values.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              onChange={e => setValue('password', e.target.value)} onBlur={() => blurField('password')} />
            <button type="button" className="field-toggle" aria-pressed={shown}
              aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
              onClick={() => setShown(v => !v)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M1.5 9s2.8-4.5 7.5-4.5S16.5 9 16.5 9s-2.8 4.5-7.5 4.5S1.5 9 1.5 9Z"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
                <circle cx="9" cy="9" r="2.1" stroke="currentColor" strokeWidth="1.3" fill="none" />
                {shown && <path d="m3 15 12-12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
              </svg>
            </button>
          </span>
          {errors.password && <span id="password-error" className="field-error" role="alert">{errors.password}</span>}
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
        {mode === 'login' && (
          <button type="button" className="auth-aux" onClick={() => setToast('В прототипе восстановление не подключено')}>
            Забыли пароль?
          </button>
        )}
      </form>

      <div className="auth-invite">
        <p>{mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}</p>
        <button className="btn btn-ghost" type="button" onClick={switchMode}>
          {mode === 'login' ? 'Создать аккаунт' : 'Войти'}
        </button>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
