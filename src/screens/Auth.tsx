import type { CSSProperties, RefObject } from 'react';
import AuthCard from '../auth/AuthCard';
import { SWEEP_MS } from '../scene-config';
import type { Session } from '../session';
import type { AuthMode } from '../types';

interface AuthProps {
  /** оба рефа сцены указывают на один и тот же контейнер: он же источник свечения за карточкой,
      он же обёртка, в которой сцена ищет `.card`, чтобы отдать карточке стекло */
  glowRef: RefObject<HTMLElement | null>;
  cardsRef: RefObject<HTMLDivElement | null>;
  limbRef: RefObject<HTMLDivElement | null>;
  /** режим формы живёт в App: им управляет не только карточка, но и свет сцены */
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSignIn: (session: Session) => void;
  /** стекло рисует сцена — карточка становится прозрачной (см. NotebookGrid) */
  glassOn: boolean;
  /** гасит кросс-фейд половин и разгон света на сцене — переключение мгновенное */
  reducedMotion: boolean;
}

export default function Auth({ glowRef, cardsRef, limbRef, mode, onModeChange, onSignIn, glassOn, reducedMotion }: AuthProps) {
  return (
    <div className="auth wrap" style={{ '--sweep': `${SWEEP_MS}ms` } as CSSProperties}
      ref={node => { cardsRef.current = node; glowRef.current = node; }}>
      <a className="logo" href="#" aria-label="Nebulab — на главную">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
          <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
          <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
        </svg>
        nebulab
      </a>

      <AuthCard mode={mode} onModeChange={onModeChange} onSignIn={onSignIn} glass={glassOn} reducedMotion={reducedMotion} />

      {/* CSS-диск планеты: фон, пока сцена грузится (и если не загрузится), и источник её геометрии */}
      <div className="limb" ref={limbRef} aria-hidden="true" />
    </div>
  );
}
