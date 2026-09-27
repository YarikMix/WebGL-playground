export interface Notebook {
  id: number;
  title: string;
  /** ячейки; число на карточке — их длина */
  cells: Cell[];
  /** кусок кода для превью на карточке — украшение, к ячейкам не привязан */
  code: string;
}

/** Режим карточки на экране входа: какая форма сейчас показана */
export type AuthMode = 'login' | 'signup';

/** Направление на солнце в координатах сцены */
export type SunDirection = [number, number, number];

/** Кусок кода для подсветки: c — комментарий, s — строка, k — ключевое слово, n — число */
export interface CodeToken {
  text: string;
  cls?: 'c' | 's' | 'k' | 'n';
}

/** Прямоугольник карточки в координатах страницы: центр и размеры, CSS-пиксели */
export interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** одна большая плита (карточка входа), а не мелкая карточка блокнота — см. GlassCards.tsx */
  large: boolean;
}

export interface PlanetGeometry {
  cx: number;
  cy: number;
  R: number;
}

/** Всё, что сцене нужно знать о вёрстке. Координаты — страницы: X вправо, Y вниз, CSS-пиксели */
export interface SceneLayout {
  width: number;
  height: number;
  /** по Y: где фон начинает и заканчивает растворяться в цвете страницы */
  fade: [number, number];
  /** null — на экране нет планеты (экран блокнота): сцена рисует только звёзды */
  planet: PlanetGeometry | null;
  /** свечение за заголовком; привязано к планете, поэтому null вместе с ней */
  glow: { x: number; y: number; rx: number; ry: number } | null;
  cards: CardRect[];
}

/** Какой экран сейчас на странице — от него зависит, что сцена рисует и когда пересчитывать раскладку */
export type SceneScreen = 'auth' | 'list' | 'notebook';

export type CellKind = 'code' | 'text';

/** Ячейка блокнота. Содержимого в модуле 1 нет — только плейсхолдер; поле source появится вместе с редактором */
export interface Cell {
  id: number;
  kind: CellKind;
}
