import { useState } from 'react';
import type { AuthMode } from '../types';

/* Карточка входа/регистрации: две половины (форма и приглашение) стоят в DOM в постоянном
   порядке, а какая из них слева, решает CSS `order` по классу режима на карточке —
   переключение не переставляет узлы и не сбрасывает фокус. Класс `card` обязателен:
   по нему useSceneLayout находит карточку и отдаёт её в сцену стеклом. */
export default function AuthCard() {
  const [mode, setMode] = useState<AuthMode>('login');
  // показ пароля — своё состояние карточки, при смене режима гасится, чтобы пароль
  // не оставался открытым на другой форме
  const [shown, setShown] = useState(false);

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'signup' : 'login'));
    setShown(false);
  };

  return (
    <div className={`card auth-card mode-${mode}`}>
      <form className="auth-form" noValidate onSubmit={e => e.preventDefault()}>
        <h1>{mode === 'login' ? 'Вход' : 'Создание аккаунта'}</h1>
        {mode === 'signup' && (
          <label className="field">
            <span>Имя</span>
            <input type="text" name="name" autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span>Почта</span>
          <input type="email" name="email" autoComplete="email" placeholder="имя@домен" />
        </label>
        <label className="field">
          <span>Пароль</span>
          <span className="field-input">
            <input type={shown ? 'text' : 'password'} name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
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
        </label>
        <button className="btn btn-primary" type="submit">
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>

      <div className="auth-invite">
        <p>{mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}</p>
        <button className="btn btn-ghost" type="button" onClick={switchMode}>
          {mode === 'login' ? 'Создать аккаунт' : 'Войти'}
        </button>
      </div>
    </div>
  );
}
