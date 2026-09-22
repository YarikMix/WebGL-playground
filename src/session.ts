/* Факт входа переживает перезагрузку. Хранилище может быть недоступно (приватный режим) —
   тогда вход просто не сохраняется, но работает. */

export interface Session {
  email: string;
  /** Имя вводят только при регистрации; при входе его нет */
  name?: string;
}

const KEY = 'cellestial-session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { email, name } = parsed as Record<string, unknown>;
    if (typeof email !== 'string' || !email) return null;
    return typeof name === 'string' && name ? { email, name } : { email };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* хранилище заблокировано */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* хранилище заблокировано */ }
}

/** Инициалы для аватара: из имени, а если его нет — первая буква почты */
export function initials(session: Session): string {
  const name = session.name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (session.email[0] ?? '?').toUpperCase();
}
