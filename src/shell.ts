import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { Session } from './session';
import type { AuthMode, Cell, Notebook } from './types';

/* Что корень (App) отдаёт экранам. У маршрутных компонентов нет пропсов, поэтому общее идёт
   через контекст: рефы сцены, сессия, блокноты и тост должны переживать смену экрана. */
export interface Shell {
  /** элемент, от которого сцена отсчитывает свечение за заголовком */
  glowRef: RefObject<HTMLElement | null>;
  /** CSS-диск планеты: фон до готовности сцены и источник её геометрии */
  limbRef: RefObject<HTMLDivElement | null>;
  /** контейнер, чьи `.card` сцена рисует стеклом */
  cardsRef: RefObject<HTMLDivElement | null>;
  /** стекло рисует сцена — DOM-карточки прозрачны */
  glassOn: boolean;
  reducedMotion: boolean;
  session: Session | null;
  /** режим формы входа живёт в корне: им управляет и карточка, и свет сцены */
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  signIn: (session: Session) => void;
  signOut: () => void;
  notebooks: Notebook[];
  /** создаёт блокнот с одной ячейкой кода и возвращает его id */
  createNotebook: () => number;
  /** заменяет ячейки блокнота; блокнот становится «изменён только что» */
  setCells: (id: number, cells: Cell[]) => void;
  toast: (text: string) => void;
}

export const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('useShell() вызван вне корневого маршрута (App)');
  return shell;
}
