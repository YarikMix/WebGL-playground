import { Link } from '@tanstack/react-router';

interface TopBarProps {
  initials: string;
  onSignOut: () => void;
}

export default function TopBar({ initials, onSignOut }: TopBarProps) {
  return (
    <header className="top wrap">
      <div className="top-inner">
        <Link className="logo" to="/" aria-label="Cellestial — на главную">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="#b9a4ff" />
            <ellipse cx="12" cy="12" rx="10.5" ry="4.2" transform="rotate(-24 12 12)" stroke="#8b6cff" strokeWidth="1.4" fill="none" />
            <circle cx="20.9" cy="7.6" r="1.5" fill="#ece9ff" />
          </svg>
          cellestial
        </Link>
        <button className="avatar" type="button" aria-label="Выйти" onClick={onSignOut}>{initials}</button>
      </div>
    </header>
  );
}
