import { useSyncExternalStore } from 'react';
import { clearSession, loadSession, saveSession } from './session';
import type { Session } from './session';

/* Сессия живёт вне React. Охранники маршрутов (beforeLoad в router.tsx) читают её синхронно:
   будь она состоянием App — компонента внутри роутера, — переход сразу после «Войти» увидел бы
   прежнее значение и вернул бы на форму. localStorage источником правды тоже не годится: при
   заблокированном хранилище вход перестал бы работать, а сейчас он работает, просто не сохраняется. */
let current: Session | null = loadSession();
const listeners = new Set<() => void>();
const emit = () => { for (const fn of listeners) fn(); };

export const sessionStore = {
  get: (): Session | null => current,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  signIn(session: Session): void { saveSession(session); current = session; emit(); },
  signOut(): void { clearSession(); current = null; emit(); },
};

export function useSession(): Session | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
}
