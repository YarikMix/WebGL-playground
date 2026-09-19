import type { RefObject } from 'react';
import { plural } from '../data';

interface HeroProps {
  /** heroRef и limbRef нужны сцене: из них берутся положение свечения и геометрия планеты */
  heroRef: RefObject<HTMLElement | null>;
  limbRef: RefObject<HTMLDivElement | null>;
  total: number;
  running: number;
  onCreate: () => void;
  onUpload: () => void;
}

export default function Hero({ heroRef, limbRef, total, running, onCreate, onUpload }: HeroProps) {
  return (
    <section className="hero wrap" ref={heroRef}>
      <div className="hero-row">
        <div className="hero-text">
          <span className="eyebrow">
            <i className="dot" />
            {running
              ? `${running} ${plural(running, 'рантайм', 'рантайма', 'рантаймов')} на орбите`
              : 'Все рантаймы остановлены'}
          </span>
          <h1>С возвращением на&nbsp;орбиту</h1>
          <p className="sub">
            {total} {plural(total, 'блокнот', 'блокнота', 'блокнотов')} · {running}{' '}
            {plural(running, 'рантайм работает', 'рантайма работают', 'рантаймов работают')} · осталось 11,5 GPU-часа
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={onCreate}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
            Новый блокнот
          </button>
          <button className="btn btn-ghost" type="button" onClick={onUpload}>Загрузить .ipynb</button>
        </div>
      </div>
      {/* CSS-диск планеты: фон, пока сцена грузится (и если не загрузится), и источник её геометрии */}
      <div className="limb" ref={limbRef} aria-hidden="true" />
    </section>
  );
}
