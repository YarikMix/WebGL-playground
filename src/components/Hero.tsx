import type { RefObject } from 'react';
import NewNotebookButton from './NewNotebookButton';
import { plural } from '../data';

interface HeroProps {
  /** heroRef и limbRef нужны сцене: из них берутся положение свечения и геометрия планеты */
  heroRef: RefObject<HTMLElement | null>;
  limbRef: RefObject<HTMLDivElement | null>;
  total: number;
  onCreate: () => void;
}

export default function Hero({ heroRef, limbRef, total, onCreate }: HeroProps) {
  return (
    <section className="hero wrap" ref={heroRef}>
      <div className="hero-row">
        <div className="hero-text">
          <h1>С возвращением на&nbsp;орбиту</h1>
          <p className="sub">{total} {plural(total, 'блокнот', 'блокнота', 'блокнотов')}</p>
        </div>
        <div className="actions">
          <NewNotebookButton onClick={onCreate} />
        </div>
      </div>
      {/* CSS-диск планеты: фон, пока сцена грузится (и если не загрузится), и источник её геометрии */}
      <div className="limb" ref={limbRef} aria-hidden="true" />
    </section>
  );
}
