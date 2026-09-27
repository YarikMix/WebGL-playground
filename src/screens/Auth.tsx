import type { CSSProperties } from 'react';
import { Link, getRouteApi, useRouter } from '@tanstack/react-router';
import AuthCard from '../auth/AuthCard';
import { SWEEP_MS } from '../scene-config';
import { useShell } from '../shell';
import type { Session } from '../session';

const loginApi = getRouteApi('/login');

/* Оба рефа сцены (glowRef и cardsRef) указывают на один и тот же контейнер: он же источник свечения
   за карточкой, он же обёртка, в которой сцена ищет `.card`, чтобы отдать карточке стекло */
export default function Auth() {
  const { glowRef, cardsRef, limbRef, mode, setMode, signIn, glassOn, reducedMotion } = useShell();
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

  return (
    <div className="auth wrap" style={{ '--sweep': `${SWEEP_MS}ms` } as CSSProperties}
      ref={node => { cardsRef.current = node; glowRef.current = node; }}>
      <Link className="logo" to="/" aria-label="Cellestial — на главную">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
          <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
          <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
        </svg>
        cellestial
      </Link>

      <AuthCard mode={mode} onModeChange={setMode} onSignIn={onSignIn} glass={glassOn} reducedMotion={reducedMotion} />

      {/* CSS-диск планеты: фон, пока сцена грузится (и если не загрузится), и источник её геометрии */}
      <div className="limb" ref={limbRef} aria-hidden="true" />
    </div>
  );
}
