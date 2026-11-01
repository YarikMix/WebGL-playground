import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthMode } from '../types';
import { AUTH_FADE_MS } from './flight';
import { useAuthForm } from './useAuthForm';
import type { Field } from './useAuthForm';

interface AuthCardProps {
  mode: AuthMode;
  form: ReturnType<typeof useAuthForm>;
  flying: boolean;
  reducedMotion: boolean;
}

export default function AuthCard({ mode, form, flying, reducedMotion }: AuthCardProps) {
  // показ пароля — своё состояние карточки, при смене режима гасится, чтобы пароль
  // не оставался открытым на другой форме
  const [shown, setShown] = useState(false);
  const [toast, setToast] = useState('');

  const { values, errors, busy, setValue, blurField, reset, submit } = form;

  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const fieldRef = (field: Field) => (field === 'login' ? loginRef : field === 'password' ? passwordRef : confirmRef);

  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    reset();
    setShown(false);
  }, [mode]);
  useEffect(() => {
    if (flying) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && cardRef.current?.contains(active)) active.blur();
      return;
    }
    const timer = setTimeout(() => loginRef.current?.focus(), reducedMotion ? 0 : AUTH_FADE_MS);
    return () => clearTimeout(timer);
  }, [flying, mode, reducedMotion]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (flying || busy) return;
    const firstBad = await submit();
    if (firstBad) fieldRef(firstBad).current?.focus();
  };

  return (
    <div ref={cardRef} className={`auth-card${flying ? ' flying' : ''}`} inert={flying}>
      <form className="auth-form" noValidate onSubmit={e => { void handleSubmit(e); }}>
        <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
        <label className="field">
          <span>Логин</span>
          {/* autocapitalize/spellcheck: иначе телефон поднимет первую букву, и логин не пройдёт правило */}
          <input ref={loginRef} type="text" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={values.login}
            aria-invalid={errors.login ? true : undefined}
            aria-describedby={errors.login ? 'login-error' : undefined}
            onChange={e => setValue('login', e.target.value)} onBlur={() => blurField('login')} />
          {/* Рендерится всегда (не только при ошибке): у .field-error зарезервирована высота
              строки в CSS, чтобы появление ошибки не двигало форму и не роняло клик по кнопке
              переключения режима под ней на узком экране (см. Ruling 10, task-6-report.md).
              Пустой элемент с role="alert" не озвучивается скринридером. */}
          <span id="login-error" className="field-error" role="alert">{errors.login}</span>
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
          <span id="password-error" className="field-error" role="alert">{errors.password}</span>
        </label>
        {mode === 'signup' && (
          <label className="field">
            <span>Повторите пароль</span>
            {/* Своей кнопки показа нет: переключатель у поля «Пароль» раскрывает оба поля,
                чтобы их можно было сверить глазами */}
            <input ref={confirmRef} type={shown ? 'text' : 'password'} name="confirm" autoComplete="new-password"
              value={values.confirm}
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={errors.confirm ? 'confirm-error' : undefined}
              onChange={e => setValue('confirm', e.target.value)} onBlur={() => blurField('confirm')} />
            <span id="confirm-error" className="field-error" role="alert">{errors.confirm}</span>
          </label>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
        {mode === 'login' && (
          <button type="button" className="auth-aux" onClick={() => setToast('В прототипе восстановление не подключено')}>
            Забыли пароль?
          </button>
        )}
      </form>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
