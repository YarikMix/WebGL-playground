import { useEffect, useRef } from 'react';

interface TopBarProps {
  query: string;
  onQuery: (value: string) => void;
  initials: string;
  onSignOut: () => void;
}

export default function TopBar({ query, onQuery, initials, onSignOut }: TopBarProps) {
  const input = useRef<HTMLInputElement>(null);

  // «/» переводит фокус в поиск, как в большинстве инструментов для разработчиков
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== input.current) { e.preventDefault(); input.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="top wrap">
      <div className="top-inner">
        <a className="logo" href="#" aria-label="Cellestial — на главную">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
            <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
            <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
          </svg>
          cellestial
        </a>
        <label className="search" htmlFor="search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <span className="sr-only">Поиск по блокнотам</span>
          <input ref={input} id="search" type="search" placeholder="Найти блокнот" autoComplete="off"
            value={query} onChange={e => onQuery(e.target.value)} />
          <kbd>/</kbd>
        </label>
        <div className="quota" title="Остаток квоты GPU в этом месяце">
          GPU <span className="meter" aria-hidden="true"><i /></span> <b>11,5 ч</b>
        </div>
        <button className="avatar" type="button" aria-label="Выйти" onClick={onSignOut}>{initials}</button>
      </div>
    </header>
  );
}
