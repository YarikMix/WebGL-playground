import { Link, getRouteApi, useRouter } from '@tanstack/react-router';
import AuthCard from '../auth/AuthCard';
import { useAuthForm } from '../auth/useAuthForm';
import { AUTH_FADE_MS } from '../auth/flight';
import { useShell } from '../shell';
import type { Session } from '../session';

const loginApi = getRouteApi('/login');

export default function Auth() {
  const { authFlight, authSceneReady, authSwitchRef, requestAuthMode, signIn, reducedMotion } = useShell();
  const router = useRouter();
  const { redirect } = loginApi.useSearch();

  /* Стор сессии синхронный, поэтому охранник следующего маршрута уже видит вход.
     redirect проверен в validateSearch (loginSearch) — это всегда путь внутри приложения.
     replace, а не push: форма входа уходит из истории. С push первый «Назад» после входа попадал
     на /login, его beforeLoad при живой сессии тут же отправлял вперёд — кнопка ничего не делала */
  const onSignIn = (session: Session) => {
    signIn(session);
    router.history.replace(redirect ?? '/');
  };
  const form = useAuthForm(authFlight.mode, onSignIn);
  const flying = authFlight.startedAt !== null;

  return (
    <div className={`auth mode-${authFlight.mode}${authSceneReady ? ' scene-ready' : ''}`}
      style={{ '--auth-fade': `${AUTH_FADE_MS}ms` } as CSSProperties}>
      <Link className="logo" to="/" aria-label="Cellestial — на главную">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
          <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
          <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
        </svg>
        cellestial
      </Link>

      <div className="auth-fallback-planet" aria-hidden="true" />
      <AuthCard mode={authFlight.mode} form={form} flying={flying} reducedMotion={reducedMotion} />
      <button className="auth-destination" type="button" ref={authSwitchRef} hidden={flying} disabled={flying || form.busy}
        aria-label={authFlight.mode === 'login' ? 'Перейти к регистрации' : 'Перейти ко входу'}
        onClick={() => { if (!form.busy && !flying) requestAuthMode(authFlight.mode === 'login' ? 'signup' : 'login'); }}>
        <span className="auth-destination-caption">{authFlight.mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}</span>
      </button>
    </div>
  );
}
import type { CSSProperties } from 'react';
