/* Факт входа переживает перезагрузку. Хранилище может быть недоступно (приватный режим) —
   тогда вход просто не сохраняется, но работает. */

export interface Session {
  login: string;
}

const KEY = 'cellestial-session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    // сессия прошлой версии ({ email, name }) сюда не проходит — человек один раз увидит форму входа
    const { login } = parsed as Record<string, unknown>;
    return typeof login === 'string' && login ? { login } : null;
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

/** Инициалы для аватара: первая буква логина, как «Я» у Colab */
export function initials(session: Session): string {
  return (session.login[0] ?? '?').toUpperCase();
}
